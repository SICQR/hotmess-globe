/**
 * POST /api/operator/beacon/drop
 * Drop a venue beacon. Checks slot limit.
 * Body: { venue_id, type, title, duration_minutes?, event_id? }
 * Confirmation level: LOW (no frontend confirm)
 * Flag: v6_night_operator_panel
 */
import { verifyOperator, supabaseAdmin } from '../_verify.js';

const BEACON_LIMITS = { mess: 2, hotmess: 2, connected: 5, promoter: 5, venue: 8 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { venue_id, type, title, duration_minutes = 60, event_id } = req.body;
  if (!venue_id || !type || !title) {
    return res.status(400).json({ error: 'venue_id, type, title required' });
  }

  const ctx = await verifyOperator(req, res, venue_id);
  if (!ctx) return;

  // Check slot limit
  const { data: membership } = await supabaseAdmin
    .from('memberships')
    .select('tier')
    .eq('venue_id', venue_id)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
    .catch(() => ({ data: null }));

  const limit = BEACON_LIMITS[membership?.tier] ?? 2;

  const { count: activeCount } = await supabaseAdmin
    .from('beacons')
    .select('id', { count: 'exact', head: true })
    .eq('venue_id', venue_id)
    .eq('status', 'active');

  if ((activeCount ?? 0) >= limit) {
    await supabaseAdmin.from('operator_audit_log').insert({
      user_id: ctx.user.id, venue_id, event_id: event_id || null,
      action_type: 'beacon_drop', scope: 'venue',
      payload: { type, title, duration_minutes },
      outcome: 'denied',
    });
    return res.status(400).json({ error: 'Beacon limit reached' });
  }

  const expiresAt = new Date(Date.now() + duration_minutes * 60 * 1000).toISOString();

  const { data: beacon, error } = await supabaseAdmin
    .from('beacons')
    .insert({
      venue_id,
      event_id: event_id || null,
      created_by: ctx.user.id,
      beacon_type: type,
      title,
      status: 'active',
      ends_at: expiresAt,
      beacon_category: 'venue',
      intensity: 0.5,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: 'Failed to create beacon', detail: error.message });
  }

  await supabaseAdmin.from('operator_audit_log').insert({
    user_id: ctx.user.id, venue_id, event_id: event_id || null,
    action_type: 'beacon_drop', scope: 'venue',
    payload: { beacon_id: beacon.id, type, title, duration_minutes },
    outcome: 'success',
  });

  res.status(200).json({ beacon_id: beacon.id, expires_at: expiresAt });
}
