/**
 * POST /api/operator/incentive-beacon
 * Create an incentive beacon with reward metadata.
 * 1 active per operator at a time. VENUE/manager role or admin only.
 * Body: { venue_id, title, reward, duration_minutes?, event_id? }
 * Confirmation level: MEDIUM
 * Flag: v6_night_operator_panel
 *
 * Schema-valid + owner-keyed per Operator Cockpit Doctrine (2026-06-24).
 * "incentive" is not a beacons.type/beacon_category value — the role lives in
 * metadata.role; the row is type='drop', beacon_category='event'.
 */
import { randomUUID } from 'node:crypto';
import { verifyOperator, supabaseAdmin } from './_verify.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { venue_id, title, reward, duration_minutes = 45, event_id = null } = req.body;
  if (!venue_id || !title || !reward) {
    return res.status(400).json({ error: 'venue_id, title, reward required' });
  }

  const ctx = await verifyOperator(req, res, venue_id);
  if (!ctx) return;
  const ownerId = ctx.user.id;

  // VENUE/manager role required
  if (!ctx.isAdmin && ctx.operatorRow?.role === 'operator') {
    await supabaseAdmin.from('operator_audit_log').insert({
      user_id: ownerId, venue_id, action_type: 'incentive_beacon',
      scope: 'venue', payload: { title, reward }, outcome: 'denied',
    });
    return res.status(403).json({ error: 'VENUE/manager role required for incentive beacons' });
  }

  // Only one active incentive beacon per operator.
  const { count: activeIncentives } = await supabaseAdmin
    .from('beacons')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('metadata->>role', 'incentive')
    .eq('status', 'active');

  if ((activeIncentives ?? 0) > 0) {
    return res.status(400).json({ error: 'An incentive beacon is already active' });
  }

  const expiresAt = new Date(Date.now() + duration_minutes * 60 * 1000).toISOString();

  const { data: beacon, error } = await supabaseAdmin
    .from('beacons')
    .insert({
      code: `inc-${randomUUID().slice(0, 8)}`,
      type: 'drop',
      owner_id: ownerId,
      venue_id: venue_id || null,
      title,
      status: 'active',
      beacon_category: 'event',
      intensity: 2,
      ends_at: expiresAt,
      metadata: { role: 'incentive', reward, event_id: event_id || null },
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Failed to create incentive beacon', detail: error.message });

  await supabaseAdmin.from('operator_audit_log').insert({
    user_id: ownerId, venue_id, action_type: 'incentive_beacon', scope: 'venue',
    payload: { beacon_id: beacon.id, title, reward, duration_minutes }, outcome: 'success',
  });

  res.status(200).json({ beacon_id: beacon.id, expires_at: expiresAt });
}
