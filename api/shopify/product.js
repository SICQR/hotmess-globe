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
  const allowed = new Set([...defaults, ...fromCsv].filter(Boolean));
  return { allowed };
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

  const requested = normalizeHandle(handle);
  const { allowed } = getAllowedHandles();

  if (!allowed.has(requested)) {
    return json(res, 404, { error: 'Product not allowed', handle });
  }
  const query = `#graphql
    query ProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        id
        title
        handle
        descriptionHtml
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
    const payload = await storefrontFetch({
      shopDomain,
      token,
      apiVersion,
      query,
      variables: { handle },
    });

    const product = payload?.data?.productByHandle || null;
    if (!product) {
      return json(res, 404, { error: 'Product not found', handle });
    }

    // Light caching: safe for public product metadata.
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');

    return json(res, 200, { ok: true, product });
  } catch (error) {
    return json(res, error?.status || 500, { error: error?.message || 'Unknown error' });
  }
}
