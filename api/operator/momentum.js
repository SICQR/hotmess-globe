/**
 * POST /api/operator/momentum
 * Advance event momentum state. Cannot go backwards.
 * Body: { venue_id, new_state, event_id? }
 * Confirmation level: MEDIUM (PEAK advance) / LOW (others)
 * States: EARLY(0.25) → LIVE(0.5) → PEAK(0.75) → WINDING_DOWN(1.0)
 * Flag: v6_night_operator_panel
 */
import { verifyOperator, supabaseAdmin } from './_verify.js';

const MOMENTUM_STATES = {
  EARLY:       0.25,
  LIVE:        0.5,
  PEAK:        0.75,
  WINDING_DOWN: 1.0,
};
const STATE_ORDER = ['EARLY', 'LIVE', 'PEAK', 'WINDING_DOWN'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { venue_id, new_state, event_id } = req.body;
  if (!venue_id || !new_state) {
    return res.status(400).json({ error: 'venue_id, new_state required' });
  }

  if (!MOMENTUM_STATES[new_state]) {
    return res.status(400).json({ error: `new_state must be one of: ${STATE_ORDER.join(', ')}` });
  }

  const ctx = await verifyOperator(req, res, venue_id);
  if (!ctx) return;

  // Get current momentum beacon
  const { data: current } = await supabaseAdmin
    .from('beacons')
    .select('id, intensity')
    .eq('venue_id', venue_id)
    .eq('beacon_category', 'momentum')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
    .catch(() => ({ data: null }));

  const currentIntensity = current?.intensity ?? 0.25;
  const newIntensity = MOMENTUM_STATES[new_state];

  // Validate forward-only progression
  if (newIntensity <= currentIntensity && current) {
    await supabaseAdmin.from('operator_audit_log').insert({
      user_id: ctx.user.id, venue_id, event_id: event_id || null,
      action_type: 'momentum_advance', scope: event_id ? 'event' : 'venue',
      payload: { new_state, new_intensity: newIntensity, current_intensity: currentIntensity },
      outcome: 'denied',
    });
    return res.status(400).json({ error: 'Cannot go backwards — momentum is forward-only' });
  }

  if (current) {
    // Update existing momentum beacon intensity
    await supabaseAdmin
      .from('beacons')
      .update({ intensity: newIntensity, updated_at: new Date().toISOString() })
      .eq('id', current.id);
  } else {
    // Create initial momentum beacon
    await supabaseAdmin.from('beacons').insert({
      venue_id,
      event_id: event_id || null,
      created_by: ctx.user.id,
      beacon_type: 'momentum',
      beacon_category: 'momentum',
      title: new_state,
      status: 'active',
      intensity: newIntensity,
      ends_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12h
    });
  }

  await supabaseAdmin.from('operator_audit_log').insert({
    user_id: ctx.user.id, venue_id, event_id: event_id || null,
    action_type: 'momentum_advance', scope: event_id ? 'event' : 'venue',
    payload: { new_state, new_intensity: newIntensity, previous_intensity: currentIntensity },
    outcome: 'success',
  });

  res.status(200).json({ state: new_state, intensity: newIntensity });
}
