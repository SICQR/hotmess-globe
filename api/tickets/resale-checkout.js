/**
 * POST /api/tickets/resale-checkout
 *
 * Creates a Stripe Checkout Session for buying a resale ticket from another member.
 *
 * Body: { seller_ticket_id: uuid }
 *
 * Flow:
 *   1. Auth buyer JWT
 *   2. Load seller ticket — must have resale_price set, state in (issued/valid), resale_allowed
 *   3. Age-gate buyer (same as primary purchase)
 *   4. Prevent self-purchase
 *   5. Create Stripe Checkout; metadata.type = 'resale'
 *   6. Return { checkout_url }
 *
 * Webhook handler calls match_resale_ticket on checkout.session.completed.
 */

import Stripe from 'stripe';
import { getSupabaseServerClients, getBearerToken, getAuthedUser, json } from '../routing/_utils.js';

export default async function handler(req, res) {
  if ((req.method || 'POST').toUpperCase() !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const { error, anonClient, serviceClient } = getSupabaseServerClients();
  if (error || !serviceClient) return json(res, 500, { error: error || 'Service role key missing' });

  const accessToken = getBearerToken(req);
  if (!accessToken) return json(res, 401, { error: 'Missing bearer token' });

  const { user, error: userErr } = await getAuthedUser({ anonClient, accessToken });
  if (userErr || !user?.id) return json(res, 401, { error: 'Invalid auth token' });

  const { seller_ticket_id } = req.body ?? {};
  if (!seller_ticket_id) return json(res, 400, { error: 'Missing seller_ticket_id' });

  // 1. Load seller ticket
  const { data: sellerTicket, error: ticketErr } = await serviceClient
    .from('ticket_orders')
    .select(`
      id, user_id, beacon_id, inventory_pool_id, ticket_state,
      resale_price, price_paid,
      ticket_inventory_pools:inventory_pool_id (resale_allowed, label, fee_rate, ticket_type),
      beacons:beacon_id (title, event_start_at)
    `)
    .eq('id', seller_ticket_id)
    .maybeSingle();

  if (ticketErr || !sellerTicket) return json(res, 404, { error: 'Ticket not found' });

  // Validate resale eligibility
  if (!['issued', 'valid'].includes(sellerTicket.ticket_state)) {
    return json(res, 409, { error: 'Ticket not available for resale', code: 'TICKET_NOT_RESELLABLE' });
  }
  if (!sellerTicket.resale_price || Number(sellerTicket.resale_price) <= 0) {
    return json(res, 409, { error: 'Ticket not listed for resale', code: 'NOT_LISTED' });
  }
  if (!sellerTicket.ticket_inventory_pools?.resale_allowed) {
    return json(res, 409, { error: 'Resale not allowed for this ticket type', code: 'RESALE_NOT_ALLOWED' });
  }

  // 2. Prevent self-purchase
  if (sellerTicket.user_id === user.id) {
    return json(res, 409, { error: 'Cannot buy your own ticket', code: 'SELF_PURCHASE' });
  }

  // 3. Age-gate buyer
  const { data: buyerProfile } = await serviceClient
    .from('profiles')
    .select('age_verified, age_verified_at, age_verification_method')
    .eq('id', user.id)
    .maybeSingle();

  if (!buyerProfile?.age_verified || !buyerProfile?.age_verified_at || !buyerProfile?.age_verification_method) {
    return json(res, 403, { error: 'Age verification required', code: 'AGE_VERIFICATION_INCOMPLETE' });
  }

  // 4. Stripe Checkout
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return json(res, 500, { error: 'Stripe not configured' });
  const stripe = new Stripe(stripeKey, { apiVersion: '2026-05-27.dahlia' });

  const resalePricePence = Math.round(Number(sellerTicket.resale_price) * 100);
  const pool = sellerTicket.ticket_inventory_pools;
  const beacon = sellerTicket.beacons;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_APP_URL || 'https://hotmessldn.com';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'gbp',
        unit_amount: resalePricePence,
        product_data: {
          name: `${pool?.label || 'Ticket'} — Resale`,
          description: beacon?.title || 'HOTMESS Event',
        },
      },
    }],
    metadata: {
      type:                       'resale',
      seller_ticket_id:           seller_ticket_id,
      buyer_id:                   user.id,
      beacon_id:                  sellerTicket.beacon_id,
      pool_id:                    sellerTicket.inventory_pool_id,
      age_verified_at:            buyerProfile.age_verified_at,
      age_verification_method:    buyerProfile.age_verification_method,
      fee_rate:                   String(pool?.fee_rate ?? 0),
    },
    success_url: `${appUrl}/?sheet=ticket-market&resale=success`,
    cancel_url:  `${appUrl}/?sheet=ticket-market`,
    expires_at:  Math.floor(Date.now() / 1000) + 30 * 60, // 30 min
  });

  return json(res, 200, { checkout_url: session.url, session_id: session.id });
}
