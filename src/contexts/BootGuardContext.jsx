import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/components/utils/supabaseClient';

/**
 * Boot Guard Context
 * Enforces: age_verified + username + onboarding_complete before OS mounts
 */

const BootGuardContext = createContext(null);

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
      // When not authenticated, don't block with AGE_GATE - let them access public routes
      // The age gate is only enforced AFTER auth when profile.age_verified is false
      setBootState('OS'); // Allow routing, auth routes will handle login
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

      if (error && error.code !== 'PGRST116') {
        console.error('Profile fetch error:', error);
      }

      setProfile(data || null);
      
      // Determine boot state
      if (!data) {
        setBootState('AUTH');
      } else if (!data.age_verified) {
        setBootState('AGE_GATE');
      } else if (!data.username) {
        setBootState('USERNAME');
      } else if (!data.onboarding_complete) {
        setBootState('ONBOARDING');
      } else {
        setBootState('OS');
      }
    } catch (err) {
      console.error('Profile fetch failed:', err);
      setBootState('AUTH');
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
