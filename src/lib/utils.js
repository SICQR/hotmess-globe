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
