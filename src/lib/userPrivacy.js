/**
 * User Privacy Utilities
 * 
 * CRITICAL: Ensures user emails are NEVER exposed to other users.
 * All profile URLs should use user ID, not email.
 * Display names should be used instead of emails in UI.
 */

// =============================================================================
// SAFE PROFILE DATA - Strips sensitive fields before sending to UI
// =============================================================================

/**
 * Fields that should NEVER be exposed to other users
 */
const PRIVATE_FIELDS = [
  'email',
  'stripe_customer_id',
  'telegram_id',
  'phone_number',
  'password_hash',
  'mfa_secret',
  'mfa_backup_codes',
  'ip_address',
  'device_id',
  'auth_provider_tokens',
];

/**
 * Fields only the user themselves can see
 */
const SELF_ONLY_FIELDS = [
  'notification_preferences',
  'privacy_settings',
  'blocked_users',
  'payment_methods',
  'earnings',
  'payout_details',
];

/**
 * Strip private fields from a user object before displaying to others
 * @param {Object} user - Raw user object
 * @param {boolean} isSelf - Whether this is the user viewing their own profile
 * @returns {Object} Safe user object
 */
export function getSafeUserData(user, isSelf = false) {
  if (!user) return null;
  
  const safeUser = { ...user };
  
  // Always remove private fields
  PRIVATE_FIELDS.forEach(field => {
    delete safeUser[field];
  });
  
  // Remove self-only fields if viewing another user
  if (!isSelf) {
    SELF_ONLY_FIELDS.forEach(field => {
      delete safeUser[field];
    });
  }
  
  return safeUser;
}

/**
 * Strip private fields from an array of users
 */
export function getSafeUserList(users) {
  if (!Array.isArray(users)) return [];
  return users.map(user => getSafeUserData(user, false));
}

// =============================================================================
// DISPLAY NAME UTILITIES
// =============================================================================

/**
 * Get the display name for a user, falling back appropriately
 * NEVER returns email
 */
export function getDisplayName(user) {
  if (!user) return 'Anonymous';
  
  // Priority order: display_name > username > full_name > 'Anonymous User'
  if (user.display_name) return user.display_name;
  if (user.username) return `@${user.username}`;
  if (user.full_name) return user.full_name;
  
  // Fallback - generate from user ID if available
  if (user.id) {
    return `User ${String(user.id).slice(0, 8)}`;
  }
  
  return 'Anonymous User';
}

/**
 * Get username (without @) or generate one
 */
export function getUsername(user) {
  if (!user) return null;
  
  if (user.username) return user.username;
  
  // Generate a username from display_name or full_name
  const baseName = user.display_name || user.full_name;
  if (baseName) {
    return baseName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 20);
  }
  
  // Last resort - use part of user ID
  if (user.id) {
    return `user_${String(user.id).slice(0, 8)}`;
  }
  
  return null;
}

// =============================================================================
// PROFILE URL UTILITIES - Use IDs, not emails
// =============================================================================

/**
 * Generate a safe profile URL using user ID
 * @param {Object} user - User object
 * @returns {string} Profile URL
 */
export function getProfileUrl(user) {
  if (!user) return '/Profile';
  
  // Prefer auth_user_id, then id
  const userId = user.auth_user_id || user.authUserId || user.id;
  
  if (userId) {
    return `/social/u/${encodeURIComponent(userId)}`;
  }
  
  // Fallback to username if available
  if (user.username) {
    return `/u/${encodeURIComponent(user.username)}`;
  }
  
  return '/Profile';
}

/**
 * Generate a safe message URL using user ID
 */
export function getMessageUrl(user, draft = '') {
  if (!user) return '/social/inbox';
  
  const userId = user.auth_user_id || user.authUserId || user.id;
  
  if (userId) {
    const url = `/social/inbox?to=${encodeURIComponent(userId)}`;
    return draft ? `${url}&draft=${encodeURIComponent(draft)}` : url;
  }
  
  return '/social/inbox';
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Check if a user has completed their profile setup
 * (required fields: display_name or username)
 */
export function hasCompletedProfileSetup(user) {
  if (!user) return false;
  
  // Must have at least a display name or username
  return !!(user.display_name || user.username);
}

/**
 * Validate a username
 */
export function validateUsername(username) {
  if (!username) {
    return { valid: false, error: 'Username is required' };
  }
  
  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (username.length > 30) {
    return { valid: false, error: 'Username must be 30 characters or less' };
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }
  
  if (/^[0-9]/.test(username)) {
    return { valid: false, error: 'Username cannot start with a number' };
  }
  
  // Reserved usernames
  const reserved = ['admin', 'hotmess', 'support', 'help', 'system', 'mod', 'moderator'];
  if (reserved.includes(username.toLowerCase())) {
    return { valid: false, error: 'This username is reserved' };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate a display name
 */
export function validateDisplayName(displayName) {
  if (!displayName) {
    return { valid: false, error: 'Display name is required' };
  }
  
  if (displayName.length < 2) {
    return { valid: false, error: 'Display name must be at least 2 characters' };
  }
  
  if (displayName.length > 50) {
    return { valid: false, error: 'Display name must be 50 characters or less' };
  }
  
  // No emails allowed
  if (displayName.includes('@') && displayName.includes('.')) {
    return { valid: false, error: 'Display name cannot be an email address' };
  }
  
  return { valid: true, error: null };
}

// =============================================================================
// TELEGRAM INTEGRATION
// =============================================================================

/**
 * Format Telegram username for display
 */
export function formatTelegramUsername(username) {
  if (!username) return null;
  
  // Remove @ if present and add it back consistently
  const clean = username.replace(/^@/, '');
  return `@${clean}`;
}

/**
 * Get Telegram profile URL
 */
export function getTelegramUrl(username) {
  if (!username) return null;
  
  const clean = username.replace(/^@/, '');
  return `https://t.me/${clean}`;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  getSafeUserData,
  getSafeUserList,
  getDisplayName,
  getUsername,
  getProfileUrl,
  getMessageUrl,
  hasCompletedProfileSetup,
  validateUsername,
  validateDisplayName,
  formatTelegramUsername,
  getTelegramUrl,
  PRIVATE_FIELDS,
};
