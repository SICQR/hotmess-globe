/**
 * API Route: Purchase Ticket
 * 
 * Creates an order with escrow payment via Stripe
 */

import Stripe from 'stripe';
import { withRateLimit } from '../middleware/rateLimiter.js';
import {
  validateUser,
  getServiceClient,
  calculatePricing,
  sendNotification,
  TRANSFER_DEADLINE_HOURS,
  CONFIRMATION_DEADLINE_HOURS,
} from './_utils.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user, error: authError, token } = await validateUser(req);
  if (authError) {
    return res.status(401).json({ error: authError });
  }

  const supabase = getServiceClient();

  try {
    const { listing_id, quantity = 1, success_url, cancel_url } = req.body;

    if (!listing_id || !success_url || !cancel_url) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['listing_id', 'success_url', 'cancel_url'],
      });
    }

    // Get the listing
    const { data: listing, error: listingError } = await supabase
      .from('ticket_listings')
      .select(`
        *,
        seller:User!seller_id(email, full_name, stripe_connect_id)
      `)
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Validate listing status
    if (listing.status !== 'active') {
      return res.status(400).json({
        error: `This listing is ${listing.status} and cannot be purchased.`,
      });
    }

    // Check quantity
    const qty = Math.min(parseInt(quantity) || 1, listing.ticket_quantity);
    if (qty < 1) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }

    // Prevent buying own tickets
    if (listing.seller_id === user.id) {
      return res.status(400).json({ error: 'You cannot buy your own tickets' });
    }

    // Check if event is still in the future
    if (new Date(listing.event_date) < new Date()) {
      return res.status(400).json({ error: 'This event has already passed' });
    }

    // Get buyer info
    const { data: buyerData } = await supabase
      .from('User')
      .select('email, full_name, stripe_customer_id')
      .eq('auth_user_id', user.id)
      .single();

    const buyerEmail = buyerData?.email || user.email;

    // Calculate pricing
    const pricing = calculatePricing(listing.asking_price_gbp, qty);

    // Get or create Stripe customer
    let customerId = buyerData?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: buyerEmail,
        name: buyerData?.full_name || undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      await supabase
        .from('User')
        .update({ stripe_customer_id: customerId })
        .eq('auth_user_id', user.id);
    }

    // Create the order in pending state
    const transferDeadline = new Date(Date.now() + TRANSFER_DEADLINE_HOURS * 60 * 60 * 1000);
    const confirmationDeadline = new Date(transferDeadline.getTime() + CONFIRMATION_DEADLINE_HOURS * 60 * 60 * 1000);

    const { data: order, error: orderError } = await supabase
      .from('ticket_orders')
      .insert({
        buyer_id: user.id,
        buyer_email: buyerEmail,
        seller_id: listing.seller_id,
        seller_email: listing.seller_email,
        listing_id: listing.id,
        quantity: qty,
        unit_price_gbp: listing.asking_price_gbp,
        subtotal_gbp: pricing.subtotal,
        platform_fee_gbp: pricing.platformFee,
        buyer_protection_fee_gbp: pricing.buyerProtectionFee,
        total_gbp: pricing.total,
        seller_payout_amount_gbp: pricing.sellerReceives,
        status: 'pending',
        escrow_status: 'pending_payment',
      })
      .select()
      .single();

    if (orderError) {
      console.error('[Purchase] Order creation error:', orderError);
      return res.status(500).json({ error: 'Failed to create order' });
    }

    // Create escrow record
    const { data: escrow } = await supabase
      .from('ticket_escrow')
      .insert({
        order_id: order.id,
        amount_gbp: pricing.total,
        platform_fee_gbp: pricing.platformFee,
        seller_amount_gbp: pricing.sellerReceives,
        status: 'pending',
        events: [{
          event: 'created',
          timestamp: new Date().toISOString(),
          buyer_email: buyerEmail,
          amount: pricing.total,
        }],
      })
      .select()
      .single();

    // Create transfer record
    await supabase
      .from('ticket_transfers')
      .insert({
        order_id: order.id,
        listing_id: listing.id,
        seller_id: listing.seller_id,
        buyer_id: user.id,
        transfer_method: listing.transfer_method,
        status: 'pending',
        transfer_deadline: transferDeadline.toISOString(),
        confirmation_deadline: confirmationDeadline.toISOString(),
      });

    // Create Stripe Checkout session
    // IMPORTANT: Using manual capture for true escrow behavior
    // Funds are captured immediately but NOT transferred to seller until buyer confirms receipt
    // Transfer is handled separately by ticket-escrow-release cron job after confirmation
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `${listing.event_name} - ${listing.ticket_type.replace('_', ' ')}`,
              description: `${qty}x ticket(s) for ${listing.event_venue} on ${new Date(listing.event_date).toLocaleDateString()}`,
              images: listing.ticket_proof_url ? [listing.ticket_proof_url] : [],
            },
            unit_amount: Math.round(listing.asking_price_gbp * 100),
          },
          quantity: qty,
        },
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'Buyer Protection Fee',
              description: 'Full refund if ticket is invalid or not delivered',
            },
            unit_amount: Math.round(pricing.buyerProtectionFee * 100),
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'Service Fee',
              description: 'Platform service fee',
            },
            unit_amount: Math.round(pricing.platformFee * 100),
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        capture_method: 'automatic',
        metadata: {
          order_id: order.id,
          listing_id: listing.id,
          escrow_id: escrow.id,
          buyer_id: user.id,
          seller_id: listing.seller_id,
          seller_connect_id: listing.seller?.stripe_connect_id || '',
          seller_payout_amount: Math.round(pricing.sellerReceives * 100),
          type: 'ticket_reseller',
        },
        // NOTE: Removed transfer_data - funds stay in platform account as escrow
        // Transfer to seller happens AFTER buyer confirms ticket receipt
        // See: api/cron/ticket-escrow-release.js
      },
      success_url: `${success_url}?order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cancel_url}?listing_id=${listing.id}`,
      metadata: {
        order_id: order.id,
        listing_id: listing.id,
        escrow_id: escrow.id,
        type: 'ticket_reseller',
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minute expiry
    });

    // Update order with payment intent
    await supabase
      .from('ticket_orders')
      .update({
        stripe_payment_intent_id: session.payment_intent,
      })
      .eq('id', order.id);

    // Reserve the listing temporarily
    await supabase
      .from('ticket_listings')
      .update({
        status: 'reserved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', listing.id);

    console.log(`[Purchase] Created order ${order.id} for listing ${listing.id}`);

    return res.status(200).json({
      url: session.url,
      order_id: order.id,
      pricing,
    });

  } catch (error) {
    console.error('[Purchase] Error:', error);
    return res.status(500).json({ error: 'Failed to initiate purchase' });
  }
}

export default withRateLimit(handler, { tier: 'auth' });
