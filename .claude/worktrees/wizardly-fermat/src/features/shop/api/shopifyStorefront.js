const asJsonOrText = async (res) => {
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  return isJson ? res.json() : res.text();
};

const isShopifyStorefrontConfigError = (payload) => {
  if (!payload || typeof payload !== 'object') return false;
  const error = String(payload?.error || '').toLowerCase();
  if (!error) return false;
  return (
    error.includes('shopify storefront api not configured') ||
    error.includes('invalid shopify storefront token')
  );
};

const asNotConfiguredPayload = (payload) => {
  const error = typeof payload?.error === 'string' ? payload.error : 'Shopify is not configured';
  const details = typeof payload?.details === 'string' ? payload.details : null;
  const debug = payload?.debug && typeof payload.debug === 'object' ? payload.debug : null;

  return {
    ok: false,
    notConfigured: true,
    error,
    ...(details ? { details } : {}),
    ...(debug ? { debug } : {}),
  };
};

const throwIfNotOk = async (res) => {
  if (res.ok) return;
  const payload = await asJsonOrText(res);
  const message = typeof payload === 'string' ? payload : payload?.error || 'Request failed';
  const err = new Error(message);
  err.status = res.status;
  err.payload = payload;
  throw err;
};

const withCartDebugParam = (url) => {
  // Dev-only: helps diagnose checkout host issues without touching production.
  if (!import.meta.env?.DEV) return url;

  try {
    const u = new URL(String(url), window.location.origin);
    if (!u.searchParams.has('debug')) u.searchParams.set('debug', '1');
    return `${u.pathname}${u.search}`;
  } catch {
    return url;
  }
};

export async function fetchCollections({ first = 24 } = {}) {
  const params = new URLSearchParams({ first: String(first) });
  const res = await fetch(`/api/shopify/collections?${params.toString()}`, { method: 'GET' });
  const payload = await asJsonOrText(res);
  if (!res.ok) {
    if (isShopifyStorefrontConfigError(payload)) {
      return { ...asNotConfiguredPayload(payload), collections: [] };
    }
    const message = typeof payload === 'string' ? payload : payload?.error || 'Request failed';
    const err = new Error(message);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

export async function fetchCollectionByHandle({ handle, firstProducts = 24 } = {}) {
  const params = new URLSearchParams({ handle: String(handle || ''), firstProducts: String(firstProducts) });
  const res = await fetch(`/api/shopify/collection?${params.toString()}`, { method: 'GET' });
  const payload = await asJsonOrText(res);
  if (!res.ok) {
    if (isShopifyStorefrontConfigError(payload)) {
      return { ...asNotConfiguredPayload(payload), collection: null };
    }
    const message = typeof payload === 'string' ? payload : payload?.error || 'Request failed';
    const err = new Error(message);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

export async function fetchProductByHandle({ handle } = {}) {
  const params = new URLSearchParams({ handle: String(handle || '') });
  const res = await fetch(`/api/shopify/product?${params.toString()}`, { method: 'GET' });
  const payload = await asJsonOrText(res);
  if (!res.ok) {
    if (isShopifyStorefrontConfigError(payload)) {
      return { ...asNotConfiguredPayload(payload), product: null };
    }
    const message = typeof payload === 'string' ? payload : payload?.error || 'Request failed';
    const err = new Error(message);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

export async function cartGet({ cartId }) {
  const params = new URLSearchParams({ id: String(cartId || '') });
  const res = await fetch(withCartDebugParam(`/api/shopify/cart?${params.toString()}`), { method: 'GET' });
  await throwIfNotOk(res);
  return res.json();
}

export async function cartCreate({ lines }) {
  const res = await fetch(withCartDebugParam('/api/shopify/cart'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create', lines }),
  });
  await throwIfNotOk(res);
  return res.json();
}

export async function cartAddLines({ cartId, lines }) {
  const res = await fetch(withCartDebugParam('/api/shopify/cart'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'addLines', cartId, lines }),
  });
  await throwIfNotOk(res);
  return res.json();
}

export async function cartUpdateLines({ cartId, lines }) {
  const res = await fetch(withCartDebugParam('/api/shopify/cart'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'updateLines', cartId, lines }),
  });
  await throwIfNotOk(res);
  return res.json();
}

export async function cartRemoveLines({ cartId, lineIds }) {
  const res = await fetch(withCartDebugParam('/api/shopify/cart'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'removeLines', cartId, lineIds }),
  });
  await throwIfNotOk(res);
  return res.json();
}

export async function cartApplyDiscountCode({ cartId, code }) {
  const res = await fetch(withCartDebugParam('/api/shopify/cart'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'applyDiscountCode', cartId, code }),
  });
  await throwIfNotOk(res);
  return res.json();
}
