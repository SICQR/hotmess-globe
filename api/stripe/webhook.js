/**
 * Vercel API Route: Stripe Webhook Handler
 * 
 * Handles Stripe webhook events for subscriptions and payments.
 * Verifies webhook signature and updates database accordingly.
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Disable body parsing - we need raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!stripe || !webhookSecret) {
    console.error('[Stripe Webhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET');
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  if (!supabaseServiceKey) {
    console.error('[Stripe Webhook] Missing SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'Database not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let event;
  
  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'];

    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.supabase_user_id;
        const tierId = session.metadata?.tier_id;

        if (userId && tierId) {
          const { error } = await supabase
            .from('User')
            .update({
              membership_tier: tierId,
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
              subscription_status: 'active',
            })
            .eq('auth_user_id', userId);

          if (error) {
            console.error('[Stripe Webhook] Failed to update user tier:', error);
          } else {
            console.log(`[Stripe Webhook] User ${userId} upgraded to ${tierId}`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.supabase_user_id;

        if (userId) {
          const status = subscription.cancel_at_period_end ? 'canceling' : subscription.status;
          
          const { error } = await supabase
            .from('User')
            .update({
              subscription_status: status,
              subscription_ends_at: subscription.cancel_at_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null,
            })
            .eq('auth_user_id', userId);

          if (error) {
            console.error('[Stripe Webhook] Failed to update subscription:', error);
          } else {
            console.log(`[Stripe Webhook] Subscription updated for user ${userId}: ${status}`);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.supabase_user_id;

        if (userId) {
          const { error } = await supabase
            .from('User')
            .update({
              membership_tier: 'basic',
              stripe_subscription_id: null,
              subscription_status: 'canceled',
              subscription_ends_at: null,
            })
            .eq('auth_user_id', userId);

          if (error) {
            console.error('[Stripe Webhook] Failed to cancel subscription:', error);
          } else {
            console.log(`[Stripe Webhook] Subscription canceled for user ${userId}`);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          const userId = subscription.metadata?.supabase_user_id;

          if (userId) {
            await supabase
              .from('User')
              .update({ subscription_status: 'past_due' })
              .eq('auth_user_id', userId);

            console.log(`[Stripe Webhook] Payment failed for user ${userId}`);
          }
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          const userId = subscription.metadata?.supabase_user_id;

          if (userId) {
            await supabase
              .from('User')
              .update({ subscription_status: 'active' })
              .eq('auth_user_id', userId);

            console.log(`[Stripe Webhook] Invoice paid for user ${userId}`);
          }
        }
        break;
      }

      // Handle one-time payments (marketplace)
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.order_id;

        if (orderId) {
          const { error } = await supabase
            .from('marketplace_orders')
            .update({
              status: 'paid',
              payment_intent_id: paymentIntent.id,
              paid_at: new Date().toISOString(),
            })
            .eq('id', orderId);

          if (error) {
            console.error('[Stripe Webhook] Failed to update order:', error);
          } else {
            console.log(`[Stripe Webhook] Order ${orderId} marked as paid`);
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.order_id;

        if (orderId) {
          await supabase
            .from('marketplace_orders')
            .update({
              status: 'payment_failed',
              payment_error: paymentIntent.last_payment_error?.message,
            })
            .eq('id', orderId);

          console.log(`[Stripe Webhook] Payment failed for order ${orderId}`);
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Handler error:', error);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
}
