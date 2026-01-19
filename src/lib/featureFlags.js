export const FEATURE_FLAGS = {
  // XP purchasing (P2P / Base44 marketplace checkout) is not ready for users yet.
  // Default to coming soon unless explicitly enabled.
  xpPurchasingEnabled: String(import.meta.env.VITE_XP_PURCHASING_ENABLED || '').toLowerCase() === 'true',
};

export const isXpPurchasingEnabled = () => FEATURE_FLAGS.xpPurchasingEnabled;
