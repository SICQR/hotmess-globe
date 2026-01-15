import { getQueryParam, json } from './_utils.js';
import { ensureStorefrontConfigured, getStorefrontConfig, storefrontFetch } from './_storefront.js';

const DEFAULT_ALLOWED_HANDLES = ['hnh-mess-lube-50ml', 'hnh-mess-lube-250ml'];

const normalizeHandle = (value) => String(value || '').trim().toLowerCase();

const getAllowedHandles = () => {
  const rawCsv = process.env.SHOPIFY_ALLOWED_PRODUCT_HANDLES;
  const fromCsv = String(rawCsv || '')
    .split(',')
    .map((s) => normalizeHandle(s))
    .filter(Boolean);

  const defaults = DEFAULT_ALLOWED_HANDLES.map(normalizeHandle).filter(Boolean);
  return new Set([...defaults, ...fromCsv].filter(Boolean));
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const handle = String(getQueryParam(req, 'handle') ?? '').trim();
  if (!handle) {
    return json(res, 400, { error: 'Missing required query param: handle' });
  }

  const configured = ensureStorefrontConfigured(res);
  if (!configured) return;

  const { shopDomain, token } = configured;
  const { apiVersion } = getStorefrontConfig();

  const allowedHandles = getAllowedHandles();

  const firstProducts = Math.min(Math.max(Number(getQueryParam(req, 'firstProducts') || 24) || 24, 1), 50);

  const query = `#graphql
    query CollectionByHandle($handle: String!, $firstProducts: Int!) {
      collectionByHandle(handle: $handle) {
        id
        title
        handle
        description
        image {
          url
          altText
        }
        products(first: $firstProducts) {
          nodes {
            id
            title
            handle
            availableForSale
            featuredImage {
              url
              altText
            }
            priceRange {
              minVariantPrice { amount currencyCode }
              maxVariantPrice { amount currencyCode }
            }
            totalInventory
            variants(first: 50) {
              nodes {
                id
                availableForSale
                quantityAvailable
              }
            }
          }
        }
      }
    }
  `;

  try {
    const payload = await storefrontFetch({
      shopDomain,
      token,
      apiVersion,
      query,
      variables: { handle, firstProducts },
    });

    const collection = payload?.data?.collectionByHandle || null;
    if (!collection) {
      return json(res, 404, { error: 'Collection not found', handle });
    }

    // Enforce: only return products that are available/in stock.
    // Storefront API only exposes published products, so "active" is implicit.
    const rawProducts = collection?.products?.nodes || [];
    const filteredProducts = rawProducts.filter((p) => {
      if (!p) return false;
      if (allowedHandles.size) {
        const h = normalizeHandle(p.handle);
        if (!allowedHandles.has(h)) return false;
      }
      if (!p.availableForSale) return false;

      const variants = p?.variants?.nodes || [];
      if (variants.length) {
        return variants.some((v) => {
          if (!v) return false;
          if (!v.availableForSale) return false;

          // Some stores disable inventory tracking; quantityAvailable may be null.
          const qa = v.quantityAvailable;
          if (qa === null || qa === undefined) return true;
          if (typeof qa === 'number') return qa > 0;

          const n = Number(qa);
          return Number.isFinite(n) ? n > 0 : true;
        });
      }

      // Fallback: some shops may not expose variant inventory fields.
      if (typeof p.totalInventory === 'number') return p.totalInventory > 0;
      return true;
    });

    if (collection?.products) {
      collection.products.nodes = filteredProducts;
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
    return json(res, 200, { ok: true, collection });
  } catch (error) {
    return json(res, error?.status || 500, { error: error?.message || 'Unknown error' });
  }
}
