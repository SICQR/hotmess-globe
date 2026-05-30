/**
 * POST /api/beta/redeem
 *
 * Claim a beta access code → sets profiles.beta_access_until = now() + 14 days
 * (extends from existing window if user already has active beta).
 *
 * Phil 2026-05-27 — 250-user 2-week cohort.
 *
 * Auth: Bearer token required.
 * Body: { code: string }
 * Returns:
 *   200 { ok: true, beta_access_until }
 *   400 { error: 'invalid_code' | 'code_exhausted' | 'code_expired' | 'code_required' }
 *   401 { error: 'unauthenticated' }
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = (SUPABASE_URL && SERVICE_KEY)
  ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!admin) return res.status(500).json({ error: 'server_misconfigured' });

  const auth = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!auth) return res.status(401).json({ error: 'unauthenticated' });

  const { data: { user }, error: authErr } = await admin.auth.getUser(auth);
  if (authErr || !user) return res.status(401).json({ error: 'invalid_token' });

  const body = (typeof req.body === 'object' && req.body) ? req.body : {};
  const raw = String(body.code || '').trim();
  if (!raw) return res.status(400).json({ error: 'code_required' });

  // Normalize: uppercase, trim trailing dashes
  const code = raw.toUpperCase().replace(/\s+/g, '');

  // Call the atomic claim function defined in the migration.
  const { data, error } = await admin.rpc('claim_beta_code', {
    p_code: code,
    p_user_id: user.id,
  });

  if (error) {
    console.error('[beta/redeem] rpc error:', error.message);
    return res.status(500).json({ error: 'claim_failed', detail: error.message });
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.ok) {
    return res.status(400).json({ error: row?.message || 'invalid_code' });
  }

  // Best-effort welcome event for funnel attribution.
  try {
    await admin.from('analytics_events').insert({
      user_id: user.id,
      event_name: 'beta_redeemed',
      category: 'beta',
      label: code,
      properties: {
        code,
        beta_access_until: row.beta_access_until,
      },
    });
  } catch (_e) { /* analytics never blocks UX */ }

  return res.status(200).json({
    ok: true,
    beta_access_until: row.beta_access_until,
    days_remaining: 14,
  });
}
