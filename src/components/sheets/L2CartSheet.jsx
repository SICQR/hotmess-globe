/**
 * L2CartSheet — Shopping cart
 * Shows items in the local cart state, totals, and a checkout CTA.
 */

import { useState } from 'react';
import { ShoppingBag, X, Plus, Minus } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';

// Simple local cart store using localStorage
function getCart() {
  try {
    return JSON.parse(localStorage.getItem('hm_cart') || '[]');
  } catch {
    return [];
  }
}

function saveCart(items) {
  localStorage.setItem('hm_cart', JSON.stringify(items));
}

export default function L2CartSheet() {
  const { openSheet, closeSheet } = useSheet();
  const [items, setItems] = useState(getCart);

  const updateQty = (id, delta) => {
    const updated = items
      .map(i => i.id === id ? { ...i, qty: Math.max(0, (i.qty || 1) + delta) } : i)
      .filter(i => i.qty > 0);
    setItems(updated);
    saveCart(updated);
  };

  const remove = (id) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    saveCart(updated);
  };

  const total = items.reduce((sum, i) => sum + ((i.price || 0) * (i.qty || 1)), 0);

  const handleCheckout = () => {
    if (items.length === 0) return;
    openSheet('checkout', { cartItems: items, total });
  };

  if (items.length === 0) {
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
        {items.map(item => (
          <div key={item.id} className="px-4 py-4 flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-[#1C1C1E] flex-shrink-0 overflow-hidden">
              {item.image
                ? <img src={item.image} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-white/20" />
                  </div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">{item.title || item.name}</p>
              <p className="text-[#C8962C] text-xs mt-0.5">£{(item.price || 0).toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => updateQty(item.id, -1)}
                className="w-7 h-7 rounded-full bg-[#1C1C1E] flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-white font-bold text-sm w-5 text-center">{item.qty || 1}</span>
              <button
                onClick={() => updateQty(item.id, 1)}
                className="w-7 h-7 rounded-full bg-[#1C1C1E] flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                onClick={() => remove(item.id)}
                className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Total & Checkout */}
      <div className="px-4 py-4 border-t border-white/8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/60 text-sm">Total</span>
          <span className="text-white font-black text-lg">£{total.toFixed(2)}</span>
        </div>
        <button
          onClick={handleCheckout}
          className="w-full bg-[#C8962C] text-black font-black text-sm rounded-2xl py-4 active:scale-95 transition-transform"
        >
          Checkout ({items.length} {items.length === 1 ? 'item' : 'items'})
        </button>
        <p className="text-center text-white/30 text-[10px] mt-2">Secure checkout · Free returns</p>
      </div>
    </div>
  );
}
