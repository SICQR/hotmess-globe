import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Validate display_name — enforces mandatory rules
 * Rules:
 *  - Must be at least 2 characters (trimmed)
 *  - Cannot contain @ symbol (prevents email masquerading)
 *  - Cannot be empty or whitespace-only
 *
 * Returns: { isValid: boolean, error: string | null }
 */
export function validateDisplayName(name) {
  const trimmed = (name || '').trim();

  if (!trimmed) {
    return { isValid: false, error: 'Display name is required' };
  }

  if (trimmed.length < 2) {
    return { isValid: false, error: 'Display name must be at least 2 characters' };
  }

  if (trimmed.includes('@')) {
    return { isValid: false, error: 'Display name cannot contain @ symbol' };
  }

  return { isValid: true, error: null };
}

export const isIframe = window.self !== window.top;

/**
 * Derive a valid username slug from email, display_name, or a fallback.
 * The result satisfies the DB constraint: lowercase alphanum + underscore, max 40 chars.
 *
 * @param {Object} params
 * @param {string|null|undefined} params.username     - Existing username (preferred; will be normalized if set)
 * @param {string|null|undefined} params.displayName  - Display name fallback
 * @param {string|null|undefined} params.email        - Email fallback (local part used)
 * @returns {string}
 */
export function deriveUsernameSlug({ username, displayName } = {}) {
  const source = username || displayName || null;
  if (!source) {
    const rand = Math.random().toString(36).substring(2, 6);
    return `user_${rand}`;
  }
  return source
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .slice(0, 40);
}
