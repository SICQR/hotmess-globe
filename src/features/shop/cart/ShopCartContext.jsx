import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  cartAddLines,
  cartApplyDiscountCode,
  cartCreate,
  cartGet,
  cartRemoveLines,
  cartUpdateLines,
} from '@/features/shop/api/shopifyStorefront';

const STORAGE_KEY = 'shopify_cart_id_v1';

const isDisallowedCheckoutHost = (url) => {
  try {
    const u = new URL(String(url));
    const host = (u.host || '').toLowerCase();
    return host.includes('myshopify.com') || host.includes('shopify.com') || host.includes('shop.app');
  } catch {
    return false;
  }
};

const ShopCartContext = createContext(null);

export function ShopCartProvider({ children }) {
  const [cart, setCart] = useState(null);
  const [cartId, setCartId] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState(null);

  const inflightPromiseRef = useRef(null);

  const persistCartId = useCallback((id) => {
    const next = id ? String(id) : null;
    setCartId(next);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, next);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const hydrate = useCallback(async () => {
    if (!cartId) {
      setCart(null);
      return null;
    }

    if (inflightPromiseRef.current) return inflightPromiseRef.current;

    const promise = (async () => {
      setIsLoading(true);
      setLastError(null);

      try {
        const data = await cartGet({ cartId });
        const next = data?.cart || null;
        setCart(next);
        return next;
      } catch (err) {
        // If the cart is gone/expired, clear it and start fresh.
        if (err?.status === 404) {
          persistCartId(null);
          setCart(null);
          return null;
        }

        setLastError(err);
        throw err;
      } finally {
        setIsLoading(false);
        inflightPromiseRef.current = null;
      }
    })();

    inflightPromiseRef.current = promise;
    return promise;
  }, [cartId, persistCartId]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const ensureCart = useCallback(
    async ({ initialLines } = {}) => {
      if (cart?.id) return cart;
      if (cartId) {
        const hydrated = await hydrate();
        if (hydrated?.id) return hydrated;
      }

      setIsLoading(true);
      setLastError(null);
      try {
        const data = await cartCreate({ lines: initialLines || [] });
        const nextCart = data?.cart || null;
        if (nextCart?.id) persistCartId(nextCart.id);
        setCart(nextCart);
        return nextCart;
      } catch (err) {
        setLastError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cart, cartId, hydrate, persistCartId]
  );

  const addItem = useCallback(
    async ({ variantId, quantity = 1 }) => {
      const qty = Number.isFinite(Number(quantity)) ? Number(quantity) : 1;
      const lines = [{ variantId, quantity: qty }];

      // Always add via cartLinesAdd to avoid accidentally double-adding
      // when a cart is created with initial lines.
      const current = cart?.id ? cart : await ensureCart();
      if (!current?.id) throw new Error('Missing cart id');

      setIsLoading(true);
      setLastError(null);
      try {
        const data = await cartAddLines({ cartId: current.id, lines });
        setCart(data?.cart || null);
        return data?.cart || null;
      } catch (err) {
        setLastError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cart, ensureCart]
  );

  const updateLineQuantity = useCallback(async ({ lineId, quantity }) => {
    if (!cart?.id) return null;

    const qty = Number.isFinite(Number(quantity)) ? Number(quantity) : 0;
    setIsLoading(true);
    setLastError(null);
    try {
      const data = await cartUpdateLines({ cartId: cart.id, lines: [{ id: lineId, quantity: qty }] });
      setCart(data?.cart || null);
      return data?.cart || null;
    } catch (err) {
      setLastError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [cart?.id]);

  const removeLine = useCallback(async ({ lineId }) => {
    if (!cart?.id) return null;

    setIsLoading(true);
    setLastError(null);
    try {
      const data = await cartRemoveLines({ cartId: cart.id, lineIds: [lineId] });
      setCart(data?.cart || null);
      return data?.cart || null;
    } catch (err) {
      setLastError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [cart?.id]);

  const applyDiscountCode = useCallback(async ({ code }) => {
    if (!cart?.id) throw new Error('Cart is empty');

    setIsLoading(true);
    setLastError(null);
    try {
      const data = await cartApplyDiscountCode({ cartId: cart.id, code });
      setCart(data?.cart || null);
      return data?.cart || null;
    } catch (err) {
      setLastError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [cart?.id]);

  const clearCart = useCallback(() => {
    persistCartId(null);
    setCart(null);
  }, [persistCartId]);

  const getCheckoutUrlOrThrow = useCallback(
    ({ allowUnbranded = false } = {}) => {
      const blockedReason = cart?.checkoutBlockedReason;
      const url = cart?.checkoutUrl;
      if (!url) {
        throw new Error(blockedReason || 'Checkout currently unavailable. Please try again later.');
      }
      if (!allowUnbranded && isDisallowedCheckoutHost(url)) {
        throw new Error('Checkout URL is not branded. Refusing to redirect to Shopify domains.');
      }
      return url;
    },
    [cart?.checkoutBlockedReason, cart?.checkoutUrl]
  );

  const beginCheckout = useCallback(() => {
    const url = getCheckoutUrlOrThrow({ allowUnbranded: false });
    window.location.assign(url);
  }, [getCheckoutUrlOrThrow]);

  const value = useMemo(
    () => ({
      cart,
      cartId,
      isLoading,
      lastError,
      hydrate,
      ensureCart,
      addItem,
      updateLineQuantity,
      removeLine,
      applyDiscountCode,
      clearCart,
      getCheckoutUrlOrThrow,
      beginCheckout,
    }),
    [
      cart,
      cartId,
      isLoading,
      lastError,
      hydrate,
      ensureCart,
      addItem,
      updateLineQuantity,
      removeLine,
      applyDiscountCode,
      clearCart,
      getCheckoutUrlOrThrow,
      beginCheckout,
    ]
  );

  return <ShopCartContext.Provider value={value}>{children}</ShopCartContext.Provider>;
}

export function useShopCart() {
  const ctx = useContext(ShopCartContext);
  if (!ctx) throw new Error('useShopCart must be used within ShopCartProvider');
  return ctx;
}
