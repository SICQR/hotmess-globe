/**
 * Application-wide constants
 * Centralizes magic numbers and configuration values
 */

// Query & Cache Configuration
export const QUERY_CONFIG = {
  USER_STALE_TIME: 5 * 60 * 1000, // 5 minutes
  USER_CACHE_TIME: 10 * 60 * 1000, // 10 minutes
  BEACON_STALE_TIME: 2 * 60 * 1000, // 2 minutes
  BEACON_CACHE_TIME: 5 * 60 * 1000, // 5 minutes
  REFETCH_INTERVAL_FAST: 5000, // 5 seconds
  REFETCH_INTERVAL_MEDIUM: 15000, // 15 seconds
  REFETCH_INTERVAL_SLOW: 60000, // 1 minute
};

// XP & Gamification
export const XP_CONFIG = {
  XP_PER_LEVEL: 1000,
  SCAN_XP_REWARD: 50,
  CHECK_IN_XP_REWARD: 100,
  PURCHASE_XP_MULTIPLIER: 0.1,
};

// Pagination
export const PAGINATION = {
  ITEMS_PER_PAGE: 12,
  FEED_ITEMS_PER_PAGE: 20,
  MESSAGES_PER_PAGE: 50,
};

// UI Configuration
export const UI_CONFIG = {
  TOAST_DURATION: 3000,
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 300,
};

// File Upload Limits
export const UPLOAD_LIMITS = {
  MAX_IMAGE_SIZE_MB: 10,
  MAX_VIDEO_SIZE_MB: 100,
  MAX_AUDIO_SIZE_MB: 50,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm'],
  ALLOWED_AUDIO_TYPES: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
};

// Membership Tiers
export const MEMBERSHIP_TIERS = {
  BASIC: 'basic',
  CHROME: 'chrome',
  PLATINUM: 'platinum',
};

// Chrome Tier Requirements
export const CHROME_REQUIREMENTS = {
  MIN_LEVEL: 5,
  PROFILE_VIEWERS_UNLOCK: 5,
};

// Right Now Durations (in minutes)
export const RIGHT_NOW_DURATIONS = {
  SHORT: 30,
  MEDIUM: 60,
  LONG: 120,
  TONIGHT: 480, // 8 hours
};

// Status Values
export const USER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  AT_EVENT: 'at_event',
  AWAY: 'away',
};

// Beacon Types
export const BEACON_TYPES = {
  EVENT: 'event',
  VENUE: 'venue',
  HOOKUP: 'hookup',
  DROP: 'drop',
  POPUP: 'popup',
  PRIVATE: 'private',
};

// Product Status
export const PRODUCT_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  SOLD_OUT: 'sold_out',
  ARCHIVED: 'archived',
};

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  ESCROW: 'escrow',
  AWAITING_PICKUP: 'awaiting_pickup',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
};