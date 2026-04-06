/**
 * L2PremiumGateSheet -- Context-aware premium paywall
 *
 * Header adapts based on origin:
 *   ghosted  -> "Unlock the full grid"
 *   music    -> "Hear the full track"
 *   personas -> "Get more personas"
 *   default  -> "Go Premium"
 *
 * After payment success, returns user to their origin (not Home).
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Grid3x3, Music, Users, Sparkles, Check, X } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { toast } from 'sonner';

type PremiumOrigin = 'ghosted' | 'music' | 'personas' | string;

interface L2PremiumGateSheetProps {
  origin?: PremiumOrigin;
}

const ORIGIN_CONFIG: Record<string, {
  headline: string;
  subtext: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  ghosted: {
    headline: 'Unlock the full grid',
    subtext: 'See everyone nearby. No limits. No filters locked.',
    icon: Grid3x3,
  },
  music: {
    headline: 'Hear the full track',
    subtext: 'Unlimited plays. Offline downloads. Full catalogue.',
    icon: Music,
  },
  personas: {
    headline: 'Get more personas',
    subtext: 'Create up to 5 unique personas. Travel mode. Weekend mode.',
    icon: Users,
  },
};

const DEFAULT_CONFIG = {
  headline: 'Go Premium',
  subtext: 'Unlock the full HOTMESS experience.',
  icon: Crown,
};

const FEATURES = [
  'Full Ghosted grid',
  'Priority visibility',
  'Advanced filters',
  'Extra personas',
  'Stealth mode',
];

const TIERS = [
  { id: 'monthly', label: 'Monthly', price: '9.99', period: '/mo', badge: null },
  { id: 'quarterly', label: 'Quarterly', price: '7.99', period: '/mo', badge: 'Save 20%' },
  { id: 'annual', label: 'Annual', price: '4.99', period: '/mo', badge: 'Best value' },
];

export default function L2PremiumGateSheet({ origin }: L2PremiumGateSheetProps) {
  const { closeSheet } = useSheet();
  const [selectedTier, setSelectedTier] = React.useState('quarterly');
  const [isProcessing, setIsProcessing] = React.useState(false);

  const config = (origin && ORIGIN_CONFIG[origin]) || DEFAULT_CONFIG;
  const Icon = config.icon;

  // Build the return URL encoding the origin so Stripe redirects back correctly
  const returnPath = origin === 'ghosted' ? '/ghosted'
    : origin === 'music' ? '/music'
    : origin === 'personas' ? '/profile?action=manage-personas'
    : '/';

  const handleSubscribe = async () => {
    setIsProcessing(true);
    try {
      // Stripe Checkout redirect would go here.
      // The success_url encodes the returnPath so the user lands back at the right place.
      const successUrl = `${window.location.origin}${returnPath}?premium=success`;
      const cancelUrl = `${window.location.origin}${returnPath}?premium=cancelled`;

      // For now, show a toast since Stripe is not yet live
      toast.success('Premium coming soon. You will be first to know.');
      closeSheet();

      // When Stripe is live, uncomment:
      // const res = await fetch('/api/stripe/create-checkout', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     tier: selectedTier,
      //     success_url: successUrl,
      //     cancel_url: cancelUrl,
      //   }),
      // });
      // const { url } = await res.json();
      // window.location.href = url;
    } catch {
      toast.error('Something went wrong. Try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#050507' }}>
      {/* Close button */}
      <button
        onClick={closeSheet}
        className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 z-10"
        aria-label="Close"
      >
        <X className="w-5 h-5 text-white/60" />
      </button>

      <div className="flex-1 overflow-y-auto px-6 pt-10 pb-32">
        {/* Hero */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(200,150,44,0.15)', border: '1px solid rgba(200,150,44,0.3)' }}
          >
            <Icon className="w-8 h-8 text-[#C8962C]" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
            {config.headline}
          </h2>
          <p className="text-sm text-white/50 max-w-[280px] mx-auto">
            {config.subtext}
          </p>
        </motion.div>

        {/* Tier selector */}
        <div className="space-y-2 mb-8">
          {TIERS.map((tier) => {
            const isActive = selectedTier === tier.id;
            return (
              <button
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl border transition-all ${
                  isActive
                    ? 'bg-[#C8962C]/10 border-[#C8962C]'
                    : 'bg-white/[0.03] border-white/[0.08]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isActive ? 'border-[#C8962C] bg-[#C8962C]' : 'border-white/20'
                    }`}
                  >
                    {isActive && <div className="w-2 h-2 rounded-full bg-black" />}
                  </div>
                  <div className="text-left">
                    <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-white/60'}`}>
                      {tier.label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {tier.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-[#C8962C]/20 text-[#C8962C] text-[10px] font-bold">
                      {tier.badge}
                    </span>
                  )}
                  <div className="text-right">
                    <span className={`text-lg font-black ${isActive ? 'text-[#C8962C]' : 'text-white/60'}`}>
                      {tier.price}
                    </span>
                    <span className="text-xs text-white/30">{tier.period}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Features list */}
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">What you get</p>
          {FEATURES.map((feature) => (
            <div key={feature} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-[#C8962C]/15 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-[#C8962C]" />
              </div>
              <span className="text-sm text-white/70">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 px-6 py-4 z-10"
        style={{
          background: 'rgba(5,5,7,0.95)',
          backdropFilter: 'blur(16px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <button
          onClick={handleSubscribe}
          disabled={isProcessing}
          className="w-full py-4 rounded-2xl font-black text-black uppercase text-sm tracking-wide disabled:opacity-60 transition-all active:scale-[0.98]"
          style={{ background: '#C8962C' }}
        >
          {isProcessing ? 'Processing...' : `Subscribe - ${TIERS.find(t => t.id === selectedTier)?.price}${TIERS.find(t => t.id === selectedTier)?.period}`}
        </button>
        <p className="text-[10px] text-white/20 text-center mt-2">
          Cancel anytime. 7-day free trial for new members.
        </p>
      </div>
    </div>
  );
}
