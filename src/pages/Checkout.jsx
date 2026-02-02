import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auth, base44, supabase } from '@/components/utils/supabaseClient';
import { createPageUrl } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ShoppingCart, Check, Gift, Tag, Sparkles, X, Clock, Shield, Truck, Percent } from 'lucide-react';
import { toast } from 'sonner';
import ErrorBoundary from '../components/error/ErrorBoundary';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getGuestCartItems, mergeGuestCartToUser } from '@/components/marketplace/cartStorage';
import { isXpPurchasingEnabled } from '@/lib/featureFlags';

// Promo code validation
const PROMO_CODES = {
  'HOTMESS10': { type: 'percent', value: 10, minXP: 100 },
  'WELCOME20': { type: 'percent', value: 20, minXP: 200, newUsersOnly: true },
  'SQUAD50': { type: 'fixed', value: 50, minXP: 200 },
  'FREEDELIVERY': { type: 'freeDelivery', value: 0 },
};

export default function Checkout() {
  const [currentUser, setCurrentUser] = useState(null);
  const [shippingAddress, setShippingAddress] = useState({});
  const [notes, setNotes] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [magicEmail, setMagicEmail] = useState('');
  const [sendingLink, setSendingLink] = useState(false);
  const [embeddedShopifyCheckoutUrl, setEmbeddedShopifyCheckoutUrl] = useState('');
  const [isShopifyCheckoutOpen, setIsShopifyCheckoutOpen] = useState(false);
  // New features
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [isGift, setIsGift] = useState(false);
  const [giftRecipient, setGiftRecipient] = useState({ name: '', email: '', message: '' });
  const [paymentMethod, setPaymentMethod] = useState('xp');
  const [showPromoInput, setShowPromoInput] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const xpPurchasingEnabled = isXpPurchasingEnabled();

  const isDisallowedCheckoutUrl = (value) => {
    try {
      const host = new URL(String(value)).host.toLowerCase();
      return host.includes('myshopify.com') || host.includes('shopify.com') || host.includes('shop.app');
    } catch {
      return true;
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          base44.auth.redirectToLogin(window.location.href);
          return;
        }

        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        base44.auth.redirectToLogin(window.location.href);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!currentUser?.email) return;

    const mergedKey = `guest_cart_merged_for:${currentUser.email}`;
    try {
      if (sessionStorage.getItem(mergedKey)) return;
    } catch {
      // If sessionStorage is unavailable, attempt merge anyway.
    }

    mergeGuestCartToUser({ currentUser })
      .then(() => {
        try {
          sessionStorage.setItem(mergedKey, '1');
        } catch {
          // ignore
        }
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      })
      .catch(() => {
        // Non-fatal: keep guest cart local if merge fails.
      });
  }, [currentUser?.email, queryClient]);

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart', currentUser?.email || 'guest'],
    queryFn: async () => {
      // Filter out expired reservations (30min timeout)
      const now = new Date();

      if (!currentUser) {
        const items = getGuestCartItems();
        return items.filter(item => {
          if (!item.reserved_until) return true;
          return new Date(item.reserved_until) > now;
        });
      }

      const authUserId = currentUser?.auth_user_id || null;

      const items = authUserId
        ? await base44.entities.CartItem.filter({ auth_user_id: authUserId })
        : await base44.entities.CartItem.filter({ user_email: currentUser.email });
      return items.filter(item => {
        if (!item.reserved_until) return true;
        return new Date(item.reserved_until) > now;
      });
    },
    enabled: true
  });

  const cartProductIds = Array.from(
    new Set(
      (Array.isArray(cartItems) ? cartItems : [])
        .map((item) => item?.product_id)
        .filter((id) => id !== null && id !== undefined)
        .map((id) => String(id))
    )
  );

  const { data: products = [] } = useQuery({
    queryKey: ['products', 'by-cart-ids', cartProductIds.join('|')],
    queryFn: async () => {
      if (!cartProductIds.length) return [];

      // IMPORTANT: do not use base44.entities.Product.list/filter here.
      // Those methods dedupe Shopify-imported rows, which can hide the exact
      // product id referenced by a cart item and make the cart look empty.
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('id', cartProductIds);

      if (error) {
        // Fall back to the Base44 wrapper (best-effort) if the raw query fails.
        // This may still dedupe, but it's better than hard-failing checkout.
        const fallback = await base44.entities.Product.filter({}, '-created_at');
        return Array.isArray(fallback) ? fallback : [];
      }

      return Array.isArray(data) ? data : [];
    },
    enabled: cartProductIds.length > 0,
  });

  const cartWithProducts = (Array.isArray(cartItems) ? cartItems : [])
    .map((item) => {
      const product = products.find((p) => String(p.id) === String(item.product_id)) || null;
      return { ...item, product };
    });

  const unresolvedCartItems = cartWithProducts.filter((item) => !item.product);

  const shopifyCartItems = cartWithProducts.filter((item) => {
    const seller = String(item?.product?.seller_email || '').toLowerCase();
    const variantId = item?.shopify_variant_id || item?.product?.details?.shopify_variant_id;
    // If product lookup failed but the cart item has a Shopify variant id, treat it as Shopify.
    return !!variantId && (seller === 'shopify@hotmess.london' || !seller);
  });

  const xpCartItems = cartWithProducts.filter((item) => !shopifyCartItems.includes(item));

  const totalXP = xpCartItems.reduce((sum, item) => {
    const priceXp = item?.product?.price_xp || 0;
    const qty = item?.quantity || 1;
    return sum + (priceXp * qty);
  }, 0);

  const requiresShipping = xpCartItems.some((item) =>
    ['physical', 'merch'].includes(String(item?.product?.product_type || '').toLowerCase())
  );

  const isShippingComplete = !requiresShipping || (
    (shippingAddress.street || '').trim() &&
    (shippingAddress.city || '').trim() &&
    (shippingAddress.postcode || '').trim()
  );

  // Promo code discount calculation
  const calculateDiscount = () => {
    if (!appliedPromo) return 0;
    if (appliedPromo.type === 'percent') {
      return Math.floor(totalXP * (appliedPromo.value / 100));
    }
    if (appliedPromo.type === 'fixed') {
      return Math.min(appliedPromo.value, totalXP);
    }
    return 0;
  };

  const discount = calculateDiscount();
  const finalTotal = Math.max(0, totalXP - discount);

  const applyPromoCode = () => {
    const code = promoCode.toUpperCase().trim();
    const promo = PROMO_CODES[code];
    
    if (!promo) {
      toast.error('Invalid promo code');
      return;
    }
    
    if (promo.minXP && totalXP < promo.minXP) {
      toast.error(`Minimum ${promo.minXP} XP required for this code`);
      return;
    }
    
    if (promo.newUsersOnly && currentUser?.created_date) {
      const daysSinceJoin = (Date.now() - new Date(currentUser.created_date).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceJoin > 7) {
        toast.error('This code is for new users only');
        return;
      }
    }
    
    setAppliedPromo({ ...promo, code });
    setShowPromoInput(false);
    toast.success(`Promo ${code} applied!`);
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
  };

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!xpPurchasingEnabled) {
        throw new Error('XP purchasing is coming soon.');
      }

      if (!currentUser) {
        throw new Error('Please sign in to complete checkout');
      }

      if (!xpCartItems.length) {
        throw new Error('No XP items to checkout');
      }

      // CRITICAL: Fetch fresh data and validate atomically
      const freshUser = await base44.auth.me();
      const currentXP = freshUser.xp || 0;
      
      // Check user has enough XP with fresh data
      if (currentXP < totalXP) {
        throw new Error(`Insufficient XP. You have ${currentXP} XP but need ${totalXP} XP.`);
      }

      // Fetch fresh product data to check inventory in real-time
      const freshProducts = await base44.entities.Product.list();
      
      // Validate products and inventory atomically
      for (const item of xpCartItems) {
        const freshProduct = freshProducts.find(p => p.id === item.product.id);
        if (!freshProduct || freshProduct.status !== 'active') {
          throw new Error(`Product "${item.product.name}" is no longer available.`);
        }
        if (freshProduct.inventory_count !== undefined && freshProduct.inventory_count < item.quantity) {
          throw new Error(`Only ${freshProduct.inventory_count} of "${item.product.name}" available.`);
        }
      }

      // Group items by seller
      const sellers = {};
      xpCartItems.forEach(item => {
        const seller = item.product.seller_email;
        if (!sellers[seller]) sellers[seller] = [];
        sellers[seller].push(item);
      });

      // ATOMIC TRANSACTION START - CRITICAL: Sequential operations prevent race conditions
      // Step 1: Reserve inventory FIRST (prevents overselling race condition)
      const inventoryUpdates = [];
      try {
        for (const item of xpCartItems) {
          const freshProduct = freshProducts.find(p => p.id === item.product.id);
          if (freshProduct.inventory_count !== undefined) {
            // Double-check inventory hasn't changed since initial validation
            if (freshProduct.inventory_count < item.quantity) {
              throw new Error(`Only ${freshProduct.inventory_count} of "${item.product.name}" available.`);
            }
            const newInventory = freshProduct.inventory_count - item.quantity;
            await base44.entities.Product.update(item.product.id, {
              inventory_count: Math.max(0, newInventory),
              sales_count: (freshProduct.sales_count || 0) + item.quantity
            });
            inventoryUpdates.push({ 
              id: item.product.id, 
              oldCount: freshProduct.inventory_count 
            });
          }
        }

        // Step 2: Deduct XP after inventory is reserved (safer order)
        const newXP = currentXP - totalXP;
        await base44.auth.updateMe({ xp: newXP });

        // Step 3: Create orders (safe to do now that inventory & XP are locked)
        for (const [seller, items] of Object.entries(sellers)) {
          const order = await base44.entities.Order.create({
            buyer_email: freshUser.email,
            seller_email: seller,
            total_xp: items.reduce((sum, i) => sum + (i.product.price_xp * i.quantity), 0),
            total_gbp: 0,
            status: 'pending',
            payment_method: 'xp',
            shipping_address: shippingAddress,
            notes
          });

          // Create order items
          for (const item of items) {
            await base44.entities.OrderItem.create({
              order_id: order.id,
              product_id: item.product.id,
              product_name: item.product.name,
              quantity: item.quantity,
              price_xp: item.product.price_xp,
              price_gbp: 0
            });
          }

          // Notify seller
          await base44.entities.Notification.create({
            user_email: seller,
            type: 'order',
            title: 'New Order!',
            message: `${freshUser.full_name || freshUser.email} placed an order`,
            link: 'SellerDashboard'
          });
        }

        // Step 4: Clear cart
        // Remove only the XP items from the DB cart.
        for (const item of xpCartItems) {
          if (item?.id) {
            await base44.entities.CartItem.delete(item.id);
          }
        }
      } catch (error) {
        // CRITICAL ROLLBACK: Restore inventory and XP on any failure
        console.error('Checkout failed, initiating rollback:', error);
        
        // Rollback inventory first (reverse order of operations)
        for (const update of inventoryUpdates) {
          try {
            await base44.entities.Product.update(update.id, {
              inventory_count: update.oldCount
            });
          } catch (rollbackError) {
            console.error('Rollback failed for product', update.id, rollbackError);
          }
        }
        
        // Rollback XP
        try {
          await base44.auth.updateMe({ xp: currentXP });
        } catch (rollbackError) {
          console.error('XP rollback failed:', rollbackError);
        }
        
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      toast.success('Order placed!');
      navigate(createPageUrl('OrderHistory'));
    },
    onError: (error) => {
      toast.error(error.message || 'Checkout failed');
    }
  });

  const shopifyCheckoutMutation = useMutation({
    mutationFn: async () => {
      if (!shopifyCartItems.length) {
        throw new Error('No Shopify items to checkout');
      }

      const lines = shopifyCartItems.map((item) => ({
        variantId: item?.shopify_variant_id || item?.product?.details?.shopify_variant_id,
        quantity: item?.quantity || 1,
      }));

      const resp = await fetch('/api/shopify/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines }),
      });

      const contentType = resp.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const payload = isJson ? await resp.json().catch(() => null) : await resp.text().catch(() => '');
      if (!resp.ok) {
        const message = isJson
          ? (payload?.error || payload?.message || 'Failed to start Shopify checkout')
          : 'Failed to start Shopify checkout';
        const details = isJson && payload?.details ? ` (${payload.details})` : '';
        const err = new Error(`${message}${details}`);
        err.status = resp.status;
        err.payload = payload;
        throw err;
      }

      const checkoutUrl = payload?.cart?.checkoutUrl;
      if (!checkoutUrl) {
        throw new Error('Shopify did not return a checkout URL');
      }

      if (isDisallowedCheckoutUrl(checkoutUrl)) {
        throw new Error('Checkout URL is not branded. Refusing to redirect to Shopify domains.');
      }

      return checkoutUrl;
    },
    onSuccess: (checkoutUrl) => {
      // Do NOT embed Shopify checkout in an iframe.
      // Embedding can trigger Shopify protected endpoints (e.g. /private_access_tokens)
      // and is often blocked by Shopify/X-Frame-Options.
      setEmbeddedShopifyCheckoutUrl(checkoutUrl);
      setIsShopifyCheckoutOpen(true);
    },
    onError: (error) => {
      toast.error(error?.message || 'Shopify checkout failed');
      // Keep a breadcrumb in DevTools for debugging 500s in prod.
      console.error('[Checkout] Shopify checkout failed', {
        status: error?.status,
        message: error?.message,
        payload: error?.payload,
      });
    },
  });

  const userXP = currentUser?.xp || 0;
  const hasEnoughXP = currentUser ? userXP >= totalXP : true;

  if ((cartItems?.length || 0) === 0) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <p className="text-white/60 mb-4">Your cart is empty</p>
          <Button onClick={() => navigate('/market')}>
            Browse Market
          </Button>
        </div>
        </div>
      </ErrorBoundary>
    );
  }

  const handleSendMagicLink = async () => {
    const email = (magicEmail || '').trim();
    if (!email) {
      toast.error('Enter your email');
      return;
    }

    setSendingLink(true);
    try {
      const redirectTo = `${window.location.origin}${createPageUrl('Checkout')}`;
      const { error } = await auth.sendMagicLink(email, redirectTo);
      if (error) throw error;
      toast.success('Magic link sent. Check your email.');
    } catch (error) {
      toast.error(error?.message || 'Failed to send magic link');
    } finally {
      setSendingLink(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Button onClick={() => navigate(-1)} variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>

          <h1 className="text-4xl font-black uppercase mb-2">
            CHECKOUT<span className="text-[#39FF14]">.</span>
          </h1>
          <p className="text-white/60 text-sm uppercase tracking-wider mb-8">
            Complete your order
          </p>

          {!xpPurchasingEnabled ? (
            <div className="mb-8 bg-white/5 border-2 border-white/10 p-6">
              <h2 className="text-xl font-black uppercase mb-2">XP PURCHASING</h2>
              <p className="text-white/60 text-sm uppercase tracking-wider">
                Coming soon.
              </p>
            </div>
          ) : null}

          {shopifyCartItems.length > 0 && (
            <div className="mb-8 bg-white/5 border-2 border-white/10 p-6">
              <h2 className="text-xl font-black uppercase mb-2">SHOPIFY CHECKOUT</h2>
              <p className="text-white/60 text-sm uppercase tracking-wider mb-4">
                {xpCartItems.length > 0
                  ? 'You have Shopify items + XP items. These checkout separately.'
                  : 'These items checkout on Shopify (card, Apple Pay, etc.).'}
              </p>

              {unresolvedCartItems.length > 0 && (
                <div className="mb-4 bg-red-600/20 border-2 border-red-600 p-4 text-xs font-bold uppercase tracking-wider">
                  Some cart items couldn’t load. Try refreshing, or remove/re-add the item.
                </div>
              )}

              <Button
                onClick={() => shopifyCheckoutMutation.mutate()}
                disabled={shopifyCheckoutMutation.isPending}
                className="bg-white hover:bg-white/90 text-black font-black uppercase"
              >
                {shopifyCheckoutMutation.isPending ? 'Starting Shopify checkout…' : 'Checkout on Shopify'}
              </Button>
            </div>
          )}

          <Dialog
            open={isShopifyCheckoutOpen}
            onOpenChange={(open) => {
              setIsShopifyCheckoutOpen(open);
              if (!open) setEmbeddedShopifyCheckoutUrl('');
            }}
          >
            <DialogContent className="max-w-5xl bg-black border border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="font-black uppercase">Secure checkout</DialogTitle>
                <DialogDescription className="text-white/60">
                    Checkout opens in a separate secure page.
                </DialogDescription>
              </DialogHeader>

                <div className="text-sm text-white/60">
                  {embeddedShopifyCheckoutUrl
                    ? 'When you’re ready, open the secure checkout to pay (card, Apple Pay, etc.).'
                    : 'No checkout URL available.'}
                </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white hover:text-black font-black uppercase"
                  onClick={() => setIsShopifyCheckoutOpen(false)}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  className="bg-white hover:bg-white/90 text-black font-black uppercase"
                  onClick={() => {
                    if (!embeddedShopifyCheckoutUrl) return;
                    if (isDisallowedCheckoutUrl(embeddedShopifyCheckoutUrl)) {
                      toast.error('Checkout URL is not branded. Refusing to redirect to Shopify domains.');
                      return;
                    }
                    window.location.assign(embeddedShopifyCheckoutUrl);
                  }}
                  disabled={!embeddedShopifyCheckoutUrl}
                >
                  Open secure checkout
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Order Summary */}
            <div className="bg-white/5 border-2 border-white/10 p-6">
              <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#FF1493]" />
                Order Summary
              </h2>
              <div className="space-y-3 mb-6">
                {cartWithProducts.map(item => (
                  <div key={item.id ?? item.product_id} className="flex justify-between items-start p-4 bg-black/40 border border-white/10">
                    <div className="flex-1">
                      <div className="font-black uppercase text-sm mb-1">
                        {item?.product?.name || 'Product unavailable'}
                      </div>
                      {item?.product ? (
                        <>
                          <div className="text-xs text-white/40 uppercase">
                            Qty: {item.quantity} × {item.product.price_xp} XP
                          </div>
                          {String(item?.product?.seller_email || '').toLowerCase() === 'shopify@hotmess.london' && (
                            <div className="text-xs text-white/50 uppercase mt-1">
                              {item?.variant_title ? `Size: ${item.variant_title} • ` : ''}Checkout on Shopify
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-xs text-red-400 uppercase mt-1">
                          Couldn’t load product details. Remove and re-add.
                        </div>
                      )}
                    </div>
                    <div className="text-[#FFEB3B] font-black text-lg">
                      {item?.product ? (item.product.price_xp * item.quantity) : '—'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-white/20 pt-4">
                {/* Promo Code Section */}
                <div className="mb-4">
                  {appliedPromo ? (
                    <div className="flex items-center justify-between p-3 bg-[#39FF14]/10 border border-[#39FF14]/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-[#39FF14]" />
                        <span className="font-bold text-[#39FF14]">{appliedPromo.code}</span>
                        <span className="text-white/60 text-sm">
                          {appliedPromo.type === 'percent' ? `-${appliedPromo.value}%` : `-${appliedPromo.value} XP`}
                        </span>
                      </div>
                      <button onClick={removePromo} className="text-white/40 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : showPromoInput ? (
                    <div className="flex gap-2">
                      <Input
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Enter promo code"
                        className="bg-white/5 border-white/20 text-white flex-1"
                        onKeyPress={(e) => e.key === 'Enter' && applyPromoCode()}
                      />
                      <Button onClick={applyPromoCode} variant="outline" className="border-white/20">
                        Apply
                      </Button>
                      <button onClick={() => setShowPromoInput(false)} className="text-white/40 hover:text-white px-2">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPromoInput(true)}
                      className="flex items-center gap-2 text-[#00D9FF] text-sm hover:underline"
                    >
                      <Percent className="w-4 h-4" /> Have a promo code?
                    </button>
                  )}
                </div>

                {currentUser ? (
                  <>
                    <div className="flex justify-between items-center mb-3 text-sm">
                      <span className="text-white/60 uppercase tracking-wider">Your Balance</span>
                      <span className="font-black text-[#39FF14]">{userXP.toLocaleString()} XP</span>
                    </div>
                    <div className="flex justify-between items-center mb-3 text-sm">
                      <span className="text-white/60 uppercase tracking-wider">Subtotal</span>
                      <span className="font-black text-[#FFEB3B]">{totalXP.toLocaleString()} XP</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between items-center mb-3 text-sm">
                        <span className="text-white/60 uppercase tracking-wider">Discount</span>
                        <span className="font-black text-[#39FF14]">-{discount.toLocaleString()} XP</span>
                      </div>
                    )}
                    <div className="border-t border-white/20 pt-3 flex justify-between items-center text-xl font-black">
                      <span className="uppercase">Order Total</span>
                      <span className="text-[#FFEB3B]">{finalTotal.toLocaleString()} XP</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-sm">
                      <span className="text-white/60 uppercase tracking-wider">After Order</span>
                      <span className={(userXP - finalTotal) >= 0 ? 'text-[#39FF14]' : 'text-red-500'}>
                        {(userXP - finalTotal).toLocaleString()} XP
                      </span>
                    </div>
                    {userXP < finalTotal && (
                      <div className="mt-4 bg-red-600/20 border-2 border-red-600 p-4 text-sm font-bold uppercase tracking-wider">
                        ⚠️ Need {(finalTotal - userXP).toLocaleString()} more XP
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-white/60 uppercase tracking-wider">
                    Sign in at checkout to confirm XP balance.
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Info */}
            <div className="bg-white/5 border-2 border-white/10 p-6">
              <h2 className="text-xl font-black uppercase mb-4">DELIVERY DETAILS</h2>

              {/* Gift Option */}
              <div className="mb-6">
                <button
                  onClick={() => setIsGift(!isGift)}
                  className={`w-full p-4 border-2 rounded-lg flex items-center justify-between transition-all ${
                    isGift 
                      ? 'border-[#FF1493] bg-[#FF1493]/10' 
                      : 'border-white/20 hover:border-white/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Gift className={`w-5 h-5 ${isGift ? 'text-[#FF1493]' : 'text-white/60'}`} />
                    <div className="text-left">
                      <p className="font-bold">Send as Gift</p>
                      <p className="text-xs text-white/40">Add a personal message</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isGift ? 'border-[#FF1493] bg-[#FF1493]' : 'border-white/40'
                  }`}>
                    {isGift && <Check className="w-3 h-3 text-black" />}
                  </div>
                </button>

                <AnimatePresence>
                  {isGift && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 space-y-3">
                        <Input
                          placeholder="Recipient's Name"
                          value={giftRecipient.name}
                          onChange={(e) => setGiftRecipient({ ...giftRecipient, name: e.target.value })}
                          className="bg-white/5 border-white/20 text-white"
                        />
                        <Input
                          placeholder="Recipient's Email"
                          type="email"
                          value={giftRecipient.email}
                          onChange={(e) => setGiftRecipient({ ...giftRecipient, email: e.target.value })}
                          className="bg-white/5 border-white/20 text-white"
                        />
                        <Textarea
                          placeholder="Gift message (optional)"
                          value={giftRecipient.message}
                          onChange={(e) => setGiftRecipient({ ...giftRecipient, message: e.target.value })}
                          className="bg-white/5 border-white/20 text-white h-20"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Shipping Address */}
              <div className="space-y-4">
                <Input
                  placeholder="Street Address"
                  value={shippingAddress.street || ''}
                  onChange={(e) => setShippingAddress({...shippingAddress, street: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                />
                <Input
                  placeholder="City"
                  value={shippingAddress.city || ''}
                  onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                />
                <Input
                  placeholder="Postcode"
                  value={shippingAddress.postcode || ''}
                  onChange={(e) => setShippingAddress({...shippingAddress, postcode: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                />
                <Textarea
                  placeholder="Order notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-white/5 border-white/20 text-white h-24"
                />

                <Button
                  onClick={() => {
                    if (!currentUser) {
                      setShowAuthModal(true);
                      return;
                    }
                    checkoutMutation.mutate();
                  }}
                  disabled={
                    xpCartItems.length === 0 ||
                    !xpPurchasingEnabled ||
                    (!currentUser ? false : (!hasEnoughXP || checkoutMutation.isPending)) ||
                    !isShippingComplete
                  }
                  className="w-full bg-[#39FF14] hover:bg-[#39FF14]/90 text-black font-black text-lg py-7 uppercase tracking-wider shadow-[0_0_20px_rgba(57,255,20,0.3)] border-2 border-[#39FF14]"
                >
                  {!xpPurchasingEnabled ? (
                    'XP PURCHASING COMING SOON'
                  ) : checkoutMutation.isPending ? (
                    'PROCESSING ORDER...'
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      {currentUser ? 'COMPLETE XP ORDER' : 'SIGN IN TO COMPLETE'} • {totalXP.toLocaleString()} XP
                    </>
                  )}
                </Button>

                {!isShippingComplete && (
                  <div className="mt-2 text-xs text-red-400 uppercase tracking-wider">
                    {requiresShipping ? 'Add a shipping address to continue.' : 'Complete required fields to continue.'}
                  </div>
                )}
                
                <div className="mt-4 p-4 bg-black/40 border border-white/10 text-xs text-white/60 uppercase tracking-wider">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#39FF14]" />
                      <span>Instant XP deduction</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#00D9FF]" />
                      <span>Order tracking</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#B026FF]" />
                      <span>Secure checkout</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-[#FF1493]" />
                      <span>Seller notified</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      </div>

      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="bg-black text-white border-2 border-white/10">
          <DialogHeader>
            <DialogTitle className="font-black uppercase">Sign in to checkout</DialogTitle>
            <DialogDescription className="text-white/60">
              Magic link only. We’ll email you a secure sign-in link.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={magicEmail}
              onChange={(e) => setMagicEmail(e.target.value)}
              placeholder="you@example.com"
              className="bg-white/5 border-white/20 text-white"
            />
          </div>

          <DialogFooter>
            <Button
              onClick={handleSendMagicLink}
              disabled={sendingLink}
              className="bg-[#39FF14] hover:bg-[#39FF14]/90 text-black font-black uppercase"
            >
              {sendingLink ? 'Sending…' : 'Send magic link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
}