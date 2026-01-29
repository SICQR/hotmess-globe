/**
 * Contextual Upsell System
 * 
 * Shows upgrade prompts at natural moments without being annoying
 * Maximum 1 upsell per session, shown at high-value moments
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Zap,
  Eye,
  MessageCircle,
  Shield,
  Sparkles,
  X,
  ChevronRight,
  Check,
  Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

// =============================================================================
// UPSELL TRIGGERS & CONFIG
// =============================================================================

export const UPSELL_TRIGGERS = {
  VIEWED_PROFILES: {
    id: 'viewed_profiles',
    threshold: 5,
    feature: 'Unlimited profile views',
    tier: 'PLUS',
    icon: Eye,
    headline: 'See Everyone',
    description: 'Unlock unlimited profile views and see who viewed you',
    cta: 'Upgrade to PLUS',
  },
  SENT_MESSAGES: {
    id: 'sent_messages',
    threshold: 3,
    feature: 'Unlimited messages + read receipts',
    tier: 'CHROME',
    icon: MessageCircle,
    headline: 'Connect More',
    description: 'Get unlimited messages, read receipts, and priority inbox',
    cta: 'Go CHROME',
  },
  CREATED_BEACON: {
    id: 'created_beacon',
    threshold: 1,
    feature: 'Beacon visibility boost',
    tier: 'PLUS',
    icon: Sparkles,
    headline: 'Boost Your Beacon',
    description: 'Get 3x more visibility with boosted beacons',
    cta: 'Upgrade to PLUS',
  },
  MATCHED_VERIFIED: {
    id: 'matched_verified',
    threshold: 1,
    feature: 'Verification badge',
    tier: 'PLUS',
    icon: Shield,
    headline: 'Get Verified',
    description: 'Verified users get 3x more matches. Stand out from the crowd.',
    cta: 'Verify Now',
  },
  PREMIUM_EVENT: {
    id: 'premium_event',
    threshold: 1,
    feature: 'Priority event entry',
    tier: 'CHROME',
    icon: Crown,
    headline: 'Skip the Line',
    description: 'Get priority entry and exclusive access to VIP events',
    cta: 'Go CHROME',
  },
};

// =============================================================================
// UPSELL CONTEXT
// =============================================================================

const UpsellContext = createContext({
  hasShownUpsell: false,
  showUpsell: () => {},
  dismissUpsell: () => {},
  trackAction: () => {},
});

export function UpsellProvider({ children, currentUser }) {
  const [hasShownUpsell, setHasShownUpsell] = useState(false);
  const [activeUpsell, setActiveUpsell] = useState(null);
  const [actionCounts, setActionCounts] = useState({});
  const navigate = useNavigate();

  // Check session storage for existing upsell shown
  useEffect(() => {
    try {
      const shown = sessionStorage.getItem('upsell_shown_session');
      if (shown) setHasShownUpsell(true);
    } catch (e) {}
  }, []);

  // Track user actions
  const trackAction = useCallback((triggerId) => {
    // Don't track for premium users
    if (currentUser?.membership_tier && currentUser.membership_tier !== 'basic') {
      return;
    }

    // Don't show if already shown this session
    if (hasShownUpsell) return;

    const trigger = Object.values(UPSELL_TRIGGERS).find(t => t.id === triggerId);
    if (!trigger) return;

    setActionCounts(prev => {
      const newCount = (prev[triggerId] || 0) + 1;
      
      // Check if threshold reached
      if (newCount >= trigger.threshold) {
        // Show upsell after a short delay
        setTimeout(() => {
          setActiveUpsell(trigger);
          setHasShownUpsell(true);
          try {
            sessionStorage.setItem('upsell_shown_session', 'true');
          } catch (e) {}
        }, 1000);
      }

      return { ...prev, [triggerId]: newCount };
    });
  }, [hasShownUpsell, currentUser]);

  // Manual show upsell
  const showUpsell = useCallback((triggerId) => {
    if (hasShownUpsell) return;
    
    const trigger = Object.values(UPSELL_TRIGGERS).find(t => t.id === triggerId);
    if (trigger) {
      setActiveUpsell(trigger);
      setHasShownUpsell(true);
      try {
        sessionStorage.setItem('upsell_shown_session', 'true');
      } catch (e) {}
    }
  }, [hasShownUpsell]);

  // Dismiss upsell
  const dismissUpsell = useCallback(() => {
    setActiveUpsell(null);
  }, []);

  // Handle CTA click
  const handleUpgrade = () => {
    dismissUpsell();
    navigate('/membership');
  };

  return (
    <UpsellContext.Provider value={{ hasShownUpsell, showUpsell, dismissUpsell, trackAction }}>
      {children}

      {/* Upsell Modal */}
      <AnimatePresence>
        {activeUpsell && (
          <UpsellModal
            trigger={activeUpsell}
            onDismiss={dismissUpsell}
            onUpgrade={handleUpgrade}
          />
        )}
      </AnimatePresence>
    </UpsellContext.Provider>
  );
}

export const useUpsell = () => useContext(UpsellContext);

// =============================================================================
// UPSELL MODAL
// =============================================================================

function UpsellModal({ trigger, onDismiss, onUpgrade }) {
  const Icon = trigger.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-black border-2 border-[#FF1493] overflow-hidden"
      >
        {/* Gradient header */}
        <div className="bg-gradient-to-br from-[#FF1493]/30 via-[#B026FF]/20 to-black p-8 text-center relative">
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 text-white/40 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[#FF1493] to-[#B026FF] rounded-full flex items-center justify-center"
          >
            <Icon className="w-10 h-10 text-white" />
          </motion.div>

          <h2 className="text-3xl font-black uppercase mb-2">{trigger.headline}</h2>
          <p className="text-white/70">{trigger.description}</p>
        </div>

        {/* Features */}
        <div className="p-6 space-y-4">
          {/* Tier badge */}
          <div className="flex items-center justify-center gap-2">
            <span className={cn(
              "px-4 py-1 rounded-full text-sm font-black uppercase",
              trigger.tier === 'CHROME' 
                ? "bg-[#00D9FF]/20 text-[#00D9FF]" 
                : "bg-[#FF1493]/20 text-[#FF1493]"
            )}>
              {trigger.tier}
            </span>
          </div>

          {/* Benefits */}
          <div className="space-y-2">
            {[
              trigger.feature,
              trigger.tier === 'CHROME' ? 'Priority in discovery' : 'See who viewed you',
              trigger.tier === 'CHROME' ? 'VIP event access' : 'Advanced filters',
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <Check className="w-4 h-4 text-[#39FF14]" />
                <span className="text-white/80">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Button
            onClick={onUpgrade}
            className="w-full bg-gradient-to-r from-[#FF1493] to-[#B026FF] hover:opacity-90 text-white font-black uppercase py-6 text-lg"
          >
            {trigger.cta}
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>

          {/* Skip */}
          <button
            onClick={onDismiss}
            className="w-full text-center text-sm text-white/40 hover:text-white py-2"
          >
            Maybe later
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// =============================================================================
// INLINE UPSELL BANNER
// =============================================================================

export function UpsellBanner({
  triggerId,
  className,
  compact = false
}) {
  const trigger = Object.values(UPSELL_TRIGGERS).find(t => t.id === triggerId);
  const navigate = useNavigate();
  
  if (!trigger) return null;

  const Icon = trigger.icon;

  if (compact) {
    return (
      <button
        onClick={() => navigate('/membership')}
        className={cn(
          "flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#FF1493]/20 to-[#B026FF]/20 border border-[#FF1493]/30 rounded-lg text-sm hover:border-[#FF1493]/50 transition-colors",
          className
        )}
      >
        <Icon className="w-4 h-4 text-[#FF1493]" />
        <span className="text-white/80">{trigger.feature}</span>
        <Crown className="w-4 h-4 text-[#FF1493]" />
      </button>
    );
  }

  return (
    <div className={cn(
      "p-4 bg-gradient-to-r from-[#FF1493]/10 to-[#B026FF]/10 border border-[#FF1493]/30 rounded-lg",
      className
    )}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-[#FF1493]/20 flex items-center justify-center flex-shrink-0">
          <Icon className="w-6 h-6 text-[#FF1493]" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-white mb-1">{trigger.headline}</h4>
          <p className="text-sm text-white/60 mb-3">{trigger.description}</p>
          <Button
            onClick={() => navigate('/membership')}
            size="sm"
            className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-bold"
          >
            {trigger.cta}
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// FEATURE GATE (shows upsell when feature is accessed)
// =============================================================================

export function FeatureGate({
  feature,
  requiredTier = 'plus',
  currentTier = 'basic',
  children,
  fallback
}) {
  const tierOrder = ['basic', 'plus', 'chrome'];
  const hasAccess = tierOrder.indexOf(currentTier) >= tierOrder.indexOf(requiredTier);

  if (hasAccess) {
    return children;
  }

  return fallback || (
    <UpsellBanner triggerId={feature} className="my-4" />
  );
}

// =============================================================================
// UPSELL HOOK
// =============================================================================

export function useTrackAction() {
  const { trackAction } = useUpsell();
  return trackAction;
}

export default {
  UpsellProvider,
  useUpsell,
  useTrackAction,
  UpsellBanner,
  FeatureGate,
  UPSELL_TRIGGERS,
};
