import { json } from './_utils.js';
import { ensureStorefrontConfigured, getStorefrontConfig, storefrontFetch } from './_storefront.js';

const DEFAULT_HANDLES = ['hnh-mess-lube-50ml', 'hnh-mess-lube-250ml'];

const normalizeHandle = (value) => String(value || '').trim().toLowerCase();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const configured = ensureStorefrontConfigured(res);
  if (!configured) return;

  const { shopDomain, token } = configured;
  const { apiVersion } = getStorefrontConfig();

  const handles = DEFAULT_HANDLES;

  const productFields = `
    id
    title
    handle
    descriptionHtml
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
      handles.map((handle) =>
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

    // Preserve the configured order (50ml then 250ml).
    const indexByHandle = new Map(handles.map((h, i) => [normalizeHandle(h), i]));
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
