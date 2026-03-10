import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

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
 * - NEEDS_ONBOARDING: Authenticated but onboarding_complete = false
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
        await loadProfile(currentSession.user.id, currentSession.user.email);
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
        void loadProfile(newSession.user.id, newSession.user.email);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(bootTimeout);
      subscription?.unsubscribe();
    };
  }, []);

  // Load profile and determine boot state
  const loadProfile = async (userId, userEmail) => {
    setIsLoading(true);

    try {
      // Fetch profile - profiles table uses account_id to link to auth.users
      let { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // PGRST116 = no rows found
      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist - create it
        const localAge = getLocalAgeVerified();
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: userEmail || null,
            age_verified: localAge,
            onboarding_complete: false,
          })
          .select()
          .single();

        if (createError) {
          console.error('Profile create error:', createError);
          // Fall through to onboarding
          setBootState(localAge ? BOOT_STATES.NEEDS_ONBOARDING : BOOT_STATES.NEEDS_AGE);
          setIsLoading(false);
          return;
        }

        profileData = newProfile;
      } else if (error) {
        console.error('Profile fetch error:', error);
        // On error, use localStorage to decide boot state
        // Trust localStorage age verification even if DB fetch fails
        const localAge = getLocalAgeVerified();
        if (localAge) {
          // User verified age locally, let them through
          setBootState(BOOT_STATES.READY);
        } else {
          setBootState(BOOT_STATES.NEEDS_AGE);
        }
        setIsLoading(false);
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

      // Determine boot state from profile (trust localStorage as fallback)
      const localCommunity = getLocalCommunityAttested();
      if (!profileData?.age_verified) {
        setBootState(BOOT_STATES.NEEDS_AGE);
      } else if (!profileData?.onboarding_complete) {
        setBootState(BOOT_STATES.NEEDS_ONBOARDING);
      } else if (!profileData?.display_name?.trim()) {
        // CRITICAL: User completed onboarding but has no display_name
        // This catches legacy profiles created before display_name was enforced
        logBoot('Profile missing display_name, forcing onboarding');
        setBootState(BOOT_STATES.NEEDS_ONBOARDING);
      } else if (!profileData?.community_attested_at && !localCommunity) {
        setBootState(BOOT_STATES.NEEDS_COMMUNITY_GATE);
      } else {
        setBootState(BOOT_STATES.READY);
      }
    } catch (err) {
      console.error('Profile load error:', err);
      // On any error, trust localStorage - user experience over strictness
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
    // username OR display_name is set when onboarding_complete becomes true.
    // Coalesce username from display_name or email so the constraint is never
    // violated even on first-run rows that have neither field yet.
    const usernameSlug = (
      profile?.username ||
      profile?.display_name ||
      session.user.email?.split('@')[0] ||
      'user'
    ).toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 40);

    const { error } = await supabase
      .from('profiles')
      .update({
        onboarding_complete: true,
        // Ensure username is set — required by DB constraint.
        // Only overwrite if the field is currently empty.
        ...(profile?.username ? {} : { username: usernameSlug }),
      })
      .eq('id', session.user.id);

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
