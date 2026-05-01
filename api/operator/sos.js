/**
 * POST /api/operator/sos
 * SOS broadcast. Safety role or admin only.
 * 1 per event per 30 min.
 * Body: { venue_id, event_id?, message?, radius_m? }
 * Confirmation level: HIGH
 * Flag: v6_night_operator_panel
 */
import { verifyOperator, supabaseAdmin } from '../_verify.js';

const SOS_COOLDOWN_MS = 30 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { venue_id, event_id, message, radius_m = 500 } = req.body;
  if (!venue_id) return res.status(400).json({ error: 'venue_id required' });

  const ctx = await verifyOperator(req, res, venue_id);
  if (!ctx) return;

  // Safety role or admin only
  if (!ctx.isAdmin && ctx.operatorRow?.role !== 'safety') {
    await supabaseAdmin.from('operator_audit_log').insert({
      user_id: ctx.user.id, venue_id, event_id: event_id || null,
      action_type: 'sos_broadcast', scope: 'venue',
      payload: { message }, outcome: 'denied',
    });
    return res.status(403).json({ error: 'Safety role or admin required for SOS broadcast' });
  }

  // Rate limit: 1 per event per 30 min
  if (event_id) {
    const { count: recentSos } = await supabaseAdmin
      .from('operator_audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('action_type', 'sos_broadcast')
      .eq('event_id', event_id)
      .eq('outcome', 'success')
      .gt('created_at', new Date(Date.now() - SOS_COOLDOWN_MS).toISOString());

    if ((recentSos ?? 0) > 0) {
      return res.status(429).json({ error: 'SOS cooldown active (30 min between broadcasts)', retry_after: 1800 });
    }
  }

  // Write safety_broadcasts record
  const { data: broadcast, error: broadcastErr } = await supabaseAdmin
    .from('safety_broadcasts')
    .insert({
      venue_id,
      event_id: event_id || null,
      broadcast_by: ctx.user.id,
      message: message || 'Safety alert from venue staff.',
      radius_m,
    })
    .select()
    .single();

  if (broadcastErr) return res.status(500).json({ error: 'Failed to create broadcast' });

  // Queue push notifications via notification_outbox
  await supabaseAdmin.from('notification_outbox').insert({
    type: 'sos_broadcast',
    status: 'queued',
    payload: {
      venue_id,
      event_id: event_id || null,
      broadcast_id: broadcast.id,
      message: message || 'Safety alert from venue staff.',
      radius_m,
    },
    created_at: new Date().toISOString(),
  });

  await supabaseAdmin.from('operator_audit_log').insert({
    user_id: ctx.user.id, venue_id, event_id: event_id || null,
    action_type: 'sos_broadcast', scope: 'venue',
    payload: { broadcast_id: broadcast.id, message, radius_m },
    outcome: 'success',
  });

  res.status(200).json({ broadcast_id: broadcast.id });
}
