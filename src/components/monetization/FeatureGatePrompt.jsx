/**
 * FeatureGatePrompt - Monetization upsell component
 * 
 * Shows contextual prompts when users encounter locked features,
 * offering paths to unlock via XP purchase or subscription upgrade.
 * 
 * Usage:
 * <FeatureGatePrompt
 *   feature="advanced_filters"
 *   requiredLevel={7}
 *   requiredXp={500}
 *   currentXp={user?.xp || 0}
 *   currentLevel={Math.floor((user?.xp || 0) / 1000) + 1}
 *   membershipTier={user?.membership_tier}
 *   onUpgrade={() => navigate('/membership')}
 *   onBuyXp={() => navigate('/xp')}
 * />
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Zap, Crown, Sparkles, ChevronRight, X, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '../../utils';

// Feature definitions with unlock requirements
const FEATURE_CONFIG = {
  // Discovery features
  advanced_filters: {
    name: 'Advanced Filters',
    description: 'Filter by compatibility, interests, and more',
    icon: Sparkles,
    requiredLevel: 7,
    plusUnlock: true,
    xpCost: 500,
  },
  discovery_priority: {
    name: 'Priority Discovery',
    description: 'Appear first in other users\' feeds',
    icon: Zap,
    requiredLevel: 7,
    plusUnlock: true,
    xpCost: 1000,
  },
  profile_viewers: {
    name: 'Profile Viewers',
    description: 'See who viewed your profile',
    icon: Sparkles,
    requiredLevel: 5,
    plusUnlock: true,
    xpCost: 300,
  },
  read_receipts: {
    name: 'Read Receipts',
    description: 'Know when your messages are read',
    icon: Sparkles,
    requiredLevel: 5,
    plusUnlock: true,
    xpCost: 200,
  },
  anonymous_browsing: {
    name: 'Anonymous Browsing',
    description: 'Browse profiles without being seen',
    icon: Lock,
    requiredLevel: 0,
    plusUnlock: true,
    chromeUnlock: false,
    xpCost: 500,
  },
  unlimited_go_live: {
    name: 'Unlimited Go Live',
    description: 'Go live anytime, as many times as you want',
    icon: Zap,
    requiredLevel: 0,
    plusUnlock: true,
    xpCost: null, // Subscription only
  },
  // Level-gated features
  create_persona: {
    name: 'Create Persona',
    description: 'Create alternate personas for different scenes',
    icon: Crown,
    requiredLevel: 3,
    plusUnlock: false,
    xpCost: 500,
  },
  custom_badge_colors: {
    name: 'Custom Badge Colors',
    description: 'Personalize your profile badge colors',
    icon: Gift,
    requiredLevel: 10,
    plusUnlock: false,
    xpCost: 800,
  },
  private_events: {
    name: 'Private Events',
    description: 'Create invite-only events',
    icon: Lock,
    requiredLevel: 15,
    plusUnlock: false,
    xpCost: 1500,
  },
};

// XP Package options for quick purchase
const XP_PACKAGES = [
  { xp: 500, price: '$5', bonus: null },
  { xp: 1000, price: '$9', bonus: '10%' },
  { xp: 2500, price: '$20', bonus: '25%' },
];

export default function FeatureGatePrompt({
  feature,
  isOpen = false,
  onClose,
  currentXp = 0,
  currentLevel = 1,
  membershipTier = 'basic',
  customTitle,
  customDescription,
  showInline = false,
}) {
  const navigate = useNavigate();
  const [selectedPackage, setSelectedPackage] = useState(null);
  
  const config = FEATURE_CONFIG[feature] || {
    name: customTitle || 'Premium Feature',
    description: customDescription || 'Unlock this feature to enhance your experience',
    icon: Lock,
    requiredLevel: 0,
    plusUnlock: true,
    xpCost: 500,
  };
  
  const Icon = config.icon;
  const xpNeeded = config.xpCost ? Math.max(0, config.xpCost - currentXp) : null;
  const levelNeeded = config.requiredLevel > currentLevel;
  const xpToNextLevel = config.requiredLevel ? (config.requiredLevel * 1000) - currentXp : 0;
  
  const isPlusSubscriber = membershipTier === 'plus' || membershipTier === 'chrome';
  const isChromeSubscriber = membershipTier === 'chrome';
  
  // Check if feature is unlockable via subscription
  const canUnlockWithPlus = config.plusUnlock && !isPlusSubscriber;
  const canUnlockWithChrome = config.chromeUnlock && !isChromeSubscriber;
  const canUnlockWithXp = config.xpCost !== null && xpNeeded > 0;
  const canUnlockWithLevel = levelNeeded && xpToNextLevel > 0;
  
  const handleUpgrade = () => {
    navigate(createPageUrl('MembershipUpgrade'));
    onClose?.();
  };
  
  const handleBuyXp = (xpAmount) => {
    navigate(createPageUrl('Checkout') + `?type=xp&amount=${xpAmount}`);
    onClose?.();
  };

  // Inline variant for embedding in pages
  if (showInline) {
    return (
      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white mb-1">{config.name}</h4>
            <p className="text-xs text-white/60 mb-3">{config.description}</p>
            
            <div className="flex flex-wrap gap-2">
              {canUnlockWithPlus && (
                <Button
                  onClick={handleUpgrade}
                  size="sm"
                  className="bg-[#E62020] hover:bg-[#E62020]/90 text-white text-xs"
                >
                  <Crown className="w-3 h-3 mr-1" />
                  Upgrade to PLUS
                </Button>
              )}
              {canUnlockWithXp && (
                <Button
                  onClick={() => handleBuyXp(config.xpCost)}
                  size="sm"
                  variant="outline"
                  className="border-[#FFEB3B] text-[#FFEB3B] hover:bg-[#FFEB3B]/10 text-xs"
                >
                  <Zap className="w-3 h-3 mr-1" />
                  {xpNeeded} XP needed
                </Button>
              )}
              {canUnlockWithLevel && (
                <span className="text-xs text-white/50 py-1">
                  Level {config.requiredLevel} required
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Modal variant
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-black border-2 border-white/20 rounded-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-[#E62020]/30 via-purple-900/30 to-black p-6 text-center">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-16 h-16 bg-[#E62020]/20 border-2 border-[#E62020]/50 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Icon className="w-8 h-8 text-[#E62020]" />
              </div>
              
              <h2 className="text-2xl font-black text-white mb-2">{config.name}</h2>
              <p className="text-white/60 text-sm">{config.description}</p>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Subscription Unlock */}
              {canUnlockWithPlus && (
                <div className="bg-gradient-to-r from-[#E62020]/10 to-[#B026FF]/10 border border-[#E62020]/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-[#E62020]" />
                      <span className="font-bold text-white">Unlock with PLUS</span>
                    </div>
                    <span className="text-sm text-white/60">£9.99/mo</span>
                  </div>
                  <ul className="text-sm text-white/70 space-y-1 mb-4">
                    <li>• {config.name} included</li>
                    <li>• 2x visibility boost</li>
                    <li>• Unlimited Go Live</li>
                    <li>• Anonymous browsing</li>
                  </ul>
                  <Button
                    onClick={handleUpgrade}
                    className="w-full bg-[#E62020] hover:bg-[#E62020]/90 text-white font-black"
                  >
                    UPGRADE TO PLUS
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
              
              {/* XP Unlock */}
              {canUnlockWithXp && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-[#FFEB3B]" />
                      <span className="font-bold text-white">Unlock with XP</span>
                    </div>
                    <span className="text-sm text-[#FFEB3B]">{xpNeeded} XP needed</span>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-white/50 mb-1">
                      <span>Your XP: {currentXp}</span>
                      <span>Need: {config.xpCost}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#FFEB3B] transition-all"
                        style={{ width: `${Math.min(100, (currentXp / config.xpCost) * 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs text-white/50 mb-3">Quick buy XP packages:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {XP_PACKAGES.map((pkg) => (
                      <button
                        key={pkg.xp}
                        onClick={() => handleBuyXp(pkg.xp)}
                        className={`p-2 border rounded-lg text-center transition-all ${
                          pkg.xp >= xpNeeded
                            ? 'border-[#FFEB3B] bg-[#FFEB3B]/10 hover:bg-[#FFEB3B]/20'
                            : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        <div className="text-sm font-bold text-white">{pkg.xp} XP</div>
                        <div className="text-xs text-white/60">{pkg.price}</div>
                        {pkg.bonus && (
                          <div className="text-[10px] text-[#39FF14]">+{pkg.bonus} bonus</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Level Requirement */}
              {canUnlockWithLevel && !canUnlockWithXp && !canUnlockWithPlus && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <div className="text-4xl font-black text-[#B026FF] mb-2">
                    Level {config.requiredLevel}
                  </div>
                  <p className="text-white/60 text-sm mb-3">
                    You're {xpToNextLevel} XP away from unlocking this feature
                  </p>
                  <Button
                    onClick={() => handleBuyXp(xpToNextLevel)}
                    variant="outline"
                    className="border-[#B026FF] text-[#B026FF] hover:bg-[#B026FF]/10"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Buy {xpToNextLevel} XP
                  </Button>
                </div>
              )}
              
              {/* Already subscribed message */}
              {isPlusSubscriber && config.plusUnlock && (
                <div className="bg-[#39FF14]/10 border border-[#39FF14]/30 rounded-xl p-4 text-center">
                  <Sparkles className="w-8 h-8 text-[#39FF14] mx-auto mb-2" />
                  <p className="text-[#39FF14] font-bold">Feature Unlocked!</p>
                  <p className="text-white/60 text-sm">This feature is included in your PLUS subscription</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook for easy feature gate checking
export function useFeatureGate(feature, user) {
  const config = FEATURE_CONFIG[feature];
  if (!config) return { isUnlocked: true, canUnlock: false };
  
  const currentLevel = Math.floor((user?.xp || 0) / 1000) + 1;
  const isPlusSubscriber = user?.membership_tier === 'plus' || user?.membership_tier === 'chrome';
  
  const levelMet = currentLevel >= (config.requiredLevel || 0);
  const subscriptionMet = config.plusUnlock ? isPlusSubscriber : true;
  
  return {
    isUnlocked: levelMet && subscriptionMet,
    canUnlockWithXp: config.xpCost !== null,
    canUnlockWithSubscription: config.plusUnlock && !isPlusSubscriber,
    xpNeeded: config.xpCost ? Math.max(0, config.xpCost - (user?.xp || 0)) : null,
    levelNeeded: config.requiredLevel || 0,
    currentLevel,
  };
}

// Export feature config for external use
export { FEATURE_CONFIG };
