import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/components/utils/supabaseClient';

/**
 * Boot Guard Context
 * Enforces: age_verified + username + onboarding_complete before OS mounts
 * 
 * KEY: Age gate is stored in sessionStorage for unauthenticated users,
 * then synced to profile on first auth.
 */

const BootGuardContext = createContext(null);

// Check if age was verified in localStorage (pre-auth flow, persists across sessions)
const AGE_KEY = 'hm_age_confirmed_v1';

const getLocalAgeVerified = () => {
  try {
    return localStorage.getItem(AGE_KEY) === 'true';
  } catch {
    return false;
  }
};

export function BootGuardProvider({ children }) {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [bootState, setBootState] = useState('LOADING'); // LOADING | AGE_GATE | AUTH | USERNAME | ONBOARDING | OS

  // Fetch profile when user changes
  useEffect(() => {
    if (isLoadingAuth) return;
    
    if (!isAuthenticated || !user?.id) {
      setProfile(null);
      // Unauthenticated users: check localStorage for age verification
      const localAgeVerified = getLocalAgeVerified();
      if (!localAgeVerified) {
        setBootState('AGE_GATE');
      } else {
        // Age verified locally, need to auth next
        setBootState('AUTH');
      }
      setIsLoadingProfile(false);
      return;
    }

    fetchProfile(user.id);
  }, [user?.id, isAuthenticated, isLoadingAuth]);

  const fetchProfile = async (userId) => {
    setIsLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // PGRST116 = no rows found (profile doesn't exist yet)
      if (error && error.code !== 'PGRST116') {
        console.error('Profile fetch error:', error);
        // On error, check if we have localStorage age and allow through to onboarding
        const localAgeVerified = getLocalAgeVerified();
        if (localAgeVerified) {
          setBootState('ONBOARDING');
        } else {
          setBootState('AGE_GATE');
        }
        setIsLoadingProfile(false);
        return;
      }

      let profileData = data || null;
      
      // If no profile exists, create one
      if (!profileData) {
        const localAgeVerified = getLocalAgeVerified();
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({ 
            id: userId,
            age_verified: localAgeVerified,
            onboarding_complete: false 
          })
          .select()
          .single();
        
        if (createError) {
          console.error('Profile create error:', createError);
          // Still allow through to onboarding
          setBootState(localAgeVerified ? 'ONBOARDING' : 'AGE_GATE');
          setIsLoadingProfile(false);
          return;
        }
        profileData = newProfile;
      }
      
      // Sync localStorage age_verified to profile if needed
      const localAgeVerified = getLocalAgeVerified();
      if (profileData && !profileData.age_verified && localAgeVerified) {
        // User confirmed age before auth - sync to profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ age_verified: true })
          .eq('id', userId);
        
        if (!updateError) {
          profileData = { ...profileData, age_verified: true };
        }
      }

      setProfile(profileData);
      
      // Determine boot state
      if (!profileData.age_verified) {
        setBootState('AGE_GATE');
      } else if (!profileData.username) {
        setBootState('USERNAME');
      } else if (!profileData.onboarding_complete) {
        setBootState('ONBOARDING');
      } else {
        setBootState('OS');
      }
    } catch (err) {
      console.error('Profile fetch failed:', err);
      // On any error, allow through to onboarding if age verified
      const localAgeVerified = getLocalAgeVerified();
      setBootState(localAgeVerified ? 'ONBOARDING' : 'AGE_GATE');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const refetchProfile = useCallback(() => {
    if (user?.id) {
      fetchProfile(user.id);
    }
  }, [user?.id]);

  // Gate check helpers
  const canMountOS = bootState === 'OS';
  const canGoLive = profile?.can_go_live === true;
  const canSell = profile?.can_sell === true;
  const isAdmin = profile?.role_flags?.admin === true;
  const isVerified = profile?.is_verified === true;

  // Gate update functions
  const markAgeVerified = useCallback(async () => {
    if (!user?.id) return false;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ age_verified: true })
        .eq('id', user.id);
      
      if (!error) {
        refetchProfile();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [user?.id, refetchProfile]);

  const claimUsername = useCallback(async (username) => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };
    
    // Normalize username
    const normalized = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (normalized.length < 3 || normalized.length > 20) {
      return { success: false, error: 'Username must be 3-20 characters' };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: normalized })
        .eq('id', user.id);
      
      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'Username already taken' };
        }
        return { success: false, error: error.message };
      }
      
      refetchProfile();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [user?.id, refetchProfile]);

  const completeOnboarding = useCallback(async () => {
    if (!user?.id) return false;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_complete: true })
        .eq('id', user.id);
      
      if (!error) {
        refetchProfile();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [user?.id, refetchProfile]);

  const value = {
    // State
    profile,
    bootState,
    isLoading: isLoadingAuth || isLoadingProfile,
    
    // Gate checks
    canMountOS,
    canGoLive,
    canSell,
    isAdmin,
    isVerified,
    
    // Actions
    refetchProfile,
    markAgeVerified,
    claimUsername,
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
