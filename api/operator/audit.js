/**
 * GET /api/operator/audit?venue_id=&limit=10&offset=0
 * Last N audit entries for venue.
 * Operator sees own actions only. Admin sees all.
 * Flag: v6_night_operator_panel
 */
import { verifyOperator, supabaseAdmin } from '../_verify.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { venue_id, limit = '10', offset = '0' } = req.query;
  if (!venue_id) return res.status(400).json({ error: 'venue_id required' });

  const ctx = await verifyOperator(req, res, venue_id);
  if (!ctx) return;

  const limitN = Math.min(parseInt(limit, 10) || 10, 50);
  const offsetN = parseInt(offset, 10) || 0;

  let query = supabaseAdmin
    .from('operator_audit_log')
    .select('id, action_type, scope, payload, outcome, created_at, user_id')
    .eq('venue_id', venue_id)
    .order('created_at', { ascending: false })
    .range(offsetN, offsetN + limitN - 1);

  // Non-admin operators see only their own entries
  if (!ctx.isAdmin) {
    query = query.eq('user_id', ctx.user.id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'Failed to fetch audit log' });

  res.status(200).json({ entries: data ?? [], limit: limitN, offset: offsetN });
}
