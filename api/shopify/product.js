import { getEnv, getQueryParam, json, normalizeShopDomain } from './_utils.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const handle = String(getQueryParam(req, 'handle') ?? '').trim();
  if (!handle) {
    return json(res, 400, { error: 'Missing required query param: handle' });
  }

  const shopDomain = normalizeShopDomain(getEnv('SHOPIFY_SHOP_DOMAIN'));
  const storefrontTokenPrimary = getEnv('SHOPIFY_API_STOREFRONT_ACCESS_TOKEN');
  const storefrontTokenFallback = getEnv('SHOPIFY_STOREFRONT_ACCESS_TOKEN');
  const storefrontToken =
    storefrontTokenPrimary ||
    (storefrontTokenFallback && !String(storefrontTokenFallback).startsWith('shpat_')
      ? storefrontTokenFallback
      : null);

  if (!shopDomain || !storefrontToken) {
    return json(res, 500, {
      error: 'Missing SHOPIFY_SHOP_DOMAIN or Shopify Storefront token',
      details: 'Set SHOPIFY_API_STOREFRONT_ACCESS_TOKEN (preferred) or SHOPIFY_STOREFRONT_ACCESS_TOKEN.',
    });
  }

  if (String(storefrontToken).startsWith('shpat_')) {
    return json(res, 500, {
      error: 'Invalid Shopify Storefront token (looks like an Admin API token)',
      details:
        'Set SHOPIFY_STOREFRONT_ACCESS_TOKEN to your Storefront API token (NOT the Admin API shpat_* token).',
    });
  }

  const endpoint = `https://${shopDomain}/api/2024-01/graphql.json`;
  const query = `#graphql
    query ProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        id
        title
        handle
        descriptionHtml
        onlineStoreUrl
        featuredImage {
          url
          altText
        }
        images(first: 10) {
          nodes {
            url
            altText
          }
        }
        variants(first: 25) {
          nodes {
            id
            title
            availableForSale
            price {
              amount
              currencyCode
            }
            compareAtPrice {
              amount
              currencyCode
            }
          }
        }
      }
    }
  `;

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontToken,
      },
      body: JSON.stringify({
        query,
        variables: { handle },
      }),
    });

    const payload = await resp.json().catch(() => null);

    if (!resp.ok) {
      const msg = payload?.errors?.[0]?.message || resp.statusText;
      return json(res, resp.status, { error: `Shopify Storefront API error: ${msg}` });
    }

    if (payload?.errors?.length) {
      return json(res, 502, { error: payload.errors[0]?.message || 'Shopify Storefront API error' });
    }

    const product = payload?.data?.productByHandle || null;
    if (!product) {
      return json(res, 404, { error: 'Product not found', handle });
    }

    // Light caching: safe for public product metadata.
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');

    return json(res, 200, { ok: true, product });
  } catch (error) {
    return json(res, 500, { error: error?.message || 'Unknown error' });
  }
}
