/**
 * Safe Exit Utility
 *
 * Clears sensitive data without destroying auth tokens,
 * then redirects to a safe landing page.
 *
 * CRITICAL: Never use localStorage.clear() — it wipes auth
 * tokens and breaks the user's ability to get back in.
 */

import { hapticHeavy } from '@/lib/haptics';

/** Keys that contain sensitive user-visible data */
const SENSITIVE_KEYS = [
  'hm_ghosted_filters',
  'hm_chat_draft',
  'hm_right_now',
  'hm_location',
  'hm_last_viewed',
  'hm_beacon_draft',
  'hm_search_history',
  'hm.profileCardStyle',
  'hm_sos_seen',
];

/** Safe redirect URL — a safe HOTMESS page, not google.com */
const SAFE_EXIT_URL = 'https://hotmessldn.com/safe';

export function clearSensitiveData() {
  try {
    // Only remove sensitive keys, preserve auth tokens
    for (const key of SENSITIVE_KEYS) {
      localStorage.removeItem(key);
    }
    // Also remove any keys that start with hm_ (except auth)
    const allKeys = Object.keys(localStorage);
    for (const key of allKeys) {
      if (key.startsWith('hm_') || key.startsWith('hm.')) {
        localStorage.removeItem(key);
      }
    }
  } catch {}

  try {
    sessionStorage.clear();
  } catch {}
}

export function safeExit() {
  hapticHeavy();
  clearSensitiveData();
  window.location.replace(SAFE_EXIT_URL);
}

export default safeExit;
