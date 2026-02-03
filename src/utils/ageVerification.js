/**
 * Age Verification Storage Utility
 * 
 * Unified storage for age verification state across the app.
 * Uses sessionStorage (clears when browser closes).
 */

const STORAGE_KEY = 'hm_age_verified';
const STORAGE_VALUE = '1';

/**
 * Check if user has been age verified this session
 */
export function isAgeVerified() {
  // Skip in dev mode for faster testing
  if (import.meta.env.DEV) return true;
  
  if (typeof window === 'undefined') return false;
  
  try {
    return sessionStorage.getItem(STORAGE_KEY) === STORAGE_VALUE;
  } catch {
    return false;
  }
}

/**
 * Mark user as age verified for this session
 */
export function setAgeVerified() {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.setItem(STORAGE_KEY, STORAGE_VALUE);
  } catch {
    // Storage may be disabled
  }
}

/**
 * Clear age verification (e.g., on logout)
 */
export function clearAgeVerification() {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage may be disabled
  }
}

// Also export for backwards compatibility with existing code
export const AGE_STORAGE_KEY = STORAGE_KEY;
export const AGE_STORAGE_VALUE = STORAGE_VALUE;
