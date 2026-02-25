import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { base44 } from '@/api/base44Client';
import {
  clearGuestCart,
  getGuestCartItems,
} from '@/components/marketplace/cartStorage';
import { toast } from 'sonner';

const CONSENT_LOG_KEY = 'market_consent_log_v1';

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

const appendConsentLog = (entry) => {
  try {
    const raw = window.localStorage.getItem(CONSENT_LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(parsed) ? parsed : [];
    arr.unshift(entry);
    window.localStorage.setItem(CONSENT_LOG_KEY, JSON.stringify(arr.slice(0, 50)));
  } catch {
    // ignore
  }
};

export default function CreatorsCheckout() {
  const [currentUser, setCurrentUser] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth
      .me()
      .then((me) => setCurrentUser(me || null))
      .catch(() => setCurrentUser(null));
  }, []);

  const { data: cartItems = [], isLoading: isLoadingCart } = useQuery({
    queryKey: ['creators-checkout-cart', currentUser?.email || 'guest'],
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
    queryKey: ['creators-checkout-products'],
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

  const productIds = useMemo(
    () => cartWithProducts.map((i) => String(i?.product?.id || i?.product_id)).filter(Boolean),
    [cartWithProducts]
  );

  const totalXP = useMemo(() => {
    return cartWithProducts.reduce((sum, item) => {
      const price = Number(item?.product?.price_xp) || 0;
      const qty = Number(item?.quantity) || 0;
      return sum + price * qty;
    }, 0);
  }, [cartWithProducts]);

  const clearCart = useMutation({
    mutationFn: async () => {
      if (!currentUser?.email) {
        clearGuestCart();
        return;
      }

      const authUserId = currentUser?.auth_user_id || null;
      const items = authUserId
        ? await base44.entities.CartItem.filter({ auth_user_id: authUserId })
        : await base44.entities.CartItem.filter({ user_email: currentUser.email });

      await Promise.all((items || []).map((item) => base44.entities.CartItem.delete(item.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creators-checkout-cart'] });
      queryClient.invalidateQueries({ queryKey: ['creators-cart'] });
    },
  });

  const completeCheckout = async () => {
    if (!accepted) return;
    if (cartWithProducts.length === 0) return;

    appendConsentLog({
      acceptedAtISO: new Date().toISOString(),
      productIds,
      cartSnapshot: cartWithProducts.map((item) => ({
        product_id: item.product?.id,
        name: item.product?.name,
        quantity: item.quantity,
        variant_title: item.variant_title || null,
        price_xp: item.product?.price_xp,
      })),
    });

    try {
      await clearCart.mutateAsync();
      toast.success('Checkout complete');
      navigate('/market/creators/checkout-success');
    } catch (e) {
      toast.error(e?.message || 'Failed to complete checkout');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">MESS MARKET CHECKOUT</h1>
            <p className="text-white/60 text-sm">Consent-first. Care always.</p>
          </div>
          <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white hover:text-black font-black uppercase">
            <Link to="/market/creators/cart">Back to cart</Link>
          </Button>
        </div>

        {isLoadingCart ? (
          <div className="border border-white/10 bg-white/5 p-6 text-center">
            <p className="text-white/70">Loading checkout…</p>
          </div>
        ) : cartWithProducts.length === 0 ? (
          <div className="border border-white/10 bg-white/5 p-6 text-center">
            <ShoppingBag className="w-10 h-10 text-white/30 mx-auto mb-3" />
            <p className="text-white/70">Your cart is empty.</p>
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
                <span className="text-xl font-black text-[#C8962C]">£{totalXP}</span>
              </div>
              <p className="text-[11px] text-white/50 mt-2">
                This is a local-only checkout flow right now. No payment is processed.
              </p>
            </div>

            <div className="border border-white/10 bg-white/5 p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="consent"
                  checked={accepted}
                  onCheckedChange={(v) => setAccepted(v === true)}
                  className="mt-1"
                />
                <label htmlFor="consent" className="text-sm leading-snug">
                  <span className="font-black">I’m 18+</span> and I’ve read the Care + Consent notes.
                  <span className="block text-[11px] text-white/50 mt-1">
                    Ask first. Confirm yes. Respect no. No pressure.
                  </span>
                </label>
              </div>
            </div>

            <Button
              onClick={completeCheckout}
              disabled={!accepted || clearCart.isPending}
              className="w-full bg-[#39FF14] text-black hover:bg-white font-black uppercase py-6"
            >
              <ShieldCheck className="w-5 h-5 mr-2" />
              Complete checkout
            </Button>

            <div className="border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/60 uppercase tracking-wider font-bold mb-3">Cart summary</p>
              <div className="space-y-2">
                {cartWithProducts.map((item) => (
                  <div
                    key={item?.id ?? `${item?.product_id}::${item?.shopify_variant_id || ''}`}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-bold">{item.product?.name || 'Item'}</span>
                      {item?.variant_title ? (
                        <span className="text-white/60"> • {item.variant_title}</span>
                      ) : null}
                    </span>
                    <span className="text-white/70">× {item.quantity || 0}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center text-xs text-white/50">
              Need help? <Link to="/safety" className="text-white hover:underline">Safety</Link> •{' '}
              <Link to="/music/live" className="text-white hover:underline">Radio</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
