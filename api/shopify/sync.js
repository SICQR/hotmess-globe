import { createClient } from '@supabase/supabase-js';

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

const getEnv = (name, fallbacks = []) => {
  const candidates = [name, ...fallbacks];
  for (const key of candidates) {
    const value = process.env[key];
    if (value && String(value).trim()) return String(value).trim();
  }
  return null;
};

const normalizeShopDomain = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  try {
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return new URL(raw).host;
    }
    return new URL(`https://${raw}`).host;
  } catch {
    return raw;
  }
};

const getBearerToken = (req) => {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header) return null;
  const value = Array.isArray(header) ? header[0] : header;
  const match = String(value).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
};

const isAdminUser = async ({ anonClient, serviceClient, accessToken, email }) => {
  const { data: userData, error: userErr } = await anonClient.auth.getUser(accessToken);
  if (userErr || !userData?.user) return false;
  const roleFromMetadata = userData.user.user_metadata?.role;
  if (roleFromMetadata === 'admin') return true;

  const tryTables = ['User', 'users'];
  for (const table of tryTables) {
    const { data, error } = await serviceClient
      .from(table)
      .select('role')
      .eq('email', email)
      .maybeSingle();
    if (error) continue;
    if (data?.role === 'admin') return true;
  }

  return false;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', ['VITE_SUPABASE_ANON_KEY']);
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

  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return json(res, 401, { error: 'Unauthorized', details: 'Missing Authorization Bearer token' });
  }

  const { data: userData, error: userErr } = await anonClient.auth.getUser(accessToken);
  if (userErr || !userData?.user?.email) {
    return json(res, 401, { error: 'Unauthorized', details: 'Invalid session' });
  }

  const email = userData.user.email;
  const isAdmin = await isAdminUser({ anonClient, serviceClient, accessToken, email });
  if (!isAdmin) {
    return json(res, 403, { error: 'Forbidden: Admin access required' });
  }

  const shopDomain = normalizeShopDomain(
    getEnv('SHOPIFY_SHOP_DOMAIN', ['SHOPIFY_STORE_URL', 'SHOPIFY_DOMAIN'])
  );
  const shopifyAccessToken = getEnv('SHOPIFY_ACCESS_TOKEN', [
    'SHOPIFY_ADMIN_ACCESS_TOKEN',
    'SHOPIFY_STOREFRONT_ACCESS_TOKEN',
  ]);

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
        'Set SHOPIFY_SHOP_DOMAIN (or SHOPIFY_STORE_URL) and SHOPIFY_ACCESS_TOKEN (or SHOPIFY_ADMIN_ACCESS_TOKEN).',
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

    const shopifyRows = (existing || []).filter((p) => p?.details?.shopify_id);

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
