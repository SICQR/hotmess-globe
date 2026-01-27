import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44, supabase } from '@/components/utils/supabaseClient';
import { Button } from '@/components/ui/button';
import { Check, Crown, Zap, Star, ArrowLeft, Loader2, CreditCard, X } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { logger } from '@/utils/logger';

// Stripe Price IDs - Replace with your actual Stripe price IDs
const STRIPE_PRICES = {
  plus: import.meta.env.VITE_STRIPE_PLUS_PRICE_ID || 'price_plus_monthly',
  pro: import.meta.env.VITE_STRIPE_CHROME_PRICE_ID || 'price_chrome_monthly',
};

const TIERS = [
  {
    id: 'basic',
    name: 'FREE',
    price: '£0',
    priceAmount: 0,
    icon: Star,
    color: '#FFFFFF',
    tagline: 'Get started',
    keyBenefits: [
      'Browse all profiles',
      'Basic match scoring',
      'Go Live once per day',
    ],
    features: [
      'Standard profile visibility',
      'Basic XP earning',
      'Event RSVPs',
    ],
  },
  {
    id: 'plus',
    name: 'PLUS',
    price: '£9.99/mo',
    priceAmount: 999,
    icon: Zap,
    color: '#E62020',
    stripePriceId: STRIPE_PRICES.plus,
    tagline: 'Most popular',
    popular: true,
    keyBenefits: [
      '2x visibility in feeds',
      'Browse anonymously',
      'Unlimited Go Live',
    ],
    features: [
      'Everything in FREE',
      'Save filter presets',
      'See blurred viewers',
      'Priority matching',
    ],
  },
  {
    id: 'pro',
    name: 'CHROME',
    price: '£19.99/mo',
    priceAmount: 1999,
    icon: Crown,
    color: '#00D9FF',
    stripePriceId: STRIPE_PRICES.pro,
    tagline: 'Full access',
    keyBenefits: [
      'See exactly who viewed you',
      'Early access to drops',
      'Priority support',
    ],
    features: [
      'Everything in PLUS',
      'Unmasked viewer list',
      'Custom profile theme',
      'Night King eligibility',
    ],
  },
];

export default function MembershipUpgrade() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        logger.error('Failed to fetch user', { error: error?.message, context: 'MembershipUpgrade' });
      }
    };
    fetchUser();

    // Handle Stripe redirect
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    
    if (success === 'true') {
      toast.success('Subscription activated! Welcome to your new tier.');
      // Clear URL params
      navigate(createPageUrl('MembershipUpgrade'), { replace: true });
    } else if (canceled === 'true') {
      toast.info('Checkout canceled. No changes were made.');
      navigate(createPageUrl('MembershipUpgrade'), { replace: true });
    }
  }, [searchParams, navigate]);

  const handleUpgrade = async (tierId) => {
    if (tierId === 'basic') {
      toast.info('You are already on the BASIC tier');
      return;
    }

    const tier = TIERS.find(t => t.id === tierId);
    if (!tier) return;

    setLoading(true);
    setSelectedTier(tierId);

    try {
      // Check if Stripe is configured
      const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      
      if (stripeKey && tier.stripePriceId) {
        // Get auth token
        const { data: { session: authSession } } = await supabase.auth.getSession();
        const token = authSession?.access_token;

        if (!token) {
          toast.error('Please log in to upgrade');
          setLoading(false);
          setSelectedTier(null);
          return;
        }

        // Create Stripe Checkout session via Vercel API route
        const response = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            priceId: tier.stripePriceId,
            tierId: tierId,
            successUrl: `${window.location.origin}${createPageUrl('MembershipUpgrade')}?success=true`,
            cancelUrl: `${window.location.origin}${createPageUrl('MembershipUpgrade')}?canceled=true`,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create checkout session');
        }

        if (result?.url) {
          // Redirect to Stripe Checkout
          window.location.href = result.url;
          return;
        }
      }

      // Fallback: Update tier directly (for development/demo)
      logger.warn('Stripe not configured, updating tier directly', { context: 'MembershipUpgrade' });
      await base44.auth.updateMe({
        membership_tier: tierId,
      });

      toast.success(`Upgraded to ${tierId.toUpperCase()}!`);
      navigate(createPageUrl('Profile'));
    } catch (error) {
      logger.error('Membership upgrade failed', { error: error?.message, context: 'MembershipUpgrade' });
      toast.error('Upgrade failed. Please try again.');
    } finally {
      setLoading(false);
      setSelectedTier(null);
    }
  };

  const handleCancelSubscription = async () => {
    setLoading(true);
    try {
      // Get auth token
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;

      if (!token) {
        toast.error('Please log in to cancel');
        return;
      }

      // Call Vercel API route to cancel subscription
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel subscription');
      }

      // Update local tier to basic
      await base44.auth.updateMe({
        membership_tier: 'basic',
      });

      toast.success('Subscription cancelled. You will retain access until the end of your billing period.');
      setShowCancelModal(false);
      
      // Refresh user data
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (error) {
      logger.error('Subscription cancellation failed', { error: error?.message, context: 'MembershipUpgrade' });
      toast.error('Failed to cancel subscription. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  const currentTierRaw = currentUser?.membership_tier;
  const currentTier = currentTierRaw === 'free' ? 'basic' : currentTierRaw || 'basic';
  const hasActiveSubscription = currentTier !== 'basic';

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="mb-6 text-white/60 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-3">
            UPGRADE YOUR <span className="text-[#E62020]">EXPERIENCE</span>
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto">
            Get more matches, more visibility, and more control over your connections.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier, idx) => {
            const Icon = tier.icon;
            const isCurrentTier = currentTier === tier.id;

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`relative bg-black border-2 p-6 md:p-8 h-full flex flex-col ${tier.popular ? 'md:-mt-4 md:mb-4' : ''}`}
                style={
                  isCurrentTier
                    ? {
                        borderColor: tier.color,
                        boxShadow: `0 0 30px ${tier.color}40`,
                      }
                    : tier.popular 
                      ? { borderColor: tier.color }
                      : { borderColor: 'rgba(255,255,255,0.2)' }
                }
              >
                {/* Popular badge */}
                {tier.popular && (
                  <div 
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-black uppercase"
                    style={{ backgroundColor: tier.color, color: 'black' }}
                  >
                    Most Popular
                  </div>
                )}

                <div className="text-center mb-6">
                  <div
                    className="w-14 h-14 mx-auto mb-4 flex items-center justify-center"
                    style={{ backgroundColor: `${tier.color}20` }}
                  >
                    <Icon className="w-7 h-7" style={{ color: tier.color }} />
                  </div>
                  <h2
                    className="text-2xl font-black uppercase mb-1"
                    style={{ color: tier.color }}
                  >
                    {tier.name}
                  </h2>
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-3">{tier.tagline}</p>
                  <p className="text-4xl font-black">{tier.price}</p>
                  {tier.priceAmount > 0 && (
                    <p className="text-xs text-white/40 mt-1">billed monthly</p>
                  )}
                </div>

                {/* Key Benefits - Highlighted */}
                <div className="mb-6 p-4 bg-white/5 border border-white/10">
                  <p className="text-[10px] uppercase tracking-wider text-white/40 mb-3">Key Benefits</p>
                  <ul className="space-y-2">
                    {tier.keyBenefits.map((benefit, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm font-medium">
                        <Check className="w-4 h-4 flex-shrink-0" style={{ color: tier.color }} />
                        <span className="text-white">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Additional Features */}
                <ul className="space-y-2 mb-8 flex-grow">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <Check className="w-3 h-3 flex-shrink-0 mt-0.5 text-white/40" />
                      <span className="text-white/60">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleUpgrade(tier.id)}
                  disabled={isCurrentTier || loading}
                  size="lg"
                  className={`w-full mt-auto font-black uppercase tracking-wide border-2 ${
                    isCurrentTier
                      ? 'bg-white/10 text-white/40 border-white/20 cursor-not-allowed'
                      : 'text-black hover:opacity-90'
                  }`}
                  style={!isCurrentTier ? { backgroundColor: tier.color, borderColor: tier.color } : {}}
                >
                  {isCurrentTier ? (
                    'CURRENT TIER'
                  ) : loading && selectedTier === tier.id ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      PROCESSING...
                    </span>
                  ) : tier.id === 'basic' ? (
                    'GET STARTED FREE'
                  ) : (
                    <span className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      UPGRADE TO {tier.name}
                    </span>
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Subscription Info */}
        <div className="mt-12 bg-white/5 border-2 border-white/10 p-6 text-center">
          <p className="text-white/60 text-sm uppercase tracking-wider mb-4">
            Subscriptions are monthly and can be cancelled anytime.
          </p>
          {hasActiveSubscription && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="text-red-400 hover:text-red-300 text-sm underline"
            >
              Cancel subscription
            </button>
          )}
        </div>

        {/* Payment Security */}
        <div className="mt-6 text-center">
          <p className="text-white/40 text-xs flex items-center justify-center gap-2">
            <CreditCard className="w-4 h-4" />
            Secure payments powered by Stripe
          </p>
        </div>
      </div>

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black border-2 border-white/20 p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black uppercase">Cancel Subscription</h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="p-2 hover:bg-white/10 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-white/70 mb-6">
              Are you sure you want to cancel your subscription? You'll lose access to premium features 
              at the end of your current billing period.
            </p>
            <div className="flex gap-4">
              <Button
                onClick={() => setShowCancelModal(false)}
                variant="outline"
                className="flex-1 border-white/20"
              >
                Keep Subscription
              </Button>
              <Button
                onClick={handleCancelSubscription}
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Cancel'
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}