/**
 * POST /api/operator/end-event
 * Sets event momentum to WINDING_DOWN and expires all the operator's active
 * beacons (except the momentum beacon itself).
 * Body: { venue_id, event_id? }
 * Confirmation level: HIGH
 * Flag: v6_night_operator_panel
 *
 * Owner-keyed + schema-valid per Operator Cockpit Doctrine (2026-06-24).
 * Momentum role lives in metadata.role (not beacon_category); intensity is an
 * INTEGER (WINDING_DOWN = 4). No phantom columns; no `.catch()` on query
 * builders (they are thenables, not Promises — `.catch` throws).
 */
import { randomUUID } from 'node:crypto';
import { verifyOperator, supabaseAdmin } from './_verify.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { venue_id, event_id } = req.body;
  if (!venue_id) return res.status(400).json({ error: 'venue_id required' });

  const ctx = await verifyOperator(req, res, venue_id);
  if (!ctx) return;
  const ownerId = ctx.user.id;
  const now = new Date().toISOString();

  // Current momentum beacon (owner-keyed; role in metadata).
  const { data: momentumBeacon } = await supabaseAdmin
    .from('beacons')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('metadata->>role', 'momentum')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Expire all the operator's active beacons except the momentum beacon.
  let expireQ = supabaseAdmin
    .from('beacons')
    .update({ status: 'expired', ends_at: now })
    .eq('owner_id', ownerId)
    .eq('status', 'active');
  if (momentumBeacon?.id) expireQ = expireQ.neq('id', momentumBeacon.id);
  const { count: expiredBeacons } = await expireQ.select('id', { count: 'exact' });

  // Wind the momentum down (intensity 4 = WINDING_DOWN), or create one.
  if (momentumBeacon?.id) {
    await supabaseAdmin
      .from('beacons')
      .update({ intensity: 4, title: 'WINDING_DOWN', updated_at: now })
      .eq('id', momentumBeacon.id);
  } else {
    await supabaseAdmin.from('beacons').insert({
      code: `mom-${randomUUID().slice(0, 8)}`,
      type: 'event',
      owner_id: ownerId,
      venue_id: venue_id || null,
      title: 'WINDING_DOWN',
      status: 'active',
      beacon_category: 'event',
      intensity: 4,
      ends_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2h
      metadata: { role: 'momentum', state: 'WINDING_DOWN', event_id: event_id || null },
    });
  }

  // Update event status if provided (non-fatal — result intentionally ignored).
  if (event_id) {
    await supabaseAdmin
      .from('events')
      .update({ status: 'ended', updated_at: now })
      .eq('id', event_id);
  }

  await supabaseAdmin.from('operator_audit_log').insert({
    user_id: ownerId, venue_id, event_id: event_id || null,
    action_type: 'end_event', scope: event_id ? 'event' : 'venue',
    payload: { beacons_expired: expiredBeacons ?? 0 },
    outcome: 'success',
  });

  res.status(200).json({ ended: true, beacons_expired: expiredBeacons ?? 0 });
}
