/**
 * Feature Gate Component
 * 
 * Wraps premium features and shows upsell when user doesn't have access.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserContext } from '@/hooks/useUserContext';
import UpsellModal from './UpsellModal';

// Feature requirements
const FEATURE_TIERS = {
  // Premium features
  unlimited_messages: 'PREMIUM',
  profile_views: 'PREMIUM',
  advanced_filters: 'PREMIUM',
  super_likes: 'PREMIUM',
  rewind: 'PREMIUM',
  no_ads: 'PREMIUM',
  read_receipts: 'PREMIUM',
  
  // Elite features
  incognito: 'ELITE',
  weekly_boost: 'ELITE',
  priority_support: 'ELITE',
  verified_badge: 'ELITE',
  exclusive_events: 'ELITE',
  video_calls: 'ELITE',
  
  // Creator features
  creator_page: 'PREMIUM',
  ppv_content: 'PREMIUM',
  custom_requests: 'ELITE'
};

// Map features to upsell triggers
const FEATURE_TO_TRIGGER = {
  unlimited_messages: 'message_limit',
  profile_views: 'profile_views',
  advanced_filters: 'advanced_filters',
  super_likes: 'super_like',
  rewind: 'rewind',
  incognito: 'incognito',
  weekly_boost: 'boost'
};

export default function FeatureGate({ 
  feature, 
  children, 
  fallback,
  showLockIcon = true,
  blurContent = false,
  className = '' 
}) {
  const { tier, isPremium, isElite } = useUserContext();
  const [showUpsell, setShowUpsell] = useState(false);

  const requiredTier = FEATURE_TIERS[feature];
  
  // Check access
  const hasAccess = () => {
    if (!requiredTier) return true;
    if (requiredTier === 'PREMIUM') return isPremium || isElite;
    if (requiredTier === 'ELITE') return isElite;
    return true;
  };

  // If user has access, render children
  if (hasAccess()) {
    return <>{children}</>;
  }

  // Custom fallback provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default locked state
  return (
    <>
      <div className={`relative ${className}`}>
        {/* Blurred content preview */}
        {blurContent && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="filter blur-lg opacity-50">
              {children}
            </div>
          </div>
        )}

        {/* Lock overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`
            ${blurContent ? 'absolute inset-0 z-10' : ''}
            flex flex-col items-center justify-center p-6 text-center
            bg-black/80 backdrop-blur-sm
          `}
        >
          {showLockIcon && (
            <div className="w-12 h-12 bg-[#C8962C]/20 border border-[#C8962C] flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-[#C8962C]" />
            </div>
          )}

          <h4 className="font-bold text-white mb-1">
            {requiredTier === 'ELITE' ? 'Elite' : 'Premium'} Feature
          </h4>
          
          <p className="text-sm text-white/60 mb-4">
            Upgrade to unlock this feature
          </p>

          <Button
            onClick={() => setShowUpsell(true)}
            className="bg-[#C8962C] hover:bg-[#C8962C]/80"
          >
            <Crown className="w-4 h-4 mr-2" />
            Upgrade
          </Button>
        </motion.div>
      </div>

      {/* Upsell modal */}
      <UpsellModal
        isOpen={showUpsell}
        onClose={() => setShowUpsell(false)}
        trigger={FEATURE_TO_TRIGGER[feature] || 'message_limit'}
      />
    </>
  );
}

/**
 * Hook to check feature access
 */
export function useFeatureAccess(feature) {
  const { isPremium, isElite } = useUserContext();
  
  const requiredTier = FEATURE_TIERS[feature];
  
  if (!requiredTier) return { hasAccess: true, requiredTier: null };
  if (requiredTier === 'PREMIUM') return { hasAccess: isPremium || isElite, requiredTier };
  if (requiredTier === 'ELITE') return { hasAccess: isElite, requiredTier };
  
  return { hasAccess: true, requiredTier: null };
}

/**
 * Premium badge component
 */
export function PremiumBadge({ tier = 'PREMIUM', size = 'sm', className = '' }) {
  const sizes = {
    xs: 'text-[8px] px-1 py-0.5',
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2 py-1'
  };

  const colors = {
    PREMIUM: { bg: 'bg-[#C8962C]/20', text: 'text-[#C8962C]', border: 'border-[#C8962C]' },
    ELITE: { bg: 'bg-[#B026FF]/20', text: 'text-[#B026FF]', border: 'border-[#B026FF]' }
  };

  const style = colors[tier] || colors.PREMIUM;

  return (
    <span className={`
      inline-flex items-center gap-1 font-bold uppercase border
      ${sizes[size]} ${style.bg} ${style.text} ${style.border} ${className}
    `}>
      {tier === 'ELITE' ? <Sparkles className="w-3 h-3" /> : <Crown className="w-3 h-3" />}
      {tier}
    </span>
  );
}
