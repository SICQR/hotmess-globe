/**
 * User Display Utilities
 * 
 * Standardized helpers for displaying user names and usernames
 * Priority: display_name > full_name > username > email prefix > "Anonymous"
 */

/**
 * Get the best display name for a user
 * @param {Object} user - User object
 * @returns {string} Display name
 */
export function getDisplayName(user) {
  if (!user) return 'Anonymous';
  return (
    user.display_name ||
    user.full_name ||
    user.profileName ||
    (user.username ? `@${user.username}` : null) ||
    user.email?.split('@')[0] ||
    'Anonymous'
  );
}

/**
 * Get the username with @ prefix
 * @param {Object} user - User object
 * @returns {string|null} Username with @ or null
 */
export function getUsername(user) {
  if (!user?.username) return null;
  const username = user.username.replace(/^@/, '');
  return `@${username}`;
}

/**
 * Get initials from name
 * @param {string} name - Full name
 * @returns {string} Initials (2 chars)
 */
export function getInitials(name) {
  if (!name) return 'HM';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'HM';
  const first = parts[0][0]?.toUpperCase() || 'H';
  const last = parts.length > 1 ? parts[parts.length - 1][0]?.toUpperCase() : 'M';
  return `${first}${last}`;
}

/**
 * Get avatar URL or fallback
 * @param {Object} user - User object
 * @returns {string} Avatar URL or placeholder
 */
export function getAvatarUrl(user) {
  if (user?.avatar_url) return user.avatar_url;
  if (user?.photoUrl) return user.photoUrl;
  
  // Generate placeholder
  const name = getDisplayName(user);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200&background=111111&color=ffffff&bold=true`;
}

/**
 * Format user for display (common pattern)
 * @param {Object} user - User object
 * @returns {Object} { name, username, avatar, initials }
 */
export function formatUserForDisplay(user) {
  return {
    name: getDisplayName(user),
    username: getUsername(user),
    avatar: getAvatarUrl(user),
    initials: getInitials(user?.display_name || user?.full_name || user?.username)
  };
}
