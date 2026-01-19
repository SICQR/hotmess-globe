import { bestEffortRateLimit, minuteBucket } from '../_rateLimit.js';
import { getRequestIp, getAuthedUser, getBearerToken, getEnv, getSupabaseServerClients, json } from '../routing/_utils.js';
import { getQueryParam } from '../shopify/_utils.js';
import { randomNonce, signTicket } from './_utils.js';

const resolveSigningSecret = () => {
  const configured = getEnv('TICKET_QR_SIGNING_SECRET', ['QR_SIGNING_SECRET']);
  if (configured) return { secret: configured, source: 'configured' };

  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  if (isProd) return { secret: null, source: 'missing' };

  // Local/dev fallback so QR flows still work without extra env.
  const fallback = getEnv('SUPABASE_ANON_KEY', ['VITE_SUPABASE_ANON_KEY']);
  return fallback ? { secret: fallback, source: 'dev_fallback' } : { secret: null, source: 'missing' };
};

export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const { secret, source } = resolveSigningSecret();
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

  const accessToken = getBearerToken(req);
  if (!accessToken) return json(res, 401, { error: 'Missing bearer token' });

  const { user, error: userError } = await getAuthedUser({ anonClient, accessToken });
  if (userError || !user?.id || !user?.email) return json(res, 401, { error: 'Invalid auth token' });

  const rsvpId =
    getQueryParam(req, 'rsvp_id') ||
    getQueryParam(req, 'rsvpId') ||
    getQueryParam(req, 'id');

  if (!rsvpId) return json(res, 400, { error: 'Missing rsvp_id' });

  const ip = getRequestIp(req);
  const rl = await bestEffortRateLimit({
    serviceClient,
    bucketKey: `ticketqr:${user.id}:${ip || 'noip'}:${minuteBucket()}`,
    userId: user.id,
    ip,
    windowSeconds: 60,
    maxRequests: 60,
  });

  if (rl.allowed === false) {
    return json(res, 429, { error: 'Rate limit exceeded', remaining: rl.remaining ?? 0 });
  }

  const { data: rsvp, error: rsvpError } = await serviceClient
    .from('event_rsvps')
    .select('id, user_email, event_id, status')
    .eq('id', rsvpId)
    .maybeSingle();

  if (rsvpError) {
    return json(res, 500, { error: 'Failed to load RSVP', details: rsvpError.message });
  }

  if (!rsvp?.id) return json(res, 404, { error: 'RSVP not found' });
  if (String(rsvp.user_email || '').toLowerCase() !== String(user.email).toLowerCase()) {
    return json(res, 403, { error: 'Forbidden' });
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const expSeconds = nowSeconds + 60 * 60 * 24 * 30; // 30 days

  const payload = {
    v: 1,
    typ: 'event_rsvp',
    rsvp_id: String(rsvp.id),
    event_id: String(rsvp.event_id),
    user_email: String(rsvp.user_email),
    iat: nowSeconds,
    exp: expSeconds,
    nonce: randomNonce(8),
  };

  const ticket = signTicket({ secret, payload });

  // Store best-effort for debugging / offline inspection.
  try {
    await serviceClient.from('event_rsvps').update({ ticket_qr: ticket }).eq('id', rsvp.id);
  } catch {
    // ignore
  }

  return json(res, 200, {
    ticket,
    rsvp: {
      id: rsvp.id,
      event_id: rsvp.event_id,
      status: rsvp.status,
    },
    signing: { source },
  });
}
