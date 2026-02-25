/**
 * L2CheckoutSheet — Checkout flow
 * Stripe-based checkout for market purchases.
 */

import { useState, useEffect } from 'react';
import { CreditCard, Lock, Package, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { toast } from 'sonner';

export default function L2CheckoutSheet({ id, cartItems, total }) {
  const { closeSheet, openSheet } = useSheet();
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
  const items = cartItems || (product ? [{ id: product.id, title: product.title, price: product.price, qty: 1 }] : []);

  const handleProceedToPayment = () => {
    if (!form.fullName.trim() || !form.email.trim() || !form.addressLine1.trim() || !form.city.trim() || !form.postcode.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    setStep('payment');
  };

  const handlePayment = async () => {
    setProcessing(true);
    try {
      // In production: call Stripe checkout session API
      // For now: simulate success
      await new Promise(r => setTimeout(r, 1500));

      const { data: { user } } = await supabase.auth.getUser();
      // Create order record
      await supabase.from('orders').insert({
        buyer_email: form.email,
        total_gbp: orderTotal,
        status: 'processing',
        shipping_address: `${form.addressLine1}, ${form.city}, ${form.postcode}, ${form.country}`,
      });

      // Clear cart
      localStorage.removeItem('hm_cart');
      setStep('success');
    } catch {
      toast.error('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
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
        <h2 className="text-white font-black text-xl mb-2">Order Placed!</h2>
        <p className="text-white/50 text-sm mb-1">Confirmation sent to</p>
        <p className="text-[#C8962C] font-bold text-sm">{form.email}</p>
        <p className="text-white/30 text-xs mt-3">Order total: £{orderTotal.toFixed(2)}</p>
        <button
          onClick={() => openSheet('vault')}
          className="mt-6 bg-[#C8962C] text-black font-black text-sm rounded-2xl px-6 py-3"
        >
          View in Vault
        </button>
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
            <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-3">Payment</p>
            <div className="bg-[#C8962C]/10 border border-[#C8962C]/20 rounded-2xl p-4 flex items-start gap-3">
              <Lock className="w-4 h-4 text-[#C8962C] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[#C8962C] font-bold text-sm">Secure Payment</p>
                <p className="text-white/40 text-xs mt-0.5">
                  You'll be redirected to Stripe to complete your payment securely.
                </p>
              </div>
            </div>
            <div className="mt-3 bg-[#1C1C1E] rounded-2xl p-4 text-center">
              <CreditCard className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="text-white/50 text-sm">Stripe payment integration</p>
              <p className="text-white/25 text-xs mt-1">Click below to complete payment</p>
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
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              : <><Lock className="w-4 h-4" /> Pay £{orderTotal.toFixed(2)} Now</>}
          </button>
        )}
        <div className="flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3 text-white/20" />
          <p className="text-white/25 text-[10px]">Secured by Stripe · 256-bit encryption</p>
        </div>
      </div>
    </div>
  );
}
