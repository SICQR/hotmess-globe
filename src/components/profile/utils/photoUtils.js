/**
 * Shared photo utilities for profile view components
 */

/**
 * Extract all photo URLs from a user object
 * Handles various photo field formats (avatar_url, avatarUrl, photos array, photo_urls, images)
 * @param {Object} user - User object with photo fields
 * @param {number} [maxPhotos=5] - Maximum number of photos to return
 * @returns {string[]} Array of unique photo URLs
 */
export function getUserPhotoUrls(user, maxPhotos = 5) {
  const urls = [];
  const push = (value) => {
    const url = typeof value === 'string' ? value.trim() : '';
    if (!url) return;
    if (urls.includes(url)) return;
    urls.push(url);
  };

  // Avatar URLs
  push(user?.avatar_url);
  push(user?.avatarUrl);

  // Photos array (can be strings or objects with url/file_url/href)
  const photos = Array.isArray(user?.photos) ? user.photos : [];
  for (const item of photos) {
    if (!item) continue;
    if (typeof item === 'string') push(item);
    else if (typeof item === 'object') push(item.url || item.file_url || item.href);
  }

  // Additional photo_urls array
  const more = Array.isArray(user?.photo_urls) ? user.photo_urls : [];
  for (const u of more) push(u);

  // Images array (can be strings or objects with url/src/file_url/href)
  const images = Array.isArray(user?.images) ? user.images : [];
  for (const img of images) {
    if (!img) continue;
    if (typeof img === 'string') push(img);
    else if (typeof img === 'object') push(img.url || img.src || img.file_url || img.href);
  }

  return urls.slice(0, maxPhotos);
}

/**
 * Check if a photo at a given index is marked as premium content
 * @param {Object} user - User object with photos array
 * @param {number} idx - Photo index to check
 * @returns {boolean} True if photo is premium
 */
export function isPremiumPhoto(user, idx) {
  const photos = Array.isArray(user?.photos) ? user.photos : [];
  const p = photos[idx];
  if (!p || typeof p !== 'object') return false;
  return !!(p.is_premium || p.isPremium || p.premium);
}

/**
 * Generate a fallback avatar URL using UI Avatars service
 * @param {string} name - Name to use for avatar initials
 * @returns {string} Fallback avatar URL
 */
export function getFallbackAvatarUrl(name) {
  const safeName = String(name || 'User');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(safeName)}&size=512&background=111111&color=ffffff`;
}
