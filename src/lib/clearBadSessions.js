/**
 * Clear any cached Supabase sessions from wrong projects.
 * This fixes the issue where localStorage contains sessions from
 * axxwdjmbwkvqhcpwters (wrong) instead of klsywpvncqqglhnhrjbh (correct).
 */

import logger from '@/utils/logger';

const CORRECT_PROJECT_REF = 'klsywpvncqqglhnhrjbh';

export function clearBadSupabaseSessions() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  
  const keysToRemove = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    
    // Supabase stores auth in keys like: sb-{project-ref}-auth-token
    if (key.startsWith('sb-') && key.includes('-auth-token')) {
      // Check if it's NOT the correct project
      if (!key.includes(CORRECT_PROJECT_REF)) {
        keysToRemove.push(key);
        logger.debug('[clearBadSessions] Removing wrong project session:', key);
      }
    }
    
    // Also check for any other supabase.auth keys that might have wrong ref
    if (key.includes('supabase') && !key.includes(CORRECT_PROJECT_REF)) {
      const value = localStorage.getItem(key);
      // Check if the value contains a JWT from wrong project
      if (value && (
        value.includes('axxwdjmbwkvqhcpwters') ||
        value.includes('klbmalzhmxnelyuabawk')
      )) {
        keysToRemove.push(key);
        logger.debug('[clearBadSessions] Removing wrong project data:', key);
      }
    }
  }
  
  // Remove all bad keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    logger.debug('[clearBadSessions] Removed:', key);
  });
  
  if (keysToRemove.length > 0) {
    logger.info(`[clearBadSessions] Cleared ${keysToRemove.length} bad session(s)`);
  } else {
    logger.debug('[clearBadSessions] No bad sessions found');
  }
}

// Also export a function to check current session project
export function getCurrentSessionProject() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('sb-') && key.includes('-auth-token')) {
      // Extract project ref from key: sb-{ref}-auth-token
      const match = key.match(/^sb-([^-]+)-auth-token/);
      if (match) return match[1];
    }
  }
  return null;
}
