/**
 * API Route: Ticket Reseller Stripe Webhook
 * 
 * Handles payment events for ticket purchases
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendNotification, logEscrowEvent } from './_utils.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_TICKET_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];

    let event;
    try {
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch (err) {
      console.error('[Ticket Webhook] Signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    }

    console.log(`[Ticket Webhook] Received event: ${event.type}`);

    // Only process ticket reseller events
    const metadata = event.data.object?.metadata || {};
    if (metadata.type !== 'ticket_reseller') {
      // Not a ticket reseller event, skip
      return res.status(200).json({ received: true, skipped: true });
    }

    const orderId = metadata.order_id;
    const listingId = metadata.listing_id;
    const escrowId = metadata.escrow_id;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        if (session.payment_status === 'paid') {
          // Payment successful - move to escrow holding
          await handlePaymentSuccess(supabase, orderId, listingId, escrowId, session);
        }
        break;
      }

      case 'checkout.session.expired': {
        // Payment session expired - release the listing
        await handleSessionExpired(supabase, orderId, listingId, escrowId);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        await handlePaymentFailed(supabase, orderId, listingId, escrowId, paymentIntent);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        if (charge.metadata?.type === 'ticket_reseller') {
          await handleRefund(supabase, charge.metadata.order_id, charge);
        }
        break;
      }

      default:
        console.log(`[Ticket Webhook] Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('[Ticket Webhook] Error:', error);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(supabase, orderId, listingId, escrowId, session) {
  console.log(`[Ticket Webhook] Payment success for order ${orderId}`);

  const now = new Date();
  const transferDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Update order status
  const { data: order } = await supabase
    .from('ticket_orders')
    .update({
      status: 'confirmed',
      escrow_status: 'holding',
      payment_status: 'captured',
      stripe_charge_id: session.payment_intent,
      paid_at: now.toISOString(),
      escrow_held_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', orderId)
    .select('*, listing:ticket_listings(*)')
    .single();

  // Update escrow status
  await supabase
    .from('ticket_escrow')
    .update({
      status: 'holding',
      stripe_payment_intent_id: session.payment_intent,
      funds_received_at: now.toISOString(),
      events: supabase.rpc('array_append', {
        arr: 'events',
        elem: {
          event: 'payment_received',
          timestamp: now.toISOString(),
          amount: session.amount_total / 100,
        },
      }),
      updated_at: now.toISOString(),
    })
    .eq('id', escrowId);

  // Update listing status to sold
  await supabase
    .from('ticket_listings')
    .update({
      status: 'sold',
      updated_at: now.toISOString(),
    })
    .eq('id', listingId);

  // Update transfer with deadline
  await supabase
    .from('ticket_transfers')
    .update({
      status: 'pending',
      transfer_deadline: transferDeadline.toISOString(),
    })
    .eq('order_id', orderId);

  // Notify seller
  if (order) {
    await sendNotification(
      supabase,
      order.seller_email,
      'ticket_sold',
      'Ticket Sold!',
      `Your ${order.listing?.event_name} ticket has been sold! Please transfer the ticket within 24 hours.`,
      `/ticket-reseller/orders/${orderId}`
    );

    // Notify buyer
    await sendNotification(
      supabase,
      order.buyer_email,
      'ticket_purchase_confirmed',
      'Purchase Confirmed',
      `Your purchase for ${order.listing?.event_name} is confirmed. The seller will transfer the ticket within 24 hours.`,
      `/ticket-reseller/orders/${orderId}`
    );
  }

  console.log(`[Ticket Webhook] Order ${orderId} confirmed, escrow holding`);
}

/**
 * Handle checkout session expiration
 */
async function handleSessionExpired(supabase, orderId, listingId, escrowId) {
  console.log(`[Ticket Webhook] Session expired for order ${orderId}`);

  // Update order to cancelled
  await supabase
    .from('ticket_orders')
    .update({
      status: 'cancelled',
      escrow_status: 'cancelled',
      payment_status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  // Update escrow
  await supabase
    .from('ticket_escrow')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', escrowId);

  // Release listing back to active
  await supabase
    .from('ticket_listings')
    .update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', listingId);

  console.log(`[Ticket Webhook] Order ${orderId} cancelled, listing released`);
}

/**
 * Handle payment failure
 */
async function handlePaymentFailed(supabase, orderId, listingId, escrowId, paymentIntent) {
  console.log(`[Ticket Webhook] Payment failed for order ${orderId}`);

  const { data: order } = await supabase
    .from('ticket_orders')
    .update({
      status: 'cancelled',
      escrow_status: 'cancelled',
      payment_status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select()
    .single();

  // Update escrow
  await supabase
    .from('ticket_escrow')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', escrowId);

  // Release listing back to active
  await supabase
    .from('ticket_listings')
    .update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', listingId);

  // Notify buyer
  if (order) {
    await sendNotification(
      supabase,
      order.buyer_email,
      'payment_failed',
      'Payment Failed',
      'Your payment could not be processed. Please try again.',
      `/ticket-reseller/listings/${listingId}`
    );
  }

  console.log(`[Ticket Webhook] Order ${orderId} failed, listing released`);
}

/**
 * Handle refund
 */
async function handleRefund(supabase, orderId, charge) {
  console.log(`[Ticket Webhook] Refund processed for order ${orderId}`);

  const { data: order } = await supabase
    .from('ticket_orders')
    .update({
      status: 'refunded',
      escrow_status: 'refunded',
      payment_status: 'refunded',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select()
    .single();

  // Update escrow
  await supabase
    .from('ticket_escrow')
    .update({
      status: 'refunded',
      stripe_refund_id: charge.refunds?.data?.[0]?.id,
      funds_refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('order_id', orderId);

  // Notify buyer
  if (order) {
    await sendNotification(
      supabase,
      order.buyer_email,
      'refund_processed',
      'Refund Processed',
      `Your refund of £${(charge.amount_refunded / 100).toFixed(2)} has been processed.`,
      `/ticket-reseller/orders/${orderId}`
    );
  }

  console.log(`[Ticket Webhook] Order ${orderId} refunded`);
}
