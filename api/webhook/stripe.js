/**
 * Stripe Webhook Handler
 * 
 * Handles payment events for:
 * - Ticket purchases (escrow release)
 * - MessMarket product purchases
 * - Business amplification credits
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
  api: { bodyParser: false },
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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

async function handlePaymentSuccess(paymentIntent) {
  const { id, metadata } = paymentIntent;
  const { type, reference_id } = metadata || {};

  switch (type) {
    case 'ticket_purchase':
      await supabase
        .from('ticket_purchases')
        .update({
          status: 'paid',
          stripe_payment_intent_id: id,
          paid_at: new Date().toISOString(),
        })
        .eq('id', reference_id);
      
      // Get purchase to mark listing as sold
      const { data: purchase } = await supabase
        .from('ticket_purchases')
        .select('listing_id')
        .eq('id', reference_id)
        .single();
      
      if (purchase) {
        await supabase
          .from('ticket_listings')
          .update({ status: 'sold', sold_at: new Date().toISOString() })
          .eq('id', purchase.listing_id);
      }
      break;

    case 'product_purchase':
      const { data: order } = await supabase
        .from('product_orders')
        .update({
          status: 'paid',
          stripe_payment_intent_id: id,
          paid_at: new Date().toISOString(),
        })
        .eq('id', reference_id)
        .select('product_id, product:products(is_digital, quantity)')
        .single();

      if (order?.product?.is_digital) {
        await supabase
          .from('product_orders')
          .update({
            digital_delivered: true,
            digital_delivered_at: new Date().toISOString(),
            status: 'delivered',
          })
          .eq('id', reference_id);
      }

      if (order?.product_id) {
        await supabase
          .from('products')
          .update({
            quantity: Math.max(0, (order.product?.quantity || 1) - 1),
          })
          .eq('id', order.product_id);
      }
      break;

    case 'business_credits':
      const credits = parseInt(metadata?.credits || '0', 10);
      if (credits > 0) {
        await supabase.rpc('add_business_credits', {
          p_business_id: reference_id,
          p_credits: credits,
        });
      }
      break;
  }
}

async function handlePaymentFailed(paymentIntent) {
  const { metadata } = paymentIntent;
  const { type, reference_id } = metadata || {};

  if (type === 'ticket_purchase') {
    await supabase
      .from('ticket_purchases')
      .update({ status: 'payment_failed' })
      .eq('id', reference_id);
  }

  if (type === 'product_purchase') {
    await supabase
      .from('product_orders')
      .update({ status: 'payment_failed' })
      .eq('id', reference_id);
  }
}
