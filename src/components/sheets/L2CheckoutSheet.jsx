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
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function L2CheckoutSheet({ id, cartItems, total }) {
  const { closeSheet, openSheet } = useSheet();
  const { beginCheckout } = useShopCart();
  const [product, setProduct] = useState(null);
  
  // NEW LOG: See exactly what props are coming in the door
  console.log('[Checkout] Sheet opened with props:', { id, cartItems, total });

  const [loading, setLoading] = useState(!!id);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState('review'); // 'review' | 'payment' | 'stripe_embedded' | 'success'
  const [paymentMethod, setPaymentMethod] = useState(null); // 'stripe' | 'p2p'
  const [orderCreated, setOrderCreated] = useState(null);
  const [clientSecret, setClientSecret] = useState('');

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
      setLoading(true);
      const cleanId = id.replace('preloved_', '');
      console.log('[Checkout] Searching for item:', { original: id, clean: cleanId });
      
      const { data, error } = await supabase
        .from('market_listings')
        .select('*')
        .or(`id.eq.${cleanId},id.eq.${id}`)
        .maybeSingle();

      if (error) {
        console.error('[Checkout] Database error while fetching product:', error);
      } else if (data) {
        console.log('[Checkout] Product LOADED successfully:', data);
        setProduct(data);
      } else {
        console.warn('[Checkout] Product NOT found in database for either ID. Check if it was deleted.');
      }
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

  const [lockedTotal, setLockedTotal] = useState(total || 0);

  useEffect(() => {
    if (total > 0 && lockedTotal === 0) {
      setLockedTotal(total);
    }
  }, [total]);

  const orderTotal = lockedTotal || product?.price || total || 0;
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

    // Both Shopify and Preloved items now proceed to the internal payment step
    setStep('payment');
  };

  const createOrderRecord = async (session, status = 'pending_payment') => {
    const user = session?.user;
    if (!user) { toast.error('Please log in'); return null; }

    // EMERGENCY FALLBACK: If product is still null, try to fetch it one last time right now
    let activeProduct = product;
    if (!activeProduct && id) {
      console.log('[Checkout] Emergency product fetch starting for ID:', id);
      const cleanId = id.toString().replace('preloved_', '');
      const { data } = await supabase.from('market_listings').select('*').eq('id', cleanId).maybeSingle();
      if (data) {
        console.log('[Checkout] Emergency fetch SUCCESS:', data.title);
        activeProduct = data;
      } else {
        console.warn('[Checkout] Emergency fetch FAILED for ID:', cleanId);
      }
    }

    // Ensure we have a valid items array for the database
    const finalItems = (items && items.length > 0) 
      ? items 
      : (activeProduct ? [{ 
          id: activeProduct.id, 
          title: activeProduct.title, 
          price: activeProduct.price || activeProduct.price_gbp || (activeProduct.price_pence ? activeProduct.price_pence/100 : 0), 
          qty: 1, 
          source: 'preloved', 
          seller_id: activeProduct.seller_id 
        }] : []);

    const payload = {
      p_buyer_id: user.id,
      p_buyer_email: form.email,
      p_total_gbp: orderTotal || (activeProduct?.price || 0),
      p_shipping_address: `${form.addressLine1}, ${form.city}, ${form.postcode}, ${form.country}`,
      p_items: finalItems.map(i => ({ 
        id: i.id, 
        title: i.title || 'Item', 
        price: i.price || 0, 
        qty: i.qty || 1,
        source: i.source || 'preloved',
        seller_id: i.seller_id || activeProduct?.seller_id || null,
        variantId: i.variantId || null
      })),
      p_status: status
    };

    console.log('[Checkout] Final RPC Payload:', payload);

    // Use RPC to bypass the schema cache issues
    const { data: orderId, error: orderErr } = await supabase.rpc('create_unified_order', payload);

    if (orderErr) {
      console.error('Order RPC Error:', orderErr);
      throw orderErr;
    }

    console.log('[Checkout] Order created successfully. ID:', orderId);

    // FIX: Force listing status update to counteract any automatic "sold" logic in the RPC
    if (activeProduct?.id) {
      const cleanId = activeProduct.id.toString().replace('preloved_', '');
      const { data: latestStock } = await supabase
        .from('market_listings')
        .select('quantity, status')
        .eq('id', cleanId)
        .single();
      
      if (latestStock) {
        const purchasedQty = finalItems[0]?.qty || 1;
        const newQty = Math.max(0, (latestStock.quantity || 1) - purchasedQty);
        
        const updates = { 
          quantity: newQty,
          status: newQty > 0 ? (latestStock.status === 'sold' ? 'active' : latestStock.status) : 'sold',
          updated_at: new Date().toISOString()
        };

        // If the RPC already marked it as sold, we force it back to active if newQty > 0
        if (newQty > 0) {
          updates.status = 'active';
        }

        await supabase.from('market_listings').update(updates).eq('id', cleanId);
        console.log('[Checkout] Global status/stock fix applied:', updates);
      }
    }

    // Return a mock order object that matches what legacy code expects
    return { id: orderId };
  };

  // Stripe payment: create order then redirect to Stripe Checkout
  const handleStripePayment = async () => {
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Create local order record in Supabase
      const order = await createOrderRecord(session, 'pending_payment');
      if (!order) { setProcessing(false); return; }

      // Determine the payload based on cart contents
      const payload = {
        type: hasShopify ? 'shopify_order' : 'preloved_order',
        order_id: order.id,
        items: items.map(i => ({
          title: i.title,
          price: i.price,
          qty: i.qty,
          variantId: i.variantId || null,
        })),
        price_gbp: orderTotal,
      };

      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || errJson.error || 'Checkout initialization failed');
      }

      const { clientSecret: secret } = await res.json();
      if (secret) {
        // Store order so onComplete can mark it paid
        setOrderCreated(order);
        // Clear cart items
        if (hasShopify) {
          localStorage.removeItem('shopify_cart_id');
        }
        if (hasPreloved && session?.user) {
          await supabase.from('cart_items').delete().eq('auth_user_id', session.user.id).eq('source', 'preloved');
        }
        setClientSecret(secret);
        setStep('stripe_embedded');
        return;
      }
    } catch (err) {
      console.error('Stripe checkout error:', err);
      toast.error(err.message || 'Payment processing failed');
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

      // Update stock/quantity instead of just marking as sold
      if (id) {
        const cleanId = id.toString().replace('preloved_', '');
        const { data: currentListing } = await supabase
          .from('market_listings')
          .select('quantity, status')
          .eq('id', cleanId)
          .single();

        if (currentListing) {
          const currentQty = currentListing.quantity || 1;
          const purchasedQty = items[0]?.qty || 1;
          const newQty = Math.max(0, currentQty - purchasedQty);
          
          const updates = { 
            quantity: newQty,
            updated_at: new Date().toISOString()
          };
          
          if (newQty <= 0) {
            updates.status = 'sold';
          }

          await supabase.from('market_listings').update(updates).eq('id', cleanId);
          console.log('[Checkout] Inventory updated:', { previous: currentQty, now: newQty });
        }
      }

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

  // ---- STRIPE EMBEDDED CHECKOUT ----
  if (step === 'stripe_embedded' && clientSecret) {
    const handlePaymentComplete = async () => {
      console.log('[Stripe] onComplete callback fired. Marking order as paid...');
      // Mark order as paid directly — works even without webhooks in local dev
      if (orderCreated?.id) {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Update 'orders' table with seller_id linkage
        // We use the activeProduct info we got during or before the payment
        const finalSellerId = product?.seller_id || orderCreated?.seller_id;
        
        const { error: err1 } = await supabase
          .from('orders')
          .update({ 
            status: 'paid', 
            seller_id: finalSellerId,
            updated_at: new Date().toISOString() 
          })
          .eq('id', orderCreated.id);
        
        if (err1) console.error('[Stripe] Failed to update orders table:', err1.message);
        else console.log('[Stripe] successfully updated orders table to paid');

        // Update 'product_orders' table to paid
        const { error: err2 } = await supabase
          .from('product_orders')
          .update({ status: 'paid', updated_at: new Date().toISOString() })
          .eq('order_id', orderCreated.id);
        
        if (err2) console.warn('[Stripe] product_orders status update error:', err2.message);
        else console.log('[Stripe] successfully updated product_orders table to paid');

        // Update stock/quantity instead of just forcing SOLD
        const listingId = product?.id || id?.toString().replace('preloved_', '');
        if (listingId) {
          const { data: currentListing } = await supabase
            .from('market_listings')
            .select('quantity, status')
            .eq('id', listingId)
            .single();

          if (currentListing) {
            const currentQty = currentListing.quantity || 1;
            const purchasedQty = items[0]?.qty || 1;
            const newQty = Math.max(0, currentQty - purchasedQty);
            
            const updates = { 
              quantity: newQty,
              updated_at: new Date().toISOString()
            };
            
            if (newQty <= 0) {
              updates.status = 'sold';
            }

            await supabase
              .from('market_listings')
              .update(updates)
              .eq('id', listingId)
              .then(null, (e) => console.warn('[Stripe] stock update failed:', e.message));
            
            console.log('[Checkout] Stripe Inventory updated:', { previous: currentQty, now: newQty });
          }
        }

        // Clear cart
        if (session?.user) {
          await supabase.from('cart_items').delete().eq('auth_user_id', session.user.id);
          console.log('[Stripe] cleared cart_items in DB');
        }
        try { 
          localStorage.removeItem('shopify_cart_id_v1'); 
          localStorage.removeItem('shopify_cart_id');
          console.log('[Stripe] cleared shopify_cart_id from localStorage');
        } catch(e) {}

        toast.success('Payment confirmed! Your order is now paid.');
      } else {
        console.warn('[Stripe] No orderCreated.id found during onComplete. This is bad.');
      }
      setStep('success');
    };

    return (
      <div className="flex flex-col h-full bg-[#1C1C1E]">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-white font-black">Secure Checkout</h2>
          <button onClick={() => setStep('payment')} className="text-white/40 text-xs">Back</button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-[400px]">
          <EmbeddedCheckoutProvider 
            stripe={stripePromise} 
            options={{ clientSecret, onComplete: handlePaymentComplete }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
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
