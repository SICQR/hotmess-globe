/**
 * /api/operator/ticket-pool
 * Create or update a ticket_inventory_pools row for an event the operator runs.
 *
 *   POST   { beacon_id, label, price, inventory_cap?, ticket_type?, fee_rate?, is_active? }  → create
 *   PATCH  { pool_id, label?, price?, inventory_cap?, ticket_type?, is_active? }             → update
 *
 * RLS on ticket_inventory_pools only allows the service role to write, so all
 * vendor pool mutations must go through this endpoint (a client-side update is
 * silently dropped). Authorisation: the caller must own the beacon
 * (beacons.owner_id) or hold a vendor_event_access row for it.
 *
 * Flag: v6_night_operator_panel
 */
import { verifyOperatorOrOwner, supabaseAdmin } from './_verify.js';

// ticket_inventory_pools.ticket_type CHECK
const TICKET_TYPES = new Set(['paid_ga', 'quick_drop', 'guest_comp', 'vip', 'guestlist']);

// HOTMESS standard platform fee (confirmed 2026-06-26). Server-set so operators
// cannot lower it; comps/guestlist are price 0 so the fee is 0 in practice.
const PLATFORM_FEE_RATE = 0.07;

async function canManageBeacon(userId, beaconId) {
  const { data: beacon } = await supabaseAdmin
    .from('beacons')
    .select('id, owner_id')
    .eq('id', beaconId)
    .maybeSingle();
  if (!beacon) return { ok: false, code: 404, error: 'Beacon not found' };
  if (beacon.owner_id === userId) return { ok: true };
  const { data: access } = await supabaseAdmin
    .from('vendor_event_access')
    .select('id')
    .eq('beacon_id', beaconId)
    .eq('vendor_id', userId)
    .maybeSingle();
  if (access) return { ok: true };
  return { ok: false, code: 403, error: 'Not authorised for this event' };
}

const toCap = (v) => (v === null || v === undefined || v === '' ? null : parseInt(v, 10));

export default async function handler(req, res) {
  const ctx = await verifyOperatorOrOwner(req, res, null);
  if (!ctx) return;
  const userId = ctx.user.id;

  // ── Create ────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { beacon_id, label, price, inventory_cap = null, ticket_type = 'paid_ga', fee_rate, is_active = true } = req.body || {};
    if (!beacon_id || !label || price === undefined || price === null || price === '') {
      return res.status(400).json({ error: 'beacon_id, label, price required' });
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) return res.status(400).json({ error: 'price must be a number >= 0' });

    if (!ctx.isAdmin) {
      const auth = await canManageBeacon(userId, beacon_id);
      if (!auth.ok) return res.status(auth.code).json({ error: auth.error });
    }

    const { data, error } = await supabaseAdmin
      .from('ticket_inventory_pools')
      .insert({
        beacon_id,
        ticket_type: TICKET_TYPES.has(ticket_type) ? ticket_type : 'paid_ga',
        label: String(label).trim(),
        price: priceNum,
        fee_rate: PLATFORM_FEE_RATE,
        inventory_cap: toCap(inventory_cap),
        is_active: !!is_active,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to create pool', detail: error.message });
    return res.status(200).json({ pool: data });
  }

  // ── Update ────────────────────────────────────────────────────────────────
  if (req.method === 'PATCH' || req.method === 'PUT') {
    const { pool_id, label, price, inventory_cap, ticket_type, is_active, resale_allowed } = req.body || {};
    if (!pool_id) return res.status(400).json({ error: 'pool_id required' });

    const { data: pool } = await supabaseAdmin
      .from('ticket_inventory_pools')
      .select('id, beacon_id')
      .eq('id', pool_id)
      .maybeSingle();
    if (!pool) return res.status(404).json({ error: 'Pool not found' });

    if (!ctx.isAdmin) {
      const auth = await canManageBeacon(userId, pool.beacon_id);
      if (!auth.ok) return res.status(auth.code).json({ error: auth.error });
    }

    const patch = { updated_at: new Date().toISOString() };
    if (label !== undefined) patch.label = String(label).trim();
    if (price !== undefined && price !== null && price !== '') {
      const p = Number(price);
      if (!Number.isFinite(p) || p < 0) return res.status(400).json({ error: 'price must be a number >= 0' });
      patch.price = p;
    }
    if (inventory_cap !== undefined) patch.inventory_cap = toCap(inventory_cap);
    if (ticket_type !== undefined && TICKET_TYPES.has(ticket_type)) patch.ticket_type = ticket_type;
    if (is_active !== undefined) patch.is_active = !!is_active;
    if (resale_allowed !== undefined) patch.resale_allowed = !!resale_allowed;

    const { data, error } = await supabaseAdmin
      .from('ticket_inventory_pools')
      .update(patch)
      .eq('id', pool_id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to update pool', detail: error.message });
    return res.status(200).json({ pool: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
