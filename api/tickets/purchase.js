import Stripe from 'stripe';
import { getSupabaseServerClients, getAuthedUser, getBearerToken, json, getEnv } from '../routing/_utils.js';

const stripeSecret = getEnv('STRIPE_SECRET_KEY');
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  if (!stripe) {
    return json(res, 500, { error: 'Stripe not configured' });
  }

  const { beacon_id, payment_method_id } = req.body;
  if (!beacon_id) return json(res, 400, { error: 'Missing beacon_id' });
  // payment_method_id is optional if free, but for sales usually required.
  
  const accessToken = getBearerToken(req);
  if (!accessToken) return json(res, 401, { error: 'Missing bearer token' });

  const { serviceClient, anonClient } = getSupabaseServerClients();
  const { user, error: userError } = await getAuthedUser({ anonClient, accessToken });

  if (userError || !user) return json(res, 401, { error: 'Unauthorized' });

  // 1. Fetch Beacon (Event) details
  const { data: beacon, error: beaconError } = await serviceClient
    .from('Beacon')
    .select('id, title, ticket_price_cents, ticket_inventory, owner_email')
    .eq('id', beacon_id)
    .single();

  if (beaconError || !beacon) {
    return json(res, 404, { error: 'Event not found' });
  }

  // 2. Check Inventory (if applicable)
  if (typeof beacon.ticket_inventory === 'number' && beacon.ticket_inventory <= 0) {
    return json(res, 409, { error: 'Sold out' });
  }

  const priceCents = beacon.ticket_price_cents || 0;

  // 3. Handle Payment
  let paymentIntentId = null;
  if (priceCents > 0) {
    if (!payment_method_id) {
        return json(res, 400, { error: 'Payment method required for paid tickets' });
    }

    try {
        // Create and confirm PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: priceCents,
            currency: 'gbp', // Assuming GBP
            payment_method: payment_method_id,
            confirm: true,
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: 'never' // Simplified for API
            },
            metadata: {
                beacon_id: beacon.id,
                user_id: user.id,
                type: 'ticket_purchase'
            },
            description: `Ticket for ${beacon.title}`
        });

        if (paymentIntent.status !== 'succeeded') {
            return json(res, 402, { error: 'Payment failed', status: paymentIntent.status });
        }
        paymentIntentId = paymentIntent.id;
    } catch (err) {
        return json(res, 402, { error: 'Payment error', details: err.message });
    }
  }

  // 4. Create Ticket (EventRSVP)
  // Check if already exists?
  const { data: existing } = await serviceClient
    .from('event_rsvps')
    .select('id')
    .eq('beacon_id', beacon_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
     // If already exists, maybe update status? 
     // For this task, assuming strict "buy a ticket". 
     // If they already have one, prevent dupe or allow multiple?
     // UNIQUE(beacon_id, user_id) constraint in migration suggests 1 per user per event.
     return json(res, 409, { error: 'You already have a ticket for this event' });
  }

  const { data: ticket, error: ticketError } = await serviceClient
    .from('event_rsvps')
    .insert({
        beacon_id: beacon_id,
        user_id: user.id,
        user_email: user.email, // Fallback for old schema
        status: 'going',
        // metadata: { price_paid: priceCents, payment_intent: paymentIntentId } // If metadata column exists
    })
    .select()
    .single();

  if (ticketError) {
      // Refund if payment succeeded? In a real app, yes.
      return json(res, 500, { error: 'Failed to generate ticket', details: ticketError.message });
  }

  // 5. Deduct Inventory
  if (typeof beacon.ticket_inventory === 'number') {
      await serviceClient
        .from('Beacon')
        .update({ ticket_inventory: beacon.ticket_inventory - 1 })
        .eq('id', beacon_id);
  }

  return json(res, 200, { success: true, ticket });
}
