/**
 * L2CartSheet — Unified shopping cart
 *
 * Displays items from BOTH sources:
 * - Shopify items via ShopCartContext (Storefront API cart)
 * - Preloved items via localStorage 'hm_cart'
 *
 * Checkout routes per source:
 * - Shopify → Shopify hosted checkout (beginCheckout)
 * - Preloved → L2CheckoutSheet (order + message seller)
 */

import { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, X, Plus, Minus, Loader2, Tag } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { useShopCart } from '@/features/shop/cart/ShopCartContext';
import { toast } from 'sonner';

/** Read preloved items from localStorage */
function getPrelovedCart() {
  try {
    return JSON.parse(localStorage.getItem('hm_cart') || '[]');
  } catch {
    return [];
  }
}

/** Write preloved items to localStorage */
function setPrelovedCart(items) {
  localStorage.setItem('hm_cart', JSON.stringify(items));
}

export default function L2CartSheet() {
  const { closeSheet, openSheet } = useSheet();
  const { cart, isLoading, updateLineQuantity, removeLine, beginCheckout } = useShopCart();

  // Shopify lines
  const shopifyLines = cart?.lines?.edges?.map(e => e.node) || [];
  const shopifyTotal = parseFloat(cart?.cost?.totalAmount?.amount || '0');
  const currency = cart?.cost?.totalAmount?.currencyCode || 'GBP';

  // Preloved items (localStorage)
  const [prelovedItems, setPrelovedItems] = useState(getPrelovedCart);

  // Refresh preloved items when sheet opens
  useEffect(() => {
    setPrelovedItems(getPrelovedCart());
  }, []);

  const prelovedTotal = prelovedItems.reduce((sum, i) => sum + (i.price || 0) * (i.qty || 1), 0);
  const combinedTotal = shopifyTotal + prelovedTotal;
  const totalItemCount = shopifyLines.length + prelovedItems.length;

  // ---- Shopify cart handlers ----
  const handleShopifyQty = async (lineId, currentQty, delta) => {
    const newQty = Math.max(0, currentQty + delta);
    try {
      if (newQty === 0) {
        await removeLine({ lineId });
      } else {
        await updateLineQuantity({ lineId, quantity: newQty });
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to update cart');
    }
  };

  const handleShopifyRemove = async (lineId) => {
    try {
      await removeLine({ lineId });
    } catch (err) {
      toast.error(err?.message || 'Failed to remove item');
    }
  };

  // ---- Preloved cart handlers ----
  const handlePrelovedQty = useCallback((itemId, delta) => {
    setPrelovedItems(prev => {
      const updated = prev.map(i => {
        if (i.id !== itemId) return i;
        const newQty = Math.max(0, (i.qty || 1) + delta);
        return newQty === 0 ? null : { ...i, qty: newQty };
      }).filter(Boolean);
      setPrelovedCart(updated);
      return updated;
    });
  }, []);

  const handlePrelovedRemove = useCallback((itemId) => {
    setPrelovedItems(prev => {
      const updated = prev.filter(i => i.id !== itemId);
      setPrelovedCart(updated);
      return updated;
    });
  }, []);

  // ---- Checkout handlers ----
  const handleShopifyCheckout = () => {
    try {
      beginCheckout();
    } catch (err) {
      toast.error(err?.message || 'Checkout unavailable');
    }
  };

  const handlePrelovedCheckout = () => {
    openSheet('checkout', {
      cartItems: prelovedItems,
      total: prelovedTotal,
    });
  };

  // ---- Empty state ----
  if (totalItemCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center h-full">
        <div className="w-16 h-16 rounded-2xl bg-[#1C1C1E] flex items-center justify-center mb-4">
          <ShoppingBag className="w-8 h-8 text-white/10" />
        </div>
        <p className="text-white/60 font-bold text-sm">Your cart is empty</p>
        <p className="text-white/30 text-xs mt-1">Browse Market to add items</p>
        <button
          onClick={closeSheet}
          className="mt-5 bg-[#C8962C] text-black font-black text-xs rounded-full px-5 py-2"
        >
          Browse Market
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">

        {/* ── Shopify items ── */}
        {shopifyLines.length > 0 && (
          <div>
            <div className="px-4 pt-3 pb-1 flex items-center gap-2">
              <ShoppingBag className="w-3 h-3 text-[#C8962C]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Shop</span>
            </div>
            <div className="divide-y divide-white/5">
              {shopifyLines.map(line => {
                const variant = line.merchandise;
                const imageUrl = variant?.image?.url || variant?.product?.featuredImage?.url;
                const title = variant?.product?.title || variant?.title || 'Item';
                const linePrice = parseFloat(line.cost?.totalAmount?.amount || '0');
                const qty = line.quantity || 1;

                return (
                  <div key={line.id} className="px-4 py-4 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-[#1C1C1E] flex-shrink-0 overflow-hidden">
                      {imageUrl
                        ? <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-6 h-6 text-white/20" />
                          </div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{title}</p>
                      {variant?.title && variant.title !== 'Default Title' && (
                        <p className="text-white/40 text-[10px]">{variant.title}</p>
                      )}
                      <p className="text-[#C8962C] text-xs mt-0.5">
                        {currency} {linePrice.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleShopifyQty(line.id, qty, -1)}
                        disabled={isLoading}
                        className="w-7 h-7 rounded-full bg-[#1C1C1E] flex items-center justify-center text-white/60 hover:text-white transition-colors disabled:opacity-40"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-white font-bold text-sm w-5 text-center">{qty}</span>
                      <button
                        onClick={() => handleShopifyQty(line.id, qty, 1)}
                        disabled={isLoading}
                        className="w-7 h-7 rounded-full bg-[#1C1C1E] flex items-center justify-center text-white/60 hover:text-white transition-colors disabled:opacity-40"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleShopifyRemove(line.id)}
                        disabled={isLoading}
                        className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors ml-1 disabled:opacity-40"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Preloved items ── */}
        {prelovedItems.length > 0 && (
          <div>
            <div className="px-4 pt-3 pb-1 flex items-center gap-2">
              <Tag className="w-3 h-3 text-[#C8962C]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Preloved</span>
            </div>
            <div className="divide-y divide-white/5">
              {prelovedItems.map(item => (
                <div key={item.id} className="px-4 py-4 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-[#1C1C1E] flex-shrink-0 overflow-hidden">
                    {item.image
                      ? <img src={item.image} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <Tag className="w-6 h-6 text-white/20" />
                        </div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">{item.title}</p>
                    <p className="text-[#C8962C] text-xs mt-0.5">
                      £{((item.price || 0) * (item.qty || 1)).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handlePrelovedQty(item.id, -1)}
                      className="w-7 h-7 rounded-full bg-[#1C1C1E] flex items-center justify-center text-white/60 hover:text-white transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-white font-bold text-sm w-5 text-center">{item.qty || 1}</span>
                    <button
                      onClick={() => handlePrelovedQty(item.id, 1)}
                      className="w-7 h-7 rounded-full bg-[#1C1C1E] flex items-center justify-center text-white/60 hover:text-white transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handlePrelovedRemove(item.id)}
                      className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Total & Checkout ── */}
      <div className="px-4 py-4 border-t border-white/8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/60 text-sm">Total</span>
          <span className="text-white font-black text-lg">
            £{combinedTotal.toFixed(2)}
          </span>
        </div>

        {/* Checkout buttons — one per source */}
        <div className="space-y-2">
          {shopifyLines.length > 0 && (
            <button
              onClick={handleShopifyCheckout}
              disabled={isLoading}
              className="w-full bg-[#C8962C] text-black font-black text-sm rounded-2xl py-4 active:scale-95 transition-transform disabled:opacity-60"
            >
              {isLoading
                ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                : `Checkout Shop (${shopifyLines.length} ${shopifyLines.length === 1 ? 'item' : 'items'})`}
            </button>
          )}
          {prelovedItems.length > 0 && (
            <button
              onClick={handlePrelovedCheckout}
              className="w-full bg-white/10 text-white font-black text-sm rounded-2xl py-4 active:scale-95 transition-transform border border-white/10"
            >
              Checkout Preloved ({prelovedItems.length} {prelovedItems.length === 1 ? 'item' : 'items'})
            </button>
          )}
        </div>
        <p className="text-center text-white/30 text-[10px] mt-2">Secure checkout · Free returns</p>
      </div>
    </div>
  );
}
