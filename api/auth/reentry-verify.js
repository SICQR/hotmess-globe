/**
 * POST /api/auth/reentry-verify
 *
 * Validates a reentry token (HMAC-SHA256 against REENTRY_SECRET) and returns
 * basic profile info for the /reentry page to render the apology + AgeGate.
 * Does NOT consume the token — consumption happens at flow completion via
 * /api/auth/reentry-complete.
 *
 * Token format (same shape as portal tokens, PR #262):
 *   <profileId>.<hex(hmacSHA256(profileId, REENTRY_SECRET))>
 *
 * Body:  { token: string }
 * 200:   { ok: true, profile: { id, display_name, age_verified,
 *           current_founding_status }, next_available_slot: 'original_50'|'founding'|'early' }
 * 400:   { ok: false, error: 'invalid_token' | 'expired' | 'consumed' | 'profile_not_found' }
 * 500:   { ok: false, error: 'MISSING_REENTRY_SECRET' | ... }
 */
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function send(res, status, body) {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).end(JSON.stringify(body));
}

function verifySignature(profileId, sig, secret) {
  const expected = crypto.createHmac('sha256', secret).update(profileId).digest('hex');
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method_not_allowed' });

  const secret = process.env.REENTRY_SECRET;
  if (!secret || secret.length < 32) {
    return send(res, 500, { ok: false, error: 'MISSING_REENTRY_SECRET' });
  }

  const { token } = req.body || {};
  if (!token || typeof token !== 'string') {
    return send(res, 400, { ok: false, error: 'invalid_token' });
  }

  const [profileId, sig] = token.split('.');
  if (!profileId || !sig || !UUID_RE.test(profileId)) {
    return send(res, 400, { ok: false, error: 'invalid_token' });
  }

  if (!verifySignature(profileId, sig, secret)) {
    return send(res, 400, { ok: false, error: 'invalid_token' });
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return send(res, 500, { ok: false, error: 'SUPABASE_ADMIN_NOT_CONFIGURED' });
  const sb = createClient(url, key);

  // Token state: any consumed token for this profile means done
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const { data: tokenRow } = await sb
    .from('reentry_tokens')
    .select('id, expires_at, consumed_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (tokenRow?.consumed_at) {
    return send(res, 400, { ok: false, error: 'consumed' });
  }
  if (tokenRow?.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    return send(res, 400, { ok: false, error: 'expired' });
  }

  const { data: profile, error } = await sb
    .from('profiles')
    .select('id, display_name, age_verified, founding_status, username')
    .eq('id', profileId)
    .maybeSingle();
  if (error || !profile) {
    return send(res, 400, { ok: false, error: 'profile_not_found' });
  }

  // Best-effort next-available preview (informational; the actual slot is
  // decided atomically at /reentry-complete by the RPC under FOR UPDATE)
  const [o50, fnd] = await Promise.all([
    sb.from('profiles').select('id', { count: 'exact', head: true }).eq('founding_status', 'original_50'),
    sb.from('profiles').select('id', { count: 'exact', head: true }).eq('founding_status', 'founding'),
  ]);
  const o50Count = o50.count ?? 0;
  const fndCount = fnd.count ?? 0;
  const next = o50Count < 50 ? 'original_50' : fndCount < 115 ? 'founding' : 'early';

  return send(res, 200, {
    ok: true,
    profile: {
      id: profile.id,
      display_name: profile.display_name,
      age_verified: !!profile.age_verified,
      current_founding_status: profile.founding_status,
      username: profile.username,
    },
    next_available_slot: next,
  });
}
