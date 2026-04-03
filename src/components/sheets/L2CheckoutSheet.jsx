/**
 * L2CheckoutSheet — Checkout flow
 *
 * Routes checkout by source:
 * - Shopify items → redirect to Shopify hosted checkout via ShopCartProvider.beginCheckout()
 * - Preloved items → Stripe Checkout Session OR arrange with seller P2P
 * - Mixed → "Complete Shopify items first" guidance
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Lock, Package, Loader2, CheckCircle, MessageCircle, CreditCard, HandshakeIcon, ShieldCheck, ArrowRight } from 'lucide-react';
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
  const [paymentMethod, setPaymentMethod] = useState(null); // 'stripe' | 'p2p'
  const [orderCreated, setOrderCreated] = useState(null);

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setForm(f => ({ ...f, email: session.user.email }));
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

  const createOrderRecord = async (session, status = 'pending_payment') => {
    const user = session?.user;
    if (!user) { toast.error('Please log in'); return null; }

    const { data: order, error: orderErr } = await supabase.from('orders').insert({
      buyer_id: user.id,
      buyer_email: form.email,
      total_gbp: orderTotal,
      status,
      shipping_address: `${form.addressLine1}, ${form.city}, ${form.postcode}, ${form.country}`,
      items: prelovedItems.map(i => ({ id: i.id, title: i.title, price: i.price, qty: i.qty })),
    }).select('id').single();

    if (orderErr) throw orderErr;

    // Notify seller(s)
    const sellerIds = [...new Set(prelovedItems.map(i => i.seller_id).filter(Boolean))];
    for (const sellerId of sellerIds) {
      const { data: sellerProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', sellerId)
        .single();

      if (sellerProfile?.email) {
        await supabase.from('notifications').insert({
          user_email: sellerProfile.email,
          type: 'order',
          title: 'New Order!',
          message: `${form.fullName || 'A buyer'} ordered from you — £${orderTotal.toFixed(2)}`,
          metadata: { order_id: order?.id, buyer_email: form.email },
          read: false,
        }).then(null, () => {});
      }
    }

    return order;
  };

  // Stripe payment: create order then redirect to Stripe Checkout
  const handleStripePayment = async () => {
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const order = await createOrderRecord(session, 'pending_payment');
      if (!order) { setProcessing(false); return; }

      // Create Stripe Checkout Session for preloved item
      const firstItem = prelovedItems[0];
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: 'preloved_order',
          listing_id: firstItem?.id || id,
          price_gbp: orderTotal,
          title: firstItem?.title || 'Preloved Item',
          order_id: order.id,
        }),
      });

      if (res.ok) {
        const { url } = await res.json();
        if (url) {
          // Clear preloved cart items from Supabase
          if (session?.user) {
            await supabase.from('cart_items').delete().eq('auth_user_id', session.user.id).eq('source', 'preloved');
          }
          window.location.href = url; // Redirect to Stripe hosted checkout
          return;
        }
      }

      // Stripe not available — fallback to P2P
      toast('Stripe unavailable right now — arrange payment with seller via chat', { duration: 4000 });
      setOrderCreated(order);
      if (session?.user) {
        await supabase.from('cart_items').delete().eq('auth_user_id', session.user.id).eq('source', 'preloved').catch(() => {});
      }
      setStep('success');
    } catch (err) {
      console.error('Stripe checkout error:', err);
      toast.error('Payment processing failed. Try arranging with seller.');
    } finally {
      setProcessing(false);
    }
  };

  // P2P payment: create order and open chat
  const handleP2PPayment = async () => {
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const order = await createOrderRecord(session, 'pending_payment');
      if (!order) { setProcessing(false); return; }

      setOrderCreated(order);
      if (session?.user) {
        await supabase.from('cart_items').delete().eq('auth_user_id', session.user.id).eq('source', 'preloved').catch(() => {});
      }
      setStep('success');
    } catch (err) {
      console.error('Checkout error:', err);
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

  // ---- SUCCESS SCREEN ----
  if (step === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 px-6 text-center h-full"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-[#C8962C]/20 border-2 border-[#C8962C] flex items-center justify-center mb-6"
        >
          <CheckCircle className="w-10 h-10 text-[#C8962C]" />
        </motion.div>
        <h2 className="text-white font-black text-xl mb-2">Order Placed!</h2>
        <p className="text-white/50 text-sm mb-1">
          {paymentMethod === 'stripe'
            ? 'Payment processing — you\'ll get a confirmation email'
            : 'Message the seller to arrange payment'}
        </p>
        <p className="text-[#C8962C] font-bold text-sm">{form.fullName || 'Order Confirmation'}</p>
        <p className="text-white/30 text-xs mt-3">Order total: £{orderTotal.toFixed(2)}</p>

        <div className="flex gap-3 mt-6 w-full max-w-xs">
          <button
            onClick={handleMessageSeller}
            className="flex-1 bg-[#C8962C] text-black font-black text-sm rounded-2xl px-5 py-3 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <MessageCircle className="w-4 h-4" />
            Message Seller
          </button>
          <button
            onClick={() => openSheet('my-orders')}
            className="flex-1 bg-white/10 text-white font-bold text-sm rounded-2xl px-5 py-3 border border-white/[0.06] active:scale-95 transition-transform"
          >
            View Orders
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* Order summary */}
        <div>
          <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-3">Order Summary</p>
          <div className="bg-[#1C1C1E] rounded-xl border border-white/[0.06] divide-y divide-white/5">
            {items.map(item => (
              <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                <Package className="w-4 h-4 text-[#C8962C] flex-shrink-0" />
                <span className="flex-1 text-white text-sm truncate">{item.title || item.name}</span>
                <span className="text-[#C8962C] font-black text-sm">£{((item.price || 0) * (item.qty || 1)).toFixed(2)}</span>
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
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C8962C]/60 transition-colors"
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {step === 'payment' && (
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-1">Choose Payment Method</p>

            {/* Pay Now — Stripe */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setPaymentMethod('stripe')}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                paymentMethod === 'stripe'
                  ? 'border-[#C8962C] bg-[#C8962C]/10'
                  : 'border-white/10 bg-[#1C1C1E] hover:border-white/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  paymentMethod === 'stripe' ? 'bg-[#C8962C]/20' : 'bg-white/5'
                }`}>
                  <CreditCard className={`w-5 h-5 ${paymentMethod === 'stripe' ? 'text-[#C8962C]' : 'text-white/40'}`} />
                </div>
                <div className="flex-1">
                  <p className={`font-black text-sm ${paymentMethod === 'stripe' ? 'text-[#C8962C]' : 'text-white'}`}>
                    Pay Now
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">
                    Secure card payment via Stripe. Buyer protection included.
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  paymentMethod === 'stripe' ? 'border-[#C8962C]' : 'border-white/20'
                }`}>
                  {paymentMethod === 'stripe' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#C8962C]" />
                  )}
                </div>
              </div>
            </motion.button>

            {/* Arrange with Seller — P2P */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setPaymentMethod('p2p')}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                paymentMethod === 'p2p'
                  ? 'border-[#C8962C] bg-[#C8962C]/10'
                  : 'border-white/10 bg-[#1C1C1E] hover:border-white/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  paymentMethod === 'p2p' ? 'bg-[#C8962C]/20' : 'bg-white/5'
                }`}>
                  <HandshakeIcon className={`w-5 h-5 ${paymentMethod === 'p2p' ? 'text-[#C8962C]' : 'text-white/40'}`} />
                </div>
                <div className="flex-1">
                  <p className={`font-black text-sm ${paymentMethod === 'p2p' ? 'text-[#C8962C]' : 'text-white'}`}>
                    Arrange with Seller
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">
                    Place order and arrange payment directly via chat.
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  paymentMethod === 'p2p' ? 'border-[#C8962C]' : 'border-white/20'
                }`}>
                  {paymentMethod === 'p2p' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#C8962C]" />
                  )}
                </div>
              </div>
            </motion.button>

            {/* Trust badge */}
            <div className="flex items-center justify-center gap-2 pt-2 text-white/25 text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>HOTMESS Buyer Protection</span>
            </div>
          </div>
        )}

      </div>

      <div className="px-4 py-4 border-t border-white/8 space-y-2">
        {step === 'review' ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleProceedToPayment}
            className="w-full bg-[#C8962C] text-black font-black text-sm rounded-2xl py-4 flex items-center justify-center gap-2"
          >
            Continue to Payment
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={paymentMethod === 'stripe' ? handleStripePayment : handleP2PPayment}
            disabled={processing || !paymentMethod}
            className="w-full bg-[#C8962C] text-black font-black text-sm rounded-2xl py-4 flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
          >
            {processing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
            ) : paymentMethod === 'stripe' ? (
              <><CreditCard className="w-4 h-4" /> Pay Now · £{orderTotal.toFixed(2)}</>
            ) : paymentMethod === 'p2p' ? (
              <><MessageCircle className="w-4 h-4" /> Place Order · £{orderTotal.toFixed(2)}</>
            ) : (
              'Select a payment method'
            )}
          </motion.button>
        )}
        <div className="flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3 text-white/20" />
          <p className="text-white/25 text-[10px]">HOTMESS Buyer Protection · Community Guidelines</p>
        </div>
      </div>
    </div>
  );
}
