import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getEnv, json, readJsonBody } from './_utils.js';
import logger from '../_utils/logger.js';

const timingSafeEqual = (a, b) => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
};

const verifyWebhook = ({ secret, rawBody, signature }) => {
  if (!secret || !signature || !rawBody) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
  return timingSafeEqual(digest, signature);
};

/**
 * Handle inventory level updates from Shopify
 */
const handleInventoryUpdate = async (serviceClient, payload) => {
  const { inventory_item_id, available } = payload;
  if (!inventory_item_id) return { handled: false };
  
  // Validate inventory quantity (must be non-negative)
  const inventoryQty = Number.isFinite(Number(available)) ? Number(available) : 0;
  if (inventoryQty < 0) {
    logger.warn(`Invalid negative inventory for item ${inventory_item_id}: ${available}`);
    return { handled: false, error: 'Invalid inventory quantity' };
  }

  // Update local product inventory if we track it
  const { data, error } = await serviceClient
    .from('products')
    .update({ 
      inventory_quantity: inventoryQty,
      updated_at: new Date().toISOString()
    })
    .eq('shopify_inventory_item_id', String(inventory_item_id));

  return { handled: !error, updated: data?.length || 0 };
};

/**
 * Handle product updates from Shopify
 */
const handleProductUpdate = async (serviceClient, payload) => {
  const { id, title, status, variants } = payload;
  if (!id) return { handled: false };

  const shopifyId = String(id);
  const isActive = status === 'active';

  // Update product status
  const { error } = await serviceClient
    .from('products')
    .update({
      title: title || undefined,
      active: isActive,
      updated_at: new Date().toISOString()
    })
    .eq('shopify_product_id', shopifyId);

  // Update variant prices if included
  if (Array.isArray(variants)) {
    for (const variant of variants) {
      await serviceClient
        .from('products')
        .update({
          price: variant.price ? parseFloat(variant.price) * 100 : undefined,
          compare_at_price: variant.compare_at_price ? parseFloat(variant.compare_at_price) * 100 : undefined,
        })
        .eq('shopify_variant_id', String(variant.id));
    }
  }

  return { handled: !error, shopifyId };
};

/**
 * Handle product deletion from Shopify
 */
const handleProductDelete = async (serviceClient, payload) => {
  const { id } = payload;
  if (!id) return { handled: false };

  // Soft delete - mark as inactive
  const { error } = await serviceClient
    .from('products')
    .update({
      active: false,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('shopify_product_id', String(id));

  return { handled: !error, deleted: String(id) };
};

/**
 * Handle order creation from Shopify
 */
const handleOrderCreated = async (serviceClient, payload) => {
  const { id, email, financial_status, fulfillment_status, line_items, total_price } = payload;
  if (!id) return { handled: false };

  // Log order for analytics
  const { error } = await serviceClient
    .from('shopify_orders')
    .upsert({
      shopify_order_id: String(id),
      customer_email: email,
      financial_status,
      fulfillment_status,
      total_price: total_price ? parseFloat(total_price) * 100 : 0,
      line_items_count: Array.isArray(line_items) ? line_items.length : 0,
      raw_payload: payload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'shopify_order_id'
    });

  return { handled: !error, orderId: String(id) };
};

/**
 * Handle order updates from Shopify
 */
const handleOrderUpdated = async (serviceClient, payload) => {
  const { id, financial_status, fulfillment_status } = payload;
  if (!id) return { handled: false };

  const { error } = await serviceClient
    .from('shopify_orders')
    .update({
      financial_status,
      fulfillment_status,
      updated_at: new Date().toISOString()
    })
    .eq('shopify_order_id', String(id));

  return { handled: !error, orderId: String(id) };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const secret = getEnv('SHOPIFY_WEBHOOK_SECRET');
  if (!secret) {
    return json(res, 500, { error: 'Webhook secret not configured', details: 'Set SHOPIFY_WEBHOOK_SECRET.' });
  }

  // Vercel may hand us a parsed body; we need a stable raw string for HMAC.
  let rawBody = null;
  if (typeof req.body === 'string') rawBody = req.body;
  if (!rawBody) {
    const parsed = await readJsonBody(req);
    rawBody = parsed ? JSON.stringify(parsed) : '';
  }

  const signature = String(req.headers?.['x-shopify-hmac-sha256'] || req.headers?.['X-Shopify-Hmac-Sha256'] || '');
  const topic = String(req.headers?.['x-shopify-topic'] || req.headers?.['X-Shopify-Topic'] || '');

  const ok = verifyWebhook({ secret, rawBody, signature });
  if (!ok) {
    return json(res, 401, { error: 'Invalid webhook signature' });
  }

  // Parse JSON payload
  const body = (() => {
    try {
      return rawBody ? JSON.parse(rawBody) : null;
    } catch {
      return null;
    }
  })();

  // Initialize Supabase for database updates
  const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
  const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  
  let result = { topic, handled: false };

  if (supabaseUrl && supabaseServiceKey && body) {
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Route webhook by topic
    switch (topic) {
      case 'inventory_levels/update':
        result = { ...result, ...(await handleInventoryUpdate(serviceClient, body)) };
        break;
      case 'products/update':
        result = { ...result, ...(await handleProductUpdate(serviceClient, body)) };
        break;
      case 'products/delete':
        result = { ...result, ...(await handleProductDelete(serviceClient, body)) };
        break;
      case 'orders/create':
        result = { ...result, ...(await handleOrderCreated(serviceClient, body)) };
        break;
      case 'orders/updated':
      case 'orders/paid':
      case 'orders/fulfilled':
        result = { ...result, ...(await handleOrderUpdated(serviceClient, body)) };
        break;
      default:
        result.handled = false;
        result.reason = 'unhandled_topic';
    }
  }

  res.setHeader('Cache-Control', 'no-store');
  return json(res, 200, {
    ok: true,
    received: {
      topic,
      id: body?.id || body?.admin_graphql_api_id || null,
    },
    result
  });
}
