/**
 * POST /api/operator/beacon/drop
 * Drop an operator beacon (owner-keyed). Checks slot limit.
 * Body: { type, title, venue_id?, duration_minutes?, event_id? }
 * Confirmation level: LOW (no frontend confirm)
 * Flag: v6_night_operator_panel
 *
 * Owner-keyed per Operator Cockpit Doctrine (2026-06-24): beacons belong to the
 * authenticated operator (owner_id), not a venue. venue_id is optional context.
 */
import { randomUUID } from 'node:crypto';
import { verifyOperatorOrOwner, supabaseAdmin } from '../_verify.js';

const BEACON_LIMITS = { mess: 2, hotmess: 2, connected: 5, promoter: 5, venue: 8 };

// beacons.type CHECK: social|event|drop|market|radio|safety|user
const ALLOWED_TYPES = new Set(['social', 'event', 'drop', 'market', 'radio', 'safety', 'user']);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, title, venue_id = null, duration_minutes = 60, event_id = null } = req.body;
  if (!type || !title) {
    return res.status(400).json({ error: 'type, title required' });
  }

  const ctx = await verifyOperatorOrOwner(req, res, venue_id);
  if (!ctx) return;

  const ownerId = ctx.user.id;
  // Coerce caller type to a schema-valid value; default to event for venue drops.
  const beaconType = ALLOWED_TYPES.has(type) ? type : 'event';

  // Slot limit by tier (membership lookup only meaningful with a venue).
  let limit = 2;
  if (venue_id) {
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('tier')
      .eq('venue_id', venue_id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    limit = BEACON_LIMITS[membership?.tier] ?? 2;
  }

  // Count the operator's currently-active beacons (owner-keyed).
  const { count: activeCount } = await supabaseAdmin
    .from('beacons')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('status', 'active');

  if ((activeCount ?? 0) >= limit) {
    await supabaseAdmin.from('operator_audit_log').insert({
      user_id: ownerId, venue_id, action_type: 'beacon_drop', scope: 'venue',
      payload: { type: beaconType, title, duration_minutes }, outcome: 'denied',
    });
    return res.status(400).json({ error: 'Beacon limit reached', limit });
  }

  const expiresAt = new Date(Date.now() + duration_minutes * 60 * 1000).toISOString();

  const { data: beacon, error } = await supabaseAdmin
    .from('beacons')
    .insert({
      code: `op-${randomUUID().slice(0, 8)}`,
      type: beaconType,
      owner_id: ownerId,
      venue_id: venue_id || null,
      title,
      status: 'active',
      beacon_category: 'venue',
      intensity: 1,
      ends_at: expiresAt,
      metadata: { role: 'venue_drop', event_id: event_id || null, duration_minutes },
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: 'Failed to create beacon', detail: error.message });
  }

  await supabaseAdmin.from('operator_audit_log').insert({
    user_id: ownerId, venue_id, action_type: 'beacon_drop', scope: 'venue',
    payload: { beacon_id: beacon.id, type: beaconType, title, duration_minutes }, outcome: 'success',
  });

  res.status(200).json({ beacon_id: beacon.id, expires_at: expiresAt });
}
