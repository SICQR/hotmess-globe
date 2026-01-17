import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import {
  getGuestCartItems,
} from '@/components/marketplace/cartStorage';

const filterValid = (items) => {
  const now = new Date();
  return (Array.isArray(items) ? items : []).filter((item) => {
    if (!item?.reserved_until) return true;
    try {
      return new Date(item.reserved_until) > now;
    } catch {
      return true;
    }
  });
};

export default function CreatorsCart() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth
      .me()
      .then((me) => setCurrentUser(me || null))
      .catch(() => setCurrentUser(null));
  }, []);

  const { data: cartItems = [] } = useQuery({
    queryKey: ['creators-cart', currentUser?.email || 'guest'],
    queryFn: async () => {
      if (!currentUser?.email) return filterValid(getGuestCartItems());

      const authUserId = currentUser?.auth_user_id || null;
      try {
        const items = authUserId
          ? await base44.entities.CartItem.filter({ auth_user_id: authUserId })
          : await base44.entities.CartItem.filter({ user_email: currentUser.email });
        return filterValid(items);
      } catch {
        return filterValid(getGuestCartItems());
      }
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['creators-cart-products'],
    queryFn: () => base44.entities.Product.filter({}, '-created_at'),
  });

  const cartWithProducts = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    return (Array.isArray(cartItems) ? cartItems : [])
      .map((item) => {
        const product = list.find((p) => String(p?.id) === String(item?.product_id));
        return product ? { ...item, product } : null;
      })
      .filter(Boolean);
  }, [cartItems, products]);

  const totalXP = useMemo(() => {
    return cartWithProducts.reduce((sum, item) => {
      const price = Number(item?.product?.price_xp) || 0;
      const qty = Number(item?.quantity) || 0;
      return sum + price * qty;
    }, 0);
  }, [cartWithProducts]);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">MESS MARKET CART</h1>
            <p className="text-white/60 text-sm">Creators bundle • Consent-first checkout</p>
          </div>
          <Button asChild className="bg-[#00D9FF] text-black hover:bg-white font-black uppercase">
            <Link to="/market/creators">Back to Market</Link>
          </Button>
        </div>

        {cartWithProducts.length === 0 ? (
          <div className="border border-white/10 bg-white/5 p-6 text-center">
            <ShoppingBag className="w-10 h-10 text-white/30 mx-auto mb-3" />
            <p className="text-white/70">Your creators cart is empty.</p>
            <div className="mt-4">
              <Button asChild className="bg-[#B026FF] text-white hover:bg-white hover:text-black font-black uppercase">
                <Link to="/market/creators">Browse creators</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60 uppercase">Subtotal</span>
                <span className="text-xl font-black text-[#FFEB3B]">{totalXP} XP</span>
              </div>
              <p className="text-[11px] text-white/50 mt-2">Checkout will enforce consent + care acknowledgement.</p>
            </div>

            <Button asChild className="w-full bg-[#39FF14] text-black hover:bg-white font-black uppercase py-6">
              <Link to="/market/creators/checkout">Proceed to checkout</Link>
            </Button>

            <div className="space-y-3">
              {cartWithProducts.map((item) => (
                <div
                  key={item?.id ?? `${item?.product_id}::${item?.shopify_variant_id || ''}`}
                  className="border border-white/10 bg-white/5 p-4"
                >
                  <p className="font-black">{item.product?.name || 'Item'}</p>
                  {item?.variant_title ? (
                    <p className="text-xs text-white/60 uppercase tracking-wider mt-1">{item.variant_title}</p>
                  ) : null}
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-white/60">Qty</span>
                    <span className="font-bold">{item.quantity || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-center">
          <Link to="/market" className="text-sm text-white/60 hover:text-white">
            Go to official shop
          </Link>
        </div>
      </div>
    </div>
  );
}
