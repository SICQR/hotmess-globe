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

  // Accept either "your-store.myshopify.com" or "https://your-store.myshopify.com"
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
  // 1) Prefer role in auth metadata
  const { data: userData, error: userErr } = await anonClient.auth.getUser(accessToken);
  if (userErr || !userData?.user) return false;
  const roleFromMetadata = userData.user.user_metadata?.role;
  if (roleFromMetadata === 'admin') return true;

  // 2) Fallback to profile table role, if present
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

const fetchAllShopifyProducts = async ({ shopDomain, accessToken, statuses = ['active'] }) => {
  const seen = new Set();
  const products = [];
  const perStatusCounts = {};

  for (const status of statuses) {
    let url = `https://${shopDomain}/admin/api/2024-01/products.json?limit=250&status=${encodeURIComponent(status)}`;
    let fetchedForStatus = 0;

    while (url) {
      const resp = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`Shopify API error (${resp.status}): ${text || resp.statusText}`);
      }

      const payload = await resp.json();
      const pageProducts = payload?.products || [];
      fetchedForStatus += pageProducts.length;

      for (const p of pageProducts) {
        const id = p?.id;
        if (!id) continue;
        const key = String(id);
        if (seen.has(key)) continue;
        seen.add(key);
        products.push(p);
      }

      // Parse pagination link header
      const link = resp.headers.get('link') || resp.headers.get('Link');
      const nextMatch = link && link.match(/<([^>]+)>;\s*rel="next"/i);
      url = nextMatch?.[1] || null;
    }

    perStatusCounts[status] = fetchedForStatus;
  }

  return { products, perStatusCounts };
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
    // Common misnaming: in some setups people paste an Admin API token (shpat_*)
    // into a "storefront" variable. Accept as fallback so local/dev works.
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
    const { products: shopifyProducts, perStatusCounts } = await fetchAllShopifyProducts({
      shopDomain,
      accessToken: shopifyAccessToken,
    });

    const activeShopifyIds = new Set(shopifyProducts.map((p) => String(p?.id)).filter(Boolean));

    // Build a lookup of existing Shopify products (by details.shopify_id)
    const { data: existingOfficial, error: existingErr } = await serviceClient
      .from('products')
      .select('id,details')
      .eq('seller_email', 'shopify@hotmess.london');

    if (existingErr) throw existingErr;

    const byShopifyId = new Map();
    for (const row of existingOfficial || []) {
      const shopifyId = row?.details?.shopify_id;
      if (shopifyId) byShopifyId.set(String(shopifyId), row.id);
    }

    const importedIds = [];
    const updatedIds = [];
    const draftedIds = [];

    // Hide any previously-imported Shopify products that are no longer active in Shopify.
    // (Prevents old drafts/archived products from showing up as "duplicates" in the app.)
    const toDraftIds = [];
    for (const row of existingOfficial || []) {
      const sid = row?.details?.shopify_id ? String(row.details.shopify_id) : null;
      if (!sid) continue;
      if (activeShopifyIds.has(sid)) continue;
      toDraftIds.push(row.id);
    }

    if (toDraftIds.length) {
      const draftUpdate = {
        status: 'draft',
        updated_at: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      };

      // Batch the updates to keep the request fast.
      const BATCH_SIZE = 200;
      for (let i = 0; i < toDraftIds.length; i += BATCH_SIZE) {
        const batch = toDraftIds.slice(i, i + BATCH_SIZE);
        const { error } = await serviceClient
          .from('products')
          .update(draftUpdate)
          .in('id', batch);
        if (error) throw error;
        draftedIds.push(...batch);
      }
    }

    for (const p of shopifyProducts) {
      const variant = Array.isArray(p?.variants) ? p.variants[0] : null;
      if (!variant) continue;

      const shopifyId = String(p.id);

      const rawTags = String(p.tags || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const normalizedExtraTags = [p.product_type, p.vendor]
        .map((v) => String(v || '').trim())
        .filter(Boolean);

      const productData = {
        name: p.title,
        description: p.body_html?.replace(/<[^>]*>/g, '') || '',
        price_xp: Math.round(parseFloat(variant.price) * 100),
        price_gbp: parseFloat(variant.price),
        seller_email: 'shopify@hotmess.london',
        // Treat Shopify items as official merch in the app UI.
        product_type: 'merch',
        // Keep Shopify product_type as the app "category" so it can be displayed.
        category: p.product_type || 'general',
        // Preserve Shopify tags, and add some useful ones for in-app filtering.
        tags: Array.from(new Set(['official', ...rawTags, ...normalizedExtraTags])),
        image_urls: (p.images || []).map((img) => img?.src).filter(Boolean),
        status: p.status === 'active' ? 'active' : 'draft',
        inventory_count: variant.inventory_quantity || 0,
        details: {
          shopify_id: shopifyId,
          shopify_variant_id: String(variant.id),
          sku: variant.sku,
          shopify_handle: p.handle,
          shopify_vendor: p.vendor || null,
          shopify_product_type: p.product_type || null,
        },
        updated_at: new Date().toISOString(),
        updated_date: new Date().toISOString(),
        created_by: 'shopify-sync',
      };

      const existingId = byShopifyId.get(shopifyId);
      if (existingId) {
        const { error } = await serviceClient.from('products').update(productData).eq('id', existingId);
        if (error) throw error;
        updatedIds.push(existingId);
      } else {
        const { data: created, error } = await serviceClient
          .from('products')
          .insert({ ...productData, created_at: new Date().toISOString(), created_date: new Date().toISOString() })
          .select('id')
          .single();
        if (error) throw error;
        importedIds.push(created.id);
      }
    }

    return json(res, 200, {
      success: true,
      imported: importedIds.length,
      updated: updatedIds.length,
      drafted: draftedIds.length,
      total: shopifyProducts.length,
      shopify_counts_by_status: perStatusCounts,
      imported_ids: importedIds,
      updated_ids: updatedIds,
      drafted_ids: draftedIds,
    });
  } catch (error) {
    console.error('Shopify import error:', error);
    return json(res, 500, { error: error?.message || 'Shopify import failed' });
  }
}
