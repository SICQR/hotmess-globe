import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  cartAddLines,
  cartApplyDiscountCode,
  cartCreate,
  cartGet,
  cartRemoveLines,
  cartUpdateLines,
} from '@/features/shop/api/shopifyStorefront';

import { toast } from 'sonner';
import { supabase } from '@/components/utils/supabaseClient';

const STORAGE_KEY = 'shopify_cart_id_v1';

const isDisallowedCheckoutHost = (url) => {
  try {
    const u = new URL(String(url));
    const host = (u.host || '').toLowerCase();
    const isBranded = host === 'shop.hotmessldn.com' || host === 'hotmessldn.com';
    if (isBranded) return false;
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
      const isMock = String(variantId || '').startsWith('mock_');

      // 1. MOCK FALLBACK: If it's a mock variant, manage locally
      if (isMock) {
        setCart((prev) => {
          const currentLines = prev?.lines?.nodes || [];
          const existing = currentLines.find((l) => l.merchandise?.id === variantId);
          
          let nextLines;
          if (existing) {
            nextLines = currentLines.map((l) => 
              l.merchandise?.id === variantId ? { ...l, quantity: l.quantity + qty } : l
            );
          } else {
            nextLines = [...currentLines, {
              id: `line_${Math.random().toString(36).slice(2)}`,
              quantity: qty,
              merchandise: {
                id: variantId,
                price: { amount: '10.00', currencyCode: 'GBP' }, // fallback
                product: { title: 'Internal Product', handle: 'internal' }
              }
            }];
          }

          const subtotal = nextLines.reduce((acc, l) => acc + (parseFloat(l.merchandise.price.amount) * l.quantity), 0);

          return {
            ...prev,
            id: prev?.id || 'mock_cart',
            totalQuantity: (prev?.totalQuantity || 0) + qty,
            lines: { nodes: nextLines },
            cost: {
              subtotalAmount: { amount: subtotal.toFixed(2), currencyCode: 'GBP' },
              totalAmount: { amount: subtotal.toFixed(2), currencyCode: 'GBP' }
            }
          };
        });
        toast.success("Added to local cart (Mock Mode)");
        return;
      }

      // 2. STANDARD SHOPIFY FETCH
      const lines = [{ variantId, quantity: qty }];
      
      setIsLoading(true);
      setLastError(null);

      try {
        if (!cart?.id) {
          const created = await ensureCart({ initialLines: lines });
          return created;
        }

        const data = await cartAddLines({ cartId: cart.id, lines });
        setCart(data?.cart || null);
        return data?.cart || null;
      } catch (err) {
        // If Shopify is dead, convert this cart to a Mock cart
        if (err?.payload?.notConfigured || err?.status === 404 || err?.message?.includes('not configured')) {
           setCart((prev) => ({
             ...prev,
             id: 'mock_cart_recovery',
             totalQuantity: (prev?.totalQuantity || 0) + qty,
             lines: { nodes: [...(prev?.lines?.nodes || []), { id: 'err_line', quantity: qty, merchandise: { id: variantId, price: { amount: '10.00' }, product: { title: 'Recovery Item' } } }] }
           }));
           toast.info("Shopify unconfigured - using local sandbox");
           return;
        }
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
      console.log('[Shopify] applied code result:', data?.cart?.discountCodes);
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
  const checkedEmailsRef = useRef(new Set());

  // ── AUTO-APPLY 10% FIRST PURCHASE DISCOUNT ────────────────────────────────
  useEffect(() => {
    const applyDiscount = async () => {
      // 1. Basic checks
      if (!cart?.id) return;
      const lines = cart?.lines?.nodes || [];
      if (lines.length === 0) return;
      
      // If already has this discount, stop.
      if (cart?.discountCodes?.some(d => d.code === 'HOTMESS10' && d.applicable)) return;

      // 2. Who is the current user?
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser?.email) return;

      // Prevent redundant checks if we already looked this email up in this session
      if (checkedEmailsRef.current.has(authUser.email)) return;
      checkedEmailsRef.current.add(authUser.email);

      // 3. Have they actually completed a payment before?
      try {
        const { count, error } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('buyer_email', authUser.email)
          .in('status', ['paid', 'shipped', 'delivered']);

        if (error) {
          console.error('[Discount] Supabase query error:', error.message);
          return;
        }

        if (count === 0) {
          console.log('[Discount] New user detected. Applying HOTMESS10...');
          await applyDiscountCode({ code: 'HOTMESS10' });
          toast.success("First purchase 10% discount auto-applied!");
        } else {
          console.log(`[Discount] Returning user found (${count} orders). No discount.`);
        }
      } catch (err) {
        console.error('[Discount] Unexpected error:', err);
      }
    };

    applyDiscount();
  }, [cart?.id, cart?.lines?.nodes?.length, cart?.discountCodes, applyDiscountCode]);



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
