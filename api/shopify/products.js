import { getQueryParam, json } from './_utils.js';
import { ensureStorefrontConfigured, getStorefrontConfig, storefrontFetch } from './_storefront.js';

/**
 * GET /api/shopify/products
 *
 * Lists products from the Shopify Storefront API.
 * Supports: ?search=term&category=handle&limit=N
 *
 * GET /api/shopify/products/:handle  (via query param ?handle=...)
 * Returns a single product by handle.
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

  // Single product by handle (when called as /api/shopify/products/some-handle)
  const handleParam = getQueryParam(req, 'handle');
  if (handleParam) {
    return getSingleProduct({ shopDomain, token, apiVersion, handle: handleParam, res });
  }

  // List products with optional filters
  const search = getQueryParam(req, 'search') || '';
  const category = getQueryParam(req, 'category') || '';
  const limit = Math.min(parseInt(getQueryParam(req, 'limit') || '50', 10), 100);

  try {
    let query;
    let variables;

    if (category) {
      // Fetch products from a specific collection
      query = `#graphql
        query CollectionProducts($handle: String!, $first: Int!) {
          collectionByHandle(handle: $handle) {
            products(first: $first) {
              nodes {
                ${PRODUCT_FIELDS}
              }
            }
          }
        }
      `;
      variables = { handle: category, first: limit };
    } else if (search) {
      // Search products by query
      query = `#graphql
        query SearchProducts($query: String!, $first: Int!) {
          products(first: $first, query: $query) {
            nodes {
              ${PRODUCT_FIELDS}
            }
          }
        }
      `;
      variables = { query: search, first: limit };
    } else {
      // List all products
      query = `#graphql
        query AllProducts($first: Int!) {
          products(first: $first, sortKey: CREATED_AT, reverse: true) {
            nodes {
              ${PRODUCT_FIELDS}
            }
          }
        }
      `;
      variables = { first: limit };
    }

    const payload = await storefrontFetch({ shopDomain, token, apiVersion, query, variables });

    const products = category
      ? payload?.data?.collectionByHandle?.products?.nodes || []
      : payload?.data?.products?.nodes || [];

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=300');
    return json(res, 200, { ok: true, products });
  } catch (error) {
    return json(res, error?.status || 500, { error: error?.message || 'Unknown error' });
  }
}

async function getSingleProduct({ shopDomain, token, apiVersion, handle, res }) {
  const query = `#graphql
    query ProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        ${PRODUCT_FIELDS}
      }
    }
  `;

  try {
    const payload = await storefrontFetch({
      shopDomain, token, apiVersion, query, variables: { handle },
    });

    const product = payload?.data?.productByHandle || null;
    if (!product) {
      return json(res, 404, { error: 'Product not found', handle });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
    return json(res, 200, { ok: true, product });
  } catch (error) {
    return json(res, error?.status || 500, { error: error?.message || 'Unknown error' });
  }
}

const PRODUCT_FIELDS = `
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
