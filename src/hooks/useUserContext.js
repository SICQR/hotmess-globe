/**
 * useUserContext Hook
 * 
 * Provides centralized access to user state, tier, limits, and preferences.
 * Use throughout the app to check permissions, tiers, and user data.
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/components/utils/supabaseClient';

// Tier limits configuration
const TIER_LIMITS = {
  FREE: {
    messagesPerDay: 5,
    profileViewsPerDay: 20,
    rightNowDurationMax: 2, // hours
    photosMax: 6,
    canSeeWhoViewed: false,
    canUseAdvancedFilters: false,
    canGoStealth: false,
    xpMultiplier: 1,
    adFree: false
  },
  PREMIUM: {
    messagesPerDay: Infinity,
    profileViewsPerDay: Infinity,
    rightNowDurationMax: 4,
    photosMax: 12,
    canSeeWhoViewed: true,
    canUseAdvancedFilters: true,
    canGoStealth: false,
    xpMultiplier: 1.5,
    adFree: true
  },
  ELITE: {
    messagesPerDay: Infinity,
    profileViewsPerDay: Infinity,
    rightNowDurationMax: 6,
    photosMax: 20,
    canSeeWhoViewed: true,
    canUseAdvancedFilters: true,
    canGoStealth: true,
    xpMultiplier: 2,
    adFree: true,
    prioritySupport: true,
    verifiedBadge: true
  }
};

export function useUserContext() {
  const { session, user: authUser, loading: authLoading } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user data from User table
  useEffect(() => {
    async function fetchUserData() {
      if (!authUser?.email) {
        setUserData(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('User')
          .select(`
            id,
            email,
            username,
            display_name,
            bio,
            photos,
            subscription_tier,
            xp_balance,
            current_streak,
            level,
            city,
            interests,
            music_taste,
            tribes,
            looking_for,
            position,
            height,
            body_type,
            preferences,
            profile_type,
            is_verified,
            created_at,
            last_active
          `)
          .eq('email', authUser.email)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        setUserData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchUserData();
    }
  }, [authUser?.email, authLoading]);

  // Computed values
  const tier = userData?.subscription_tier || 'FREE';
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.FREE;

  const computed = useMemo(() => ({
    // User info
    user: userData,
    email: userData?.email || authUser?.email,
    displayName: userData?.display_name || userData?.username || 'Anonymous',
    
    // Tier & limits
    tier,
    limits,
    
    // XP & gamification
    xp: userData?.xp_balance || 0,
    level: userData?.level || 1,
    streak: userData?.current_streak || 0,
    xpMultiplier: limits.xpMultiplier,
    
    // Status flags
    isLoggedIn: !!authUser,
    isLoading: loading || authLoading,
    isPremium: tier === 'PREMIUM' || tier === 'ELITE',
    isElite: tier === 'ELITE',
    isVerified: userData?.is_verified || false,
    
    // Preferences
    preferences: userData?.preferences || {},
    city: userData?.city || 'London',
    
    // Profile data
    profile: {
      photos: userData?.photos || [],
      bio: userData?.bio || '',
      interests: userData?.interests || [],
      tribes: userData?.tribes || [],
      lookingFor: userData?.looking_for || [],
      musicTaste: userData?.music_taste || [],
      position: userData?.position,
      height: userData?.height,
      bodyType: userData?.body_type,
      profileType: userData?.profile_type || 'standard'
    },
    
    // Permissions
    canSeeWhoViewed: limits.canSeeWhoViewed,
    canUseAdvancedFilters: limits.canUseAdvancedFilters,
    canGoStealth: limits.canGoStealth,
    
    // Error state
    error
  }), [userData, authUser, tier, limits, loading, authLoading, error]);

  // Update user data function
  const updateUser = async (updates) => {
    if (!userData?.id) return { error: 'No user ID' };

    try {
      const { data, error: updateError } = await supabase
        .from('User')
        .update(updates)
        .eq('id', userData.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setUserData(data);
      return { data };
    } catch (err) {
      console.error('Error updating user:', err);
      return { error: err };
    }
  };

  // Refresh user data
  const refresh = async () => {
    if (!authUser?.email) return;
    
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('User')
        .select('*')
        .eq('email', authUser.email)
        .single();

      if (fetchError) throw fetchError;
      setUserData(data);
    } catch (err) {
      console.error('Error refreshing user:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    ...computed,
    updateUser,
    refresh,
    TIER_LIMITS
  };
}

export default useUserContext;
