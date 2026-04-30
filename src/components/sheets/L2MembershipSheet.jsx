/**
 * L2MembershipSheet — Membership tiers + Stripe checkout
 *
 * Fetches tiers from membership_tiers table.
 * "Upgrade" calls /api/stripe/create-checkout-session → redirects to Stripe Checkout.
 *
 * STRIPE KEYS: If STRIPE_SECRET_KEY is missing in Vercel env, the API returns 503
 * and the sheet shows a "not yet available" message. Add the key in Vercel to activate.
 */

import { useState, useEffect } from 'react';
import { Crown, Check, Zap, Eye, Loader2, Music, MapPin, Users } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import { useCurrentUser } from '@/components/utils/queryConfig';
import { useQueryClient } from '@tanstack/react-query';

const FEATURE_ROWS = [
  { icon: Zap,           label: 'Unlimited Messaging',    free: false,        paid: true          },
  { icon: Crown,         label: 'Unlimited BOOs',         free: '3/day',      paid: 'Unlimited'   },
  { icon: Eye,           label: 'See who BOO\'d you',     free: false,        paid: true          },
  { icon: Users,         label: 'Profile Viewers',        free: false,        paid: 'CONNECTED+'  },
  { icon: MapPin,        label: 'In-app Navigation',      free: true,         paid: true          },
  { icon: Music,         label: 'Radio Access',           free: true,         paid: true          },
];

function penceToDisplay(pence) {
  const pounds = Number(pence) / 100;
  return `£${pounds % 1 === 0 ? pounds.toFixed(0) : pounds.toFixed(2)}`;
}

import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function L2MembershipSheet() {
  const { closeSheet } = useSheet();
  const queryClient = useQueryClient();
  const [tiers, setTiers] = useState([]);
  const [selectedTierId, setSelectedTierId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tiersLoading, setTiersLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState('');
  const [step, setStep] = useState('selection'); // 'selection' | 'stripe_embedded' | 'success'
  const { data: user } = useCurrentUser();

  const userTier = (user?.subscription_tier || user?.membership_tier || user?.profile_type || 'mess').toLowerCase();
  
  // Show 'canceling' if they have that status
  const isCanceling = user?.subscription_status === 'canceling';
  
  const selectedTier = tiers.find((t) => t.id === selectedTierId);
  const isSelectedCurrent = selectedTier?.name?.toLowerCase() === userTier;
  
  // Calculate relative power level
  const userTierPrice = tiers.find(t => t.name.toLowerCase() === userTier.toLowerCase())?.price || 0;

  // Fetch all tiers on mount
  useEffect(() => {
    supabase
      .from('membership_tiers')
      .select('*')
      .order('price', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data?.length) {
          setTiers(data);
          
          // DEFAULT SELECTION:
          // 1. Current user plan
          // 2. Or first paid plan (HOTMESS)
          const currentPlan = data.find(t => t.name.toLowerCase() === userTier.toLowerCase());
          if (currentPlan) {
            setSelectedTierId(currentPlan.id);
          } else {
            const firstPaid = data.find(t => t.price > 0);
            setSelectedTierId(firstPaid?.id || data[0].id);
          }
        }
        setTiersLoading(false);
      });
  }, [userTier]);

  const handleUpgrade = async () => {
    if (!selectedTier || loading) return;
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token || !session?.user) {
        toast.error('Sign in to upgrade');
        setLoading(false);
        return;
      }

      const orderTotal = Number(selectedTier.price) / 100;

      // STEP 1: Create a Unified Order record just like the Shop does
      // This is the "magic" that makes the backend return a clientSecret
      const orderPayload = {
        p_buyer_id: session.user.id,
        p_buyer_email: session.user.email,
        p_total_gbp: orderTotal,
        p_shipping_address: 'Membership Activation',
        p_items: [{
          id: `tier_${selectedTier.id}`,
          title: `Membership: ${selectedTier.name}`,
          price: orderTotal,
          qty: 1,
          source: 'membership',
          tier_id: selectedTier.id
        }],
        p_status: 'pending_payment'
      };

      const { data: orderId, error: orderErr } = await supabase.rpc('create_unified_order', orderPayload);
      
      if (orderErr) {
        console.error('Order creation failed:', orderErr);
        toast.error('Failed to prepare checkout');
        setLoading(false);
        return;
      }

      // STEP 2: Request the Stripe Session using the dedicated membership flow
      const stripePayload = {
        tierId: selectedTier.id, // The backend uses this to fetch price/name from DB
      };

      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(stripePayload),
      });

      const data = await res.json();
      const secret = data.clientSecret || data.client_secret;

      if (secret) {
        setClientSecret(secret);
        setStep('stripe_embedded');
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('[MembershipSheet] checkout error:', err);
      toast.error('Something went wrong. Try again.');
      setLoading(false);
    }
  };

  const handlePaymentComplete = async () => {
    // Logic to update user record in DB after successful payment
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && selectedTier) {
        const tierName = selectedTier.name.toLowerCase();
        
        // Update Profile
        await supabase
          .from('profiles')
          .update({ 
            membership_tier: tierName,
            subscription_tier: tierName.toUpperCase(),
            is_verified: true,
            is_business: true
          })
          .eq('id', user.id);

        // Update Memberships Table (Upsert)
        await supabase
          .from('memberships')
          .upsert({
            user_id: user.id,
            tier_name: tierName,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

        console.log('[Membership] ✅ Upgrade recorded for user:', user.id);
      }
      setStep('success');
      toast.success('Welcome to Premium! 👑');
    } catch (e) {
      console.error('[Membership] Post-payment update failed:', e);
      setStep('success'); // Still show success as payment went through, fallback to webhook
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? You will keep your benefits until the end of the current billing period.')) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        const dateStr = data.endsAt ? new Date(data.endsAt).toLocaleDateString() : 'the end of your period';
        toast.success(`Subscription cancelled. It will expire on ${dateStr}`);
        queryClient.invalidateQueries({ queryKey: ['profiles'] });
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('[MembershipSheet] cancel error:', err);
      toast.error(err.message || 'Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  // ---- SUCCESS SCREEN ----
  if (step === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center h-full">
        <div className="w-20 h-20 rounded-full bg-[#C8962C]/20 border-2 border-[#C8962C] flex items-center justify-center mb-6">
          <Crown className="w-10 h-10 text-[#C8962C]" />
        </div>
        <h2 className="text-white font-black text-2xl mb-2">You're In!</h2>
        <p className="text-white/50 text-sm mb-6">
          Your account has been upgraded to <strong>{selectedTier?.name || 'Premium'}</strong>.
          Close this window to see your new badges and features.
        </p>
        <button
          onClick={() => {
            closeSheet();
            window.location.reload();
          }}
          className="w-full bg-[#C8962C] text-black font-black text-sm rounded-2xl py-4 transition-transform active:scale-95"
        >
          Got it!
        </button>
      </div>
    );
  }

  // ---- STRIPE EMBEDDED CHECKOUT ----
  if (step === 'stripe_embedded' && clientSecret) {
    return (
      <div className="flex flex-col h-full bg-[#1C1C1E]">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-white font-black">Secure Payment</h2>
          <button onClick={() => setStep('selection')} className="text-[#C8962C] font-bold text-xs uppercase tracking-widest">Back</button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-[450px]">
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
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Hero */}
      <div className="px-4 pt-6 pb-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#C8962C]/20 border border-[#C8962C]/30 flex items-center justify-center mx-auto mb-4">
          <Crown className="w-8 h-8 text-[#C8962C]" />
        </div>
        <h2 className="text-white font-black text-xl">Hotmess Membership</h2>
        <p className="text-white/40 text-sm mt-1">Unlock unlimited connections & exclusive features.</p>
      </div>

      {/* Tier selector - Grid Layout for 100% Visibility */}
      <div className="px-4 pb-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {tiersLoading ? (
            <div className="col-span-full flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-[#C8962C]" />
            </div>
          ) : tiers.length === 0 ? (
            <div className="col-span-full border-2 border-dashed border-white/10 rounded-2xl py-12 text-center">
              <p className="text-white/20 text-xs italic">Awaiting elite tiers from the mainframe…</p>
            </div>
          ) : (
            tiers.map((tier) => {
              const isSelected = tier.id === selectedTierId;
              const isCurrent = userTier?.toLowerCase() === tier.name.toLowerCase();
              return (
                <button
                  key={tier.id}
                  onClick={() => setSelectedTierId(tier.id)}
                  disabled={!isCurrent && userTierPrice > tier.price}
                  className={`relative flex flex-col justify-center items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300 min-h-[120px] lg:min-h-[140px] ${
                    isSelected 
                      ? 'bg-[#C8962C] border-[#C8962C] shadow-[0_0_20px_rgba(200,150,44,0.3)]' 
                      : 'bg-black/40 border-white/5 hover:border-white/10'
                  } ${!isCurrent && userTierPrice > tier.price ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'}`}
                >
                  {isCurrent ? (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#C8962C] text-black text-[7px] font-black uppercase px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg z-20">
                      YOUR PLAN
                    </span>
                  ) : userTierPrice > tier.price ? (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-black text-white/50 text-[7px] font-black uppercase px-2 py-0.5 rounded-full whitespace-nowrap border border-white/10 z-20">
                      LOCKED
                    </span>
                  ) : null}
                  <p className={`font-black text-lg lg:text-xl leading-none ${isSelected ? 'text-black' : 'text-[#C8962C]'}`}>
                    {tier.price === 0 ? 'FREE' : penceToDisplay(tier.price)}
                  </p>
                  <p className={`text-[10px] font-black uppercase tracking-tighter ${isSelected ? 'text-black/60' : 'text-white/40'}`}>
                    {tier.name}
                  </p>
                  {isSelected && !isCurrent && <Check className="w-4 h-4 text-black mt-1" />}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Feature comparison */}
      <div className="px-4 pb-4">
        <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-3">What you get</p>
        <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden">
          <div className="flex px-4 py-2 border-b border-white/5">
            <div className="flex-1" />
            <div className="w-16 text-center text-white/30 text-[10px] font-black uppercase">Free</div>
            <div className="w-16 text-center text-[#C8962C] text-[10px] font-black uppercase">Premium</div>
          </div>
          {FEATURE_ROWS.map(({ icon: Icon, label, free, paid }) => (
            <div key={label} className="flex items-center px-4 py-3 border-b border-white/5 last:border-0">
              <div className="flex-1 flex items-center gap-2.5">
                <Icon className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                <span className="text-white/70 text-xs">{label}</span>
              </div>
              <div className="w-16 text-center">
                {free === true
                  ? <Check className="w-4 h-4 text-white/40 mx-auto" />
                  : free === false
                  ? <span className="text-white/15 text-sm">—</span>
                  : <span className="text-white/40 text-[10px] font-bold">{free}</span>}
              </div>
              <div className="w-16 text-center">
                {paid === true
                  ? <Check className="w-4 h-4 text-[#C8962C] mx-auto" />
                  : <span className="text-[#C8962C] text-[10px] font-bold">{paid}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-6">
        {isSelectedCurrent ? (
          <div className="space-y-3">
            <div className="w-full bg-white/5 border border-white/20 text-white/50 font-black text-sm rounded-2xl py-4 flex items-center justify-center gap-2">
              <Check className="w-4 h-4 text-[#C8962C]" />
              ACTIVE PLAN
            </div>
            {selectedTier?.price > 0 && user?.subscription_status !== 'canceling' && (
              <button
                onClick={handleCancel}
                disabled={loading}
                className="w-full py-3 text-red-500/50 hover:text-red-500 text-xs font-black uppercase transition-colors"
              >
                {loading ? 'Processing...' : 'Cancel Subscription'}
              </button>
            )}
            {user?.subscription_status === 'canceling' && (
              <div className="text-center space-y-1 py-2">
                <p className="text-[11px] text-red-500 font-black uppercase tracking-widest">
                  Membership Canceling
                </p>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-[18px] text-white font-black">
                    {(() => {
                      if (!user?.subscription_ends_at) return 'Ending Soon';
                      const diff = new Date(user.subscription_ends_at).getTime() - Date.now();
                      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                      return days > 0 ? `Expires in ${days} Days` : 'Expires Today';
                    })()}
                  </p>
                  <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider">
                    Full access until {user?.subscription_ends_at ? new Date(user.subscription_ends_at).toLocaleDateString() : 'end of period'}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : selectedTier?.price === 0 ? (
          <button
            onClick={() => {
              toast.info('You are already on the MESS tier');
            }}
            className="w-full bg-white/10 text-white/50 font-black text-sm rounded-2xl py-4 active:scale-95 transition-all"
          >
            FREE TIER ACTIVE
          </button>
        ) : (
          <button
            onClick={handleUpgrade}
            disabled={loading || tiersLoading || !selectedTier}
            className="w-full bg-[#C8962C] text-black font-black text-sm rounded-2xl py-4 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
            {loading ? 'Opening secure checkout…' : `Upgrade to ${selectedTier?.name}`}
          </button>
        )}
        <p className="text-center text-white/25 text-[10px] mt-2">
          Secure payment via Stripe · Instant activation
        </p>
      </div>
    </div>
  );
}
