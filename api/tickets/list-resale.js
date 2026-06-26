/**
 * POST   /api/tickets/list-resale   Body: { ticket_id, resale_price }   → list for resale
 * DELETE /api/tickets/list-resale   Body: { ticket_id }                 → remove listing
 *   (POST with { ticket_id, unlist: true } also removes a listing.)
 *
 * Safe in-app, buyer-to-buyer resale listing.
 *
 * ticket_orders RLS only permits service-role writes, so the listing must go
 * through this endpoint (a client-side update silently no-ops). Safety rules:
 *   - caller must own the ticket
 *   - ticket must be live (issued/valid) and not already scanned/void
 *   - the pool must allow resale (resale_allowed)
 *   - ANTI-TOUTING: resale_price must be > 0 and <= face value (price_paid).
 *     No markup — you can recoup what you paid, never profit.
 *
 * The transfer itself (on a buyer's resale purchase) is handled by
 * match_resale_ticket: it voids the seller's QR and reissues a fresh one to the
 * buyer, so a sold ticket can never be used twice.
 */
import { getSupabaseServerClients, getBearerToken, getAuthedUser, json } from '../routing/_utils.js';

const LISTABLE_STATES = ['issued', 'valid'];

export default async function handler(req, res) {
  const method = (req.method || 'POST').toUpperCase();
  if (!['POST', 'DELETE'].includes(method)) {
    res.setHeader('Allow', 'POST, DELETE');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const { error: cfgErr, anonClient, serviceClient } = getSupabaseServerClients();
  if (cfgErr || !serviceClient) return json(res, 500, { error: cfgErr || 'Service role key missing' });

  const accessToken = getBearerToken(req);
  if (!accessToken) return json(res, 401, { error: 'Missing bearer token' });
  const { user, error: userErr } = await getAuthedUser({ anonClient, accessToken });
  if (userErr || !user?.id) return json(res, 401, { error: 'Invalid auth token' });

  const body = req.body ?? {};
  const { ticket_id } = body;
  if (!ticket_id) return json(res, 400, { error: 'Missing ticket_id' });

  // Load the ticket + pool resale policy.
  const { data: ticket, error: tErr } = await serviceClient
    .from('ticket_orders')
    .select('id, user_id, ticket_state, price_paid, resale_price, ticket_inventory_pools:inventory_pool_id (resale_allowed)')
    .eq('id', ticket_id)
    .maybeSingle();
  if (tErr || !ticket) return json(res, 404, { error: 'Ticket not found' });
  if (ticket.user_id !== user.id) return json(res, 403, { error: 'Not your ticket' });

  const unlist = method === 'DELETE' || body.unlist === true;

  if (unlist) {
    const { error } = await serviceClient
      .from('ticket_orders')
      .update({ resale_price: null, updated_at: new Date().toISOString() })
      .eq('id', ticket_id);
    if (error) return json(res, 500, { error: 'Could not remove listing', detail: error.message });
    return json(res, 200, { listed: false });
  }

  // ── List for resale ──
  if (!LISTABLE_STATES.includes(ticket.ticket_state)) {
    return json(res, 400, { error: 'This ticket can no longer be listed (already used, transferred, or expired).' });
  }
  if (!ticket.ticket_inventory_pools?.resale_allowed) {
    return json(res, 400, { error: 'Resale is not allowed for this event.' });
  }
  const face = Number(ticket.price_paid);
  if (!Number.isFinite(face) || face <= 0) {
    return json(res, 400, { error: 'Only paid tickets can be resold.' });
  }
  const price = Number(body.resale_price);
  if (!Number.isFinite(price) || price <= 0) {
    return json(res, 400, { error: 'Enter a valid resale price.' });
  }
  if (price > face) {
    return json(res, 400, {
      error: `Resale is capped at face value (£${face.toFixed(2)}). HOTMESS does not allow ticket touting.`,
      max_price: face,
    });
  }

  const { error } = await serviceClient
    .from('ticket_orders')
    .update({ resale_price: price, updated_at: new Date().toISOString() })
    .eq('id', ticket_id);
  if (error) return json(res, 500, { error: 'Could not list ticket', detail: error.message });

  return json(res, 200, { listed: true, resale_price: price, max_price: face });
}
