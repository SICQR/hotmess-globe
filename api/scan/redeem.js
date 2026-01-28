import { bestEffortRateLimit, minuteBucket } from '../_rateLimit.js';
import { getRequestIp, getEnv, getSupabaseServerClients, json, readJsonBody } from '../routing/_utils.js';
import { requireAdmin } from '../_middleware/adminAuth.js';
import { verifyTicket } from '../tickets/_utils.js';

const resolveSigningSecret = () => {
  const configured = getEnv('TICKET_QR_SIGNING_SECRET', ['QR_SIGNING_SECRET']);
  if (configured) return { secret: configured, source: 'configured' };

  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  if (isProd) return { secret: null, source: 'missing' };

  const fallback = getEnv('SUPABASE_ANON_KEY', ['VITE_SUPABASE_ANON_KEY']);
  return fallback ? { secret: fallback, source: 'dev_fallback' } : { secret: null, source: 'missing' };
};

const USER_TABLES = ['User', 'users'];

const addXpToUser = async ({ serviceClient, userEmail, amount }) => {
  for (const table of USER_TABLES) {
    const { data: row, error: readError } = await serviceClient
      .from(table)
      .select('id, xp')
      .eq('email', userEmail)
      .maybeSingle();

    if (readError) continue;
    if (!row?.id) continue;

    const currentXp = Number.isFinite(Number(row.xp)) ? Number(row.xp) : 0;
    const nextXp = currentXp + amount;

    const { error: updateError } = await serviceClient.from(table).update({ xp: nextXp }).eq('id', row.id);
    if (!updateError) return { ok: true, nextXp };
  }

  return { ok: false, nextXp: null };
};

export default async function handler(req, res) {
  const method = (req.method || 'POST').toUpperCase();
  if (method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const { secret } = resolveSigningSecret();
  if (!secret) {
    return json(res, 500, {
      error: 'Ticket signing not configured',
      details: 'Set TICKET_QR_SIGNING_SECRET in server environment variables.',
    });
  }

  const { error, anonClient, serviceClient } = getSupabaseServerClients();
  if (error) return json(res, 500, { error });
  if (!serviceClient) {
    return json(res, 500, {
      error: 'Supabase service role key missing',
      details: 'Set SUPABASE_SERVICE_ROLE_KEY in server environment variables.',
    });
  }

  // Use centralized admin authentication
  const adminCheck = await requireAdmin(req, { anonClient, serviceClient });
  if (adminCheck.error) {
    return json(res, adminCheck.status, { error: adminCheck.error });
  }

  const scanner = adminCheck.user;

  const ip = getRequestIp(req);
  const rl = await bestEffortRateLimit({
    serviceClient,
    bucketKey: `scanredeem:${scanner.id}:${ip || 'noip'}:${minuteBucket()}`,
    userId: scanner.id,
    ip,
    windowSeconds: 60,
    maxRequests: 60,
  });

  if (rl.allowed === false) {
    return json(res, 429, { error: 'Rate limit exceeded', remaining: rl.remaining ?? 0 });
  }

  const body = (await readJsonBody(req)) || {};
  const ticket = String(body.ticket || body.code || body.qr || '').trim();
  if (!ticket) return json(res, 400, { error: 'Missing ticket' });

  const verified = verifyTicket({ secret, token: ticket });
  if (!verified.ok) return json(res, 400, { error: verified.error || 'Invalid ticket' });

  const payload = verified.payload;
  if (payload.typ !== 'event_rsvp') return json(res, 400, { error: 'Unsupported ticket type' });

  const rsvpId = String(payload.rsvp_id || '').trim();
  const eventId = String(payload.event_id || '').trim();
  const userEmail = String(payload.user_email || '').trim();

  if (!rsvpId || !eventId || !userEmail) return json(res, 400, { error: 'Invalid ticket payload' });

  // Optional client-provided event guard.
  const expectedEvent = body.event_id || body.eventId || null;
  if (expectedEvent && String(expectedEvent) !== eventId) {
    return json(res, 400, { error: 'Wrong event' });
  }

  const { data: rsvp, error: rsvpError } = await serviceClient
    .from('event_rsvps')
    .select('id, user_email, event_id, status, checked_in, checked_in_at')
    .eq('id', rsvpId)
    .maybeSingle();

  if (rsvpError) return json(res, 500, { error: 'Failed to load RSVP', details: rsvpError.message });
  if (!rsvp?.id) return json(res, 404, { error: 'RSVP not found' });

  if (String(rsvp.event_id) !== eventId || String(rsvp.user_email || '').toLowerCase() !== userEmail.toLowerCase()) {
    return json(res, 400, { error: 'Ticket does not match RSVP' });
  }

  if (rsvp.checked_in) {
    return json(res, 200, {
      ok: true,
      already_checked_in: true,
      rsvp: {
        id: rsvp.id,
        user_email: rsvp.user_email,
        event_id: rsvp.event_id,
        checked_in_at: rsvp.checked_in_at,
      },
    });
  }

  const nowIso = new Date().toISOString();

  const { error: updateError } = await serviceClient
    .from('event_rsvps')
    .update({ checked_in: true, checked_in_at: nowIso, updated_at: nowIso })
    .eq('id', rsvp.id);

  if (updateError) return json(res, 500, { error: 'Failed to check in', details: updateError.message });

  // Award XP (best-effort)
  const XP_AWARD = 50;
  const xp = await addXpToUser({ serviceClient, userEmail: rsvp.user_email, amount: XP_AWARD });

  try {
    await serviceClient.from('xp_ledger').insert({
      user_email: rsvp.user_email,
      amount: XP_AWARD,
      transaction_type: 'event_checkin',
      reference_id: String(rsvp.event_id),
      reference_type: 'event',
      balance_after: xp.nextXp,
      created_by: scanner.email,
    });
  } catch {
    // ignore
  }

  try {
    await serviceClient.from('user_interactions').insert({
      user_email: rsvp.user_email,
      interaction_type: 'ticket_checkin',
      beacon_id: rsvp.event_id,
      metadata: {
        scanned_by: scanner.email,
        rsvp_id: rsvp.id,
      },
      created_by: scanner.email,
    });
  } catch {
    // ignore
  }

  return json(res, 200, {
    ok: true,
    already_checked_in: false,
    awarded_xp: XP_AWARD,
    rsvp: {
      id: rsvp.id,
      user_email: rsvp.user_email,
      event_id: rsvp.event_id,
      checked_in_at: nowIso,
    },
  });
}
