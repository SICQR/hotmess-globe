/**
 * POST /api/operator/system-beacon
 * Push a system beacon (1 per venue, 30-min cooldown).
 * VENUE role or admin only.
 * Body: { venue_id, title, duration_minutes?, event_id? }
 * Confirmation level: MEDIUM
 * Flag: v6_night_operator_panel
 */
import { verifyOperator, supabaseAdmin } from '../_verify.js';

const COOLDOWN_MS = 30 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { venue_id, title, duration_minutes = 60, event_id } = req.body;
  if (!venue_id || !title) {
    return res.status(400).json({ error: 'venue_id, title required' });
  }

  const ctx = await verifyOperator(req, res, venue_id);
  if (!ctx) return;

  // VENUE role or admin required
  if (!ctx.isAdmin && ctx.operatorRow?.role !== 'manager' && ctx.operatorRow?.role !== 'safety') {
    if (ctx.operatorRow?.role === 'operator') {
      await supabaseAdmin.from('operator_audit_log').insert({
        user_id: ctx.user.id, venue_id, action_type: 'system_beacon_push',
        scope: 'venue', payload: { title }, outcome: 'denied',
      });
      return res.status(403).json({ error: 'VENUE/manager role required for system beacons' });
    }
  }

  // Check cooldown via operator_system_beacons
  let { data: sysRow } = await supabaseAdmin
    .from('operator_system_beacons')
    .select('*')
    .eq('venue_id', venue_id)
    .single()
    .catch(() => ({ data: null }));

  if (sysRow?.last_pushed_at) {
    const since = Date.now() - new Date(sysRow.last_pushed_at).getTime();
    if (since < COOLDOWN_MS) {
      const retry_after = Math.ceil((COOLDOWN_MS - since) / 1000);
      return res.status(429).json({ error: 'Cooldown active', retry_after });
    }
  }

  // Expire previous system beacon if still active
  if (sysRow?.active_beacon_id) {
    await supabaseAdmin
      .from('beacons')
      .update({ status: 'expired', ends_at: new Date().toISOString() })
      .eq('id', sysRow.active_beacon_id);
  }

  const expiresAt = new Date(Date.now() + duration_minutes * 60 * 1000).toISOString();

  const { data: beacon, error } = await supabaseAdmin
    .from('beacons')
    .insert({
      venue_id,
      event_id: event_id || null,
      created_by: ctx.user.id,
      beacon_type: 'system',
      beacon_category: 'system',
      title,
      status: 'active',
      ends_at: expiresAt,
      intensity: 0.8,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Failed to create system beacon' });

  // Upsert tracking row
  await supabaseAdmin.from('operator_system_beacons').upsert({
    venue_id,
    last_pushed_at: new Date().toISOString(),
    active_beacon_id: beacon.id,
    push_count_today: (sysRow?.push_count_today ?? 0) + 1,
  });

  await supabaseAdmin.from('operator_audit_log').insert({
    user_id: ctx.user.id, venue_id, event_id: event_id || null,
    action_type: 'system_beacon_push', scope: 'venue',
    payload: { beacon_id: beacon.id, title, duration_minutes },
    outcome: 'success',
  });

  res.status(200).json({ beacon_id: beacon.id, expires_at: expiresAt });
}
