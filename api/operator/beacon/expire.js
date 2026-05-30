/**
 * POST /api/operator/beacon/expire
 * Expire a specific beacon (must match venue_id).
 * Body: { venue_id, beacon_id }
 * Confirmation level: LOW
 * Flag: v6_night_operator_panel
 */
import { verifyOperator, supabaseAdmin } from '../_verify.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { venue_id, beacon_id } = req.body;
  if (!venue_id || !beacon_id) {
    return res.status(400).json({ error: 'venue_id, beacon_id required' });
  }

  const ctx = await verifyOperator(req, res, venue_id);
  if (!ctx) return;

  // Verify beacon belongs to this venue
  const { data: beacon } = await supabaseAdmin
    .from('beacons')
    .select('id, venue_id, status')
    .eq('id', beacon_id)
    .single();

  if (!beacon || beacon.venue_id !== venue_id) {
    return res.status(404).json({ error: 'Beacon not found for this venue' });
  }

  if (beacon.status !== 'active') {
    return res.status(400).json({ error: 'Beacon is not active' });
  }

  const { error } = await supabaseAdmin
    .from('beacons')
    .update({ status: 'expired', ends_at: new Date().toISOString() })
    .eq('id', beacon_id);

  if (error) return res.status(500).json({ error: 'Failed to expire beacon' });

  await supabaseAdmin.from('operator_audit_log').insert({
    user_id: ctx.user.id, venue_id,
    action_type: 'beacon_expire', scope: 'venue',
    payload: { beacon_id },
    outcome: 'success',
  });

  res.status(200).json({ expired: true });
}
