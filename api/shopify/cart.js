import { getEnv, getQueryParam, json, normalizeShopDomain, readJsonBody } from './_utils.js';
import { ensureStorefrontConfigured, getStorefrontConfig, storefrontFetch } from './_storefront.js';

const isDisallowedCheckoutHost = (host) => {
  const h = String(host || '').toLowerCase();
  if (!h) return false;
  // Non-negotiable: never show these to customers.
  return h.includes('myshopify.com') || h.includes('shopify.com') || h.includes('shop.app');
};

const enforceBrandedCheckoutUrl = ({ checkoutUrl, checkoutHost }) => {
  const raw = String(checkoutUrl || '').trim();
  if (!raw) return { checkoutUrl: null, error: 'Missing checkoutUrl' };

  let url;
  try {
    url = new URL(raw);
  } catch {
    return { checkoutUrl: raw, error: null };
  }

  const desiredHost = normalizeShopDomain(checkoutHost);
  // Only apply a "branded" checkout host if it is truly branded.
  // Using a *.myshopify.com host here does not satisfy the non-negotiable requirement.
  if (desiredHost && !isDisallowedCheckoutHost(desiredHost)) {
    url.host = desiredHost;
  }

  // Reduce the chance Shopify auto-routes users into Shop/accelerated flows.
  // This does not disable checkout; it simply opts out of automatic redirects.
  if (!url.searchParams.has('auto_redirect')) url.searchParams.set('auto_redirect', 'false');
  if (!url.searchParams.has('skip_shop_pay')) url.searchParams.set('skip_shop_pay', 'true');
  if (!url.searchParams.has('edge_redirect')) url.searchParams.set('edge_redirect', 'false');

  const final = url.toString();
  if (isDisallowedCheckoutHost(url.host)) {
    return {
      checkoutUrl: final,
      error:
        'Checkout host is not branded. Set SHOPIFY_CHECKOUT_DOMAIN to your branded checkout host (not *.myshopify.com) so checkout never shows Shopify domains.',
    };
  }

  return { checkoutUrl: final, error: null };
};

const toStorefrontVariantGid = (variantId) => {
  const raw = String(variantId ?? '').trim();
  if (!raw) return null;
  if (raw.startsWith('gid://shopify/ProductVariant/')) return raw;
  if (/^\d+$/.test(raw)) return `gid://shopify/ProductVariant/${raw}`;
  return raw;
};

const extractNumericVariantId = (variantId) => {
  const raw = String(variantId ?? '').trim();
  if (!raw) return null;
  if (raw.startsWith('gid://shopify/ProductVariant/')) {
    const match = raw.match(/^gid:\/\/shopify\/ProductVariant\/(\d+)$/);
    return match?.[1] || null;
  }
  if (/^\d+$/.test(raw)) return raw;
  return null;
};

// `readJsonBody` comes from ./_utils.js

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const debugRequestedRaw = String(getQueryParam(req, 'debug') ?? '').trim().toLowerCase();
  const debugRequested = debugRequestedRaw === '1' || debugRequestedRaw === 'true' || debugRequestedRaw === 'yes';
  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  const shouldIncludeDebug = debugRequested && !isProd;

  // Checkout host must be a branded/custom domain (never *.myshopify.com).
  // We accept multiple env var names for compatibility across deployments.
  const checkoutHostCandidate = getEnv('SHOPIFY_CHECKOUT_DOMAIN', [
    'SHOPIFY_CHECKOUT_HOST',
    'SHOPIFY_BRANDED_CHECKOUT_DOMAIN',
    'SHOPIFY_BRANDED_DOMAIN',
    'SHOPIFY_PUBLIC_DOMAIN',
  ]);
  const checkoutHost = (() => {
    const normalized = normalizeShopDomain(checkoutHostCandidate);
    if (!normalized) return null;
    if (isDisallowedCheckoutHost(normalized)) return null;
    return normalized;
  })();

  // We intentionally require the Storefront token for a real headless cart.
  // Tokenless /cart/{variant}:{qty} URLs are not compatible with the “never leave our platform” requirement.
  const configured = ensureStorefrontConfigured(res);
  if (!configured) return;

  const { shopDomain, token } = configured;
  const { apiVersion } = getStorefrontConfig();

  const CART_FRAGMENT = `#graphql
    fragment CartFields on Cart {
      id
      checkoutUrl
      totalQuantity
      discountCodes {
        code
        applicable
      }
      cost {
        subtotalAmount { amount currencyCode }
        totalAmount { amount currencyCode }
        totalTaxAmount { amount currencyCode }
        totalDutyAmount { amount currencyCode }
      }
      lines(first: 50) {
        nodes {
          id
          quantity
          merchandise {
            ... on ProductVariant {
              id
              title
              availableForSale
              image { url altText }
              price { amount currencyCode }
              product { title handle }
            }
          }
        }
      }
    }
  `;

  const cartToResponse = (cart) => {
    const rawCheckoutUrl = cart?.checkoutUrl;
    let rawHost = null;
    try {
      rawHost = rawCheckoutUrl ? new URL(String(rawCheckoutUrl)).host : null;
    } catch {
      rawHost = null;
    }

    const enforced = enforceBrandedCheckoutUrl({ checkoutUrl: rawCheckoutUrl, checkoutHost });

    const debug = shouldIncludeDebug
      ? {
          shopDomain,
          apiVersion,
          checkoutHostCandidate,
          normalizedCheckoutHost: checkoutHost,
          originalCheckoutUrl: rawCheckoutUrl ? String(rawCheckoutUrl) : null,
          originalCheckoutHost: rawHost,
          enforcedCheckoutUrl: enforced?.checkoutUrl ? String(enforced.checkoutUrl) : null,
          enforcedCheckoutHost: (() => {
            try {
              return enforced?.checkoutUrl ? new URL(String(enforced.checkoutUrl)).host : null;
            } catch {
              return null;
            }
          })(),
          disallowedOriginalHost: rawHost ? isDisallowedCheckoutHost(rawHost) : false,
          disallowedEnforcedHost: (() => {
            try {
              return enforced?.checkoutUrl ? isDisallowedCheckoutHost(new URL(String(enforced.checkoutUrl)).host) : false;
            } catch {
              return false;
            }
          })(),
          blockedReason: enforced?.error || null,
        }
      : null;

    if (debug) {
      // Light-touch breadcrumb for DevTools/Network without exposing secrets.
      // Example: "orig=shop.app enforced=shop.hotmessldn.com blocked=yes"
      const orig = debug.originalCheckoutHost || 'none';
      const enf = debug.enforcedCheckoutHost || 'none';
      const blocked = debug.blockedReason ? 'yes' : 'no';
      res.setHeader('X-HM-Checkout-Debug', `orig=${orig} enforced=${enf} blocked=${blocked}`);
    }

    if (enforced.error) {
      // Important: cart operations should still succeed even if checkout is blocked.
      // Never leak Shopify-hosted checkout URLs to the client.
      return {
        cart: { ...cart, checkoutUrl: null, checkoutBlockedReason: enforced.error },
        checkoutBlockedReason: enforced.error,
        debug: debug || null,
      };
    }

    return {
      cart: { ...cart, checkoutUrl: enforced.checkoutUrl, checkoutBlockedReason: null },
      checkoutBlockedReason: null,
      debug: debug || null,
    };
  };

  if (req.method === 'GET') {
    const id = String(getQueryParam(req, 'id') ?? '').trim();
    if (!id) return json(res, 400, { error: 'Missing required query param: id' });

    const query = `#graphql
      ${CART_FRAGMENT}
      query CartGet($id: ID!) {
        cart(id: $id) { ...CartFields }
      }
    `;

    try {
      const payload = await storefrontFetch({
        shopDomain,
        token,
        apiVersion,
        query,
        variables: { id },
      });

      const cart = payload?.data?.cart || null;
      if (!cart) return json(res, 404, { error: 'Cart not found' });

      const { cart: outCart, checkoutBlockedReason, debug } = cartToResponse(cart);

      res.setHeader('Cache-Control', 'no-store');
      return json(res, 200, { ok: true, cart: outCart, checkoutBlockedReason, ...(debug ? { debug } : {}) });
    } catch (error) {
      return json(res, error?.status || 500, { error: error?.message || 'Unknown error' });
    }
  }

  const body = await readJsonBody(req);
  const action = String(body?.action || '').trim();

  const normalizeLines = (linesInput) => {
    const raw = Array.isArray(linesInput) ? linesInput : [];
    const out = [];
    for (const line of raw) {
      const rawVariantId = String(line?.variantId ?? line?.merchandiseId ?? '').trim();
      const qty = Number.isFinite(Number(line?.quantity)) ? Number(line.quantity) : 1;
      if (!rawVariantId) continue;
      if (qty <= 0) continue;
      const gid = toStorefrontVariantGid(rawVariantId);
      if (!gid) continue;
      out.push({ merchandiseId: gid, quantity: qty });
    }
    return out;
  };

  const cartId = String(body?.cartId ?? '').trim();

  // Back-compat: if no action is provided but lines[] exist, treat as create.
  const implicitCreate = !action && Array.isArray(body?.lines);

  try {
    if (action === 'create' || implicitCreate) {
      const lines = normalizeLines(body?.lines);
      if (!lines.length) return json(res, 400, { error: 'Missing required body: lines[]' });

      const query = `#graphql
        ${CART_FRAGMENT}
        mutation CartCreate($lines: [CartLineInput!]!) {
          cartCreate(input: { lines: $lines }) {
            cart { ...CartFields }
            userErrors { field message }
          }
        }
      `;

      const payload = await storefrontFetch({
        shopDomain,
        token,
        apiVersion,
        query,
        variables: { lines },
      });

      const result = payload?.data?.cartCreate || null;
      const errors = Array.isArray(result?.userErrors) ? result.userErrors : [];
      if (errors.length) return json(res, 400, { error: errors[0]?.message || 'Unable to create cart', userErrors: errors });

      const cart = result?.cart || null;
      if (!cart?.id) return json(res, 502, { error: 'Shopify did not return cart id' });

      const { cart: outCart, checkoutBlockedReason, debug } = cartToResponse(cart);

      res.setHeader('Cache-Control', 'no-store');
      return json(res, 200, { ok: true, cart: outCart, checkoutBlockedReason, ...(debug ? { debug } : {}) });
    }

    if (!cartId) return json(res, 400, { error: 'Missing required body: cartId' });

    if (action === 'addLines') {
      const lines = normalizeLines(body?.lines);
      if (!lines.length) return json(res, 400, { error: 'Missing required body: lines[]' });

      const query = `#graphql
        ${CART_FRAGMENT}
        mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
          cartLinesAdd(cartId: $cartId, lines: $lines) {
            cart { ...CartFields }
            userErrors { field message }
          }
        }
      `;

      const payload = await storefrontFetch({ shopDomain, token, apiVersion, query, variables: { cartId, lines } });
      const result = payload?.data?.cartLinesAdd || null;
      const errors = Array.isArray(result?.userErrors) ? result.userErrors : [];
      if (errors.length) return json(res, 400, { error: errors[0]?.message || 'Unable to add lines', userErrors: errors });

      const { cart: outCart, checkoutBlockedReason, debug } = cartToResponse(result?.cart);
      res.setHeader('Cache-Control', 'no-store');
      return json(res, 200, { ok: true, cart: outCart, checkoutBlockedReason, ...(debug ? { debug } : {}) });
    }

    if (action === 'updateLines') {
      const raw = Array.isArray(body?.lines) ? body.lines : [];
      const lines = raw
        .map((line) => {
          const id = String(line?.id ?? '').trim();
          const qty = Number.isFinite(Number(line?.quantity)) ? Number(line.quantity) : null;
          if (!id) return null;
          if (qty === null) return null;
          return { id, quantity: qty };
        })
        .filter(Boolean);

      if (!lines.length) return json(res, 400, { error: 'Missing required body: lines[] with id + quantity' });

      const query = `#graphql
        ${CART_FRAGMENT}
        mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
          cartLinesUpdate(cartId: $cartId, lines: $lines) {
            cart { ...CartFields }
            userErrors { field message }
          }
        }
      `;

      const payload = await storefrontFetch({ shopDomain, token, apiVersion, query, variables: { cartId, lines } });
      const result = payload?.data?.cartLinesUpdate || null;
      const errors = Array.isArray(result?.userErrors) ? result.userErrors : [];
      if (errors.length) return json(res, 400, { error: errors[0]?.message || 'Unable to update lines', userErrors: errors });

      const { cart: outCart, checkoutBlockedReason, debug } = cartToResponse(result?.cart);
      res.setHeader('Cache-Control', 'no-store');
      return json(res, 200, { ok: true, cart: outCart, checkoutBlockedReason, ...(debug ? { debug } : {}) });
    }

    if (action === 'removeLines') {
      const lineIds = Array.isArray(body?.lineIds) ? body.lineIds.map((v) => String(v || '').trim()).filter(Boolean) : [];
      if (!lineIds.length) return json(res, 400, { error: 'Missing required body: lineIds[]' });

      const query = `#graphql
        ${CART_FRAGMENT}
        mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
          cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
            cart { ...CartFields }
            userErrors { field message }
          }
        }
      `;

      const payload = await storefrontFetch({ shopDomain, token, apiVersion, query, variables: { cartId, lineIds } });
      const result = payload?.data?.cartLinesRemove || null;
      const errors = Array.isArray(result?.userErrors) ? result.userErrors : [];
      if (errors.length) return json(res, 400, { error: errors[0]?.message || 'Unable to remove lines', userErrors: errors });

      const { cart: outCart, checkoutBlockedReason, debug } = cartToResponse(result?.cart);
      res.setHeader('Cache-Control', 'no-store');
      return json(res, 200, { ok: true, cart: outCart, checkoutBlockedReason, ...(debug ? { debug } : {}) });
    }

    if (action === 'applyDiscountCode') {
      const code = String(body?.code || '').trim();
      if (!code) return json(res, 400, { error: 'Missing required body: code' });

      const query = `#graphql
        ${CART_FRAGMENT}
        mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!) {
          cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
            cart { ...CartFields }
            userErrors { field message }
          }
        }
      `;

      const payload = await storefrontFetch({
        shopDomain,
        token,
        apiVersion,
        query,
        variables: { cartId, discountCodes: [code] },
      });

      const result = payload?.data?.cartDiscountCodesUpdate || null;
      const errors = Array.isArray(result?.userErrors) ? result.userErrors : [];
      if (errors.length) return json(res, 400, { error: errors[0]?.message || 'Unable to apply discount', userErrors: errors });

      const { cart: outCart, checkoutBlockedReason, debug } = cartToResponse(result?.cart);
      res.setHeader('Cache-Control', 'no-store');
      return json(res, 200, { ok: true, cart: outCart, checkoutBlockedReason, ...(debug ? { debug } : {}) });
    }

    return json(res, 400, {
      error: 'Unknown cart action',
      details: 'Supported: create, addLines, updateLines, removeLines, applyDiscountCode',
    });
  } catch (error) {
    return json(res, error?.status || 500, { error: error?.message || 'Unknown error' });
  }
}
