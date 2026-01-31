/**
 * HOTMESS Proactive AI Triggers
 * 
 * Defines conditions under which the AI should proactively engage users.
 * Use with useAITriggers hook to monitor and fire triggers.
 */

// Trigger definitions
export const AI_TRIGGERS = {
  // Empty results triggers
  EMPTY_EVENTS: {
    id: 'empty_events',
    condition: (state) => state.page === '/events' && state.eventsCount === 0,
    message: "Nothing happening tonight? Let me find you something based on your vibe...",
    action: 'suggest_events',
    priority: 'medium',
    cooldown: 60 * 60 * 1000 // 1 hour
  },
  
  EMPTY_SEARCH: {
    id: 'empty_search',
    condition: (state) => state.searchQuery && state.resultsCount === 0,
    message: "Couldn't find what you're looking for? Let me try a different approach...",
    action: 'refine_search',
    priority: 'low',
    cooldown: 5 * 60 * 1000 // 5 minutes
  },

  // Engagement triggers
  INACTIVE_USER: {
    id: 'inactive_user',
    condition: (user) => {
      if (!user?.lastActive) return false;
      const daysSince = (Date.now() - new Date(user.lastActive).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince >= 7;
    },
    message: "Hey, missed you! Want to see who's new nearby?",
    action: 'show_new_profiles',
    priority: 'medium',
    cooldown: 24 * 60 * 60 * 1000 // 24 hours
  },

  CART_ABANDONED: {
    id: 'cart_abandoned',
    condition: (state) => {
      if (!state.cartItems?.length || !state.cartLastUpdated) return false;
      const hoursSince = (Date.now() - new Date(state.cartLastUpdated).getTime()) / (1000 * 60 * 60);
      return hoursSince >= 24;
    },
    message: "Still thinking about that? It's going fast...",
    action: 'show_cart',
    priority: 'low',
    cooldown: 24 * 60 * 60 * 1000
  },

  // Profile optimization triggers
  PROFILE_INCOMPLETE: {
    id: 'profile_incomplete',
    condition: (user) => {
      if (!user) return false;
      const completeness = calculateProfileCompleteness(user);
      return completeness < 50;
    },
    message: "Quick tip: Complete profiles get 40% more responses. Want some suggestions?",
    action: 'show_profile_optimizer',
    priority: 'medium',
    cooldown: 3 * 24 * 60 * 60 * 1000 // 3 days
  },

  NO_PHOTO: {
    id: 'no_photo',
    condition: (user) => !user?.photos?.length,
    message: "Profiles with photos get way more attention. Want to add one?",
    action: 'prompt_photo_upload',
    priority: 'high',
    cooldown: 24 * 60 * 60 * 1000
  },

  // Safety triggers
  RIGHT_NOW_ENDED: {
    id: 'right_now_ended',
    condition: (state) => {
      if (!state.rightNowEndedAt) return false;
      const hoursSince = (Date.now() - new Date(state.rightNowEndedAt).getTime()) / (1000 * 60 * 60);
      return hoursSince >= 2 && hoursSince < 4;
    },
    message: "How'd it go? Just checking in. 💚",
    action: 'safety_checkin',
    priority: 'high',
    cooldown: 12 * 60 * 60 * 1000
  },

  LATE_NIGHT: {
    id: 'late_night',
    condition: (state) => {
      const hour = new Date().getHours();
      return hour >= 2 && hour < 5 && state.isActive;
    },
    message: "Still up? Everything okay? I'm here if you need anything.",
    action: 'check_wellbeing',
    priority: 'low',
    cooldown: 4 * 60 * 60 * 1000
  },

  FIRST_MEETUP: {
    id: 'first_meetup',
    condition: (state) => {
      // Triggered when user has sent "on my way" or similar
      return state.meetupInitiated && !state.previousMeetups?.includes(state.meetupUserId);
    },
    message: "First time meeting someone? Remember: trust your gut, share your location with a friend if you want, and have fun!",
    action: 'show_safety_tips',
    priority: 'high',
    cooldown: 0 // Always show for first meetups
  },

  // Messaging triggers
  FIRST_MESSAGE: {
    id: 'first_message',
    condition: (state) => state.aboutToSendFirstMessage,
    message: "Pro tip: Mention something from their profile - shows you actually read it!",
    action: 'show_wingman',
    priority: 'low',
    cooldown: 24 * 60 * 60 * 1000
  },

  MESSAGE_NO_REPLY: {
    id: 'message_no_reply',
    condition: (state) => {
      if (!state.lastMessageSent) return false;
      const hoursSince = (Date.now() - new Date(state.lastMessageSent).getTime()) / (1000 * 60 * 60);
      return hoursSince >= 48 && !state.gotReply;
    },
    message: "No reply yet? Don't sweat it - onto the next. Want me to find you some fresh profiles?",
    action: 'suggest_profiles',
    priority: 'low',
    cooldown: 72 * 60 * 60 * 1000
  },

  // XP/Gamification triggers
  STREAK_AT_RISK: {
    id: 'streak_at_risk',
    condition: (user) => {
      if (!user?.streakLastUpdated) return false;
      const hoursSince = (Date.now() - new Date(user.streakLastUpdated).getTime()) / (1000 * 60 * 60);
      return hoursSince >= 20 && hoursSince < 24; // Last 4 hours of streak
    },
    message: `Your ${user?.currentStreak || 0}-day streak is about to end! Quick action to save it?`,
    action: 'suggest_quick_action',
    priority: 'medium',
    cooldown: 4 * 60 * 60 * 1000
  },

  LEVEL_UP_CLOSE: {
    id: 'level_up_close',
    condition: (user) => {
      if (!user?.xpBalance) return false;
      const xpToNextLevel = getXPToNextLevel(user.xpBalance);
      return xpToNextLevel <= 50;
    },
    message: `You're ${getXPToNextLevel(user?.xpBalance)} XP away from leveling up! 🔥`,
    action: 'suggest_xp_actions',
    priority: 'low',
    cooldown: 12 * 60 * 60 * 1000
  }
};

/**
 * Calculate profile completeness percentage
 */
function calculateProfileCompleteness(user) {
  if (!user) return 0;
  
  const fields = [
    { name: 'photos', weight: 25, check: () => user.photos?.length > 0 },
    { name: 'bio', weight: 15, check: () => user.bio?.length >= 50 },
    { name: 'interests', weight: 10, check: () => user.interests?.length >= 3 },
    { name: 'tribes', weight: 10, check: () => user.tribes?.length > 0 },
    { name: 'looking_for', weight: 15, check: () => user.looking_for?.length > 0 },
    { name: 'height', weight: 5, check: () => !!user.height },
    { name: 'body_type', weight: 5, check: () => !!user.body_type },
    { name: 'position', weight: 5, check: () => !!user.position },
    { name: 'music_taste', weight: 5, check: () => user.music_taste?.length > 0 },
    { name: 'location', weight: 5, check: () => !!user.city }
  ];

  return fields.reduce((score, field) => {
    return score + (field.check() ? field.weight : 0);
  }, 0);
}

/**
 * Calculate XP needed to reach next level
 */
function getXPToNextLevel(currentXP) {
  if (!currentXP) return 100;
  
  // Level thresholds: 100, 300, 600, 1000, 1500, 2100, 2800, etc.
  const levels = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500];
  
  for (let i = 0; i < levels.length; i++) {
    if (currentXP < levels[i]) {
      return levels[i] - currentXP;
    }
  }
  
  // Beyond level 10
  return 1000 - (currentXP % 1000);
}

/**
 * Check if a trigger should fire (respecting cooldowns)
 */
export function shouldFireTrigger(trigger, lastFired) {
  if (!lastFired) return true;
  
  const timeSinceLast = Date.now() - lastFired;
  return timeSinceLast >= trigger.cooldown;
}

/**
 * Get all active triggers for current state
 */
export function getActiveTriggers(state, user, firedTriggers = {}) {
  const active = [];
  
  for (const [key, trigger] of Object.entries(AI_TRIGGERS)) {
    try {
      const conditionMet = trigger.condition(state, user);
      const notOnCooldown = shouldFireTrigger(trigger, firedTriggers[trigger.id]);
      
      if (conditionMet && notOnCooldown) {
        active.push(trigger);
      }
    } catch (e) {
      console.warn(`Trigger ${key} condition check failed:`, e);
    }
  }
  
  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  active.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return active;
}

/**
 * Hook to use AI triggers in components
 */
export function useAITriggers(state, user) {
  const [firedTriggers, setFiredTriggers] = useState(() => {
    // Load from localStorage
    try {
      return JSON.parse(localStorage.getItem('ai_triggers_fired') || '{}');
    } catch {
      return {};
    }
  });

  const activeTriggers = getActiveTriggers(state, user, firedTriggers);

  const markFired = (triggerId) => {
    const updated = { ...firedTriggers, [triggerId]: Date.now() };
    setFiredTriggers(updated);
    localStorage.setItem('ai_triggers_fired', JSON.stringify(updated));
  };

  return {
    activeTriggers,
    topTrigger: activeTriggers[0] || null,
    markFired
  };
}

// Need to import useState for the hook
import { useState } from 'react';

export default {
  AI_TRIGGERS,
  getActiveTriggers,
  shouldFireTrigger,
  useAITriggers,
  calculateProfileCompleteness,
  getXPToNextLevel
};
