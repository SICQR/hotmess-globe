/**
 * L2CartSheet — Unified shopping cart
 *
 * Displays items from BOTH sources:
 * - Shopify items via ShopCartContext (Storefront API cart)
 * - Preloved items via Supabase cart_items table
 *
 * Checkout routes per source:
 * - Shopify → Shopify hosted checkout (beginCheckout)
 * - Preloved → L2CheckoutSheet (order + message seller)
 */

import { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, X, Plus, Minus, Loader2, Tag, CheckSquare, Square } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { useShopCart } from '@/features/shop/cart/ShopCartContext';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

export default function L2CartSheet() {
  const { closeSheet, openSheet } = useSheet();
  const { cart, isLoading, updateLineQuantity, removeLine, beginCheckout } = useShopCart();

  // Shopify lines
  const shopifyLines = cart?.lines?.nodes || [];
  const shopifyTotal = parseFloat(cart?.cost?.totalAmount?.amount || '0');
  const currency = cart?.cost?.totalAmount?.currencyCode || 'GBP';

  // Preloved items (Supabase cart_items)
  const [prelovedItems, setPrelovedItems] = useState([]);
  const [prelovedLoading, setPrelovedLoading] = useState(true);

  const loadPrelovedCart = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setPrelovedLoading(false); return; }
      const { data } = await supabase
        .from('cart_items')
        .select('id, product_id, quantity, metadata')
        .eq('auth_user_id', session.user.id)
        .eq('source', 'preloved');
      setPrelovedItems((data || []).map(row => ({
        id: row.product_id,
        cart_row_id: row.id,
        title: row.metadata?.title || 'Item',
        price: row.metadata?.price || 0,
        image: row.metadata?.image || null,
        seller_id: row.metadata?.seller_id || null,
        qty: row.quantity || 1,
        source: 'preloved',
      })));
    } catch {
      // Fallback: empty cart
    } finally {
      setPrelovedLoading(false);
    }
  }, []);

  useEffect(() => { loadPrelovedCart(); }, [loadPrelovedCart]);

  const prelovedTotal = prelovedItems.reduce((sum, i) => sum + (i.price || 0) * (i.qty || 1), 0);
  const combinedTotal = shopifyTotal + prelovedTotal;
  const totalItemCount = shopifyLines.length + prelovedItems.length;

  // ---- Selection State ----
  const [selectedIds, setSelectedIds] = useState(new Set());

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allItemIds = [
    ...shopifyLines.map(l => l.id),
    ...prelovedItems.map(i => i.id)
  ];
  
  const allSelected = allItemIds.length > 0 && selectedIds.size === allItemIds.length;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allItemIds));
    }
  };

  const activeShopifyLines = shopifyLines.filter(line => selectedIds.has(line.id));
  const activePrelovedItems = prelovedItems.filter(item => selectedIds.has(item.id));

  const activeShopifyTotal = activeShopifyLines.reduce((sum, line) => {
    return sum + (parseFloat(line.merchandise?.price?.amount || line.merchandise?.price || '0') * (line.quantity || 1));
  }, 0);
  const activePrelovedTotal = activePrelovedItems.reduce((sum, i) => sum + ((i.price || 0) * (i.qty || 1)), 0);
  const activeCombinedTotal = activeShopifyTotal + activePrelovedTotal;
  const activeItemCount = activeShopifyLines.length + activePrelovedItems.length;

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

  // ---- Preloved cart handlers (Supabase) ----
  const handlePrelovedQty = useCallback(async (itemId, delta) => {
    setPrelovedItems(prev => {
      return prev.map(i => {
        if (i.id !== itemId) return i;
        const newQty = Math.max(0, (i.qty || 1) + delta);
        return newQty === 0 ? null : { ...i, qty: newQty };
      }).filter(Boolean);
    });
    const item = prelovedItems.find(i => i.id === itemId);
    if (!item?.cart_row_id) return;
    const newQty = Math.max(0, (item.qty || 1) + delta);
    if (newQty === 0) {
      await supabase.from('cart_items').delete().eq('id', item.cart_row_id);
    } else {
      await supabase.from('cart_items').update({ quantity: newQty }).eq('id', item.cart_row_id);
    }
  }, [prelovedItems]);

  const handlePrelovedRemove = useCallback(async (itemId) => {
    const item = prelovedItems.find(i => i.id === itemId);
    setPrelovedItems(prev => prev.filter(i => i.id !== itemId));
    if (item?.cart_row_id) {
      await supabase.from('cart_items').delete().eq('id', item.cart_row_id);
    }
  }, [prelovedItems]);

  // ---- Checkout handlers ----
  const handleShopifyCheckout = () => {
    openSheet('checkout', {
      cartItems: activeShopifyLines.map(line => ({
        id: line.id,
        variantId: line.merchandise?.id,
        title: line.merchandise?.product?.title || line.merchandise?.title || 'Item',
        price: parseFloat(line.merchandise?.price?.amount || line.merchandise?.price || '0'),
        qty: line.quantity,
        source: 'shopify'
      })),
      total: activeShopifyTotal
    });
  };

  const handlePrelovedCheckout = () => {
    openSheet('checkout', {
      cartItems: activePrelovedItems,
      total: activePrelovedTotal,
    });
  };

  const handleCheckoutAll = () => {
    const allItems = [
      ...activeShopifyLines.map(line => ({
        id: line.id,
        variantId: line.merchandise?.id,
        title: line.merchandise?.product?.title || line.merchandise?.title || 'Item',
        price: parseFloat(line.merchandise?.price?.amount || line.merchandise?.price || '0'),
        qty: line.quantity,
        source: 'shopify'
      })),
      ...activePrelovedItems
    ];
    openSheet('checkout', {
      cartItems: allItems,
      total: activeCombinedTotal,
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

        {/* ── Select All Toggle ── */}
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#050507]/90 backdrop-blur-md z-10">
          <button 
            onClick={handleToggleSelectAll}
            className="flex items-center gap-2 text-sm text-white/70 active:scale-95 transition-transform"
          >
            {allSelected ? <CheckSquare className="w-5 h-5 text-[#C8962C]" /> : <Square className="w-5 h-5 text-white/30" />}
            <span className="font-bold uppercase tracking-wider text-xs">
              {allSelected ? 'Deselect All' : 'Select All'}
            </span>
          </button>
        </div>

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
                const qty = line.quantity || 1;
                const pricePerItem = parseFloat(variant?.price?.amount || '0');
                const lineTotal = pricePerItem * qty;

                return (
                  <div key={line.id} className="px-4 py-4 flex items-center gap-3">
                    <button 
                      onClick={() => handleToggleSelect(line.id)}
                      className="mr-0 mt-0.5 active:scale-90 transition-transform flex-shrink-0"
                    >
                      {selectedIds.has(line.id) ? (
                        <CheckSquare className="w-5 h-5 text-[#C8962C]" />
                      ) : (
                        <Square className="w-5 h-5 text-white/30" />
                      )}
                    </button>
                    <div className="w-14 h-14 rounded-xl bg-[#1C1C1E] flex-shrink-0 overflow-hidden border border-white/5">
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
                      <p className="text-[#C8962C] text-xs mt-0.5 font-bold">
                        {currency} {lineTotal.toFixed(2)}
                        {qty > 1 && <span className="text-white/30 font-normal ml-1">({qty} × {pricePerItem.toFixed(2)})</span>}
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
                  <button 
                    onClick={() => handleToggleSelect(item.id)}
                    className="mr-0 mt-0.5 active:scale-90 transition-transform flex-shrink-0"
                  >
                    {selectedIds.has(item.id) ? (
                      <CheckSquare className="w-5 h-5 text-[#C8962C]" />
                    ) : (
                      <Square className="w-5 h-5 text-white/30" />
                    )}
                  </button>
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
      <div className="px-4 py-4 border-t border-white/10 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-1">
          <span className="text-white/40 text-xs">{activeItemCount} selected</span>
          {activeShopifyLines.length > 0 && activePrelovedItems.length > 0 && (
            <span className="text-white/30 text-[10px]">
              Shop £{activeShopifyTotal.toFixed(2)} + Preloved £{activePrelovedTotal.toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-white font-bold text-sm">Selected Total</span>
          <span className="text-[#C8962C] font-black text-xl">
            £{activeCombinedTotal.toFixed(2)}
          </span>
        </div>

        {/* Checkout buttons — unified in-app */}
        <div className="space-y-2">
          {activeCombinedTotal === 0 ? (
            <button
              disabled
              className="w-full bg-white/10 text-white/40 font-black text-sm rounded-2xl py-4 transition-transform"
            >
              Select items to checkout
            </button>
          ) : activeShopifyLines.length > 0 && activePrelovedItems.length > 0 ? (
             <button
                onClick={handleCheckoutAll}
                className="w-full bg-[#C8962C] text-black font-black text-sm rounded-2xl py-4 active:scale-95 transition-transform"
              >
                Checkout All Selected · £{activeCombinedTotal.toFixed(2)}
              </button>
          ) : activeShopifyLines.length > 0 ? (
            <button
              onClick={handleShopifyCheckout}
              disabled={isLoading}
              className="w-full bg-[#C8962C] text-black font-black text-sm rounded-2xl py-4 active:scale-95 transition-transform disabled:opacity-60"
            >
              {isLoading
                ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                : `Checkout Shop (£${activeShopifyTotal.toFixed(2)})`}
            </button>
          ) : (
            <button
              onClick={handlePrelovedCheckout}
              className="w-full bg-[#C8962C] text-black font-black text-sm rounded-2xl py-4 active:scale-95 transition-transform"
            >
              Checkout Preloved (£${activePrelovedTotal.toFixed(2)})
            </button>
          )}
        </div>
        <p className="text-center text-white/30 text-[10px] mt-2">Secure checkout · Free returns</p>
      </div>
    </div>
  );
}
