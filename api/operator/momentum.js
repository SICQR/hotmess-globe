/**
 * POST /api/operator/momentum
 * Advance event momentum state. Cannot go backwards.
 * Body: { new_state, venue_id?, event_id? }
 * Confirmation level: MEDIUM (PEAK advance) / LOW (others)
 * States: EARLY(1) → LIVE(2) → PEAK(3) → WINDING_DOWN(4)
 * Flag: v6_night_operator_panel
 *
 * Schema-valid + owner-keyed per Operator Cockpit Doctrine (2026-06-24).
 * "momentum" is not a beacons.type/beacon_category value — role lives in
 * metadata.role; the row is type='event', beacon_category='event'.
 * intensity is INTEGER, so states map to 1..4 (was fractional).
 */
import { randomUUID } from 'node:crypto';
import { verifyOperatorOrOwner, supabaseAdmin } from './_verify.js';

const MOMENTUM_STATES = { EARLY: 1, LIVE: 2, PEAK: 3, WINDING_DOWN: 4 };
const STATE_ORDER = ['EARLY', 'LIVE', 'PEAK', 'WINDING_DOWN'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { new_state, venue_id = null, event_id = null } = req.body;
  if (!new_state) return res.status(400).json({ error: 'new_state required' });
  if (!MOMENTUM_STATES[new_state]) {
    return res.status(400).json({ error: `new_state must be one of: ${STATE_ORDER.join(', ')}` });
  }

  const ctx = await verifyOperatorOrOwner(req, res, venue_id);
  if (!ctx) return;
  const ownerId = ctx.user.id;

  // Get current momentum beacon (owner-keyed).
  const { data: current } = await supabaseAdmin
    .from('beacons')
    .select('id, intensity')
    .eq('owner_id', ownerId)
    .eq('metadata->>role', 'momentum')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const currentIntensity = current?.intensity ?? 1;
  const newIntensity = MOMENTUM_STATES[new_state];

  // Validate forward-only progression
  if (current && newIntensity <= currentIntensity) {
    await supabaseAdmin.from('operator_audit_log').insert({
      user_id: ownerId, venue_id, action_type: 'momentum_advance', scope: event_id ? 'event' : 'venue',
      payload: { new_state, new_intensity: newIntensity, current_intensity: currentIntensity },
      outcome: 'denied',
    });
    return res.status(400).json({ error: 'Cannot go backwards — momentum is forward-only' });
  }

  if (current) {
    await supabaseAdmin
      .from('beacons')
      .update({ intensity: newIntensity, updated_at: new Date().toISOString() })
      .eq('id', current.id);
  } else {
    await supabaseAdmin.from('beacons').insert({
      code: `mom-${randomUUID().slice(0, 8)}`,
      type: 'event',
      owner_id: ownerId,
      venue_id: venue_id || null,
      title: new_state,
      status: 'active',
      beacon_category: 'event',
      intensity: newIntensity,
      ends_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12h
      metadata: { role: 'momentum', state: new_state, event_id: event_id || null },
    });
  }

  await supabaseAdmin.from('operator_audit_log').insert({
    user_id: ownerId, venue_id, action_type: 'momentum_advance', scope: event_id ? 'event' : 'venue',
    payload: { new_state, new_intensity: newIntensity, previous_intensity: currentIntensity },
    outcome: 'success',
  });

  res.status(200).json({ state: new_state, intensity: newIntensity });
}
