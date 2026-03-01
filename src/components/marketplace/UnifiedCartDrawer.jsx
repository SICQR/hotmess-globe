import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useShopCart } from '@/features/shop/cart/ShopCartContext';
import { ShopCartPanel } from '@/features/shop/cart/ShopCartDrawer';
import { base44 } from '@/components/utils/supabaseClient';
import {
  getGuestCartItems,
  updateCartItemQuantity,
  removeFromCart,
  clearGuestCart,
} from '@/components/marketplace/cartStorage';
import { CART_OPEN_EVENT } from '@/utils/cartEvents';

const guessTabFromPath = (pathname) => {
  const p = String(pathname || '').toLowerCase();
  if (p.startsWith('/market/creators')) return 'creators';
  return 'shopify';
};

const creatorsItemKey = (item) => {
  const pid = item?.product_id ? String(item.product_id) : '';
  const vid = item?.shopify_variant_id ? String(item.shopify_variant_id).trim() : '';
  return `${pid}::${vid}`;
};

function CreatorsCartPanel({ currentUser, enabled }) {
  const queryClient = useQueryClient();

  const { data: cartItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ['creators-cart', currentUser?.email || 'guest'],
    enabled,
    queryFn: async () => {
      const now = new Date();

      if (!currentUser?.email) {
        const items = getGuestCartItems();
        return items.filter((item) => {
          if (!item?.reserved_until) return true;
          return new Date(item.reserved_until) > now;
        });
      }

      const authUserId = currentUser?.auth_user_id || null;
      const items = authUserId
        ? await base44.entities.CartItem.filter({ auth_user_id: authUserId })
        : await base44.entities.CartItem.filter({ user_email: currentUser.email });

      return (Array.isArray(items) ? items : []).filter((item) => {
        if (!item?.reserved_until) return true;
        return new Date(item.reserved_until) > now;
      });
    },
  });

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['creators-cart-products'],
    enabled,
    queryFn: () => base44.entities.Product.filter({}, '-created_date'),
  });

  const cartWithProducts = useMemo(() => {
    const productsArr = Array.isArray(products) ? products : [];
    const byId = new Map(productsArr.map((p) => [String(p?.id), p]));

    const merged = (Array.isArray(cartItems) ? cartItems : [])
      .map((item) => ({
        ...item,
        product: byId.get(String(item?.product_id)) || null,
      }))
      .filter((item) => item.product);

    // In case of duplicate guest rows, keep them deterministic.
    const seen = new Set();
    return merged.filter((item) => {
      const key = creatorsItemKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [cartItems, products]);

  const totalXp = useMemo(
    () => cartWithProducts.reduce((sum, item) => sum + (Number(item.product?.price_xp) || 0) * (Number(item.quantity) || 0), 0),
    [cartWithProducts]
  );

  const totalQty = useMemo(
    () => cartWithProducts.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    [cartWithProducts]
  );

  const removeMutation = useMutation({
    mutationFn: ({ itemId, productId, variantId }) =>
      removeFromCart({ itemId, productId, variantId, currentUser }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creators-cart'] });
      queryClient.invalidateQueries({ queryKey: ['creators-cart-count'] });
      toast.success('Removed from cart');
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to remove');
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({ itemId, productId, quantity, variantId }) =>
      updateCartItemQuantity({ itemId, productId, quantity, variantId, currentUser }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creators-cart'] });
      queryClient.invalidateQueries({ queryKey: ['creators-cart-count'] });
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to update quantity');
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.email) {
        clearGuestCart();
        return;
      }

      const authUserId = currentUser?.auth_user_id || null;
      const items = authUserId
        ? await base44.entities.CartItem.filter({ auth_user_id: authUserId })
        : await base44.entities.CartItem.filter({ user_email: currentUser.email });

      await Promise.all((Array.isArray(items) ? items : []).map((item) => base44.entities.CartItem.delete(item.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creators-cart'] });
      queryClient.invalidateQueries({ queryKey: ['creators-cart-count'] });
      toast.success('Cart cleared');
    },
    onError: () => {
      // Best-effort; in some envs the cart table is missing.
      toast.error('Failed to clear cart');
    },
  });

  const isLoading = isLoadingItems || isLoadingProducts;

  return (
    <div className="mt-6 space-y-4">
      <SheetHeader>
        <SheetTitle className="text-white font-black uppercase tracking-wider">Creators cart</SheetTitle>
      </SheetHeader>

      {isLoading ? (
        <div className="border border-white/10 bg-white/5 p-4">
          <p className="text-white/70 text-sm">Loading…</p>
        </div>
      ) : cartWithProducts.length === 0 ? (
        <div className="border border-white/10 bg-white/5 p-4">
          <p className="text-white/70 text-sm">Your creators cart is empty.</p>
          <div className="mt-3 flex gap-3">
            <Link to="/market/creators" className="text-[#C8962C] hover:underline text-sm font-bold">
              Browse creators
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {cartWithProducts.map((item) => {
              const product = item.product;
              const qty = Number(item.quantity) || 0;

              return (
                <div
                  key={item.id ?? creatorsItemKey(item)}
                  className="border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-black truncate">{product?.name || 'Item'}</p>
                      {item.variant_title ? (
                        <p className="text-xs text-white/60 uppercase tracking-wider">{item.variant_title}</p>
                      ) : null}
                      {Number.isFinite(Number(product?.price_gbp)) ? (
                        <p className="text-xs text-white/60 mt-1">£{product.price_gbp}</p>
                      ) : null}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300"
                      onClick={() =>
                        removeMutation.mutate({
                          itemId: item.id,
                          productId: item.product_id,
                          variantId: item.shopify_variant_id,
                        })
                      }
                      aria-label="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white hover:text-black"
                        disabled={qty <= 1}
                        onClick={() =>
                          updateQuantityMutation.mutate({
                            itemId: item.id,
                            productId: item.product_id,
                            variantId: item.shopify_variant_id,
                            quantity: Math.max(1, qty - 1),
                          })
                        }
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-bold w-8 text-center">{qty}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white hover:text-black"
                        onClick={() =>
                          updateQuantityMutation.mutate({
                            itemId: item.id,
                            productId: item.product_id,
                            variantId: item.shopify_variant_id,
                            quantity: qty + 1,
                          })
                        }
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Items</span>
              <span className="font-bold">{totalQty}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Subtotal</span>
              <span className="font-black">{totalQty} item{totalQty !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300"
                onClick={() => clearCartMutation.mutate()}
              >
                Clear cart
              </Button>
              <Link to="/market/creators/cart" className="text-sm text-white/60 hover:text-white">
                View full cart
              </Link>
            </div>
          </div>

          <SheetClose asChild>
            <Button
              asChild
              className="w-full bg-[#C8962C] text-white hover:bg-white hover:text-black font-black uppercase py-6"
            >
              <Link to="/market/creators/checkout">Checkout</Link>
            </Button>
          </SheetClose>
        </>
      )}
    </div>
  );
}

export default function UnifiedCartDrawer({ currentUser }) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { cart } = useShopCart();

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => guessTabFromPath(location?.pathname));

  const shopifyCount = Number(cart?.totalQuantity) || 0;

  const { data: creatorsCount = 0 } = useQuery({
    queryKey: ['creators-cart-count', currentUser?.email || 'guest'],
    queryFn: async () => {
      const now = new Date();

      if (!currentUser?.email) {
        const items = getGuestCartItems();
        return (Array.isArray(items) ? items : [])
          .filter((item) => {
            if (!item?.reserved_until) return true;
            return new Date(item.reserved_until) > now;
          })
          .reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
      }

      const authUserId = currentUser?.auth_user_id || null;
      try {
        const items = authUserId
          ? await base44.entities.CartItem.filter({ auth_user_id: authUserId })
          : await base44.entities.CartItem.filter({ user_email: currentUser.email });

        return (Array.isArray(items) ? items : [])
          .filter((item) => {
            if (!item?.reserved_until) return true;
            return new Date(item.reserved_until) > now;
          })
          .reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
      } catch {
        // In some environments the CartItem table/view may not exist yet.
        const items = getGuestCartItems();
        return (Array.isArray(items) ? items : [])
          .filter((item) => {
            if (!item?.reserved_until) return true;
            return new Date(item.reserved_until) > now;
          })
          .reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
      }
    },
    refetchOnWindowFocus: true,
  });

  const totalCount = shopifyCount + (Number(creatorsCount) || 0);

  const openWith = useCallback(
    (tab) => {
      setActiveTab(tab || guessTabFromPath(location?.pathname));
      setOpen(true);
      queryClient.invalidateQueries({ queryKey: ['creators-cart'] });
      queryClient.invalidateQueries({ queryKey: ['creators-cart-count'] });
    },
    [location?.pathname, queryClient]
  );

  useEffect(() => {
    const handler = (event) => {
      const tab = event?.detail?.tab ? String(event.detail.tab) : null;
      openWith(tab);
    };

    window.addEventListener(CART_OPEN_EVENT, handler);
    return () => window.removeEventListener(CART_OPEN_EVENT, handler);
  }, [openWith]);

  // Keep tab in sync with navigation when closed.
  useEffect(() => {
    if (open) return;
    setActiveTab(guessTabFromPath(location?.pathname));
  }, [location?.pathname, open]);

  // Catch localStorage changes (guest cart) from other tabs/windows.
  useEffect(() => {
    const onStorage = (e) => {
      if (!e) return;
      queryClient.invalidateQueries({ queryKey: ['creators-cart-count'] });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [queryClient]);

  const onClickTrigger = () => {
    openWith(activeTab);
  };

  const creatorsEnabled = open && activeTab === 'creators';

  return (
    <>
      <button
        className="relative p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        aria-label="Open cart"
        onClick={onClickTrigger}
      >
        <ShoppingCart className="w-5 h-5" />
        {totalCount > 0 ? (
          <span className="absolute -top-1 -right-1 bg-[#C8962C] text-black text-[10px] font-black rounded-full px-1.5 py-0.5">
            {totalCount}
          </span>
        ) : null}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="bg-black text-white border-l border-white/10 w-full sm:max-w-md">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white/5 border border-white/10 w-full justify-start">
              <TabsTrigger value="shopify" className="data-[state=active]:bg-[#00D9FF] data-[state=active]:text-black">
                Shop ({shopifyCount})
              </TabsTrigger>
              <TabsTrigger value="creators" className="data-[state=active]:bg-[#C8962C] data-[state=active]:text-white">
                Creators ({Number(creatorsCount) || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="shopify" className="mt-2">
              <ShopCartPanel />
            </TabsContent>

            <TabsContent value="creators" className="mt-2">
              <CreatorsCartPanel currentUser={currentUser} enabled={creatorsEnabled} />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}
