import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/components/utils/supabaseClient';

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
  READY: 'READY',
};

// Consistent localStorage key for age verification
const AGE_KEY = 'hm_age_confirmed_v1';

const getLocalAgeVerified = () => {
  try {
    return localStorage.getItem(AGE_KEY) === 'true';
  } catch {
    return false;
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
    let timeoutId = null;

    const initAuth = async () => {
      setIsLoading(true);
      setBootState(BOOT_STATES.LOADING);

      // If Supabase is not configured, immediately fall back to UNAUTHENTICATED
      if (!isSupabaseConfigured) {
        console.warn('[BootGuard] Supabase not configured - falling back to UNAUTHENTICATED state');
        if (mounted) {
          setSession(null);
          setProfile(null);
          setBootState(BOOT_STATES.UNAUTHENTICATED);
          setIsLoading(false);
        }
        return;
      }

      // Set a timeout to prevent infinite loading
      // If auth check takes more than 10 seconds, assume connection failed
      timeoutId = setTimeout(() => {
        if (mounted && bootState === BOOT_STATES.LOADING) {
          console.warn('[BootGuard] Auth initialization timeout - falling back to UNAUTHENTICATED');
          setSession(null);
          setProfile(null);
          setBootState(BOOT_STATES.UNAUTHENTICATED);
          setIsLoading(false);
        }
      }, 10000);

      try {
        // Get current session
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        // Clear timeout since we got a response
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (error || !currentSession?.user?.id) {
          // No session = UNAUTHENTICATED (this is valid, not an error)
          setSession(null);
          setProfile(null);
          setBootState(BOOT_STATES.UNAUTHENTICATED);
          setIsLoading(false);
          return;
        }

        setSession(currentSession);
        await loadProfile(currentSession.user.id);
      } catch (err) {
        console.error('Auth init error:', err);
        if (mounted) {
          // Clear timeout on error
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          setBootState(BOOT_STATES.UNAUTHENTICATED);
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      console.log('[BootGuard] Auth event:', event);

      if (event === 'SIGNED_OUT' || !newSession?.user?.id) {
        setSession(null);
        setProfile(null);
        setBootState(BOOT_STATES.UNAUTHENTICATED);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(newSession);
        await loadProfile(newSession.user.id);
      }
    });

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      subscription?.unsubscribe();
    };
  }, []);

  // Load profile and determine boot state
  const loadProfile = async (userId) => {
    setIsLoading(true);

    try {
      // Fetch profile
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
        // On error, use localStorage age to decide
        const localAge = getLocalAgeVerified();
        setBootState(localAge ? BOOT_STATES.NEEDS_ONBOARDING : BOOT_STATES.NEEDS_AGE);
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
        }
      }

      setProfile(profileData);

      // Determine boot state from profile
      if (!profileData?.age_verified) {
        setBootState(BOOT_STATES.NEEDS_AGE);
      } else if (!profileData?.onboarding_complete) {
        setBootState(BOOT_STATES.NEEDS_ONBOARDING);
      } else {
        setBootState(BOOT_STATES.READY);
      }
    } catch (err) {
      console.error('Profile load error:', err);
      const localAge = getLocalAgeVerified();
      setBootState(localAge ? BOOT_STATES.NEEDS_ONBOARDING : BOOT_STATES.NEEDS_AGE);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh profile
  const refetchProfile = useCallback(async () => {
    if (session?.user?.id) {
      await loadProfile(session.user.id);
    }
  }, [session?.user?.id]);

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

    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_complete: true })
      .eq('id', session.user.id);

    if (!error) {
      await refetchProfile();
      return true;
    }
    return false;
  }, [session?.user?.id, refetchProfile]);

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
