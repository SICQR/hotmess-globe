/**
 * /api/shopify/sync-check
 *
 * Read-only diagnostic. Returns the drift between:
 *   - PUBLIC: products visible at https://shop.hotmessldn.com/products.json
 *     (everything Shopify has published to the public Online Store)
 *   - APP:    products returned by the Storefront API token this app uses
 *     (i.e. what /api/shopify/products returns)
 *
 * If PUBLIC > APP, the missing handles are products that exist on Shopify
 * but aren't ticked on the headless channel — the exact failure mode from
 * #463/#488. The cron at /api/cron/shopify-auto-publish runs every 15 min
 * to auto-correct this; this endpoint is the human-readable check.
 *
 * No auth: read-only, both upstream endpoints are public.
 *
 * Response shape:
 *   {
 *     ok: true,
 *     public_count: number,
 *     app_count: number,
 *     drift: number,
 *     missing_in_app: [{ handle, title }, ...],
 *     extra_in_app: [{ handle, title }, ...],  // rare — products visible to
 *                                              // app token but not on public
 *                                              // storefront (test products, etc.)
 *     checked_at: ISO timestamp
 *   }
 */

import { json, normalizeShopDomain, getEnv } from './_utils.js';

const fetchPublic = async (shopHost) => {
  const url = `https://${shopHost}/products.json?limit=250`;
  const resp = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!resp.ok) throw new Error(`Public products.json: ${resp.status}`);
  const data = await resp.json();
  return Array.isArray(data?.products) ? data.products : [];
};

const fetchAppView = async (origin) => {
  // Same-origin call — works in Vercel preview + prod.
  const url = `${origin}/api/shopify/products?limit=100&_t=${Date.now()}`;
  const resp = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!resp.ok) throw new Error(`App API: ${resp.status}`);
  const data = await resp.json();
  return Array.isArray(data?.products) ? data.products : [];
};

const inferOrigin = (req) => {
  const host = req.headers?.host || req.headers?.['x-forwarded-host'];
  const proto =
    req.headers?.['x-forwarded-proto'] ||
    (host && String(host).includes('localhost') ? 'http' : 'https');
  return host ? `${proto}://${host}` : null;
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  // Use the storefront subdomain for the public-truth read. If env hints at a
  // different shop domain, derive from there; otherwise fall back to the known
  // production shop subdomain.
  const configuredShop = normalizeShopDomain(
    getEnv('SHOPIFY_PUBLIC_SHOP_HOST', ['SHOPIFY_PUBLIC_DOMAIN'])
  );
  const shopHost = configuredShop || 'shop.hotmessldn.com';

  const origin = inferOrigin(req);
  if (!origin) {
    return json(res, 500, { error: 'Could not infer request origin' });
  }

  try {
    const [publicProducts, appProducts] = await Promise.all([
      fetchPublic(shopHost),
      fetchAppView(origin),
    ]);

    const publicByHandle = new Map(
      publicProducts.map((p) => [p.handle, { handle: p.handle, title: p.title }])
    );
    // App products carry handle inside metadata.handle (per market.ts normalisation).
    // The /api/shopify/products endpoint returns the raw Shopify nodes, so handle
    // is at the top level.
    const appByHandle = new Map(
      appProducts.map((p) => [p.handle, { handle: p.handle, title: p.title }])
    );

    const missing_in_app = [];
    for (const [handle, info] of publicByHandle) {
      if (!appByHandle.has(handle)) missing_in_app.push(info);
    }

    const extra_in_app = [];
    for (const [handle, info] of appByHandle) {
      if (!publicByHandle.has(handle)) extra_in_app.push(info);
    }

    res.setHeader('Cache-Control', 'no-store');
    return json(res, 200, {
      ok: true,
      checked_at: new Date().toISOString(),
      public_host: shopHost,
      public_count: publicByHandle.size,
      app_count: appByHandle.size,
      drift: missing_in_app.length,
      missing_in_app,
      extra_in_app,
      hint:
        missing_in_app.length > 0
          ? 'Products listed in `missing_in_app` are on the public storefront but ' +
            'not visible to the app. The auto-publish cron should resolve within 15 min. ' +
            'For an immediate fix tick the headless channel on those products in Shopify Admin.'
          : 'In sync.',
    });
  } catch (error) {
    return json(res, 500, {
      ok: false,
      error: error?.message || 'sync-check failed',
    });
  }
}
