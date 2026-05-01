/**
 * POST /api/operator/zone/update
 * Update zone signal text + intensity for a micro-zone beacon.
 * Body: { venue_id, zone_id, signal, intensity }
 * Confirmation level: LOW
 * Flag: v6_night_operator_panel
 */
import { verifyOperator, supabaseAdmin } from '../_verify.js';

const VALID_SIGNALS = ['busy', 'active', 'quiet', 'empty'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { venue_id, zone_id, signal, intensity } = req.body;
  if (!venue_id || !zone_id || !signal) {
    return res.status(400).json({ error: 'venue_id, zone_id, signal required' });
  }

  if (!VALID_SIGNALS.includes(signal)) {
    return res.status(400).json({ error: `signal must be one of: ${VALID_SIGNALS.join(', ')}` });
  }

  const ctx = await verifyOperator(req, res, venue_id);
  if (!ctx) return;

  // Verify zone beacon belongs to this venue
  const { data: beacon } = await supabaseAdmin
    .from('beacons')
    .select('id, venue_id')
    .eq('id', zone_id)
    .eq('beacon_category', 'zone')
    .single();

  if (!beacon || beacon.venue_id !== venue_id) {
    return res.status(404).json({ error: 'Zone not found for this venue' });
  }

  const { error } = await supabaseAdmin
    .from('beacons')
    .update({
      title: signal.charAt(0).toUpperCase() + signal.slice(1),
      intensity: intensity ?? { busy: 0.9, active: 0.7, quiet: 0.3, empty: 0.1 }[signal],
      updated_at: new Date().toISOString(),
    })
    .eq('id', zone_id);

  if (error) return res.status(500).json({ error: 'Failed to update zone' });

  await supabaseAdmin.from('operator_audit_log').insert({
    user_id: ctx.user.id, venue_id,
    action_type: 'zone_update', scope: 'venue',
    payload: { zone_id, signal, intensity },
    outcome: 'success',
  });

  res.status(200).json({ updated: true });
}
