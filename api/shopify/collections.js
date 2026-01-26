import { getQueryParam, json } from './_utils.js';
import { ensureStorefrontConfigured, getStorefrontConfig, storefrontFetch } from './_storefront.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const configured = ensureStorefrontConfigured(res);
  if (!configured) return;

  const { shopDomain, token } = configured;
  const { apiVersion } = getStorefrontConfig();

  const first = Math.min(Math.max(Number(getQueryParam(req, 'first') || 24) || 24, 1), 100);

  const query = `#graphql
    query Collections($first: Int!) {
      collections(first: $first, sortKey: UPDATED_AT, reverse: true) {
        nodes {
          id
          title
          handle
          description
          image {
            url
            altText
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
      variables: { first },
    });

    const collections = payload?.data?.collections?.nodes || [];

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
    return json(res, 200, { ok: true, collections });
  } catch (error) {
    return json(res, error?.status || 500, { error: error?.message || 'Unknown error' });
  }
}
