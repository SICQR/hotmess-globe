import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { deriveUsernameSlug } from '@/lib/utils';

// Debug logging for boot process — only when VITE_BOOT_DEBUG=true
const logBoot = import.meta.env.VITE_BOOT_DEBUG === 'true'
  ? (msg, data) => console.log(`[BootGuard] ${msg}`, data || '')
  : () => {};

/**
 * Retry a Supabase query with exponential backoff.
 *
 * @param {() => Promise<{data: unknown, error: {code: string, message: string} | null}>} queryFn
 *   A zero-argument function that executes and returns a Supabase query result.
 * @param {number} [maxAttempts=3] Maximum number of attempts before returning the last error.
 * @param {number} [baseDelayMs=300] Base delay in ms; doubles on each retry (300, 600, …).
 * @returns {Promise<{data: unknown, error: unknown}>} The first successful result, or the
 *   result from the final attempt if all attempts fail.
 *
 * Only retries on non-PGRST116 errors (PGRST116 = "no rows found", not transient).
 */
async function fetchWithRetry(queryFn, maxAttempts = 3, baseDelayMs = 300) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await queryFn();
    // No error or expected not-found → return immediately
    if (!result.error || result.error.code === 'PGRST116') return result;
    // Last attempt — return whatever we have
    if (attempt === maxAttempts) return result;
    // Transient error — wait with exponential backoff before retrying
    const delay = baseDelayMs * 2 ** (attempt - 1);
    logBoot(`Supabase fetch error (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms`, result.error.message);
    await new Promise((r) => setTimeout(r, delay));
  }
  // This line is intentionally unreachable — the loop always returns on the final attempt.
  // The fallback satisfies TypeScript's control-flow analysis.
  /* c8 ignore next */
  return { data: null, error: { code: 'UNKNOWN', message: 'fetchWithRetry: loop exhausted' } };
}

/**
 * Boot Guard Context - Clean Implementation
 *
 * STATE MACHINE:
 * - LOADING:               Initial state, checking auth
 * - UNAUTHENTICATED:       No session (valid state, not error)
 * - NEEDS_AGE:             Authenticated but age_verified = false
 * - NEEDS_ONBOARDING:      Authenticated but onboarding_complete = false
 * - NEEDS_COMMUNITY_GATE:  Age + onboarding done, community_attested_at missing
 * - READY:                 All gates passed, mount OS
 *
 * ERROR PATH RULE: On transient DB errors, fall back to localStorage.
 *   - localAge + localCommunity → READY
 *   - localAge only             → NEEDS_COMMUNITY_GATE  (never bypass the community gate!)
 *   - neither                   → NEEDS_AGE
 *
 * KEY RULE: UNAUTHENTICATED users are allowed to access public routes.
 * Boot guard only enforces profile flags AFTER authentication.
 */

export const BOOT_STATES = {
  LOADING: 'LOADING',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  NEEDS_AGE: 'NEEDS_AGE',
  NEEDS_ONBOARDING: 'NEEDS_ONBOARDING',
  NEEDS_COMMUNITY_GATE: 'NEEDS_COMMUNITY_GATE',
  READY: 'READY',
};

// Consistent localStorage key for age verification
const AGE_KEY = 'hm_age_confirmed_v1';
const COMMUNITY_KEY = 'hm_community_attested_v1';

const getLocalAgeVerified = () => {
  try {
    const val = localStorage.getItem(AGE_KEY);
    // Handle various possible values: 'true', 'TRUE', '1', etc.
    return val === 'true' || val === '1' || val === 'TRUE';
  } catch {
    return false;
  }
};

const getLocalCommunityAttested = () => {
  try {
    const val = localStorage.getItem(COMMUNITY_KEY);
    return val === 'true' || val === '1' || val === 'TRUE';
  } catch {
    return false;
  }
};

/** Clear all hm_* localStorage keys — used on signout so a fresh signup starts clean */
const clearHotmessStorage = () => {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('hm_') || k.startsWith('chat_read_') || k.startsWith('ghosted_'))) {
        keys.push(k);
      }
    }
    keys.forEach(k => localStorage.removeItem(k));
    logBoot('Cleared localStorage keys:', keys.length);
  } catch {
    // localStorage unavailable
  }
};

const BootGuardContext = createContext(null);

export function BootGuardProvider({ children }) {
  const [bootState, setBootState] = useState(BOOT_STATES.LOADING);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ---------------------------------------------------------------------------
  // loadProfile — hoisted to useCallback so it is a stable reference.
  //
  // WHY useCallback([])?
  //   The function only closes over stable values:
  //     • useState setters (React guarantees stability across renders)
  //     • the `supabase` module singleton (module-level constant)
  //     • helper functions defined at module scope (fetchWithRetry, getLocal*)
  //   Passing [] as deps is therefore correct and avoids stale-closure bugs when
  //   this function is listed in the deps arrays of useEffect / refetchProfile.
  //
  // IMPORTANT: loadProfile must be defined BEFORE the useEffect that uses it.
  // Defining it after (as a plain async function) means the useEffect closure
  // captures a stale reference from the first render — a hooks ordering violation.
  // ---------------------------------------------------------------------------
  const loadProfile = useCallback(async (userId) => {
    setIsLoading(true);

    // Safety timeout — loadProfile is also called from onAuthStateChange
    // which has NO outer timeout. Never leave user stuck at LOADING.
    const profileTimeout = setTimeout(() => {
      console.error('[BootGuard] loadProfile timeout — 8s, forcing recovery');
      const localAge = getLocalAgeVerified();
      const localCommunity = getLocalCommunityAttested();
      if (localAge && localCommunity) {
        setBootState(BOOT_STATES.READY);
      } else if (localAge) {
        setBootState(BOOT_STATES.NEEDS_COMMUNITY_GATE);
      } else {
        setBootState(BOOT_STATES.NEEDS_AGE);
      }
      setIsLoading(false);
    }, 8_000);

    try {
      // Fetch profile with retry (handles transient Supabase connectivity blips)
      const { data: profileData, error } = await fetchWithRetry(() =>
        supabase.from('profiles').select('*').eq('id', userId).single(),
      );

      // PGRST116 = no rows found — NEW USER, skip straight to onboarding
      if (error && error.code === 'PGRST116') {
        logBoot('No profile row — new user, routing to onboarding immediately');
        setProfile(null);
        const localAge = getLocalAgeVerified();
        setBootState(localAge ? BOOT_STATES.NEEDS_ONBOARDING : BOOT_STATES.NEEDS_AGE);
        return;
      }

      if (error) {
        console.error('Profile fetch error (after retries):', error);
        // On error, fall back to localStorage — three-way check.
        // CRITICAL BUG FIX: the old code went to NEEDS_ONBOARDING (or even READY)
        // whenever localAge was set, silently bypassing NEEDS_COMMUNITY_GATE.
        //
        //   localAge + localCommunity → READY
        //   localAge only             → NEEDS_COMMUNITY_GATE  (community gate still required)
        //   neither                   → NEEDS_AGE
        const localAge = getLocalAgeVerified();
        const localCommunity = getLocalCommunityAttested();
        if (localAge && localCommunity) {
          setBootState(BOOT_STATES.READY);
        } else if (localAge) {
          setBootState(BOOT_STATES.NEEDS_COMMUNITY_GATE);
        } else {
          setBootState(BOOT_STATES.NEEDS_AGE);
        }
        return;
      }

      // Sync localStorage age to profile if needed (handles RLS race on first login)
      let row = profileData;
      const localAge = getLocalAgeVerified();
      if (row && !row.age_verified && localAge) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ age_verified: true })
          .eq('id', userId);

        if (!updateError) {
          row = { ...row, age_verified: true };
        } else {
          console.error('[BootGuard] Failed to sync age (RLS?):', updateError);
          // Trust localStorage — the user DID verify their age, RLS may just be blocking
          row = { ...row, age_verified: true };
        }
      }

      // Final fallback: localStorage wins over a stale DB value
      if (!row?.age_verified && localAge) {
        row = { ...row, age_verified: true };
      }

      setProfile(row);

      // Determine boot state from profile (trust localStorage as fallback)
      const localCommunity = getLocalCommunityAttested();
      if (!row?.age_verified) {
        setBootState(BOOT_STATES.NEEDS_AGE);
      } else if (!row?.onboarding_complete) {
        setBootState(BOOT_STATES.NEEDS_ONBOARDING);
      } else if (!row?.display_name?.trim()) {
        // CRITICAL: User completed onboarding but has no display_name
        // This catches legacy profiles created before display_name was enforced
        logBoot('Profile missing display_name, forcing onboarding');
        setBootState(BOOT_STATES.NEEDS_ONBOARDING);
      } else if (!row?.community_attested_at && !localCommunity) {
        setBootState(BOOT_STATES.NEEDS_COMMUNITY_GATE);
      } else {
        setBootState(BOOT_STATES.READY);
      }
    } catch (err) {
      console.error('Profile load error:', err);
      // On any exception, same three-way localStorage fallback as error path above.
      const localAge = getLocalAgeVerified();
      const localCommunity = getLocalCommunityAttested();
      if (localAge && localCommunity) {
        setBootState(BOOT_STATES.READY);
      } else if (localAge) {
        setBootState(BOOT_STATES.NEEDS_COMMUNITY_GATE);
      } else {
        setBootState(BOOT_STATES.NEEDS_AGE);
      }
    } finally {
      clearTimeout(profileTimeout);
      setIsLoading(false);
    }
  }, []); // stable — closes only over module-level constants and useState setters

  // Initialize and listen to auth changes
  useEffect(() => {
    let mounted = true;
    let bootTimeout = null;

    const initAuth = async () => {
      logBoot('initAuth started');
      setIsLoading(true);
      setBootState(BOOT_STATES.LOADING);

      // Safety net: 10-second timeout — never leave user on LOADING forever
      bootTimeout = setTimeout(() => {
        if (!mounted) return;
        console.error('[BootGuard] Boot timeout — stuck in LOADING for 10s, forcing recovery');
        const localAge = getLocalAgeVerified();
        setBootState(localAge ? BOOT_STATES.NEEDS_ONBOARDING : BOOT_STATES.UNAUTHENTICATED);
        setIsLoading(false);
      }, 10_000);

      try {
        // Get current session
        logBoot('Getting session...');
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        logBoot('Session result:', { hasSession: !!currentSession, error: error?.message });

        if (!mounted) return;

        if (error || !currentSession?.user?.id) {
          // No session = UNAUTHENTICATED (this is valid, not an error)
          logBoot('No session, setting UNAUTHENTICATED');
          setSession(null);
          setProfile(null);
          setBootState(BOOT_STATES.UNAUTHENTICATED);
          setIsLoading(false);
          clearTimeout(bootTimeout);
          return;
        }

        setSession(currentSession);
        await loadProfile(currentSession.user.id);
        clearTimeout(bootTimeout);
      } catch (err) {
        console.error('Auth init error:', err);
        logBoot('Auth init error:', err);
        if (mounted) {
          setBootState(BOOT_STATES.UNAUTHENTICATED);
          setIsLoading(false);
          clearTimeout(bootTimeout);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    //
    // IMPORTANT: This callback must NOT be async / must not await anything that
    // calls supabase.auth.getSession() — including loadProfile().
    //
    // Why: supabase-js v2 holds the Navigator Lock inside _initialize() while
    // calling _notifyAllSubscribers(), which awaits ALL subscriber callbacks via
    // Promise.all().  If we await loadProfile() here, loadProfile() calls
    // supabase.from().select() → _getAccessToken() → getSession() → tries to
    // acquire the SAME Navigator Lock → circular deadlock, app stuck at LOADING.
    //
    // Fix: fire loadProfile() without awaiting (void).  The callback returns
    // immediately, Promise.all resolves, _initialize() releases the lock, and
    // loadProfile() can then safely acquire it for its own getSession() call.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !newSession?.user?.id) {
        // Clear all hm_* localStorage keys so a new user doesn't inherit state
        clearHotmessStorage();
        setSession(null);
        setProfile(null);
        setBootState(BOOT_STATES.UNAUTHENTICATED);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(newSession);
        // Do NOT await — see comment above re: Navigator Lock deadlock.
        void loadProfile(newSession.user.id);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(bootTimeout);
      subscription?.unsubscribe();
    };
  }, [loadProfile]); // loadProfile is stable (useCallback([])) — no risk of effect re-runs

  // Refresh profile — stable because loadProfile is stable
  const refetchProfile = useCallback(async () => {
    if (session?.user?.id) {
      await loadProfile(session.user.id);
    }
  }, [session?.user?.id, loadProfile]);

  // Mark age verified (for authenticated users)
  const markAgeVerified = useCallback(async () => {
    // Always store locally
    try {
      localStorage.setItem(AGE_KEY, 'true');
    } catch {}

    // If authenticated, update profile
    if (session?.user?.id) {
      const { error } = await supabase
        .from('profiles')
        .update({ age_verified: true })
        .eq('id', session.user.id);

      if (!error) {
        await refetchProfile();
        return true;
      }
    }

    return true;
  }, [session?.user?.id, refetchProfile]);

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    if (!session?.user?.id) return false;

    // Build the update payload.
    // The profiles_onboarding_requires_identity constraint demands that either
    // username OR display_name is set when onboarding_complete becomes true.
    // Coalesce username from display_name or email so the constraint is never
    // violated even on first-run rows that have neither field yet.
    const usernameSlug = deriveUsernameSlug({
      username: profile?.username,
      displayName: profile?.display_name,
      email: session.user.email,
    });

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: session.user.id,
          onboarding_complete: true,
          // Ensure identity is set: DB constraint allows either username OR display_name.
          // Only derive and set username when BOTH are currently empty.
          ...(profile?.username || profile?.display_name ? {} : { username: usernameSlug }),
          // Preserve email in case the row is being created here
          email: session.user.email || undefined,
        },
        { onConflict: 'id' },
      );

    if (!error) {
      await refetchProfile();
      return true;
    }
    console.error('[BootGuard] completeOnboarding error:', error);
    return false;
  }, [session?.user?.id, session?.user?.email, profile?.username, profile?.display_name, refetchProfile]);

  const value = {
    // State
    bootState,
    profile,
    session,
    isLoading,

    // Computed
    isAuthenticated: !!session?.user?.id,
    canMountOS: bootState === BOOT_STATES.READY,

    // Actions
    refetchProfile,
    markAgeVerified,
    completeOnboarding,
  };

  return (
    <BootGuardContext.Provider value={value}>
      {children}
    </BootGuardContext.Provider>
  );
}

export function useBootGuard() {
  const context = useContext(BootGuardContext);
  if (!context) {
    throw new Error('useBootGuard must be used within a BootGuardProvider');
  }
  return context;
}

export default BootGuardProvider;
