import { base44 } from '@/components/utils/supabaseClient';

const GUEST_CART_STORAGE_KEY = 'hotmess_guest_cart_v1';

const safeParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const safeLocalStorageGetItem = (key) => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeLocalStorageSetItem = (key, value) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
};

const safeLocalStorageRemoveItem = (key) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
};

export const getGuestCartItems = () => {
  if (typeof window === 'undefined') return [];
  const raw = safeLocalStorageGetItem(GUEST_CART_STORAGE_KEY);
  const parsed = safeParse(raw);
  return Array.isArray(parsed) ? parsed : [];
};

export const setGuestCartItems = (items) => {
  if (typeof window === 'undefined') return;
  safeLocalStorageSetItem(
    GUEST_CART_STORAGE_KEY,
    JSON.stringify(Array.isArray(items) ? items : [])
  );
};

export const clearGuestCart = () => {
  if (typeof window === 'undefined') return;
  safeLocalStorageRemoveItem(GUEST_CART_STORAGE_KEY);
};

const getReservedUntilIso = () => {
  const reservedUntil = new Date();
  reservedUntil.setMinutes(reservedUntil.getMinutes() + 30);
  return reservedUntil.toISOString();
};

const resolveCurrentUser = async (currentUser) => {
  if (currentUser?.email) return currentUser;
  try {
    const me = await base44.auth.me();
    return me?.email ? me : null;
  } catch {
    return null;
  }
};

const isMissingTableError = (error) => {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();

  if (code === 'PGRST205') return true;
  if (code === '42P01') return true;

  return (
    error?.status === 404 ||
    message.includes('schema cache') ||
    message.includes('could not find the table') ||
    message.includes('does not exist')
  );
};

const isMissingColumnError = (error) => {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();

  if (code === 'PGRST204') return true;
  if (code === '42703') return true;

  return (
    (message.includes('could not find') && message.includes('column')) ||
    (message.includes('column') && message.includes('does not exist'))
  );
};

const isCartSchemaCompatError = (error) => {
  if (isMissingTableError(error) || isMissingColumnError(error)) return true;

  // Some Supabase schema-cache/column issues surface as a generic 400.
  const status = Number(error?.status);
  if (status === 400) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('schema') || message.includes('column') || message.includes('could not find');
  }

  return false;
};

const warnCartFallbackOnce = (() => {
  let didWarn = false;
  return (error) => {
    if (didWarn) return;
    didWarn = true;
    // Keep this as a quiet breadcrumb; many environments won’t have cart tables yet.
    console.warn('[cart] Falling back to guest cart (cart_items table unavailable)', error);
  };
})();

const addToGuestCart = ({ productId, qty, variantId, variantTitle }) => {
  const existingItems = getGuestCartItems();
  const reserved_until = getReservedUntilIso();
  const idx = existingItems.findIndex((item) => {
    if (item?.product_id !== productId) return false;
    const itemVariant = item?.shopify_variant_id ? String(item.shopify_variant_id).trim() : null;
    return itemVariant === variantId;
  });

  if (idx >= 0) {
    const next = [...existingItems];
    const current = next[idx] || {};
    next[idx] = {
      ...current,
      product_id: productId,
      quantity: (current.quantity || 0) + qty,
      reserved_until,
      ...(variantId ? { shopify_variant_id: variantId } : {}),
      ...(variantTitle ? { variant_title: variantTitle } : {}),
    };
    setGuestCartItems(next);
    return;
  }

  setGuestCartItems([
    ...existingItems,
    {
      product_id: productId,
      quantity: qty,
      reserved_until,
      ...(variantId ? { shopify_variant_id: variantId } : {}),
      ...(variantTitle ? { variant_title: variantTitle } : {}),
    },
  ]);
};

export const addToCart = async ({ productId, quantity = 1, currentUser, variantId = null, variantTitle = null }) => {
  if (!productId) throw new Error('Missing product id');
  const qty = Number.isFinite(quantity) ? quantity : 1;
  if (qty <= 0) return;

  const normalizedVariantId = variantId ? String(variantId).trim() : null;
  const normalizedVariantTitle = variantTitle ? String(variantTitle).trim() : null;

  const resolvedUser = await resolveCurrentUser(currentUser);

  // Authenticated cart -> DB
  if (resolvedUser?.email) {
    try {
      const authUserId = resolvedUser?.auth_user_id || null;
      const reserved_until = getReservedUntilIso();

      const baseFilter = authUserId
        ? { auth_user_id: authUserId, product_id: productId }
        : { user_email: resolvedUser.email, product_id: productId };

      const existing = normalizedVariantId
        ? await base44.entities.CartItem.filter({ ...baseFilter, shopify_variant_id: normalizedVariantId })
        : await base44.entities.CartItem.filter(baseFilter);

      if (existing.length > 0) {
        const item = existing[0];
        return base44.entities.CartItem.update(item.id, {
          quantity: (item.quantity || 0) + qty,
          reserved_until,
        });
      }

      return base44.entities.CartItem.create({
        user_email: resolvedUser.email,
        ...(authUserId ? { auth_user_id: authUserId } : {}),
        product_id: productId,
        quantity: qty,
        reserved_until,
        ...(normalizedVariantId ? { shopify_variant_id: normalizedVariantId } : {}),
        ...(normalizedVariantTitle ? { variant_title: normalizedVariantTitle } : {}),
      });
    } catch (error) {
      if (isCartSchemaCompatError(error)) {
        warnCartFallbackOnce(error);
        addToGuestCart({
          productId,
          qty,
          variantId: normalizedVariantId,
          variantTitle: normalizedVariantTitle,
        });
        return;
      }
      throw error;
    }
  }

  // Guest cart -> localStorage
  addToGuestCart({
    productId,
    qty,
    variantId: normalizedVariantId,
    variantTitle: normalizedVariantTitle,
  });
};

export const updateCartItemQuantity = async ({ itemId, productId, quantity, currentUser, variantId = null }) => {
  const qty = Number.isFinite(quantity) ? quantity : 1;
  if (qty <= 0) {
    return removeFromCart({ itemId, productId, currentUser, variantId });
  }

  if (currentUser?.email) {
    if (!itemId) throw new Error('Missing cart item id');
    try {
      return base44.entities.CartItem.update(itemId, {
        quantity: qty,
        reserved_until: getReservedUntilIso(),
      });
    } catch (error) {
      if (isCartSchemaCompatError(error)) {
        warnCartFallbackOnce(error);
        const normalizedVariantId = variantId ? String(variantId).trim() : null;
        const items = getGuestCartItems();
        const next = items.map((item) =>
          item?.product_id === productId && (String(item?.shopify_variant_id || '').trim() || null) === normalizedVariantId
            ? { ...item, quantity: qty, reserved_until: getReservedUntilIso() }
            : item
        );
        setGuestCartItems(next);
        return;
      }
      throw error;
    }
  }

  const items = getGuestCartItems();
  const normalizedVariantId = variantId ? String(variantId).trim() : null;
  const next = items.map((item) =>
    item?.product_id === productId && (String(item?.shopify_variant_id || '').trim() || null) === normalizedVariantId
      ? { ...item, quantity: qty, reserved_until: getReservedUntilIso() }
      : item
  );
  setGuestCartItems(next);
};

export const removeFromCart = async ({ itemId, productId, currentUser, variantId = null }) => {
  if (currentUser?.email) {
    if (!itemId) throw new Error('Missing cart item id');
    try {
      return base44.entities.CartItem.delete(itemId);
    } catch (error) {
      if (isCartSchemaCompatError(error)) {
        warnCartFallbackOnce(error);
        const items = getGuestCartItems();
        const normalizedVariantId = variantId ? String(variantId).trim() : null;
        setGuestCartItems(
          items.filter((item) => {
            if (item?.product_id !== productId) return true;
            const itemVariant = (String(item?.shopify_variant_id || '').trim() || null);
            return itemVariant !== normalizedVariantId;
          })
        );
        return;
      }
      throw error;
    }
  }

  const items = getGuestCartItems();
  const normalizedVariantId = variantId ? String(variantId).trim() : null;
  setGuestCartItems(
    items.filter((item) => {
      if (item?.product_id !== productId) return true;
      const itemVariant = (String(item?.shopify_variant_id || '').trim() || null);
      return itemVariant !== normalizedVariantId;
    })
  );
};

// Deduplication guard for cart merge (Stage 3 stabilization)
let _cartMergeInProgress = false;
let _lastCartMergeUserId = null;

export const mergeGuestCartToUser = async ({ currentUser }) => {
  const resolvedUser = await resolveCurrentUser(currentUser);
  if (!resolvedUser?.email) return;

  const authUserId = resolvedUser?.auth_user_id || null;
  
  // Guard: prevent duplicate merges for same user within same session
  if (_cartMergeInProgress && _lastCartMergeUserId === authUserId) {
    return;
  }
  
  // Guard: if we already merged for this user and guest cart is empty, skip
  if (_lastCartMergeUserId === authUserId) {
    const guestItems = getGuestCartItems();
    if (!guestItems.length) return;
  }

  _cartMergeInProgress = true;
  _lastCartMergeUserId = authUserId;

  try {
    const guestItems = getGuestCartItems();
    if (!guestItems.length) {
      return;
    }

  const now = new Date();
  const validGuestItems = guestItems.filter((item) => {
    if (!item?.product_id) return false;
    if (!item?.reserved_until) return true;
    return new Date(item.reserved_until) > now;
  });

  if (!validGuestItems.length) {
    clearGuestCart();
    return;
  }

  let existingDbItems = [];
  try {
    existingDbItems = authUserId
      ? await base44.entities.CartItem.filter({ auth_user_id: authUserId })
      : await base44.entities.CartItem.filter({ user_email: resolvedUser.email });
  } catch (error) {
    if (isMissingTableError(error)) {
      warnCartFallbackOnce(error);
      // Leave items in guest cart; DB cart is unavailable.
      return;
    }
    throw error;
  }
  const makeKey = (item) => {
    const pid = item?.product_id ? String(item.product_id) : '';
    const vid = item?.shopify_variant_id ? String(item.shopify_variant_id).trim() : '';
    return `${pid}::${vid}`;
  };

  const byKey = new Map(existingDbItems.map((item) => [makeKey(item), item]));

  for (const guestItem of validGuestItems) {
    const productId = guestItem.product_id;
    const guestVariantId = guestItem?.shopify_variant_id ? String(guestItem.shopify_variant_id).trim() : null;
    const guestVariantTitle = guestItem?.variant_title ? String(guestItem.variant_title).trim() : null;
    const qty = Number.isFinite(guestItem.quantity) ? guestItem.quantity : 1;
    const reserved_until = guestItem.reserved_until || getReservedUntilIso();

    const existing = byKey.get(`${String(productId)}::${guestVariantId || ''}`);
    try {
      if (existing) {
        await base44.entities.CartItem.update(existing.id, {
          quantity: (existing.quantity || 0) + qty,
          reserved_until,
        });
        continue;
      }

      await base44.entities.CartItem.create({
        user_email: resolvedUser.email,
        ...(authUserId ? { auth_user_id: authUserId } : {}),
        product_id: productId,
        quantity: qty,
        reserved_until,
        ...(guestVariantId ? { shopify_variant_id: guestVariantId } : {}),
        ...(guestVariantTitle ? { variant_title: guestVariantTitle } : {}),
      });
    } catch (error) {
      if (isMissingTableError(error)) {
        warnCartFallbackOnce(error);
        // Leave items in guest cart; DB cart is unavailable.
        return;
      }
      throw error;
    }
  }

  clearGuestCart();
  } finally {
    _cartMergeInProgress = false;
  }
};
