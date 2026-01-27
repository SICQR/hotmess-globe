import React from 'react';
import { Crown, Star, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DEFAULT_TIER_PRICES = { basic: 500, premium: 1000, vip: 2500 };
const DEFAULT_TIER_PERKS = {
  basic: ['Access to basic premium content', 'Monthly exclusive updates'],
  premium: ['Access to all premium content', 'Direct messaging priority', 'Weekly exclusive content'],
  vip: ['Access to all content', '1-on-1 chat sessions', 'Behind-the-scenes access', 'Custom content requests'],
};

const TIER_CONFIG = {
  basic: {
    label: 'Basic',
    icon: Star,
    gradient: 'from-white/20 to-white/10',
    border: 'border-white/30',
    accent: 'text-white',
    buttonClass: 'bg-white/10 text-white hover:bg-white/20',
  },
  premium: {
    label: 'Premium',
    icon: Crown,
    gradient: 'from-[#FFD700]/20 to-[#FF8C00]/20',
    border: 'border-[#FFD700]/50',
    accent: 'text-[#FFD700]',
    buttonClass: 'bg-gradient-to-r from-[#FFD700] to-[#FF8C00] text-black hover:opacity-90',
    recommended: true,
  },
  vip: {
    label: 'VIP',
    icon: Sparkles,
    gradient: 'from-[#E62020]/20 to-[#8B5CF6]/20',
    border: 'border-[#E62020]/50',
    accent: 'text-[#E62020]',
    buttonClass: 'bg-gradient-to-r from-[#E62020] to-[#8B5CF6] text-white hover:opacity-90',
  },
};

export default function TierSelector({
  tierPrices = DEFAULT_TIER_PRICES,
  tierPerks = DEFAULT_TIER_PERKS,
  selectedTier,
  onSelectTier,
  currentTier,
  onSubscribe,
  isSubscribing,
  creatorName,
}) {
  const tiers = ['basic', 'premium', 'vip'];

  return (
    <div className="space-y-4">
      <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4">
        Choose Your Access Level
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((tier) => {
          const config = TIER_CONFIG[tier];
          const Icon = config.icon;
          const price = tierPrices[tier] || DEFAULT_TIER_PRICES[tier];
          const perks = tierPerks[tier] || DEFAULT_TIER_PERKS[tier];
          const isSelected = selectedTier === tier;
          const isCurrent = currentTier === tier;

          return (
            <div
              key={tier}
              className={cn(
                'relative rounded-xl p-4 border-2 transition-all cursor-pointer',
                `bg-gradient-to-br ${config.gradient}`,
                isSelected ? `${config.border} ring-2 ring-offset-2 ring-offset-black` : 'border-white/10',
                config.recommended && 'md:-mt-2 md:mb-2'
              )}
              onClick={() => onSelectTier(tier)}
            >
              {/* Recommended badge */}
              {config.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#FFD700] text-black text-xs font-bold uppercase rounded-full">
                  Recommended
                </div>
              )}

              {/* Current badge */}
              {isCurrent && (
                <div className="absolute -top-3 right-3 px-3 py-0.5 bg-[#39FF14] text-black text-xs font-bold uppercase rounded-full">
                  Current
                </div>
              )}

              <div className="text-center mb-4">
                <Icon className={cn('w-8 h-8 mx-auto mb-2', config.accent)} />
                <h4 className={cn('text-lg font-black uppercase', config.accent)}>
                  {config.label}
                </h4>
                <div className="text-2xl font-black mt-2">
                  <span className={config.accent}>{price}</span>
                  <span className="text-xs text-white/40 ml-1">XP/mo</span>
                </div>
              </div>

              <ul className="space-y-2 mb-4">
                {perks.map((perk, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-white/70">
                    <Check className={cn('w-3 h-3 mt-0.5 flex-shrink-0', config.accent)} />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onSubscribe(tier);
                }}
                disabled={isSubscribing || isCurrent}
                className={cn('w-full font-bold', config.buttonClass)}
              >
                {isSubscribing && selectedTier === tier ? (
                  'Subscribing...'
                ) : isCurrent ? (
                  'Current Plan'
                ) : currentTier ? (
                  tier === 'vip' || (tier === 'premium' && currentTier === 'basic') ? 'Upgrade' : 'Downgrade'
                ) : (
                  'Subscribe'
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Compact tier display for showing current subscription
export function TierBadge({ tier, size = 'md' }) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.basic;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-1.5 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-bold uppercase',
        `bg-gradient-to-r ${config.gradient} ${config.border} border`,
        sizeClasses[size]
      )}
    >
      <Icon className={cn(iconSizes[size], config.accent)} />
      <span className={config.accent}>{config.label}</span>
    </div>
  );
}
