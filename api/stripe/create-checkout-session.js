/**
 * POST /api/stripe/create-checkout-session
 *
 * Creates a Stripe Checkout Session for a membership tier.
 * Uses price_data (dynamic) — no pre-configured Stripe Price IDs required.
 *
 * Body: { tierId: number }
 * Returns: { url: string }
 *
 * STRIPE ENV VARS required in Vercel → Settings → Environment Variables:
 *   STRIPE_SECRET_KEY        sk_live_xxx  or  sk_test_xxx
 *   STRIPE_WEBHOOK_SECRET    whsec_xxx  (for webhook at /api/stripe/webhook)
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }) : null;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!stripe) {
    return res.status(503).json({
      error: 'Stripe not configured',
      detail: 'Add STRIPE_SECRET_KEY in Vercel → Settings → Environment Variables',
    });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }

  // Auth via Bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body || {};
  const { type } = body;

  // Resolve origin for redirect URLs
  const origin =
    process.env.VITE_PUBLIC_URL ||
    (req.headers.origin?.startsWith('http') ? req.headers.origin : null) ||
    'https://hotmessldn.com';

  // Fetch display_name for the Stripe customer description
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  // ── Preloved order checkout ──────────────────────────────────────────────
  if (type === 'preloved_order') {
    const { listing_id, price_gbp, title, order_id } = body;
    if (!listing_id || !price_gbp) {
      return res.status(400).json({ error: 'listing_id and price_gbp required' });
    }

    const amountInPence = Math.round(Number(price_gbp) * 100);
    if (!amountInPence || amountInPence <= 0) {
      return res.status(400).json({ error: 'Invalid price' });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: user.email,
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              unit_amount: amountInPence,
              product_data: {
                name: title || 'Preloved Item',
                description: 'Preloved item from HOTMESS Market',
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          user_id: user.id,
          user_email: user.email ?? '',
          user_name: profile?.display_name ?? '',
          type: 'preloved_order',
          listing_id: String(listing_id),
          order_id: order_id ? String(order_id) : '',
        },
        success_url: `${origin}/market?purchase=success&listing=${encodeURIComponent(listing_id)}`,
        cancel_url: `${origin}/market`,
        allow_promotion_codes: false,
      });

      return res.status(200).json({ url: session.url });
    } catch (err) {
      console.error('[preloved-checkout] Stripe error:', err?.message);
      return res.status(500).json({ error: 'Failed to create checkout session', detail: err?.message });
    }
  }

  // ── Membership checkout (default) ────────────────────────────────────────
  const { tierId } = body;
  if (!tierId) {
    return res.status(400).json({ error: 'tierId required' });
  }

  // Fetch the tier
  const { data: tier, error: tierError } = await supabase
    .from('membership_tiers')
    .select('id, name, price')
    .eq('id', Number(tierId))
    .single();

  if (tierError || !tier) {
    return res.status(404).json({ error: 'Tier not found' });
  }

  const priceInPence = Math.round(Number(tier.price));
  if (!priceInPence || priceInPence <= 0) {
    return res.status(400).json({ error: 'Free tier — no checkout needed' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            unit_amount: priceInPence,
            product_data: {
              name: `HOTMESS ${tier.name.replace(/_/g, ' ').toUpperCase()} Membership`,
              description: `One-time activation of HOTMESS ${tier.name} tier`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        user_email: user.email ?? '',
        user_name: profile?.display_name ?? '',
        tier_id: String(tier.id),
        tier_name: tier.name,
        type: 'membership',
      },
      success_url: `${origin}/more/settings?membership=success&tier=${encodeURIComponent(tier.name)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/more/settings?membership=cancelled`,
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[membership-checkout] Stripe error:', err?.message);
    return res.status(500).json({ error: 'Failed to create checkout session', detail: err?.message });
  }
}
