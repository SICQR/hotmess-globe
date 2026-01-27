import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        const tierId = session.metadata?.tier_id

        if (userId && tierId) {
          await supabaseAdmin
            .from('User')
            .update({
              membership_tier: tierId,
              stripe_subscription_id: session.subscription as string,
              subscription_status: 'active',
            })
            .eq('auth_user_id', userId)

          console.log(`User ${userId} upgraded to ${tierId}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id

        if (userId) {
          const status = subscription.cancel_at_period_end ? 'canceling' : subscription.status
          
          await supabaseAdmin
            .from('User')
            .update({
              subscription_status: status,
              subscription_ends_at: subscription.cancel_at_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null,
            })
            .eq('auth_user_id', userId)

          console.log(`Subscription updated for user ${userId}: ${status}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id

        if (userId) {
          await supabaseAdmin
            .from('User')
            .update({
              membership_tier: 'basic',
              stripe_subscription_id: null,
              subscription_status: 'canceled',
              subscription_ends_at: null,
            })
            .eq('auth_user_id', userId)

          console.log(`Subscription canceled for user ${userId}`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
        const userId = subscription.metadata?.supabase_user_id

        if (userId) {
          await supabaseAdmin
            .from('User')
            .update({
              subscription_status: 'past_due',
            })
            .eq('auth_user_id', userId)

          // TODO: Send payment failed email notification

          console.log(`Payment failed for user ${userId}`)
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
        const userId = subscription.metadata?.supabase_user_id

        if (userId) {
          await supabaseAdmin
            .from('User')
            .update({
              subscription_status: 'active',
            })
            .eq('auth_user_id', userId)

          console.log(`Invoice paid for user ${userId}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
