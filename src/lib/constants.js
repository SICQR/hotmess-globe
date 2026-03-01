/**
 * Platform Constants
 * 
 * Centralized configuration values.
 */

// Tier limits
export const TIER_LIMITS = {
  FREE: {
    dailyMessages: 10,
    dailySwipes: 50,
    profileViews: false,
    advancedFilters: false,
    superLikes: 0,
    rewinds: 0,
    boosts: 0,
    personas: 1,
    videoCalls: 3,
    messagesPerConversation: 5,
    aiQuestions: 5
  },
  PREMIUM: {
    dailyMessages: 100,
    dailySwipes: 200,
    profileViews: true,
    advancedFilters: true,
    superLikes: 5,
    rewinds: 10,
    boosts: 0,
    personas: 3,
    videoCalls: 10,
    messagesPerConversation: -1, // Unlimited
    aiQuestions: 50
  },
  ELITE: {
    dailyMessages: -1, // Unlimited
    dailySwipes: -1,
    profileViews: true,
    advancedFilters: true,
    superLikes: 20,
    rewinds: -1,
    boosts: 1,
    personas: 5,
    videoCalls: -1,
    messagesPerConversation: -1,
    aiQuestions: -1
  }
};

// XP rewards
export const XP_REWARDS = {
  daily_login: 10,
  profile_complete: 50,
  first_match: 25,
  first_message: 15,
  photo_upload: 10,
  safety_checkin_complete: 20,
  event_rsvp: 15,
  product_purchase: 30,
  referral: 100,
  streak_7_days: 70,
  streak_30_days: 300,
  subscription_start: 200,
  first_video_call: 50
};

// Level thresholds
export const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000,
  17000, 23000, 30000, 40000, 52000, 67000, 85000, 107000, 135000, 170000
];

// Achievement definitions
export const ACHIEVEMENTS = {
  FIRST_MATCH: { id: 'first_match', name: 'First Spark', xp: 50, icon: '⚡' },
  FIRST_MESSAGE: { id: 'first_message', name: 'Ice Breaker', xp: 25, icon: '💬' },
  PROFILE_PRO: { id: 'profile_pro', name: 'Profile Pro', xp: 100, icon: '⭐' },
  STREAK_7: { id: 'streak_7', name: 'Week Warrior', xp: 100, icon: '🔥' },
  STREAK_30: { id: 'streak_30', name: 'Monthly Legend', xp: 500, icon: '👑' },
  SOCIAL_BUTTERFLY: { id: 'social_butterfly', name: 'Social Butterfly', xp: 200, icon: '🦋' },
  SAFE_PLAYER: { id: 'safe_player', name: 'Safe Player', xp: 75, icon: '🛡️' },
  EVENT_GOER: { id: 'event_goer', name: 'Event Enthusiast', xp: 150, icon: '🎉' },
  NIGHT_OWL: { id: 'night_owl', name: 'Night Owl', xp: 50, icon: '🦉' },
  SUPPORTER: { id: 'supporter', name: 'Community Supporter', xp: 300, icon: '❤️' }
};

// Persona types
export const PERSONA_TYPES = {
  MAIN: { label: 'Main', color: '#FFFFFF', icon: 'User' },
  TRAVEL: { label: 'Travel', color: '#00D9FF', icon: 'Plane' },
  WEEKEND: { label: 'Weekend', color: '#C8962C', icon: 'PartyPopper' },
  CUSTOM: { label: 'Custom', color: '#C8962C', icon: 'Sparkles' }
};

// Content ratings
export const CONTENT_RATINGS = {
  sfw: { label: 'Safe for Work', color: '#39FF14', restricted: false },
  suggestive: { label: 'Suggestive', color: '#C8962C', restricted: false },
  nsfw: { label: 'NSFW', color: '#C8962C', restricted: true },
  xxx: { label: 'Explicit', color: '#C8962C', restricted: true, requires2257: true }
};

// Beacon tiers
export const BEACON_TIERS = {
  basic_3h: { name: 'Basic', hours: 3, price: 999, reach: 25, color: '#FFFFFF' },
  standard_6h: { name: 'Standard', hours: 6, price: 1999, reach: 50, color: '#00D9FF' },
  premium_9h: { name: 'Premium', hours: 9, price: 3999, reach: 100, color: '#C8962C' },
  featured_12h: { name: 'Featured', hours: 12, price: 7999, reach: 200, color: '#C8962C' },
  spotlight_24h: { name: 'Spotlight', hours: 24, price: 14999, reach: 500, color: '#C8962C' }
};

// Platform fee (creator economy)
export const PLATFORM_FEE_PERCENT = 20;

// Match score thresholds
export const MATCH_LEVELS = {
  exceptional: { min: 85, color: '#39FF14', label: 'Exceptional' },
  great: { min: 70, color: '#00D9FF', label: 'Great' },
  good: { min: 55, color: '#C8962C', label: 'Good' },
  moderate: { min: 40, color: '#C8962C', label: 'Moderate' },
  low: { min: 0, color: '#FFFFFF', label: 'Low' }
};

// Colors (brand)
export const COLORS = {
  primary: '#C8962C',
  secondary: '#C8962C',
  success: '#39FF14',
  warning: '#C8962C',
  info: '#00D9FF',
  danger: '#FF0000',
  background: '#000000',
  surface: '#111111',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.6)'
};
