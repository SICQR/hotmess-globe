export const FEATURE_FLAGS = {
  // XP purchasing (P2P / Base44 marketplace checkout) is now enabled.
  // Can be disabled via env var if needed: VITE_XP_PURCHASING_ENABLED=false
  xpPurchasingEnabled: String(import.meta.env.VITE_XP_PURCHASING_ENABLED || 'true').toLowerCase() !== 'false',
  
  // Premium content features
  premiumContentEnabled: String(import.meta.env.VITE_PREMIUM_CONTENT_ENABLED || 'true').toLowerCase() !== 'false',
  
  // Multi-profile personas feature flags
  // Enabled by default in development, set VITE_PERSONAS_ENABLED=false to disable
  personasEnabled: String(import.meta.env.VITE_PERSONAS_ENABLED ?? 'true').toLowerCase() !== 'false',
  secondaryProfilesInDiscoveryEnabled: String(import.meta.env.VITE_SECONDARY_PROFILES_IN_DISCOVERY ?? 'true').toLowerCase() !== 'false',
  personaBoundConversationsEnabled: String(import.meta.env.VITE_PERSONA_BOUND_CONVERSATIONS ?? 'true').toLowerCase() !== 'false',
  
  // Maximum secondary profiles (default 5, can be overridden)
  maxSecondaryProfiles: parseInt(import.meta.env.VITE_MAX_SECONDARY_PROFILES || '5', 10) || 5,
};

export const isXpPurchasingEnabled = () => FEATURE_FLAGS.xpPurchasingEnabled;
export const isPremiumContentEnabled = () => FEATURE_FLAGS.premiumContentEnabled;

// Personas feature flag helpers
export const isPersonasEnabled = () => FEATURE_FLAGS.personasEnabled;
export const isSecondaryProfilesInDiscoveryEnabled = () => FEATURE_FLAGS.secondaryProfilesInDiscoveryEnabled;
export const isPersonaBoundConversationsEnabled = () => FEATURE_FLAGS.personaBoundConversationsEnabled;
export const getMaxSecondaryProfiles = () => FEATURE_FLAGS.maxSecondaryProfiles;
