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

export const addToCart = async ({ productId, quantity = 1, currentUser }) => {
  if (!productId) throw new Error('Missing product id');
  const qty = Number.isFinite(quantity) ? quantity : 1;
  if (qty <= 0) return;

  // Authenticated cart -> DB
  if (currentUser?.email) {
    const reserved_until = getReservedUntilIso();

    const existing = await base44.entities.CartItem.filter({
      user_email: currentUser.email,
      product_id: productId,
    });

    if (existing.length > 0) {
      const item = existing[0];
      return base44.entities.CartItem.update(item.id, {
        quantity: (item.quantity || 0) + qty,
        reserved_until,
      });
    }

    return base44.entities.CartItem.create({
      user_email: currentUser.email,
      product_id: productId,
      quantity: qty,
      reserved_until,
    });
  }

  // Guest cart -> localStorage
  const existingItems = getGuestCartItems();
  const reserved_until = getReservedUntilIso();
  const idx = existingItems.findIndex((item) => item?.product_id === productId);

  if (idx >= 0) {
    const next = [...existingItems];
    const current = next[idx] || {};
    next[idx] = {
      ...current,
      product_id: productId,
      quantity: (current.quantity || 0) + qty,
      reserved_until,
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
    },
  ]);
};

export const updateCartItemQuantity = async ({ itemId, productId, quantity, currentUser }) => {
  const qty = Number.isFinite(quantity) ? quantity : 1;
  if (qty <= 0) {
    return removeFromCart({ itemId, productId, currentUser });
  }

  if (currentUser?.email) {
    if (!itemId) throw new Error('Missing cart item id');
    return base44.entities.CartItem.update(itemId, {
      quantity: qty,
      reserved_until: getReservedUntilIso(),
    });
  }

  const items = getGuestCartItems();
  const next = items.map((item) =>
    item?.product_id === productId
      ? { ...item, quantity: qty, reserved_until: getReservedUntilIso() }
      : item
  );
  setGuestCartItems(next);
};

export const removeFromCart = async ({ itemId, productId, currentUser }) => {
  if (currentUser?.email) {
    if (!itemId) throw new Error('Missing cart item id');
    return base44.entities.CartItem.delete(itemId);
  }

  const items = getGuestCartItems();
  setGuestCartItems(items.filter((item) => item?.product_id !== productId));
};

export const mergeGuestCartToUser = async ({ currentUser }) => {
  if (!currentUser?.email) return;

  const guestItems = getGuestCartItems();
  if (!guestItems.length) return;

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

  const existingDbItems = await base44.entities.CartItem.filter({ user_email: currentUser.email });
  const byProductId = new Map(existingDbItems.map((item) => [item.product_id, item]));

  for (const guestItem of validGuestItems) {
    const productId = guestItem.product_id;
    const qty = Number.isFinite(guestItem.quantity) ? guestItem.quantity : 1;
    const reserved_until = guestItem.reserved_until || getReservedUntilIso();

    const existing = byProductId.get(productId);
    if (existing) {
      await base44.entities.CartItem.update(existing.id, {
        quantity: (existing.quantity || 0) + qty,
        reserved_until,
      });
      continue;
    }

    await base44.entities.CartItem.create({
      user_email: currentUser.email,
      product_id: productId,
      quantity: qty,
      reserved_until,
    });
  }

  clearGuestCart();
};
