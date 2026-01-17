import { createClient } from '@supabase/supabase-js';
import { getBearerToken, getEnv, json, readJsonBody } from '../shopify/_utils.js';
import { createSupabaseClients } from '../events/_admin.js';
import { bestEffortRateLimit, minuteBucket } from '../_rateLimit.js';
import { getRequestIp } from '../routing/_utils.js';

const normalizeCode = (value) => String(value || '').trim();

const parseBeaconIdFromCode = (raw) => {
  const code = normalizeCode(raw);
  if (!code) return null;

  // Allow passing the UUID directly.
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(code)) {
    return code;
  }

  // Legacy prefixes.
  const legacy = code.match(/^(?:BEACON-|beacon:)([0-9a-f-]{36})$/i);
  if (legacy?.[1]) return legacy[1];

  // Deep links like: https://.../_/go/beacon/<id>
  try {
    const url = new URL(code);
    const parts = url.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((p) => p === '_');
    if (idx >= 0 && parts[idx + 1] === 'go' && parts[idx + 2] === 'beacon' && parts[idx + 3]) {
      const candidate = parts[idx + 3];
      if (/^[0-9a-f-]{36}$/i.test(candidate)) return candidate;
    }
  } catch {
    // not a URL
  }

  // JSON payloads (future-proof): {"beacon_id":"..."}
  if (code.startsWith('{') && code.endsWith('}')) {
    try {
      const parsed = JSON.parse(code);
      const candidate = parsed?.beacon_id || parsed?.beaconId;
      if (typeof candidate === 'string' && /^[0-9a-f-]{36}$/i.test(candidate)) return candidate;
    } catch {
      // ignore
    }
  }

  return null;
};

const createAuthedClient = ({ supabaseUrl, supabaseAnonKey, accessToken }) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', ['VITE_SUPABASE_ANON_KEY']);
  const supabaseServiceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    return json(res, 500, {
      error: 'Supabase server env not configured',
      details: 'Set SUPABASE_URL and SUPABASE_ANON_KEY in server env.',
    });
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return json(res, 401, { error: 'Missing Authorization bearer token' });
  }

  const body = (await readJsonBody(req)) || {};
  const code = normalizeCode(body.code || body.qr || body.value);
  const beaconId = normalizeCode(body.beacon_id || body.beaconId) || parseBeaconIdFromCode(code);

  if (!beaconId) {
    return json(res, 400, { error: 'Missing or invalid beacon id/code' });
  }

  const authedClient = createAuthedClient({ supabaseUrl, supabaseAnonKey, accessToken });
  const { data: userData, error: userErr } = await authedClient.auth.getUser();
  if (userErr || !userData?.user?.email) {
    return json(res, 401, { error: 'Invalid auth token' });
  }

  // Best-effort DB-backed rate limiting (prevents spam writes).
  // If service role isn't configured (common in local dev), skip.
  const { serviceClient } = supabaseServiceRoleKey
    ? createSupabaseClients({
        supabaseUrl,
        supabaseAnonKey,
        supabaseServiceRoleKey,
      })
    : { serviceClient: null };

  const ip = getRequestIp(req);
  const userId = userData?.user?.id || null;
  const rlKey = `scan:${userId || 'nouser'}:${ip || 'noip'}:${minuteBucket()}`;
  const rl = await bestEffortRateLimit({
    serviceClient,
    bucketKey: rlKey,
    userId,
    ip,
    windowSeconds: 60,
    maxRequests: 20,
  });

  if (rl.allowed === false) {
    return json(res, 429, { error: 'Rate limit exceeded', remaining: rl.remaining ?? 0 });
  }

  const email = userData.user.email;
  const dedupeKey = `scan:${email}:${beaconId}:${minuteBucket()}`;

  const getBeaconById = async (table) => {
    const { data, error } = await authedClient
      .from(table)
      .select('id, title, kind, mode, xp_scan, status, active')
      .eq('id', beaconId)
      .maybeSingle();
    return { data, error };
  };

  // Fetch beacon (public/published/active per RLS policies).
  let beacon = null;
  {
    const candidates = ['Beacon', 'beacons'];
    let lastError = null;
    for (const table of candidates) {
      const { data, error } = await getBeaconById(table);
      if (!error && data?.id) {
        beacon = data;
        break;
      }
      lastError = error;
    }

    if (!beacon?.id) {
      return json(res, 404, { error: 'Beacon not found', details: lastError?.message });
    }
  }

  // Dedupe: prevent farming scans of the same beacon.
  const { data: existing } = await authedClient
    .from('beacon_checkins')
    .select('id, created_at')
    .eq('user_email', email)
    .eq('beacon_id', beacon.id)
    .order('created_at', { ascending: false })
    .limit(1);

  const last = Array.isArray(existing) ? existing[0] : null;
  if (last?.created_at) {
    const lastMs = new Date(last.created_at).getTime();
    if (Number.isFinite(lastMs) && Date.now() - lastMs < 12 * 60 * 60 * 1000) {
      return json(res, 409, { error: 'Already scanned recently' });
    }
  }

  const earnedXp = Number.isFinite(Number(beacon.xp_scan)) ? Number(beacon.xp_scan) : 0;

  // Record check-in first (idempotent under concurrent requests).
  const { data: checkin, error: checkinErr } = await authedClient
    .from('beacon_checkins')
    .insert({
      user_email: email,
      beacon_id: beacon.id,
      beacon_title: beacon.title,
      created_by: email,
      dedupe_key: dedupeKey,
    })
    .select()
    .maybeSingle();

  if (checkinErr) {
    const code = String(checkinErr?.code || '').toUpperCase();
    if (code === '23505') {
      return json(res, 409, { error: 'Already scanned recently' });
    }
    return json(res, 500, { error: 'Failed to record check-in', details: checkinErr.message });
  }

  // Update user XP (email-owned row).
  let newXp = null;
  try {
    const candidates = ['User', 'users'];
    for (const table of candidates) {
      const { data: userRow, error: readErr } = await authedClient
        .from(table)
        .select('xp')
        .eq('email', email)
        .maybeSingle();

      if (readErr) continue;

      const currentXp = Number.isFinite(Number(userRow?.xp)) ? Number(userRow.xp) : 0;
      newXp = currentXp + earnedXp;

      const { error: updateErr } = await authedClient
        .from(table)
        .update({ xp: newXp })
        .eq('email', email);

      if (!updateErr) break;
    }
  } catch {
    // Best-effort; still record checkin and interaction.
  }

  // Record interaction for analytics.
  try {
    await authedClient.from('user_interactions').insert({
      user_email: email,
      interaction_type: 'scan',
      beacon_id: beacon.id,
      beacon_kind: beacon.kind,
      beacon_mode: beacon.mode,
      metadata: {
        source: body.source || 'scan',
        code: code || null,
      },
      created_by: email,
    });
  } catch {
    // ignore
  }

  // XP ledger entry (best-effort).
  try {
    await authedClient.from('xp_ledger').insert({
      user_email: email,
      amount: earnedXp,
      transaction_type: 'scan',
      reference_id: String(beacon.id),
      reference_type: 'beacon',
      balance_after: newXp,
      created_by: email,
    });
  } catch {
    // ignore
  }

  return json(res, 200, {
    ok: true,
    beacon: {
      id: beacon.id,
      title: beacon.title,
      kind: beacon.kind,
      mode: beacon.mode,
    },
    checkin: checkin ? { id: checkin.id, created_at: checkin.created_at } : null,
    earned_xp: earnedXp,
    new_xp: newXp,
  });
}
