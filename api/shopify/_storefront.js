import { getEnv, json, normalizeShopDomain } from './_utils.js';

export const getStorefrontConfig = () => {
  const shopDomain = normalizeShopDomain(getEnv('SHOPIFY_SHOP_DOMAIN', ['SHOPIFY_STORE_URL', 'SHOPIFY_DOMAIN']));
  const tokenRaw = getEnv('SHOPIFY_API_STOREFRONT_ACCESS_TOKEN', ['SHOPIFY_STOREFRONT_ACCESS_TOKEN']);
  const token = tokenRaw && !String(tokenRaw).startsWith('shpat_') ? String(tokenRaw).trim() : null;
  const apiVersion = String(getEnv('SHOPIFY_STOREFRONT_API_VERSION') || '2024-10').trim();

  return { shopDomain, tokenRaw, token, apiVersion };
};

export const ensureStorefrontConfigured = (res) => {
  const { shopDomain, tokenRaw, token } = getStorefrontConfig();

  if (!shopDomain || !token) {
    const extra = !shopDomain
      ? 'Set SHOPIFY_SHOP_DOMAIN (or SHOPIFY_STORE_URL / SHOPIFY_DOMAIN).'
      : 'Set SHOPIFY_API_STOREFRONT_ACCESS_TOKEN (preferred) or SHOPIFY_STOREFRONT_ACCESS_TOKEN.';

    json(res, 500, {
      error: 'Shopify Storefront API not configured',
      details: extra,
      debug: {
        hasShopDomain: !!shopDomain,
        hasToken: !!token,
        tokenLooksLikeAdmin: !!tokenRaw && String(tokenRaw).startsWith('shpat_'),
      },
    });

    return null;
  }

  if (tokenRaw && String(tokenRaw).startsWith('shpat_')) {
    json(res, 500, {
      error: 'Invalid Shopify Storefront token (looks like an Admin API token)',
      details: 'Use the Storefront API token, not an Admin API shpat_* token.',
    });
    return null;
  }

  return { shopDomain, token };
};

export const storefrontFetch = async ({ shopDomain, token, apiVersion, query, variables }) => {
  const endpoint = `https://${shopDomain}/api/${apiVersion}/graphql.json`;

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token,
    },
    body: JSON.stringify({ query, variables: variables || {} }),
  });

  const payload = await resp.json().catch(() => null);

  if (!resp.ok) {
    const msg = payload?.errors?.[0]?.message || resp.statusText;
    const err = new Error(`Shopify Storefront API error: ${msg}`);
    err.status = resp.status;
    err.payload = payload;
    throw err;
  }

  if (payload?.errors?.length) {
    const err = new Error(payload.errors[0]?.message || 'Shopify Storefront API error');
    err.status = 502;
    err.payload = payload;
    throw err;
  }

  return payload;
};
