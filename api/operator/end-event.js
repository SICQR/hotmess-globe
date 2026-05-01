/**
 * POST /api/operator/end-event
 * Sets event momentum to WINDING_DOWN, expires all venue beacons.
 * Body: { venue_id, event_id? }
 * Confirmation level: HIGH
 * Flag: v6_night_operator_panel
 */
import { verifyOperator, supabaseAdmin } from '../_verify.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { venue_id, event_id } = req.body;
  if (!venue_id) return res.status(400).json({ error: 'venue_id required' });

  const ctx = await verifyOperator(req, res, venue_id);
  if (!ctx) return;

  const now = new Date().toISOString();

  // Expire all active venue beacons except momentum
  const { count: expiredBeacons } = await supabaseAdmin
    .from('beacons')
    .update({ status: 'expired', ends_at: now })
    .eq('venue_id', venue_id)
    .eq('status', 'active')
    .neq('beacon_category', 'momentum')
    .select('id', { count: 'exact' });

  // Set momentum to WINDING_DOWN (intensity 1.0)
  const { data: momentumBeacon } = await supabaseAdmin
    .from('beacons')
    .select('id')
    .eq('venue_id', venue_id)
    .eq('beacon_category', 'momentum')
    .eq('status', 'active')
    .single()
    .catch(() => ({ data: null }));

  if (momentumBeacon) {
    await supabaseAdmin
      .from('beacons')
      .update({ intensity: 1.0, title: 'WINDING_DOWN', updated_at: now })
      .eq('id', momentumBeacon.id);
  } else {
    // Create winding down beacon if none exists
    await supabaseAdmin.from('beacons').insert({
      venue_id,
      event_id: event_id || null,
      created_by: ctx.user.id,
      beacon_type: 'momentum',
      beacon_category: 'momentum',
      title: 'WINDING_DOWN',
      status: 'active',
      intensity: 1.0,
      ends_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2h
    });
  }

  // Update event status if provided
  if (event_id) {
    await supabaseAdmin
      .from('events')
      .update({ status: 'ended', updated_at: now })
      .eq('id', event_id)
      .catch(() => {}); // non-fatal if events table differs
  }

  await supabaseAdmin.from('operator_audit_log').insert({
    user_id: ctx.user.id, venue_id, event_id: event_id || null,
    action_type: 'end_event', scope: event_id ? 'event' : 'venue',
    payload: { beacons_expired: expiredBeacons ?? 0 },
    outcome: 'success',
  });

  res.status(200).json({ ended: true, beacons_expired: expiredBeacons ?? 0 });
}
