import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { deriveUsernameSlug } from '@/lib/utils';

// Debug logging for boot process — only when VITE_BOOT_DEBUG=true
const logBoot = import.meta.env.VITE_BOOT_DEBUG === 'true'
  ? (msg, data) => console.log(`[BootGuard] ${msg}`, data || '')
  : () => {};

/**
 * Boot Guard Context - Clean Implementation
 * 
 * STATE MACHINE:
 * - LOADING: Initial state, checking auth
 * - UNAUTHENTICATED: No session (valid state, not error)
 * - NEEDS_AGE: Authenticated but age_verified = false
 * - NEEDS_ONBOARDING: Authenticated but onboarding_completed = false
 * - READY: All gates passed, mount OS
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

/** Keys that survive signout — user prefs that are not auth-scoped */
const PERSIST_KEYS = new Set([
  'hm_cookie_consent_v1',
  'hm_age_confirmed_v1',
  'hm_community_attested_v1',
]);

/** Clear all hm_* localStorage keys — used on signout so a fresh signup starts clean */
const clearHotmessStorage = () => {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('hm_') || k.startsWith('chat_read_') || k.startsWith('ghosted_'))) {
        if (!PERSIST_KEYS.has(k)) keys.push(k);
      }
    }
    keys.forEach(k => localStorage.removeItem(k));
    logBoot('Cleared localStorage keys:', keys.length);
  } catch {
    // localStorage unavailable
  }
};

// ── Optimistic local-session read (synchronous — no network, no flash) ──────
// Supabase stores the session token in localStorage under this key.
// We read it synchronously to set initial state before any network call.
const SESSION_KEY = 'sb-rfoftonnlwudilafhfkl-auth-token';

function readLocalSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.user?.id && parsed?.expires_at) {
      // Don't trust if expired more than 1 hour ago (refresh token will recover it)
      if (Date.now() > (parsed.expires_at * 1000) + 3_600_000) return null;
      return parsed;
    }
    return null;
  } catch { return null; }
}

/**
 * Write a session-presence hint to IndexedDB so Safari doesn't purge the
 * Supabase localStorage token when the app is backgrounded for >7 days.
 * Fire-and-forget — never blocks boot.
 */
function writeIDBHint() {
  try {
    const req = indexedDB.open('hm_v1', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('s')) {
        db.createObjectStore('s', { keyPath: 'k' });
      }
    };
    req.onsuccess = (e) => {
      const db = e.target.result;
      try {
        const tx = db.transaction('s', 'readwrite');
        tx.objectStore('s').put({ k: 'ts', v: Date.now() });
        tx.oncomplete = () => db.close();
      } catch { db.close(); }
    };
  } catch { /* IDB unavailable (private browsing) */ }
}

const BootGuardContext = createContext(null);

/**
 * Provides BootGuard context that manages authentication, profile-derived gating, and boot state for the application.
 *
 * Exposes state: `bootState`, `profile`, `session`, `isLoading`; computed flags: `isAuthenticated`, `canMountOS`, `canBrowse`; and actions: `refetchProfile`, `markAgeVerified`, `completeOnboarding`.
 * The provider controls route gating and application mount readiness based on Supabase auth state and profile flags (age verification, onboarding, community attestation).
 * @returns {JSX.Element} The BootGuardContext provider element containing the supplied children.
 */
export function BootGuardProvider({ children }) {
  // ── Optimistic initialisation: returning users start at READY synchronously ──
  // This eliminates the loading flash / LOADING state for the ~100% of returning
  // users. The background getSession() call below corrects stale tokens silently.
  const _localSession = readLocalSession();
  const [bootState, setBootState] = useState(_localSession ? BOOT_STATES.READY : BOOT_STATES.LOADING);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(_localSession ? { user: _localSession.user } : null);
  const [isLoading, setIsLoading] = useState(!_localSession);

  // Initialize and listen to auth changes
  useEffect(() => {
    let mounted = true;
    let bootTimeout = null;

    const initAuth = async () => {
      logBoot('initAuth started');
      // Only show loading if we DON'T have a local session (first-time user)
      if (!_localSession) {
        setIsLoading(true);
        setBootState(BOOT_STATES.LOADING);
      }

      // Safety net: 10-second timeout — never leave user on LOADING forever
      bootTimeout = setTimeout(() => {
        if (!mounted) return;
        console.error('[BootGuard] Boot timeout — stuck in LOADING for 10s, forcing recovery');
        const localAge = getLocalAgeVerified();
        setBootState(localAge ? BOOT_STATES.NEEDS_ONBOARDING : BOOT_STATES.UNAUTHENTICATED);
        setIsLoading(false);
      }, 10_000);

      try {
        // ONE network call — silently corrects if the cached token is stale
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
        await loadProfile(currentSession.user.id, currentSession.user.email);
        clearTimeout(bootTimeout);
      } catch (err) {
        console.error('Auth init error:', err);
        logBoot('Auth init error:', err);
        if (mounted) {
          // Don't regress a READY state on network error — keep showing OS
          if (bootState !== BOOT_STATES.READY) {
            setBootState(BOOT_STATES.UNAUTHENTICATED);
          }
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
        // Mark presence offline before clearing state (fire-and-forget)
        if (newSession?.user?.id) {
          void supabase.from('user_presence').upsert({
            user_id: newSession.user.id,
            status: 'offline',
            last_seen_at: new Date().toISOString(),
          }, { onConflict: 'user_id' }).then(null, () => {});
        }
        // Clear all hm_* localStorage keys so a new user doesn't inherit state
        clearHotmessStorage();
        setSession(null);
        setProfile(null);
        setBootState(BOOT_STATES.UNAUTHENTICATED);
        return;
      }

      // INITIAL_SESSION fires on every page load AND after email confirmation.
      // SIGNED_IN fires after login/signup. TOKEN_REFRESHED on session refresh.
      // All three require loadProfile to determine boot state.
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        setSession(newSession);
        // IDB hint: prevent Safari purging localStorage token when backgrounded
        if (event === 'SIGNED_IN') writeIDBHint();
        // Mark presence online (fire-and-forget — do NOT await)
        void supabase.from('user_presence').upsert({
          user_id: newSession.user.id,
          status: 'online',
          last_seen_at: new Date().toISOString(),
          metadata: {},
        }, { onConflict: 'user_id' }).then(null, () => {});
        // Do NOT await — see comment above re: Navigator Lock deadlock.
        void loadProfile(newSession.user.id, newSession.user.email);
      }
    });

    // Presence heartbeat — keeps user_presence.last_seen_at fresh (every 60s)
    const heartbeatInterval = setInterval(() => {
      if (!mounted) return;
      supabase.auth.getSession().then(({ data }) => {
        const uid = data?.session?.user?.id;
        if (!uid) return;
        void supabase.from('user_presence').upsert({
          user_id: uid,
          status: 'online',
          last_seen_at: new Date().toISOString(),
        }, { onConflict: 'user_id' }).then(null, () => {});
      }).then(null, () => {});
    }, 60_000);

    return () => {
      mounted = false;
      clearTimeout(bootTimeout);
      clearInterval(heartbeatInterval);
      subscription?.unsubscribe();
    };
  }, []);

  // Load profile and determine boot state
  const loadProfile = async (userId, userEmail) => {
    setIsLoading(true);

    // Safety timeout — loadProfile is also called from onAuthStateChange
    // which has NO outer timeout. Never leave user stuck at LOADING.
    const profileTimeout = setTimeout(() => {
      console.error('[BootGuard] loadProfile timeout — 8s, forcing NEEDS_ONBOARDING');
      const localAge = getLocalAgeVerified();
      setBootState(localAge ? BOOT_STATES.NEEDS_ONBOARDING : BOOT_STATES.NEEDS_AGE);
      setIsLoading(false);
    }, 8_000);

    try {
      // Fetch profile - profiles table uses id = auth.uid()
      let { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // PGRST116 = no rows found — NEW USER, skip straight to onboarding
      if (error && error.code === 'PGRST116') {
        logBoot('No profile row — new user, routing to onboarding immediately');
        setProfile(null);
        const localAge = getLocalAgeVerified();
        setBootState(localAge ? BOOT_STATES.NEEDS_ONBOARDING : BOOT_STATES.NEEDS_AGE);
        setIsLoading(false);
        clearTimeout(profileTimeout);
        return;
      } else if (error) {
        console.error('Profile fetch error:', error);
        // On error, use localStorage to decide boot state.
        // Trust localStorage age verification, but never skip onboarding —
        // we don't know whether onboarding completed if the DB is unreachable.
        const localAge = getLocalAgeVerified();
        if (localAge) {
          setBootState(BOOT_STATES.NEEDS_ONBOARDING);
        } else {
          setBootState(BOOT_STATES.NEEDS_AGE);
        }
        setIsLoading(false);
        clearTimeout(profileTimeout);
        return;
      }

      // Sync localStorage age to profile if needed
      const localAge = getLocalAgeVerified();
      
      if (profileData && !profileData.age_verified && localAge) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ age_verified: true })
          .eq('id', userId);

        if (!updateError) {
          profileData = { ...profileData, age_verified: true };
        } else {
          console.error('[BootGuard] Failed to sync age (RLS?):', updateError);
          // IMPORTANT: Even if DB update fails, trust localStorage 
          // The user DID verify their age, RLS might just be blocking
          profileData = { ...profileData, age_verified: true };
        }
      }

      // Final fallback: if localStorage says verified but profile doesn't, trust localStorage
      if (!profileData?.age_verified && localAge) {
        profileData = { ...profileData, age_verified: true };
      }

      setProfile(profileData);

      // Determine boot state from profile.
      //
      // RETURNING USER RULE: onboarding_completed === true is the ONLY gate.
      // Do NOT check display_name, onboarding_stage, or any other field.
      // Users who completed onboarding must never be forced back through it.
      const localCommunity = getLocalCommunityAttested();
      if (!profileData?.age_verified) {
        setBootState(BOOT_STATES.NEEDS_AGE);
      } else if (!profileData?.onboarding_completed) {
        // Community gate applies ONLY during onboarding (pre-completion).
        // Once onboarding_completed is true, user is always READY.
        if (!profileData?.community_attested_at && !localCommunity) {
          setBootState(BOOT_STATES.NEEDS_COMMUNITY_GATE);
        } else {
          setBootState(BOOT_STATES.NEEDS_ONBOARDING);
        }
      } else {
        // onboarding_completed === true → READY. Always. No display_name gate.
        // Community attestation is captured during onboarding step 7 —
        // if onboarding is marked complete, community was attested.
        setBootState(BOOT_STATES.READY);
      }
    } catch (err) {
      console.error('Profile load error:', err);
      // On any exception, trust localStorage age — but never skip onboarding.
      // We cannot know if onboarding completed if the DB threw, so route to
      // NEEDS_ONBOARDING (safe) rather than READY (dangerous bypass).
      const localAge = getLocalAgeVerified();
      if (localAge) {
        setBootState(BOOT_STATES.NEEDS_ONBOARDING);
      } else {
        setBootState(BOOT_STATES.NEEDS_AGE);
      }
    } finally {
      clearTimeout(profileTimeout);
      setIsLoading(false);
    }
  };

  // Refresh profile
  const refetchProfile = useCallback(async () => {
    if (session?.user?.id) {
      await loadProfile(session.user.id, session.user.email);
    }
  }, [session?.user?.id, session?.user?.email]);

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
    // username OR display_name is set when onboarding_completed becomes true.
    // Coalesce username from display_name or email so the constraint is never
    // violated even on first-run rows that have neither field yet.
    const usernameSlug = deriveUsernameSlug({
      username: profile?.username,
      displayName: profile?.display_name,
    });

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: session.user.id,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
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
    /** True when the user can browse the app shell (authenticated OR anonymous). */
    canBrowse: bootState === BOOT_STATES.READY || bootState === BOOT_STATES.UNAUTHENTICATED,

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
