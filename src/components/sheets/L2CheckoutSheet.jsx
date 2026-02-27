/**
 * L2CheckoutSheet — Checkout flow
 *
 * Routes checkout by source:
 * - Shopify items → redirect to Shopify hosted checkout via ShopCartProvider.beginCheckout()
 * - Preloved items → create order record + open chat with seller to arrange payment
 * - Mixed → "Complete Shopify items first" guidance
 */

import { useState, useEffect, useMemo } from 'react';
import { Lock, Package, Loader2, CheckCircle, MessageCircle } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { useShopCart } from '@/features/shop/cart/ShopCartContext';
import { toast } from 'sonner';

export default function L2CheckoutSheet({ id, cartItems, total }) {
  const { closeSheet, openSheet } = useSheet();
  const { beginCheckout } = useShopCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState('review'); // 'review' | 'payment' | 'success'

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    addressLine1: '',
    city: '',
    postcode: '',
    country: 'GB',
  });

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    const load = async () => {
      const { data } = await supabase
        .from('preloved_listings')
        .select('id, title, price, images, seller_id')
        .eq('id', id)
        .single();
      if (data) setProduct(data);
      setLoading(false);
    };
    load();
  }, [id]);

  // Pre-fill email from auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setForm(f => ({ ...f, email: user.email }));
    });
  }, []);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const orderTotal = total || product?.price || 0;
  const items = cartItems || (product ? [{ id: product.id, title: product.title, price: product.price, qty: 1, source: 'preloved', seller_id: product.seller_id }] : []);

  // Determine cart composition
  const { hasShopify, hasPreloved, prelovedItems } = useMemo(() => {
    const shopify = items.some(i => i.source === 'shopify');
    const preloved = items.some(i => !i.source || i.source === 'preloved');
    return { hasShopify: shopify, hasPreloved: preloved, prelovedItems: items.filter(i => !i.source || i.source === 'preloved') };
  }, [items]);

  const handleProceedToPayment = () => {
    if (!form.fullName.trim() || !form.email.trim() || !form.addressLine1.trim() || !form.city.trim() || !form.postcode.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    // If Shopify items present, redirect to Shopify checkout
    if (hasShopify && !hasPreloved) {
      try {
        beginCheckout();
        toast.success('Redirecting to checkout...');
        closeSheet();
      } catch (err) {
        toast.error(err?.message || 'Checkout unavailable');
      }
      return;
    }

    // If mixed cart, guide user
    if (hasShopify && hasPreloved) {
      toast('Complete Shopify items first, then preloved items separately', { duration: 4000 });
      try {
        beginCheckout();
        closeSheet();
      } catch (err) {
        toast.error(err?.message || 'Checkout unavailable');
      }
      return;
    }

    // Preloved only → proceed to payment step
    setStep('payment');
  };

  const handlePayment = async () => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Create order record for preloved items
      await supabase.from('orders').insert({
        buyer_id: user?.id,
        buyer_email: form.email,
        total_gbp: orderTotal,
        status: 'pending_payment',
        shipping_address: `${form.addressLine1}, ${form.city}, ${form.postcode}, ${form.country}`,
      });

      // Clear preloved items from local cart
      localStorage.removeItem('hm_cart');
      setStep('success');
    } catch {
      toast.error('Failed to create order. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Open chat with first seller (preloved items)
  const handleMessageSeller = () => {
    const sellerId = prelovedItems[0]?.seller_id || product?.seller_id;
    if (sellerId) {
      openSheet('chat', { recipientId: sellerId });
    } else {
      toast.error('Seller contact unavailable');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center h-full">
        <div className="w-20 h-20 rounded-full bg-[#C8962C]/20 border-2 border-[#C8962C] flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-[#C8962C]" />
        </div>
        <h2 className="text-white font-black text-xl mb-2">Order Created!</h2>
        <p className="text-white/50 text-sm mb-1">
          Message the seller to arrange payment
        </p>
        <p className="text-[#C8962C] font-bold text-sm">{form.email}</p>
        <p className="text-white/30 text-xs mt-3">Order total: £{orderTotal.toFixed(2)}</p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleMessageSeller}
            className="bg-[#C8962C] text-black font-black text-sm rounded-2xl px-6 py-3 flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Message Seller
          </button>
          <button
            onClick={() => openSheet('my-orders')}
            className="bg-white/10 text-white font-bold text-sm rounded-2xl px-6 py-3"
          >
            View Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* Order summary */}
        <div>
          <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-3">Order Summary</p>
          <div className="bg-[#1C1C1E] rounded-2xl divide-y divide-white/5">
            {items.map(item => (
              <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                <Package className="w-4 h-4 text-[#C8962C] flex-shrink-0" />
                <span className="flex-1 text-white text-sm truncate">{item.title || item.name}</span>
                <span className="text-white/60 text-sm">£{((item.price || 0) * (item.qty || 1)).toFixed(2)}</span>
              </div>
            ))}
            <div className="px-4 py-3 flex justify-between">
              <span className="text-white/60 text-sm">Total</span>
              <span className="text-[#C8962C] font-black text-sm">£{orderTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {step === 'review' && (
          <>
            {/* Shipping */}
            <div>
              <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-3">Delivery Address</p>
              <div className="space-y-2">
                {[
                  { key: 'fullName', placeholder: 'Full name' },
                  { key: 'email', placeholder: 'Email address', type: 'email' },
                  { key: 'addressLine1', placeholder: 'Address line 1' },
                  { key: 'city', placeholder: 'City' },
                  { key: 'postcode', placeholder: 'Postcode' },
                ].map(({ key, placeholder, type = 'text' }) => (
                  <input
                    key={key}
                    type={type}
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C8962C]/60"
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {step === 'payment' && (
          <div>
            <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-3">Arrange Payment</p>
            <div className="bg-[#C8962C]/10 border border-[#C8962C]/20 rounded-2xl p-4 flex items-start gap-3">
              <MessageCircle className="w-4 h-4 text-[#C8962C] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[#C8962C] font-bold text-sm">Peer-to-Peer Purchase</p>
                <p className="text-white/40 text-xs mt-0.5">
                  Your order will be created and the seller notified. Arrange payment directly with the seller via chat.
                </p>
              </div>
            </div>
            <div className="mt-3 bg-[#1C1C1E] rounded-2xl p-4">
              <p className="text-white/50 text-sm text-center">
                HOTMESS holds your order details. Payment is arranged between buyer and seller.
              </p>
              <div className="flex items-center justify-center gap-2 mt-3 text-white/25 text-xs">
                <Lock className="w-3 h-3" />
                <span>Protected by HOTMESS Community Guidelines</span>
              </div>
            </div>
          </div>
        )}

      </div>

      <div className="px-4 py-4 border-t border-white/8 space-y-2">
        {step === 'review' ? (
          <button
            onClick={handleProceedToPayment}
            className="w-full bg-[#C8962C] text-black font-black text-sm rounded-2xl py-4 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            Continue to Payment · £{orderTotal.toFixed(2)}
          </button>
        ) : (
          <button
            onClick={handlePayment}
            disabled={processing}
            className="w-full bg-[#C8962C] text-black font-black text-sm rounded-2xl py-4 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
          >
            {processing
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating Order...</>
              : <><MessageCircle className="w-4 h-4" /> Place Order · £{orderTotal.toFixed(2)}</>}
          </button>
        )}
        <div className="flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3 text-white/20" />
          <p className="text-white/25 text-[10px]">HOTMESS Buyer Protection · Community Guidelines</p>
        </div>
      </div>
    </div>
  );
}
