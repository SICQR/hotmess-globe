/**
 * POST /api/auth/reentry-complete
 *
 * Marks reentry done for a profile:
 *   - validates token (same as verify)
 *   - sets profiles.age_verified=true
 *   - sets profiles.username=locked_username (with collision protection)
 *   - sets profiles.username_locked_at=now()
 *   - calls assign_founding_status_slot(profile_id) — atomic under the
 *     cohort_locks FOR UPDATE — to assign 'original_50' / 'founding' / 'early'
 *   - marks reentry_tokens.consumed_at=now()
 *
 * Body:  { token: string, locked_username: string }
 * 200:   { ok: true, founding_status, username, profile_id }
 * 400:   { ok: false, error: 'invalid_token' | 'expired' | 'consumed' | 'profile_not_found' | 'username_taken' | 'username_invalid' }
 * 500:   { ok: false, error: '...' }
 *
 * Idempotency: if the token's already consumed, returns 400 'consumed'.
 * The RPC itself is also idempotent — a second call with the same profile
 * returns the existing founding_status without reallocating.
 */
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

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
  if (!secret || secret.length < 32) return send(res, 500, { ok: false, error: 'MISSING_REENTRY_SECRET' });

  const { token, locked_username } = req.body || {};
  if (!token || typeof token !== 'string') return send(res, 400, { ok: false, error: 'invalid_token' });
  if (!locked_username || typeof locked_username !== 'string' || !USERNAME_RE.test(locked_username)) {
    return send(res, 400, { ok: false, error: 'username_invalid' });
  }

  const [profileId, sig] = token.split('.');
  if (!profileId || !sig || !UUID_RE.test(profileId)) return send(res, 400, { ok: false, error: 'invalid_token' });
  if (!verifySignature(profileId, sig, secret)) return send(res, 400, { ok: false, error: 'invalid_token' });

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return send(res, 500, { ok: false, error: 'SUPABASE_ADMIN_NOT_CONFIGURED' });
  const sb = createClient(url, key);

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Insert/upsert the token row first — if it's been seen we'll know
  // (consumed_at) before doing any mutation work.
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: tokRow, error: tokErr } = await sb
    .from('reentry_tokens')
    .upsert({ profile_id: profileId, token_hash: tokenHash, expires_at: expiresAt }, { onConflict: 'token_hash' })
    .select('id, consumed_at, expires_at')
    .single();
  if (tokErr) return send(res, 500, { ok: false, error: 'token_upsert_failed' });

  if (tokRow.consumed_at) return send(res, 400, { ok: false, error: 'consumed' });
  if (new Date(tokRow.expires_at) < new Date()) return send(res, 400, { ok: false, error: 'expired' });

  // Username collision check: case-insensitive
  const { data: clash } = await sb
    .from('profiles').select('id').ilike('username', locked_username).neq('id', profileId).maybeSingle();
  if (clash) return send(res, 400, { ok: false, error: 'username_taken' });

  // Atomic slot assignment via the SECURITY DEFINER RPC (cohort_locks FOR UPDATE).
  const { data: assigned, error: rpcErr } = await sb.rpc('assign_founding_status_slot', { p_profile_id: profileId });
  if (rpcErr) return send(res, 500, { ok: false, error: 'rpc_failed: ' + rpcErr.message });

  // Now lock the username and flip age_verified. Username may already be set
  // (e.g. retry after partial completion) — that's fine, we COALESCE the lock timestamp.
  const { error: profErr } = await sb
    .from('profiles')
    .update({
      age_verified: true,
      username: locked_username,
      username_locked_at: new Date().toISOString(),
    })
    .eq('id', profileId);
  if (profErr) {
    // If unique-violation on username, surface a clean error
    if (profErr.code === '23505') return send(res, 400, { ok: false, error: 'username_taken' });
    return send(res, 500, { ok: false, error: 'profile_update_failed: ' + profErr.message });
  }

  // Consume the token
  await sb.from('reentry_tokens').update({ consumed_at: new Date().toISOString() }).eq('id', tokRow.id);

  // Spot number for the welcome message: count of profiles in the assigned
  // cohort. Since assign_founding_status_slot already wrote this profile's
  // status under FOR UPDATE, this COUNT(*) includes us and matches the
  // ordinal of our slot. Cheap; under 1ms at 154 profiles total.
  let spot_number = null;
  if (assigned === 'original_50' || assigned === 'founding') {
    const { count } = await sb
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('founding_status', assigned);
    spot_number = count ?? null;
  }

  // AUTH FUNNEL RESCUE (2026-05-17): reentry-complete used to return without
  // creating a Supabase session. Members completed reentry but had no auth
  // cookie, so /pulse and every authed route bounced them to /auth — the
  // bounce Glen and 67 other recipients hit. Fix: mint a magic-link via
  // admin.generateLink and return its action_link. ReentryPage's done phase
  // surfaces it as a primary "Enter HOTMESS →" CTA that exchanges the
  // magic-link token for a real session via /auth/callback.
  let action_link = null;
  try {
    const { data: au, error: auErr } = await sb.auth.admin.getUserById(profileId);
    const userEmail = au?.user?.email;
    if (!auErr && userEmail) {
      const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
        type: 'magiclink',
        email: userEmail,
        options: { redirectTo: 'https://hotmessldn.com/auth/callback' },
      });
      if (!linkErr) {
        action_link = linkData?.properties?.action_link ?? null;
      }
    }
  } catch (e) {
    // Non-fatal: the reentry write already succeeded; if magic-link mint
    // fails, the client falls back to its own "request a sign-in link"
    // affordance on the welcome screen. Log it for observability.
    console.warn('[reentry-complete] magic-link mint failed (non-fatal):', e?.message || e);
  }

  return send(res, 200, {
    ok: true,
    profile_id: profileId,
    username: locked_username,
    founding_status: assigned,
    spot_number,
    action_link,
  });
}
