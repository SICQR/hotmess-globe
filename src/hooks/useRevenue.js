/**
 * useRevenue Hook
 * 
 * Tracks usage, determines when to show upsells, and manages conversion events.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { useUserContext } from './useUserContext';
import logger from '@/utils/logger';

// Upsell trigger thresholds
const UPSELL_TRIGGERS = {
  MESSAGE_LIMIT: {
    threshold: 0.8, // 80% of daily limit
    type: 'soft',
    message: "Running low on messages today. Upgrade for unlimited!",
    feature: 'unlimited_messages'
  },
  PROFILE_VIEWS: {
    threshold: 0.9,
    type: 'soft',
    message: "Almost at your profile view limit. See more with Premium!",
    feature: 'unlimited_views'
  },
  WHO_VIEWED: {
    threshold: 0, // Show when they try to access
    type: 'gate',
    message: "See who viewed your profile with Premium",
    feature: 'see_who_viewed'
  },
  ADVANCED_FILTERS: {
    threshold: 0,
    type: 'gate',
    message: "Unlock advanced filters with Premium",
    feature: 'advanced_filters'
  },
  STEALTH_MODE: {
    threshold: 0,
    type: 'gate',
    message: "Go stealth with Elite - browse invisibly",
    feature: 'stealth_mode'
  },
  XP_BOOST: {
    threshold: 0,
    type: 'promotional',
    message: "Earn 2x XP with Elite membership!",
    feature: 'xp_boost'
  }
};

export function useRevenue() {
  const { user, email, tier, limits, isPremium, isElite } = useUserContext();
  const [dailyUsage, setDailyUsage] = useState({
    messages: 0,
    profileViews: 0,
    searches: 0
  });
  const [shownUpsells, setShownUpsells] = useState(new Set());

  // Track daily usage from database
  useEffect(() => {
    async function fetchDailyUsage() {
      if (!email) return;

      const today = new Date().toISOString().split('T')[0];
      
      // In production, this would query an analytics/usage table
      // For now, use localStorage as a simple counter
      const stored = localStorage.getItem(`usage_${email}_${today}`);
      if (stored) {
        setDailyUsage(JSON.parse(stored));
      }
    }

    fetchDailyUsage();
  }, [email]);

  // Save usage to localStorage (would be database in production)
  const saveUsage = useCallback((usage) => {
    if (!email) return;
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`usage_${email}_${today}`, JSON.stringify(usage));
    setDailyUsage(usage);
  }, [email]);

  // Track an action
  const trackAction = useCallback((actionType, metadata = {}) => {
    const newUsage = { ...dailyUsage };

    switch (actionType) {
      case 'message_sent':
        newUsage.messages += 1;
        break;
      case 'profile_viewed':
        newUsage.profileViews += 1;
        break;
      case 'search':
        newUsage.searches += 1;
        break;
    }

    saveUsage(newUsage);

    // Log to analytics
    logConversionEvent(actionType, metadata);

    return checkUpsell(actionType);
  }, [dailyUsage, saveUsage]);

  // Check if an upsell should be shown
  const checkUpsell = useCallback((actionType) => {
    if (isPremium) return null; // Premium users don't see most upsells

    // Message limit check
    if (actionType === 'message_sent') {
      const ratio = dailyUsage.messages / limits.messagesPerDay;
      if (ratio >= UPSELL_TRIGGERS.MESSAGE_LIMIT.threshold) {
        return {
          ...UPSELL_TRIGGERS.MESSAGE_LIMIT,
          remaining: limits.messagesPerDay - dailyUsage.messages
        };
      }
    }

    // Profile view limit check
    if (actionType === 'profile_viewed') {
      const ratio = dailyUsage.profileViews / limits.profileViewsPerDay;
      if (ratio >= UPSELL_TRIGGERS.PROFILE_VIEWS.threshold) {
        return {
          ...UPSELL_TRIGGERS.PROFILE_VIEWS,
          remaining: limits.profileViewsPerDay - dailyUsage.profileViews
        };
      }
    }

    return null;
  }, [isPremium, dailyUsage, limits]);

  // Check if a feature is gated
  const shouldShowGate = useCallback((feature) => {
    const gates = {
      see_who_viewed: !limits.canSeeWhoViewed,
      advanced_filters: !limits.canUseAdvancedFilters,
      stealth_mode: !limits.canGoStealth
    };

    return gates[feature] || false;
  }, [limits]);

  // Get upsell for a gated feature
  const getFeatureUpsell = useCallback((feature) => {
    const upsells = {
      see_who_viewed: UPSELL_TRIGGERS.WHO_VIEWED,
      advanced_filters: UPSELL_TRIGGERS.ADVANCED_FILTERS,
      stealth_mode: UPSELL_TRIGGERS.STEALTH_MODE
    };

    return upsells[feature] || null;
  }, []);

  // Log conversion events
  const logConversionEvent = useCallback(async (eventType, metadata = {}) => {
    if (!email) return;

    try {
      await supabase
        .from('search_analytics')
        .insert({
          user_email: email,
          search_type: eventType,
          results_count: 0,
          clicked_result_id: metadata.resultId || null,
          metadata: { ...metadata, tier }
        });
    } catch (err) {
      // Analytics failures shouldn't break the app
      logger.warn('Analytics log failed:', err);
    }
  }, [email, tier]);

  // Track upsell shown
  const markUpsellShown = useCallback((upsellType) => {
    setShownUpsells(prev => new Set([...prev, upsellType]));
    
    // Also log for analytics
    logConversionEvent('upsell_shown', { upsell_type: upsellType });
  }, [logConversionEvent]);

  // Track upsell clicked
  const trackUpsellClick = useCallback((upsellType) => {
    logConversionEvent('upsell_clicked', { upsell_type: upsellType });
  }, [logConversionEvent]);

  // Get remaining daily usage
  const remainingUsage = useMemo(() => ({
    messages: Math.max(0, limits.messagesPerDay - dailyUsage.messages),
    profileViews: Math.max(0, limits.profileViewsPerDay - dailyUsage.profileViews)
  }), [limits, dailyUsage]);

  // Get usage percentage
  const usagePercentage = useMemo(() => ({
    messages: limits.messagesPerDay === Infinity 
      ? 0 
      : Math.round((dailyUsage.messages / limits.messagesPerDay) * 100),
    profileViews: limits.profileViewsPerDay === Infinity 
      ? 0 
      : Math.round((dailyUsage.profileViews / limits.profileViewsPerDay) * 100)
  }), [limits, dailyUsage]);

  return {
    // Usage tracking
    dailyUsage,
    remainingUsage,
    usagePercentage,
    trackAction,

    // Upsells
    checkUpsell,
    shouldShowGate,
    getFeatureUpsell,
    markUpsellShown,
    trackUpsellClick,
    hasSeenUpsell: (type) => shownUpsells.has(type),

    // Limits info
    limits,
    isPremium,
    isElite,

    // Conversion tracking
    logConversionEvent
  };
}

export default useRevenue;
