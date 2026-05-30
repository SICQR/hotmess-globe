/**
 * api/operator/_verify.js
 * Shared auth + operator_venues check. Import in every operator API route.
 *
 * Usage:
 *   const { user, operatorRow, isAdmin } = await verifyOperator(req, res, venue_id);
 *   if (!user) return; // already responded with 401/403
 *
 * For admin-only actions, check isAdmin after calling verifyOperator.
 * For venue-scoped writes without a known venue_id (e.g. global kill switch),
 *   pass null as venue_id and check isAdmin yourself.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

/**
 * @param {import('@vercel/node').VercelRequest}  req
 * @param {import('@vercel/node').VercelResponse} res
 * @param {string|null} venueId  — venue_id to check operator access for. Pass null for admin-only routes.
 * @returns {{ user, operatorRow, isAdmin } | null}  null means already responded.
 */
export async function verifyOperator(req, res, venueId = null) {
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing auth token' });
    return null;
  }
  const token = auth.slice(7);

  // Resolve user from JWT
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) {
    res.status(401).json({ error: 'Invalid auth token' });
    return null;
  }

  // Check admin role
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const isAdmin = profile?.role === 'admin';

  // Admin bypasses operator_venues check
  if (isAdmin) {
    return { user, operatorRow: null, isAdmin: true };
  }

  // Non-admin: must have active operator_venues row for this venue
  if (!venueId) {
    res.status(403).json({ error: 'Admin role required' });
    return null;
  }

  const { data: operatorRow } = await supabaseAdmin
    .from('operator_venues')
    .select('*')
    .eq('user_id', user.id)
    .eq('venue_id', venueId)
    .is('revoked_at', null)
    .single();

  if (!operatorRow) {
    // Log denied attempt — fire and forget
    supabaseAdmin.from('operator_audit_log').insert({
      user_id: user.id,
      venue_id: venueId,
      action_type: 'beacon_drop', // placeholder; caller should log properly
      scope: 'venue',
      payload: { path: req.url },
      outcome: 'denied',
    }).then(() => {}).catch(() => {});

    res.status(403).json({ error: 'Not authorised for this venue' });
    return null;
  }

  return { user, operatorRow, isAdmin: false };
}

export { supabaseAdmin };
