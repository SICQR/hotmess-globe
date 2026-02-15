/**
 * useGamification Hook
 * 
 * Manages XP, streaks, achievements, challenges, and level progression.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { useUserContext } from './useUserContext';

// XP values for different actions
const XP_REWARDS = {
  PROFILE_COMPLETE: 100,
  DAILY_LOGIN: 10,
  STREAK_BONUS: 5, // per day
  ATTEND_EVENT: 50,
  RSVP_EVENT: 10,
  SEND_MESSAGE: 2,
  RECEIVE_MESSAGE: 1,
  PROFILE_VIEW: 1,
  SAFETY_CHECKIN: 5,
  FIRST_PURCHASE: 50,
  REVIEW_PRODUCT: 20,
  REFER_FRIEND: 100,
  COMPLETE_CHALLENGE: 25,
  UNLOCK_ACHIEVEMENT: 50
};

// Level thresholds
const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  300,    // Level 3
  600,    // Level 4
  1000,   // Level 5
  1500,   // Level 6
  2100,   // Level 7
  2800,   // Level 8
  3600,   // Level 9
  4500,   // Level 10
  5500    // Level 11+
];

// Achievement definitions
const ACHIEVEMENTS = {
  FIRST_STEPS: { id: 'first_steps', name: 'First Steps', description: 'Complete your profile', xp: 100 },
  SOCIAL_BUTTERFLY: { id: 'social_butterfly', name: 'Social Butterfly', description: 'Send 50 messages', xp: 50 },
  PARTY_ANIMAL: { id: 'party_animal', name: 'Party Animal', description: 'Attend 5 events', xp: 75 },
  STREAK_WEEK: { id: 'streak_week', name: 'Week Warrior', description: '7-day login streak', xp: 50 },
  STREAK_MONTH: { id: 'streak_month', name: 'Committed', description: '30-day login streak', xp: 200 },
  BIG_SPENDER: { id: 'big_spender', name: 'Big Spender', description: 'Spend £100 on MESSMARKET', xp: 100 },
  SAFETY_FIRST: { id: 'safety_first', name: 'Safety First', description: 'Complete 10 safety check-ins', xp: 50 },
  TRENDSETTER: { id: 'trendsetter', name: 'Trendsetter', description: 'Be among first to RSVP to 3 events', xp: 75 }
};

// Daily challenge templates
const CHALLENGE_TEMPLATES = [
  { type: 'send_messages', target: 3, xp: 15, description: 'Send 3 messages' },
  { type: 'view_profiles', target: 10, xp: 10, description: 'View 10 profiles' },
  { type: 'use_right_now', target: 1, xp: 20, description: 'Use Right Now' },
  { type: 'browse_events', target: 5, xp: 10, description: 'Browse 5 events' },
  { type: 'add_to_cart', target: 1, xp: 10, description: 'Add something to cart' },
  { type: 'complete_checkin', target: 1, xp: 15, description: 'Complete a safety check-in' }
];

export function useGamification() {
  const { user, xp, level, streak, xpMultiplier, refresh } = useUserContext();
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [challengeProgress, setChallengeProgress] = useState(0);
  const [achievements, setAchievements] = useState([]);
  const [recentXP, setRecentXP] = useState(null);

  // Calculate level from XP
  const calculateLevel = useCallback((xpAmount) => {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xpAmount >= LEVEL_THRESHOLDS[i]) {
        return i + 1;
      }
    }
    return 1;
  }, []);

  // Calculate XP to next level
  const xpToNextLevel = useCallback((xpAmount) => {
    const currentLevel = calculateLevel(xpAmount);
    if (currentLevel >= LEVEL_THRESHOLDS.length) {
      return 1000 - (xpAmount % 1000); // Beyond max defined level
    }
    return LEVEL_THRESHOLDS[currentLevel] - xpAmount;
  }, [calculateLevel]);

  // Get level progress percentage
  const levelProgress = useCallback((xpAmount) => {
    const currentLevel = calculateLevel(xpAmount);
    const currentThreshold = LEVEL_THRESHOLDS[currentLevel - 1] || 0;
    const nextThreshold = LEVEL_THRESHOLDS[currentLevel] || currentThreshold + 1000;
    const xpInLevel = xpAmount - currentThreshold;
    const xpNeeded = nextThreshold - currentThreshold;
    return Math.round((xpInLevel / xpNeeded) * 100);
  }, [calculateLevel]);

  // Award XP
  const awardXP = useCallback(async (amount, reason, metadata = {}) => {
    if (!user?.id) return { error: 'Not logged in' };

    const multipliedAmount = Math.round(amount * xpMultiplier);

    try {
      // Update user XP
      const newXP = (xp || 0) + multipliedAmount;
      const newLevel = calculateLevel(newXP);

      const { error } = await supabase
        .from('User')
        .update({ 
          xp_balance: newXP,
          level: newLevel
        })
        .eq('account_id', user.id);

      if (error) throw error;

      // Log the transaction
      await supabase
        .from('xp_transactions')
        .insert({
          user_email: user.email,
          amount: multipliedAmount,
          transaction_type: 'reward',
          reference_type: reason,
          notes: metadata.notes || reason
        });

      // Show recent XP animation
      setRecentXP({ amount: multipliedAmount, reason });
      setTimeout(() => setRecentXP(null), 3000);

      // Refresh user data
      await refresh();

      return { success: true, amount: multipliedAmount, newXP, newLevel };
    } catch (err) {
      console.error('Error awarding XP:', err);
      return { error: err };
    }
  }, [user, xp, xpMultiplier, calculateLevel, refresh]);

  // Track action for gamification
  const trackAction = useCallback(async (actionType) => {
    const xpAmount = XP_REWARDS[actionType];
    if (xpAmount) {
      await awardXP(xpAmount, actionType);
    }
    
    // Check achievements
    await checkAchievements(actionType);
    
    // Update challenge progress
    if (dailyChallenge?.type === actionType.toLowerCase()) {
      const newProgress = Math.min(challengeProgress + 1, dailyChallenge.target);
      setChallengeProgress(newProgress);
      
      if (newProgress >= dailyChallenge.target) {
        await awardXP(dailyChallenge.xp, 'COMPLETE_CHALLENGE');
      }
    }
  }, [awardXP, dailyChallenge, challengeProgress]);

  // Check and unlock achievements
  const checkAchievements = useCallback(async (actionType) => {
    // This would check various conditions and unlock achievements
    // Simplified version - actual implementation would track counts
  }, []);

  // Load daily challenge
  useEffect(() => {
    if (!user?.id) return;

    // Generate deterministic daily challenge based on date + user id
    const today = new Date().toISOString().split('T')[0];
    const seed = `${today}-${user.id}`;
    const index = hashString(seed) % CHALLENGE_TEMPLATES.length;
    setDailyChallenge(CHALLENGE_TEMPLATES[index]);
    setChallengeProgress(0);
  }, [user?.id]);

  // Load achievements
  useEffect(() => {
    setAchievements(user?.achievements || []);
  }, [user?.achievements]);

  return {
    // Current state
    xp: xp || 0,
    level: level || 1,
    streak: streak || 0,
    xpMultiplier,
    achievements,
    dailyChallenge,
    challengeProgress,
    recentXP,

    // Computed
    xpToNextLevel: xpToNextLevel(xp || 0),
    levelProgress: levelProgress(xp || 0),

    // Actions
    awardXP,
    trackAction,
    checkAchievements,

    // Constants
    XP_REWARDS,
    ACHIEVEMENTS,
    LEVEL_THRESHOLDS
  };
}

// Simple string hash for deterministic challenge selection
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export default useGamification;
