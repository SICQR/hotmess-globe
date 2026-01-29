/**
 * Upsell Modal
 * 
 * Dynamic upsell prompts triggered by user actions.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Crown, 
  Sparkles,
  Check,
  Zap,
  Shield,
  Eye,
  MessageSquare,
  Heart,
  Star,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

// Feature benefits by trigger
const TRIGGER_BENEFITS = {
  message_limit: {
    icon: MessageSquare,
    headline: 'Keep the conversation going',
    subheadline: "You've hit your daily message limit",
    cta: 'Unlimited messaging',
    benefits: ['Unlimited messages', 'Read receipts', 'Priority delivery']
  },
  profile_views: {
    icon: Eye,
    headline: 'See who\'s checking you out',
    subheadline: 'Someone viewed your profile',
    cta: 'Unlock profile views',
    benefits: ['See all viewers', 'View timestamps', 'Viewer insights']
  },
  advanced_filters: {
    icon: Sparkles,
    headline: 'Find exactly what you want',
    subheadline: 'Advanced filters are Premium only',
    cta: 'Unlock all filters',
    benefits: ['Position filters', 'Tribe filters', 'Activity status']
  },
  boost: {
    icon: Zap,
    headline: 'Get seen first',
    subheadline: 'Boost your visibility',
    cta: 'Activate boost',
    benefits: ['10x more views', 'Top of grid', 'Priority matching']
  },
  super_like: {
    icon: Star,
    headline: 'Stand out from the crowd',
    subheadline: 'Super likes get 3x more responses',
    cta: 'Get super likes',
    benefits: ['5 super likes/day', 'Priority notification', 'Stand out badge']
  },
  rewind: {
    icon: Heart,
    headline: 'Changed your mind?',
    subheadline: 'Undo your last swipe',
    cta: 'Unlock rewind',
    benefits: ['Unlimited rewinds', 'Never miss a match', 'Second chances']
  },
  incognito: {
    icon: Shield,
    headline: 'Browse privately',
    subheadline: 'View profiles without being seen',
    cta: 'Go incognito',
    benefits: ['Hidden browsing', 'No read receipts', 'Full privacy']
  }
};

// Tier comparison
const TIERS = [
  {
    id: 'premium',
    name: 'Premium',
    price: '£9.99',
    period: '/month',
    color: '#FF1493',
    features: [
      'Unlimited messages',
      'See who viewed you',
      'Advanced filters',
      '5 super likes/day',
      'Rewind swipes',
      'No ads'
    ]
  },
  {
    id: 'elite',
    name: 'Elite',
    price: '£19.99',
    period: '/month',
    color: '#B026FF',
    popular: true,
    features: [
      'Everything in Premium',
      'Incognito mode',
      'Weekly boost',
      'Priority support',
      'Verified badge',
      'Exclusive events access'
    ]
  }
];

export default function UpsellModal({ 
  isOpen, 
  onClose, 
  trigger = 'message_limit',
  onUpgrade 
}) {
  const navigate = useNavigate();
  const [selectedTier, setSelectedTier] = useState('premium');

  const triggerData = TRIGGER_BENEFITS[trigger] || TRIGGER_BENEFITS.message_limit;
  const TriggerIcon = triggerData.icon;

  const handleUpgrade = () => {
    // Track conversion event
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'begin_checkout', {
        trigger,
        tier: selectedTier
      });
    }

    onUpgrade?.(selectedTier);
    navigate(`/subscribe?tier=${selectedTier}&trigger=${trigger}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border-2 border-white/20 text-white max-w-lg p-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="relative p-6 bg-gradient-to-br from-[#FF1493]/20 to-[#B026FF]/20">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#FF1493]/30 flex items-center justify-center border border-[#FF1493]">
              <TriggerIcon className="w-7 h-7 text-[#FF1493]" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase">{triggerData.headline}</h2>
              <p className="text-white/60">{triggerData.subheadline}</p>
            </div>
          </div>

          {/* Quick benefits */}
          <div className="mt-4 flex flex-wrap gap-2">
            {triggerData.benefits.map((benefit, i) => (
              <span 
                key={i}
                className="px-3 py-1 bg-white/10 text-sm text-white/80 flex items-center gap-1"
              >
                <Check className="w-3 h-3 text-[#39FF14]" />
                {benefit}
              </span>
            ))}
          </div>
        </div>

        {/* Tier selection */}
        <div className="p-6">
          <p className="text-xs uppercase text-white/40 font-bold mb-4">Choose your plan</p>
          
          <div className="grid grid-cols-2 gap-3">
            {TIERS.map((tier) => (
              <button
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                className={`
                  relative p-4 border-2 transition-all text-left
                  ${selectedTier === tier.id 
                    ? 'border-white bg-white/10' 
                    : 'border-white/20 hover:border-white/40'
                  }
                `}
                style={{
                  borderColor: selectedTier === tier.id ? tier.color : undefined
                }}
              >
                {tier.popular && (
                  <span className="absolute -top-2 right-2 px-2 py-0.5 bg-[#B026FF] text-[10px] text-white font-bold">
                    BEST VALUE
                  </span>
                )}
                
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-4 h-4" style={{ color: tier.color }} />
                  <span className="font-bold" style={{ color: tier.color }}>{tier.name}</span>
                </div>
                
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white">{tier.price}</span>
                  <span className="text-xs text-white/50">{tier.period}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Selected tier features */}
          <div className="mt-4 p-4 bg-white/5 border border-white/10">
            <p className="text-xs uppercase text-white/40 mb-3">
              {TIERS.find(t => t.id === selectedTier)?.name} includes:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {TIERS.find(t => t.id === selectedTier)?.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-white/80">
                  <Check className="w-3 h-3 text-[#39FF14]" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <Button
            onClick={handleUpgrade}
            className="w-full mt-6 h-14 bg-gradient-to-r from-[#FF1493] to-[#B026FF] hover:opacity-90 text-lg font-black"
          >
            {triggerData.cta}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <p className="mt-4 text-center text-xs text-white/40">
            Cancel anytime. No commitment.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
