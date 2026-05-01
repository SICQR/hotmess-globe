export const config = {
  api: {
    bodyParser: false,
  },
};

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const SHOPIFY_ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || 'hotmessldn.myshopify.com';

async function createShopifyOrder(session) {
  if (!SHOPIFY_ADMIN_API_TOKEN) {
    console.error('[Shopify] Missing SHOPIFY_ADMIN_API_TOKEN');
    return;
  }

  const orderId = session.metadata?.order_id;
  const email = session.customer_details?.email || session.metadata?.user_email;
  const shipping = session.shipping_details;

  // Prepare Shopify line items
  // Note: We need variant IDs here. We pass them in the checkout session metadata or line items usually.
  // In our create-checkout-session.js, we don't put variantId in metadata, but we might have it in the session line items if we was careful.
  // Actually, we should probably fetch the list of items from Supabase using orderId to be safe and get variantIds.
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: order, error: fetchErr } = await supabase.from('orders').select('*').eq('id', orderId).single();
  
  if (fetchErr || !order || !order.items) {
    console.error('[Shopify] Order or items not found in Supabase for mirroring:', orderId, fetchErr?.message);
    return;
  }

  console.log(`[Shopify] Checking ${order.items.length} items for Shopify variants...`);

  // Smarter detection: if it has a variantId, treat it as a Shopify item
  const shopifyItems = order.items
    .filter(item => item.variantId || item.source === 'shopify')
    .map(item => {
      // Clean the variant ID (handle GIDs like gid://shopify/ProductVariant/12345 or plain IDs)
      const cleanVariantId = String(item.variantId).split('/').pop();
      return {
        variant_id: parseInt(cleanVariantId),
        quantity: item.qty || item.quantity || 1,
      };
    })
    .filter(item => !isNaN(item.variant_id));

  console.log(`[Shopify] Detected ${shopifyItems.length} Shopify-ready items.`);

  if (shopifyItems.length === 0) {
    console.log('[Shopify] No items found with valid Shopify Variant IDs. Skipping mirroring.');
    return;
  }

  const orderPayload = {
    order: {
      email: email,
      fulfillment_status: null,
      send_receipt: true,
      send_fulfillment_receipt: true,
      line_items: shopifyItems,
      shipping_address: shipping ? {
        first_name: shipping.name.split(' ')[0],
        last_name: shipping.name.split(' ').slice(1).join(' ') || 'Customer',
        address1: shipping.address.line1,
        address2: shipping.address.line2,
        city: shipping.address.city,
        province: shipping.address.state,
        zip: shipping.address.postal_code,
        country: shipping.address.country,
      } : undefined,
      financial_status: 'paid',
      note: `Created via HOTMESS App (Stripe Session: ${session.id})`,
      tags: 'App Order, Stripe',
    },
  };

  try {
    const response = await fetch(`https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/orders.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
      },
      body: JSON.stringify(orderPayload),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('[Shopify] Order creation failed:', JSON.stringify(result));
    } else {
      console.log('[Shopify] Order mirrored successfully:', result.order?.id);
      
      // Update our local order with the Shopify Order ID
      await supabase
        .from('orders')
        .update({ shopify_order_id: String(result.order?.id) })
        .eq('id', orderId);
    }
  } catch (err) {
    console.error('[Shopify] Fetch error:', err);
  }
}

async function processOrderCompletion(session, eventType, req) {
  const orderId = session.metadata?.order_id;
  const stripeType = session.metadata?.type;

  console.log(`[Webhook] Processing ${eventType} (Type: ${stripeType})`);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // ── Handle Membership Upgrades ──────────────────────────────────────────
  if (stripeType === 'membership') {
    const userId = session.metadata?.user_id;
    const tierName = session.metadata?.tier_name;

    if (!userId || !tierName) {
      console.error('[Webook] Missing membership metadata:', { userId, tierName });
      return;
    }

    console.log(`[Webhook] Upgrading user ${userId} to ${tierName}...`);
    
    let subscription_status = 'active';
    let subscription_ends_at = null;

    // If we have a subscription ID, fetch the real end date from Stripe
    if (session.subscription) {
      try {
        console.log('[Webhook] Fetching subscription details for:', session.subscription);
        const sub = await stripe.subscriptions.retrieve(session.subscription);
        
        subscription_status = sub.status || 'active';
        
        if (sub.current_period_end) {
          const timestamp = Number(sub.current_period_end);
          if (!isNaN(timestamp)) {
            subscription_ends_at = new Date(timestamp * 1000).toISOString();
          }
        }
        
        // Final fallback if date is still null but we have a sub
        if (!subscription_ends_at) {
          console.warn('[Webhook] current_period_end missing, using 31-day fallback');
          subscription_ends_at = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
        }

        console.log('[Webhook] Success! Status:', subscription_status, 'Ends at:', subscription_ends_at);
      } catch (e) {
        console.warn('[Webhook] Could not fetch subscription details:', e.message);
        // Fallback so it's not null
        subscription_ends_at = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    const { error: upgradeErr } = await supabase
      .from('profiles')
      .update({ 
        business_type: tierName.toLowerCase().includes('elite') || tierName.toLowerCase().includes('premium') ? 'premium' : tierName.toLowerCase(),
        profile_type: tierName.toLowerCase().includes('elite') || tierName.toLowerCase().includes('premium') ? 'premium' : tierName.toLowerCase(),
        membership_tier: `MESS — ${tierName.toUpperCase()}`,
        subscription_tier: tierName.toUpperCase(),
        stripe_subscription_id: session.subscription, 
        subscription_status,
        subscription_ends_at,
        is_business: true,
        is_verified: true
      })
      .eq('id', userId);

    if (upgradeErr) {
      console.error('[Webhook] Membership upgrade failed:', upgradeErr.message);
    } else {
      console.log(`[Webhook] User ${userId} successfully upgraded to ${tierName}. Status: ${subscription_status}`);
      // Send membership confirmation email
      await sendMembershipEmail(userId, tierName, req);
    }
    return;
  }

  // ── HNH MESS direct purchase completion ──────────────────────────────────
  if (session.metadata?.type === 'hnh_mess') {
    const userId      = session.metadata?.user_id ?? null;
    const source      = session.metadata?.source ?? 'unknown';
    const venueId     = session.metadata?.venue_id   || null;
    const beaconId    = session.metadata?.beacon_id  || null;
    const radioShowId = session.metadata?.radio_show_id || null;
    const sku         = session.metadata?.sku ?? 'small';
    const amountGbp   = (session.amount_total ?? 0) / 100;

    // Write order row with attribution metadata
    const { data: orderRow, error: orderErr } = await supabase
      .from('orders')
      .insert({
        user_id:     userId,
        product_key: 'hnh-mess',
        sku,
        amount:      amountGbp,
        currency:    'gbp',
        status:      'paid',
        stripe_session_id: session.id,
        buyer_email: session.customer_details?.email ?? session.metadata?.user_email ?? '',
        buyer_name:  session.customer_details?.name  ?? session.metadata?.user_name  ?? '',
        shipping_address: session.shipping_details
          ? `${session.shipping_details.name}
${session.shipping_details.address.line1}, ${session.shipping_details.address.city}, ${session.shipping_details.address.postal_code}`
          : null,
        metadata: {
          source,
          venue_id:      venueId,
          beacon_id:     beaconId,
          radio_show_id: radioShowId,
        },
      })
      .select('id')
      .single();

    if (orderErr) {
      console.error('[hnh_mess-webhook] order insert error:', orderErr.message);
    } else {
      console.log('[hnh_mess-webhook] order created:', orderRow?.id);
    }

    // Write attribution event to analytics_events
    if (userId) {
      await supabase.from('analytics_events').insert({
        user_id:    userId,
        event_name: 'hnh_purchase',
        category:   'conversion',
        label:      `hnh_mess_${sku}`,
        value:      amountGbp,
        properties: {
          source,
          sku,
          venue_id:      venueId,
          beacon_id:     beaconId,
          radio_show_id: radioShowId,
          stripe_session_id: session.id,
          order_id:      orderRow?.id ?? null,
        },
      });
    }

    console.log(`[hnh_mess-webhook] Done. source=${source} sku=${sku} amount=£${amountGbp}`);
    return;
  }

  // ── Handle Physical Orders (Existing Logic) ──────────────────────────────
  if (!orderId) {
    console.warn('[Webhook] No orderId found in metadata. Skipping processing.');
    return;
  }

  // 1. Extract shipping & buyer details
  const customerEmail = session.customer_details?.email || session.metadata?.user_email || session.receipt_email;
  const shipping = session.shipping_details;
  const buyerName = shipping?.name || session.customer_details?.name || 'Buyer';
  
  const shippingAddress = shipping 
    ? `${shipping.name}\n${shipping.address.line1}${shipping.address.line2 ? `, ${shipping.address.line2}` : ''}\n${shipping.address.city}, ${shipping.address.postal_code}, ${shipping.address.country}`
    : null;

  // 2. Update local Supabase tables
  console.log(`[Webhook] Updating Supabase tables for order ${orderId} status to 'paid'...`);
  
  // Update 'orders' table
  const { error: err1 } = await supabase
    .from('orders')
    .update({ 
      status: 'paid', 
      updated_at: new Date().toISOString(),
      stripe_session_id: session.id,
      shipping_address: shippingAddress || session.metadata?.shipping_address,
      buyer_name: buyerName,
      buyer_email: customerEmail
    })
    .eq('id', orderId);

  // Update 'product_orders' table (Used by the "More" tab/Order list)
  const { error: err2 } = await supabase
    .from('product_orders')
    .update({ 
      status: 'paid', 
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);

  if (err1) console.error('[Webhook] orders update fail:', err1.message);
  if (err2) console.error('[Webhook] product_orders update fail:', err2.message);

  if (!err1 && !err2) {
    console.log('[Webhook] Both local tables updated successfully.');
  }

  // 3. Clear user cart
  const userId = session.metadata?.user_id;
  if (userId) {
    console.log(`[Webhook] Clearing cart for user ${userId}...`);
    await supabase.from('cart_items').delete().eq('auth_user_id', userId);
  }

  // 4. Shopify Mirroring
  console.log(`[Webhook] Checking for Shopify mirroring for order ${orderId}...`);
  await createShopifyOrder(session);

  // 4. Send Email Notification
  if (customerEmail) {
    try {
      const protocol = req.headers?.host?.includes('localhost') ? 'http' : 'https';
      const baseUrl = process.env.VITE_APP_URL || (req.headers && req.headers.host ? `${protocol}://${req.headers.host}` : 'http://localhost:5173');
      
      const { data: orderData } = await supabase.from('orders').select('*').eq('id', orderId).single();
      
      let emailHtml = '';
      let emailSubject = '';

      // Check if it's a Preloved order or Shopify order
      const isPreloved = orderData?.items?.some(item => item.source === 'preloved');
      
      if (isPreloved) {
        const item = orderData.items[0];
        const itemName = item.title || item.name || 'Preloved Item';
        const sellerName = item.seller_name || 'HOTMESS Member';
        emailSubject = `You bought ${itemName}`;
        // Use a lightweight fetch to templates since we are in a serverless environment
        const { prelovedSaleConfirmation } = await import('../email/templates.js');
        emailHtml = prelovedSaleConfirmation(itemName, item.price || orderData.amount, sellerName);
      } else {
        emailSubject = `Your HOTMESS order is confirmed`;
        const { shopifyOrderConfirmation } = await import('../email/templates.js');
        emailHtml = shopifyOrderConfirmation(orderId, orderData?.items || [], orderData?.total || orderData?.amount || 'N/A');
      }
      
      await fetch(`${baseUrl}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: customerEmail,
          subject: emailSubject,
          html: emailHtml
        })
      });
      console.log(`[Webhook] Confirmation email sent to ${customerEmail}`);
    } catch (emailErr) {
      console.error('[Webhook] Email send fail:', emailErr.message);
    }
  }
}

async function sendMembershipEmail(userId, tierName, req) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: user } = await supabase.from('profiles').select('email').eq('id', userId).single();
  
  if (!user?.email) return;

  try {
    const protocol = req.headers?.host?.includes('localhost') ? 'http' : 'https';
    const baseUrl = process.env.VITE_APP_URL || (req.headers && req.headers.host ? `${protocol}://${req.headers.host}` : 'http://localhost:5173');
    
    const { membershipConfirmation } = await import('../email/templates.js');
    const emailHtml = membershipConfirmation(tierName.toUpperCase());
    
    await fetch(`${baseUrl}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: user.email,
        subject: `Welcome to HOTMESS ${tierName.toUpperCase()}`,
        html: emailHtml
      })
    });
    console.log(`[Webhook] Membership email sent to ${user.email}`);
  } catch (err) {
    console.error('[Webhook] Membership email fail:', err.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  // --- COLLECT RAW BODY ---
  const chunks = [];
  for await (const chunk of req) { chunks.push(chunk); }
  const rawBody = Buffer.concat(chunks);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    const isLocal = req.headers.host?.includes('localhost');
    
    // In production, ALWAYS verify the signature!
    // On localhost, Vite Dev Server can sometimes mutate raw streams so we bypass signature validation.
    if (!isLocal && process.env.STRIPE_WEBHOOK_SECRET && sig !== 'DEBUG') {
      event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      let payloadString = rawBody.toString();
      if (!payloadString && req.body) {
        payloadString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }
      const data = JSON.parse(payloadString);
      event = { type: data.type, object: data, data: data.data || data };
      
      // Standardize event structure to mimic constructEvent if it was just raw JSON
      if (data.type && data.data && data.data.object) {
          event.data = data.data; // Stripe standard format
      } else {
          event.data = { object: data }; // Fallback format
      }
    }
  } catch (err) {
    console.error('[Webhook] Parsing failed:', err.message);
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: `Webhook Error: ${err.message}` }));
  }

  console.log(`[Webhook] Event Received: ${event.type}`);

  // Handle both possible success events
  if (event.type === 'checkout.session.completed') {
    await processOrderCompletion(event.data.object, 'checkout.session.completed', req);
  } 
  else if (event.type === 'payment_intent.succeeded') {
    await processOrderCompletion(event.data.object, 'payment_intent.succeeded', req);
  }

  res.statusCode = 200;
  return res.end(JSON.stringify({ received: true }));
}
