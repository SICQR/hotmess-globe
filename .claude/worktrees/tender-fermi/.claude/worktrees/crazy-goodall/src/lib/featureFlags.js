export const FEATURE_FLAGS = {
  // XP purchasing (P2P / Base44 marketplace checkout) is not ready for users yet.
  // Default to coming soon unless explicitly enabled.
  xpPurchasingEnabled: String(import.meta.env.VITE_XP_PURCHASING_ENABLED || '').toLowerCase() === 'true',
  
  // Gamification system (XP, achievements, leaderboards, sweat coins) - COMING SOON
  // All gamification UI is hidden until this is enabled.
  gamificationEnabled: String(import.meta.env.VITE_GAMIFICATION_ENABLED || '').toLowerCase() === 'true',
};

export const isXpPurchasingEnabled = () => FEATURE_FLAGS.xpPurchasingEnabled;
export const isGamificationEnabled = () => FEATURE_FLAGS.gamificationEnabled;
