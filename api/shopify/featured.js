import { getQueryParam, json } from './_utils.js';
import { ensureStorefrontConfigured, getStorefrontConfig, storefrontFetch } from './_storefront.js';

const DEFAULT_HANDLES = ['hnh-mess-lube-50ml', 'hnh-mess-lube-250ml'];

const normalizeHandle = (value) => String(value || '').trim().toLowerCase();

/**
 * GET /api/shopify/featured
 *
 * Returns featured products by handle.
 * Supports: ?handles=handle-a,handle-b  (comma-separated)
 * Falls back to DEFAULT_HANDLES (HNH lube) when no handles param provided.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const configured = ensureStorefrontConfigured(res);
  if (!configured) return;

  const { shopDomain, token } = configured;
  const { apiVersion } = getStorefrontConfig();

  // Parse handles from query param or fall back to defaults
  const handlesParam = getQueryParam(req, 'handles');
  const handles = handlesParam
    ? handlesParam.split(',').map(h => h.trim()).filter(Boolean)
    : DEFAULT_HANDLES;

  // Cap at 10 handles to avoid abuse
  const cappedHandles = handles.slice(0, 10);

  const productFields = `
    id
    title
    handle
    descriptionHtml
    productType
    tags
    featuredImage { url altText }
    images(first: 10) { nodes { url altText } }
    variants(first: 25) {
      nodes {
        id
        title
        availableForSale
        price { amount currencyCode }
        compareAtPrice { amount currencyCode }
      }
    }
  `;

  const byHandleQuery = `#graphql
    query FeaturedProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        ${productFields}
      }
    }
  `;

  try {
    const responses = await Promise.all(
      cappedHandles.map((handle) =>
        storefrontFetch({
          shopDomain,
          token,
          apiVersion,
          query: byHandleQuery,
          variables: { handle },
        })
      )
    );

    const products = responses
      .map((resp) => resp?.data?.productByHandle || null)
      .filter(Boolean);

    // Preserve the requested order.
    const indexByHandle = new Map(cappedHandles.map((h, i) => [normalizeHandle(h), i]));
    products.sort((a, b) => (indexByHandle.get(normalizeHandle(a?.handle)) ?? 999) - (indexByHandle.get(normalizeHandle(b?.handle)) ?? 999));

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
    return json(res, 200, {
      ok: true,
      products,
      handles: products.map((p) => p.handle).filter(Boolean),
    });
  } catch (error) {
    return json(res, error?.status || 500, { error: error?.message || 'Unknown error' });
  }
}
