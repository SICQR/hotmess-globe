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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  if (!stripe) {
    res.statusCode = 503;
    return res.end(JSON.stringify({
      error: 'Stripe not configured',
      detail: 'Add STRIPE_SECRET_KEY in .env or Vercel Settings',
    }));
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    res.statusCode = 503;
    return res.end(JSON.stringify({ error: 'Supabase not configured' }));
  }

  // Auth via Bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: 'Unauthorized' }));
  }

  const token = authHeader.slice(7);
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: 'Unauthorized' }));
  }

  // ── Manual Body Parsing (Required for local Node/Vite dev) ────────────────
  let body = {};
  if (req.method === 'POST') {
    try {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const data = Buffer.concat(chunks).toString();
      if (data) body = JSON.parse(data);
    } catch (e) {
      console.error('Body parse error:', e);
      // Fallback to req.body if it exists (for Vercel)
      body = req.body || {};
    }
  }

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

  // ── HNH MESS product checkout (Channel 2/3: direct Stripe, no Shopify required) ─────────
  if (type === 'hnh_mess') {
    const {
      sku = 'small',           // 'small' (£10) | 'large' (£15)
      source,                  // attribution: market | beacon | radio | home | chat | whatsapp | venue_physical
      venue_id   = null,
      beacon_id  = null,
      radio_show_id = null,
    } = body;

    // Daily order cap — spec §STOCK SAFETY (default 20)
    const maxDaily = Number(process.env.MAX_HNH_DAILY_ORDERS ?? 20);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: todayCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('product_key', 'hnh-mess')
      .gte('created_at', todayStart.toISOString());

    if ((todayCount ?? 0) >= maxDaily) {
      res.statusCode = 429;
      return res.end(JSON.stringify({
        error: 'Daily order cap reached. Back soon.',
        code:  'HNH_DAILY_CAP',
      }));
    }

    const priceGbp = sku === 'large' ? 15 : 10;
    const productName = sku === 'large' ? 'HNH MESS Large (50ml)' : 'HNH MESS Small (30ml)';

    try {
      const session = await stripe.checkout.sessions.create({
        ui_mode: 'embedded',
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: user.email,
        line_items: [{
          price_data: {
            currency: 'gbp',
            unit_amount: priceGbp * 100,
            product_data: {
              name: productName,
              description: 'Aftercare isn\'t optional. Premium water-based lube.',
            },
          },
          quantity: 1,
        }],
        shipping_address_collection: { allowed_countries: ['GB'] },
        metadata: {
          user_id:       user.id,
          user_email:    user.email ?? '',
          user_name:     profile?.display_name ?? '',
          type:          'hnh_mess',
          product_key:   'hnh-mess',
          sku,
          source:        source ?? 'unknown',
          venue_id:      venue_id   ? String(venue_id)    : '',
          beacon_id:     beacon_id  ? String(beacon_id)   : '',
          radio_show_id: radio_show_id ? String(radio_show_id) : '',
        },
        return_url: `${origin}/market?purchase=success&type=hnh_mess&session_id={CHECKOUT_SESSION_ID}`,
        allow_promotion_codes: false,
      });

      res.statusCode = 200;
      return res.end(JSON.stringify({ clientSecret: session.client_secret }));
    } catch (err) {
      console.error('[hnh_mess-checkout] Stripe error:', err?.message);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Failed to create checkout session', detail: err?.message }));
    }
  }

  // ── Preloved or Shopify order checkout ──────────────────────────────────────────────
  if (type === 'preloved_order' || type === 'shopify_order') {
    const { listing_id, price_gbp, title, order_id, items: lineItems } = body;
    
    // items from frontend (optional but preferred for multi-item carts)
    const normalizedLines = lineItems?.length > 0 
      ? lineItems.map((i, idx) => {
          const rawPrice = i.price || (idx === 0 ? price_gbp : 0);
          const unit_amount = Math.round(Number(rawPrice || 0) * 100);
          
          if (!unit_amount || unit_amount <= 0) {
            throw new Error(`Item "${i.title || 'Unknown'}" has an invalid price: ${rawPrice}`);
          }

          return {
            price_data: {
              currency: 'gbp',
              unit_amount,
              product_data: {
                name: i.title || 'Item',
                description: type === 'shopify_order' ? 'HOTMESS Merch' : 'Preloved item',
              },
            },
            quantity: i.qty || 1,
          };
        })
      : [
          {
            price_data: {
              currency: 'gbp',
              unit_amount: Math.round(Number(price_gbp || 0) * 100),
              product_data: {
                name: title || (type === 'shopify_order' ? 'Merch Order' : 'Preloved Item'),
                description: type === 'shopify_order' ? 'HOTMESS Merch' : 'Preloved item from HOTMESS Market',
              },
            },
            quantity: 1,
          },
        ];

    if (!normalizedLines[0].price_data.unit_amount || normalizedLines[0].price_data.unit_amount <= 0) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Checkout total cannot be zero.' }));
    }

    try {
      const session = await stripe.checkout.sessions.create({
        ui_mode: 'embedded',
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: user.email,
        line_items: normalizedLines,
        metadata: {
          user_id: user.id,
          user_email: user.email ?? '',
          user_name: profile?.display_name ?? '',
          type,
          order_id: order_id ? String(order_id) : '',
        },
        return_url: type === 'shopify_order' 
          ? `${origin}/market?purchase=success&type=shop&order_id=${order_id}&session_id={CHECKOUT_SESSION_ID}`
          : `${origin}/market?purchase=success&listing=${encodeURIComponent(listing_id || '')}&order_id=${order_id}&session_id={CHECKOUT_SESSION_ID}`,
        allow_promotion_codes: true,
      });

      res.statusCode = 200;
      return res.end(JSON.stringify({ clientSecret: session.client_secret }));
    } catch (err) {
      console.error(`[${type}-checkout] Stripe error:`, err?.message);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Failed to create checkout session', detail: err?.message }));
    }
  }

  // ── Membership checkout (default) ────────────────────────────────────────
  const { tierId } = body;
  if (!tierId) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'tierId required' }));
  }

  // Fetch the tier — robust lookup by ID or NAME
  let query = supabase.from('membership_tiers').select('id, name, price');
  if (isNaN(Number(tierId))) {
    // If it's a string (e.g. 'plus', 'pro'), match by name
    query = query.eq('name', String(tierId).toLowerCase());
  } else {
    query = query.eq('id', Number(tierId));
  }
  
  const { data: tier, error: tierError } = await query.maybeSingle();

  if (tierError || !tier) {
    console.error(`[membership-checkout] Tier not found for input: ${tierId}`);
    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'Tier not found in database' }));
  }

  const priceInPence = Math.round(Number(tier.price));
  if (!priceInPence || priceInPence <= 0) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Free tier — no checkout needed' }));
  }

  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            unit_amount: priceInPence,
            product_data: {
              name: `HOTMESS ${tier.name.replace(/_/g, ' ').toUpperCase()} Membership`,
              description: `Recurring HOTMESS ${tier.name} subscription`,
            },
            recurring: {
              interval: 'month',
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
      return_url: `${origin}/more/settings?membership=success&tier=${encodeURIComponent(tier.name)}&session_id={CHECKOUT_SESSION_ID}`,
      allow_promotion_codes: true,
    });

    res.statusCode = 200;
    return res.end(JSON.stringify({ clientSecret: session.client_secret }));
  } catch (err) {
    console.error('[membership-checkout] Stripe error:', err?.message);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Failed to create checkout session', detail: err?.message }));
  }
}
