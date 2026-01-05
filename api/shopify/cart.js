import { json, normalizeShopDomain, readJsonBody } from './_utils.js';

const toStorefrontVariantGid = (variantId) => {
  const raw = String(variantId ?? '').trim();
  if (!raw) return null;
  if (raw.startsWith('gid://shopify/ProductVariant/')) return raw;
  if (/^\d+$/.test(raw)) return `gid://shopify/ProductVariant/${raw}`;
  return raw;
};

// `readJsonBody` comes from ./_utils.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const shopDomain = normalizeShopDomain(process.env.SHOPIFY_SHOP_DOMAIN);
  const storefrontTokenPrimary = process.env.SHOPIFY_API_STOREFRONT_ACCESS_TOKEN;
  const storefrontTokenFallback = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
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

  const body = await readJsonBody(req);

  const linesInput = Array.isArray(body?.lines) ? body.lines : [];
  if (!linesInput.length) {
    return json(res, 400, { error: 'Missing required body: lines[]' });
  }

  const lines = [];
  for (const line of linesInput) {
    const gid = toStorefrontVariantGid(line?.variantId);
    const qty = Number.isFinite(Number(line?.quantity)) ? Number(line.quantity) : 1;
    if (!gid) continue;
    if (qty <= 0) continue;
    lines.push({ merchandiseId: gid, quantity: qty });
  }

  if (!lines.length) {
    return json(res, 400, { error: 'No valid lines provided' });
  }

  const endpoint = `https://${shopDomain}/api/2024-01/graphql.json`;
  const query = `#graphql
    mutation CartCreate($lines: [CartLineInput!]!) {
      cartCreate(input: { lines: $lines }) {
        cart {
          id
          checkoutUrl
        }
        userErrors {
          field
          message
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
      body: JSON.stringify({ query, variables: { lines } }),
    });

    const payload = await resp.json().catch(() => null);

    if (!resp.ok) {
      const msg = payload?.errors?.[0]?.message || resp.statusText;
      return json(res, resp.status, { error: `Shopify Storefront API error: ${msg}` });
    }

    if (payload?.errors?.length) {
      return json(res, 502, { error: payload.errors[0]?.message || 'Shopify Storefront API error' });
    }

    const result = payload?.data?.cartCreate || null;
    const errors = Array.isArray(result?.userErrors) ? result.userErrors : [];
    if (errors.length) {
      return json(res, 400, { error: errors[0]?.message || 'Unable to create cart', userErrors: errors });
    }

    const cart = result?.cart || null;
    if (!cart?.checkoutUrl) {
      return json(res, 502, { error: 'Shopify did not return checkoutUrl' });
    }

    res.setHeader('Cache-Control', 'no-store');
    return json(res, 200, { ok: true, cart });
  } catch (error) {
    return json(res, 500, { error: error?.message || 'Unknown error' });
  }
}
