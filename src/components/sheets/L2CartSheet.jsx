/**
 * L2CartSheet — Shopping cart powered by Shopify Storefront API
 * Uses ShopCartContext for cart state (single source of truth).
 */

import { ShoppingBag, X, Plus, Minus, Loader2 } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { useShopCart } from '@/features/shop/cart/ShopCartContext';
import { toast } from 'sonner';

export default function L2CartSheet() {
  const { closeSheet } = useSheet();
  const { cart, isLoading, updateLineQuantity, removeLine, beginCheckout } = useShopCart();

  const lines = cart?.lines?.edges?.map(e => e.node) || [];
  const totalAmount = cart?.cost?.totalAmount;
  const currency = totalAmount?.currencyCode || 'GBP';
  const total = parseFloat(totalAmount?.amount || '0');

  const handleUpdateQty = async (lineId, currentQty, delta) => {
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

  const handleRemove = async (lineId) => {
    try {
      await removeLine({ lineId });
    } catch (err) {
      toast.error(err?.message || 'Failed to remove item');
    }
  };

  const handleCheckout = () => {
    try {
      beginCheckout();
    } catch (err) {
      toast.error(err?.message || 'Checkout unavailable');
    }
  };

  if (lines.length === 0) {
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
      {/* Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5">
        {lines.map(line => {
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
                  onClick={() => handleUpdateQty(line.id, qty, -1)}
                  disabled={isLoading}
                  className="w-7 h-7 rounded-full bg-[#1C1C1E] flex items-center justify-center text-white/60 hover:text-white transition-colors disabled:opacity-40"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-white font-bold text-sm w-5 text-center">{qty}</span>
                <button
                  onClick={() => handleUpdateQty(line.id, qty, 1)}
                  disabled={isLoading}
                  className="w-7 h-7 rounded-full bg-[#1C1C1E] flex items-center justify-center text-white/60 hover:text-white transition-colors disabled:opacity-40"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleRemove(line.id)}
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

      {/* Total & Checkout */}
      <div className="px-4 py-4 border-t border-white/8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/60 text-sm">Total</span>
          <span className="text-white font-black text-lg">
            {currency} {total.toFixed(2)}
          </span>
        </div>
        <button
          onClick={handleCheckout}
          disabled={isLoading}
          className="w-full bg-[#C8962C] text-black font-black text-sm rounded-2xl py-4 active:scale-95 transition-transform disabled:opacity-60"
        >
          {isLoading
            ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            : `Checkout (${lines.length} ${lines.length === 1 ? 'item' : 'items'})`}
        </button>
        <p className="text-center text-white/30 text-[10px] mt-2">Secure checkout · Free returns</p>
      </div>
    </div>
  );
}
