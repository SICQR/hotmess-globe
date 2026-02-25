/**
 * Clear any cached Supabase sessions from stale/wrong projects.
 * Correct project: klsywpvncqqglhnhrjbh (active as of Feb 2026).
 */

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
        console.log('[clearBadSessions] Removing wrong project session:', key);
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
        console.log('[clearBadSessions] Removing wrong project data:', key);
      }
    }
  }
  
  // Remove all bad keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log('[clearBadSessions] Removed:', key);
  });
  
  if (keysToRemove.length > 0) {
    console.warn(`[clearBadSessions] Cleared ${keysToRemove.length} bad session(s)`);
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
