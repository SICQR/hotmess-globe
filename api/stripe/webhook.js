/**
 * Vercel API Route: Stripe Webhook Handler
 * 
 * Handles Stripe webhook events for subscriptions and payments.
 * Verifies webhook signature and updates database accordingly.
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { notifyXpCredited } from '../notifications/premium.js';

// Disable body parsing - we need raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Initialized lazily per-request to pick up env changes in dev
const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);
const getWebhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET;
const getSupabaseUrl = () => process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const getSupabaseServiceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = getWebhookSecret();
  const supabaseUrl = getSupabaseUrl();
  const supabaseServiceKey = getSupabaseServiceKey();

  if (!stripeSecretKey || !webhookSecret) {
    console.error('[Stripe Webhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET');
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const stripe = getStripe();

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
        const xpPurchaseType = session.metadata?.type;
        const userEmail = session.metadata?.user_email;
        const xpAmount = session.metadata?.xp_amount;

        // Handle XP purchase
        if (xpPurchaseType === 'xp_purchase' && userEmail && xpAmount) {
          const amount = parseInt(xpAmount, 10);
          
          // Get current user XP
          const { data: user, error: userError } = await supabase
            .from('User')
            .select('xp')
            .eq('email', userEmail)
            .single();
          
          if (userError) {
            console.error('[Stripe Webhook] Failed to fetch user for XP credit:', userError);
          } else {
            const currentXp = user?.xp || 0;
            const newXp = currentXp + amount;
            
            // Credit XP to user
            const { error: updateError } = await supabase
              .from('User')
              .update({ xp: newXp })
              .eq('email', userEmail);
            
            if (updateError) {
              console.error('[Stripe Webhook] Failed to credit XP:', updateError);
            } else {
              console.log(`[Stripe Webhook] Credited ${amount} XP to ${userEmail} (new balance: ${newXp})`);
              
              // Update transaction record
              await supabase
                .from('xp_transactions')
                .update({
                  description: `Completed: ${amount} XP purchase`,
                })
                .eq('reference_id', session.id)
                .eq('transaction_type', 'purchase');

              // Send notification (non-blocking)
              notifyXpCredited({
                userEmail,
                amount,
                packageName: session.metadata?.package_id || `${amount} XP`,
              }).catch((err) => {
                console.error('[Stripe Webhook] Notification error:', err);
              });
            }
          }
          break;
        }

        // Handle membership tier upgrade
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

      // Stripe Connect events
      case 'account.updated': {
        const account = event.data.object;
        const hotmessEmail = account.metadata?.hotmess_email;

        if (hotmessEmail) {
          const status = account.charges_enabled && account.payouts_enabled 
            ? 'active' 
            : account.details_submitted 
              ? 'pending_verification'
              : 'incomplete';

          const { error } = await supabase
            .from('User')
            .update({
              stripe_connect_status: status,
              verified_seller: status === 'active' ? true : undefined,
            })
            .eq('email', hotmessEmail);

          if (error) {
            console.error('[Stripe Webhook] Failed to update Connect status:', error);
          } else {
            console.log(`[Stripe Webhook] Connect account updated for ${hotmessEmail}: ${status}`);
          }
        }
        break;
      }

      case 'transfer.created':
      case 'transfer.updated': {
        const transfer = event.data.object;
        const payoutId = transfer.metadata?.payout_id;

        if (payoutId) {
          await supabase
            .from('seller_payouts')
            .update({ 
              status: 'in_transit',
              stripe_transfer_id: transfer.id,
            })
            .eq('id', payoutId);

          console.log(`[Stripe Webhook] Transfer ${transfer.id} for payout ${payoutId}`);
        }
        break;
      }

      case 'payout.paid': {
        const payout = event.data.object;
        
        // Find payouts associated with this Stripe payout
        // First try by stripe_connect_account_id, then fallback to transfer lookup
        let { data: sellerPayouts } = await supabase
          .from('seller_payouts')
          .select('*')
          .eq('status', 'in_transit')
          .eq('stripe_connect_account_id', payout.destination);
        
        // Fallback: if no matches by account_id, this may be an older record
        // Look up any in_transit payouts that haven't been matched yet
        if (!sellerPayouts?.length) {
          const { data: fallbackPayouts } = await supabase
            .from('seller_payouts')
            .select('*')
            .eq('status', 'in_transit')
            .is('stripe_payout_id', null);
          sellerPayouts = fallbackPayouts;
        }

        if (sellerPayouts?.length > 0) {
          for (const sellerPayout of sellerPayouts) {
            await supabase
              .from('seller_payouts')
              .update({ 
                status: 'paid',
                stripe_payout_id: payout.id,
                arrival_date: new Date(payout.arrival_date * 1000).toISOString(),
              })
              .eq('id', sellerPayout.id);

            // Notify seller
            await supabase.from('notifications').insert({
              user_email: sellerPayout.seller_email,
              type: 'payout',
              title: 'Payout Complete!',
              message: `£${sellerPayout.amount_gbp?.toFixed(2) || '0.00'} has arrived in your bank account`,
              link: 'SellerDashboard',
            });
          }
          console.log(`[Stripe Webhook] Payout ${payout.id} completed`);
        }
        break;
      }

      case 'payout.failed': {
        const payout = event.data.object;
        
        // Find payouts - try by account_id first, then fallback
        let { data: sellerPayouts } = await supabase
          .from('seller_payouts')
          .select('*')
          .eq('status', 'in_transit')
          .eq('stripe_connect_account_id', payout.destination);
        
        if (!sellerPayouts?.length) {
          const { data: fallbackPayouts } = await supabase
            .from('seller_payouts')
            .select('*')
            .eq('status', 'in_transit')
            .is('stripe_payout_id', null);
          sellerPayouts = fallbackPayouts;
        }

        if (sellerPayouts?.length > 0) {
          for (const sellerPayout of sellerPayouts) {
            await supabase
              .from('seller_payouts')
              .update({ 
                status: 'failed',
                notes: payout.failure_message || 'Payout failed',
              })
              .eq('id', sellerPayout.id);

            await supabase.from('notifications').insert({
              user_email: sellerPayout.seller_email,
              type: 'payout',
              title: 'Payout Failed',
              message: `There was an issue with your payout. Please check your bank details.`,
              link: 'SellerDashboard',
            });
          }
          console.log(`[Stripe Webhook] Payout ${payout.id} failed`);
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
