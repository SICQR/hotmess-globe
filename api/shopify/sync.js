import { createClient } from '@supabase/supabase-js';
import { getEnv, json, normalizeDetails, normalizeShopDomain } from './_utils.js';
import { bestEffortRateLimit, minuteBucket } from '../_rateLimit.js';
import { getRequestIp } from '../routing/_utils.js';
import { requireAdmin } from '../_middleware/adminAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', ['SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY']);
  const supabaseServiceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    return json(res, 500, {
      error: 'Supabase server env not configured',
      details: 'Set SUPABASE_URL and SUPABASE_ANON_KEY (or VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY).',
    });
  }

  if (!supabaseServiceRoleKey) {
    return json(res, 500, {
      error: 'Supabase service role key missing',
      details: 'Set SUPABASE_SERVICE_ROLE_KEY in server environment variables (Vercel).',
    });
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Use centralized admin authentication
  const adminCheck = await requireAdmin(req, { anonClient, serviceClient });
  if (adminCheck.error) {
    return json(res, adminCheck.status, { error: adminCheck.error });
  }

  const adminUser = adminCheck.user;

  // Rate limits: per-user + per-IP (best-effort).
  // Sync is lighter than import but still potentially abusive.
  {
    const ip = getRequestIp(req);
    const userId = adminUser.id;
    const bucketKey = `shopify:sync:${userId}:${ip || 'noip'}:${minuteBucket()}`;
    const rl = await bestEffortRateLimit({
      serviceClient,
      bucketKey,
      userId,
      ip,
      windowSeconds: 60,
      maxRequests: 2,
    });

    if (rl.allowed === false) {
      return json(res, 429, { error: 'Rate limit exceeded', remaining: rl.remaining ?? 0 });
    }
  }

  const shopDomain = normalizeShopDomain(getEnv('SHOPIFY_SHOP_DOMAIN', ['SHOPIFY_STORE_URL', 'SHOPIFY_DOMAIN']));
  const shopifyAccessToken = getEnv('SHOPIFY_ADMIN_ACCESS_TOKEN', ['SHOPIFY_ACCESS_TOKEN']);

  if (!shopDomain || !shopifyAccessToken) {
    const present = {
      SHOPIFY_SHOP_DOMAIN: !!getEnv('SHOPIFY_SHOP_DOMAIN'),
      SHOPIFY_STORE_URL: !!getEnv('SHOPIFY_STORE_URL'),
      SHOPIFY_DOMAIN: !!getEnv('SHOPIFY_DOMAIN'),
      SHOPIFY_ACCESS_TOKEN: !!getEnv('SHOPIFY_ACCESS_TOKEN'),
      SHOPIFY_ADMIN_ACCESS_TOKEN: !!getEnv('SHOPIFY_ADMIN_ACCESS_TOKEN'),
      SHOPIFY_STOREFRONT_ACCESS_TOKEN: !!getEnv('SHOPIFY_STOREFRONT_ACCESS_TOKEN'),
    };

    return json(res, 400, {
      error: 'Shopify credentials not configured',
      details:
        'Set SHOPIFY_SHOP_DOMAIN (or SHOPIFY_STORE_URL) and SHOPIFY_ADMIN_ACCESS_TOKEN (or SHOPIFY_ACCESS_TOKEN).',
      debug_present: present,
    });
  }

  try {
    // Load existing Shopify-backed products
    const { data: existing, error: existingErr } = await serviceClient
      .from('products')
      .select('id,name,inventory_count,details')
      .eq('seller_email', 'shopify@hotmess.london');

    if (existingErr) throw existingErr;

    const shopifyRows = (existing || [])
      .map((row) => {
        const details = normalizeDetails(row?.details) || null;
        return details ? { ...row, details } : row;
      })
      .filter((p) => p?.details?.shopify_id);

    const syncedProducts = [];
    const errors = [];

    for (const product of shopifyRows) {
      const shopifyId = String(product.details.shopify_id);
      const resp = await fetch(
        `https://${shopDomain}/admin/api/2024-01/products/${shopifyId}.json`,
        {
          headers: {
            'X-Shopify-Access-Token': shopifyAccessToken,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        errors.push({ product_id: product.id, error: `Shopify API error (${resp.status}): ${text || resp.statusText}` });
        continue;
      }

      const payload = await resp.json();
      const shopifyProduct = payload?.product;
      if (!shopifyProduct) {
        errors.push({ product_id: product.id, error: 'Missing product payload from Shopify' });
        continue;
      }

      const desiredVariantId = product.details.shopify_variant_id;
      const variant = (shopifyProduct.variants || []).find(
        (v) => String(v.id) === String(desiredVariantId)
      ) || (shopifyProduct.variants || [])[0];

      if (!variant) {
        errors.push({ product_id: product.id, error: 'No variants returned from Shopify' });
        continue;
      }

      const updates = {
        inventory_count: variant.inventory_quantity || 0,
        status: (variant.inventory_quantity || 0) > 0 ? 'active' : 'sold_out',
        price_gbp: parseFloat(variant.price),
        price_xp: Math.round(parseFloat(variant.price) * 100),
        updated_at: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      };

      const { error } = await serviceClient.from('products').update(updates).eq('id', product.id);
      if (error) {
        errors.push({ product_id: product.id, error: error.message });
        continue;
      }

      syncedProducts.push({
        product_id: product.id,
        name: product.name,
        old_inventory: product.inventory_count,
        new_inventory: updates.inventory_count,
      });
    }

    return json(res, 200, {
      success: true,
      synced: syncedProducts.length,
      errors: errors.length,
      timestamp: new Date().toISOString(),
      synced_products: syncedProducts,
      error_details: errors,
    });
  } catch (error) {
    console.error('Inventory sync error:', error);
    return json(res, 500, { error: error?.message || 'Inventory sync failed' });
  }
}
