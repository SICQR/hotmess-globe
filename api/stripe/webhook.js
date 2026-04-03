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

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;
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
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  if (!supabaseServiceKey) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let event;
  
  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  try {
    // Idempotency check — skip already-processed events
    const { data: existing } = await supabase
      .from('stripe_events_log')
      .select('id')
      .eq('stripe_event_id', event.id)
      .maybeSingle();
    if (existing) return res.status(200).json({ received: true, deduplicated: true });

    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object;
        // Support both metadata key styles (old: supabase_user_id, new: user_id)
        const userId = session.metadata?.user_id || session.metadata?.supabase_user_id;
        const tierId = session.metadata?.tier_id;
        const tierName = session.metadata?.tier_name;
        const type = session.metadata?.type;

        // Handle one-time boost purchases
        const boostKey = session.metadata?.boost_key;
        const sessionUserId = session.metadata?.user_id;
        if (boostKey && sessionUserId) {
          const { error: boostError } = await supabase.rpc('activate_user_boost', {
            p_user_id: sessionUserId,
            p_boost_key: boostKey,
            p_payment_intent_id: session.payment_intent || null,
          });
          // Even if RPC doesn't exist yet, don't crash — just log
          if (boostError) console.error('activate_user_boost error:', boostError.message);
          return res.json({ received: true });
        }

        // ── Preloved order fulfilment ──────────────────────────────────────
        const listingId = session.metadata?.listing_id;
        if (userId && type === 'preloved_order' && listingId) {
          // Mark listing as sold
          const { error: listingErr } = await supabase
            .from('preloved_listings')
            .update({ status: 'sold' })
            .eq('id', listingId);
          if (listingErr) {
            console.error('[Stripe webhook] preloved listing update error:', listingErr.message, { listingId });
          }

          // Record in vault for buyer
          await supabase.from('vault_items').insert({
            user_id: userId,
            item_type: 'preloved_purchase',
            source_system: 'stripe',
            source_ref: session.id,
            status: 'paid',
            title: 'Preloved Item',
            metadata: {
              stripe_session_id: session.id,
              listing_id: listingId,
              paid_at: new Date().toISOString(),
            },
          }).catch((err) => {
            console.error('[Stripe webhook] vault_items insert error:', err?.message);
          });

          break;
        }

        if (userId && type === 'membership' && tierId) {
          // Upsert into memberships table — one active row per user
          const { error: memberErr } = await supabase
            .from('memberships')
            .upsert(
              {
                user_id: userId,
                tier: tierName || tierId,
                status: 'active',
                started_at: new Date().toISOString(),
                ends_at: null,
                metadata: {
                  stripe_session_id: session.id,
                  stripe_customer_id: session.customer,
                  tier_id: tierId,
                  paid_at: new Date().toISOString(),
                },
              },
              { onConflict: 'user_id' }
            );

          if (memberErr) {
            console.error('[Stripe webhook] membership upsert error:', memberErr.message, { userId, tierId });
          }

          // Write vault item for membership
          await supabase.from('vault_items').upsert({
            user_id: userId,
            item_type: 'membership',
            source_system: 'stripe',
            source_ref: session.id,
            status: 'active',
            title: tierName || tierId,
            metadata: { stripe_session_id: session.id, tier: tierId },
          }, { onConflict: 'user_id,item_type,source_ref' }).catch(() => {});
        } else if (userId && !type) {
          // Legacy path: session without type metadata — treat as subscription update
          const tierId_ = session.metadata?.tier_id;
          if (tierId_) {
            await supabase
              .from('memberships')
              .upsert(
                { user_id: userId, tier: tierId_, status: 'active', started_at: new Date().toISOString(), ends_at: null, metadata: { stripe_session_id: session.id } },
                { onConflict: 'user_id' }
              );
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
            .from('profiles')
            .update({
              subscription_status: status,
              subscription_ends_at: subscription.cancel_at_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null,
            })
            .eq('id', userId);

          if (error) {
            console.error('[Stripe webhook] customer.subscription.updated DB error:', error.message, { userId, status });
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.supabase_user_id;

        if (userId) {
          const { error } = await supabase
            .from('profiles')
            .update({
              membership_tier: 'basic',
              stripe_subscription_id: null,
              subscription_status: 'canceled',
              subscription_ends_at: null,
            })
            .eq('id', userId);

          if (error) {
            console.error('[Stripe webhook] customer.subscription.deleted DB error:', error.message, { userId });
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
            const { error } = await supabase
              .from('profiles')
              .update({ subscription_status: 'past_due' })
              .eq('id', userId);

            if (error) {
              console.error('[Stripe webhook] invoice.payment_failed DB error:', error.message, { userId });
            }
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
            const { error } = await supabase
              .from('profiles')
              .update({ subscription_status: 'active' })
              .eq('id', userId);

            if (error) {
              console.error('[Stripe webhook] invoice.paid DB error:', error.message, { userId });
            }
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
            console.error('[Stripe webhook] payment_intent.succeeded DB error:', error.message, { orderId });
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.order_id;

        if (orderId) {
          const { error } = await supabase
            .from('marketplace_orders')
            .update({
              status: 'payment_failed',
              payment_error: paymentIntent.last_payment_error?.message,
            })
            .eq('id', orderId);

          if (error) {
            console.error('[Stripe webhook] payment_intent.payment_failed DB error:', error.message, { orderId });
          }
        }
        break;
      }

      // Delayed payment methods (bank debits, etc.) — same logic as checkout.session.completed
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        const userId = session.metadata?.user_id || session.metadata?.supabase_user_id;
        const tierId = session.metadata?.tier_id;
        const tierName = session.metadata?.tier_name;
        const type = session.metadata?.type;

        const boostKey = session.metadata?.boost_key;
        const sessionUserId = session.metadata?.user_id;
        if (boostKey && sessionUserId) {
          const { error: boostError } = await supabase.rpc('activate_user_boost', {
            p_user_id: sessionUserId,
            p_boost_key: boostKey,
            p_payment_intent_id: session.payment_intent || null,
          });
          if (boostError) console.error('activate_user_boost error:', boostError.message);
          return res.json({ received: true });
        }

        // ── Preloved order (async payment) ─────────────────────────────────
        const asyncListingId = session.metadata?.listing_id;
        if (userId && type === 'preloved_order' && asyncListingId) {
          await supabase.from('preloved_listings').update({ status: 'sold' }).eq('id', asyncListingId);
          await supabase.from('vault_items').insert({
            user_id: userId,
            item_type: 'preloved_purchase',
            source_system: 'stripe',
            source_ref: session.id,
            status: 'paid',
            title: 'Preloved Item',
            metadata: { stripe_session_id: session.id, listing_id: asyncListingId, paid_at: new Date().toISOString() },
          }).catch(() => {});
          break;
        }

        if (userId && type === 'membership' && tierId) {
          const { error: memberErr } = await supabase
            .from('memberships')
            .upsert(
              {
                user_id: userId,
                tier: tierName || tierId,
                status: 'active',
                started_at: new Date().toISOString(),
                ends_at: null,
                metadata: {
                  stripe_session_id: session.id,
                  stripe_customer_id: session.customer,
                  tier_id: tierId,
                  paid_at: new Date().toISOString(),
                },
              },
              { onConflict: 'user_id' }
            );

          if (memberErr) {
            console.error('[Stripe webhook] async_payment membership upsert error:', memberErr.message, { userId, tierId });
          }

          await supabase.from('vault_items').upsert({
            user_id: userId,
            item_type: 'membership',
            source_system: 'stripe',
            source_ref: session.id,
            status: 'active',
            title: tierName || tierId,
            metadata: { stripe_session_id: session.id, tier: tierId },
          }, { onConflict: 'user_id,item_type,source_ref' }).catch(() => {});
        } else if (userId && !type) {
          const tierId_ = session.metadata?.tier_id;
          if (tierId_) {
            await supabase
              .from('memberships')
              .upsert(
                { user_id: userId, tier: tierId_, status: 'active', started_at: new Date().toISOString(), ends_at: null, metadata: { stripe_session_id: session.id } },
                { onConflict: 'user_id' }
              );
          }
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const userId = charge.metadata?.user_id || charge.metadata?.supabase_user_id;
        if (userId) {
          // Update memberships if this was a membership charge
          await supabase.from('memberships').update({ status: 'refunded' }).eq('user_id', userId).eq('status', 'active');
        }
        // Update vault items if order_id exists
        const orderId = charge.metadata?.order_id;
        if (orderId) {
          await supabase.from('vault_items').update({ status: 'refunded' }).eq('source_ref', orderId);
        }
        break;
      }

      default:
        // Unhandled event type — not an error, just not subscribed
        break;
    }

    // Log processed event for idempotency
    await supabase.from('stripe_events_log').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      object_id: event.data?.object?.id,
      processed: true,
      processed_at: new Date().toISOString(),
      payload: event.data?.object ? { id: event.data.object.id } : {},
    }).catch(() => {}); // Non-fatal if log insert fails

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Stripe webhook] Unhandled error in event handler:', error?.message || error, { eventType: event?.type });
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
}
