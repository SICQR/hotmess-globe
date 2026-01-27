/**
 * Level-based feature unlock system
 * 
 * Features unlock at specific levels. This module provides utilities to:
 * - Check if a user has unlocked a feature
 * - Get all unlocks for a level
 * - Get the next unlock for a user
 */

// Default unlock definitions (fallback if DB unavailable)
export const DEFAULT_UNLOCKS = [
  { level: 3, feature_key: 'create_persona', feature_label: 'Create Secondary Persona', icon: '🎭' },
  { level: 3, feature_key: 'custom_status', feature_label: 'Custom Status', icon: '💬' },
  { level: 5, feature_key: 'profile_viewers', feature_label: 'See Profile Viewers', icon: '👁️' },
  { level: 5, feature_key: 'read_receipts', feature_label: 'Read Receipts', icon: '✓' },
  { level: 7, feature_key: 'discovery_priority', feature_label: 'Discovery Priority', icon: '⬆️' },
  { level: 7, feature_key: 'advanced_filters', feature_label: 'Advanced Filters', icon: '🔍' },
  { level: 10, feature_key: 'custom_badge_color', feature_label: 'Custom Badge Color', icon: '🎨' },
  { level: 10, feature_key: 'profile_themes', feature_label: 'Profile Themes', icon: '🖼️' },
  { level: 15, feature_key: 'create_private_events', feature_label: 'Create Private Events', icon: '🎉' },
  { level: 15, feature_key: 'event_co_host', feature_label: 'Event Co-Hosting', icon: '🤝' },
  { level: 20, feature_key: 'legend_badge', feature_label: 'Legend Badge', icon: '👑' },
  { level: 20, feature_key: 'unlimited_personas', feature_label: 'Unlimited Personas', icon: '♾️' },
];

// XP per level constant
export const XP_PER_LEVEL = 1000;

/**
 * Calculate user level from XP
 */
export const calculateLevel = (xp) => {
  return Math.floor((xp || 0) / XP_PER_LEVEL) + 1;
};

/**
 * Calculate XP needed for next level
 */
export const xpToNextLevel = (xp) => {
  const currentLevel = calculateLevel(xp);
  const xpForNextLevel = currentLevel * XP_PER_LEVEL;
  return xpForNextLevel - (xp || 0);
};

/**
 * Get progress percentage to next level
 */
export const levelProgress = (xp) => {
  const currentXp = xp || 0;
  const level = calculateLevel(currentXp);
  const xpIntoLevel = currentXp - ((level - 1) * XP_PER_LEVEL);
  return Math.min(100, Math.round((xpIntoLevel / XP_PER_LEVEL) * 100));
};

/**
 * Check if a feature is unlocked for a user
 */
export const isFeatureUnlocked = (userXp, featureKey, unlocks = DEFAULT_UNLOCKS) => {
  const userLevel = calculateLevel(userXp);
  const unlock = unlocks.find(u => u.feature_key === featureKey);
  if (!unlock) return true; // If not in unlock list, assume available
  return userLevel >= unlock.level;
};

/**
 * Get the level required to unlock a feature
 */
export const getLevelForFeature = (featureKey, unlocks = DEFAULT_UNLOCKS) => {
  const unlock = unlocks.find(u => u.feature_key === featureKey);
  return unlock?.level || null;
};

/**
 * Get all unlocked features for a user
 */
export const getUnlockedFeatures = (userXp, unlocks = DEFAULT_UNLOCKS) => {
  const userLevel = calculateLevel(userXp);
  return unlocks.filter(u => userLevel >= u.level);
};

/**
 * Get all locked features for a user
 */
export const getLockedFeatures = (userXp, unlocks = DEFAULT_UNLOCKS) => {
  const userLevel = calculateLevel(userXp);
  return unlocks.filter(u => userLevel < u.level);
};

/**
 * Get the next unlock for a user (closest locked feature)
 */
export const getNextUnlock = (userXp, unlocks = DEFAULT_UNLOCKS) => {
  const userLevel = calculateLevel(userXp);
  const locked = unlocks
    .filter(u => userLevel < u.level)
    .sort((a, b) => a.level - b.level);
  return locked[0] || null;
};

/**
 * Get all unlocks for a specific level
 */
export const getUnlocksForLevel = (level, unlocks = DEFAULT_UNLOCKS) => {
  return unlocks.filter(u => u.level === level);
};

/**
 * Get unique unlock levels
 */
export const getUnlockLevels = (unlocks = DEFAULT_UNLOCKS) => {
  return [...new Set(unlocks.map(u => u.level))].sort((a, b) => a - b);
};

/**
 * Hook-friendly: Get feature unlock status with requirements
 */
export const getFeatureStatus = (userXp, featureKey, unlocks = DEFAULT_UNLOCKS) => {
  const userLevel = calculateLevel(userXp);
  const unlock = unlocks.find(u => u.feature_key === featureKey);
  
  if (!unlock) {
    return { unlocked: true, level: 0, requiredLevel: null };
  }
  
  return {
    unlocked: userLevel >= unlock.level,
    level: userLevel,
    requiredLevel: unlock.level,
    xpNeeded: unlock.level > userLevel ? ((unlock.level - 1) * XP_PER_LEVEL) - (userXp || 0) : 0,
    feature: unlock,
  };
};
