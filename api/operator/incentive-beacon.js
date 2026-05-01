/**
 * POST /api/operator/incentive-beacon
 * Create an incentive beacon with reward metadata.
 * 1 active per venue at a time. VENUE role or admin only.
 * Body: { venue_id, title, reward, duration_minutes?, event_id? }
 * Confirmation level: MEDIUM
 * Flag: v6_night_operator_panel
 */
import { verifyOperator, supabaseAdmin } from '../_verify.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { venue_id, title, reward, duration_minutes = 45, event_id } = req.body;
  if (!venue_id || !title || !reward) {
    return res.status(400).json({ error: 'venue_id, title, reward required' });
  }

  const ctx = await verifyOperator(req, res, venue_id);
  if (!ctx) return;

  // VENUE/manager role required
  if (!ctx.isAdmin && ctx.operatorRow?.role === 'operator') {
    await supabaseAdmin.from('operator_audit_log').insert({
      user_id: ctx.user.id, venue_id, action_type: 'incentive_beacon',
      scope: 'venue', payload: { title, reward }, outcome: 'denied',
    });
    return res.status(403).json({ error: 'VENUE/manager role required for incentive beacons' });
  }

  // Check no active incentive beacon already
  const { count: activeIncentives } = await supabaseAdmin
    .from('beacons')
    .select('id', { count: 'exact', head: true })
    .eq('venue_id', venue_id)
    .eq('beacon_category', 'incentive')
    .eq('status', 'active');

  if ((activeIncentives ?? 0) > 0) {
    return res.status(400).json({ error: 'An incentive beacon is already active for this venue' });
  }

  const expiresAt = new Date(Date.now() + duration_minutes * 60 * 1000).toISOString();

  const { data: beacon, error } = await supabaseAdmin
    .from('beacons')
    .insert({
      venue_id,
      event_id: event_id || null,
      created_by: ctx.user.id,
      beacon_type: 'incentive',
      beacon_category: 'incentive',
      title,
      status: 'active',
      ends_at: expiresAt,
      intensity: 0.85,
      meta: { reward },
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Failed to create incentive beacon' });

  await supabaseAdmin.from('operator_audit_log').insert({
    user_id: ctx.user.id, venue_id, event_id: event_id || null,
    action_type: 'incentive_beacon', scope: 'venue',
    payload: { beacon_id: beacon.id, title, reward, duration_minutes },
    outcome: 'success',
  });

  res.status(200).json({ beacon_id: beacon.id, expires_at: expiresAt });
}
