/**
 * Profiles Domain Layer
 * 
 * Centralizes all profile-related Supabase operations.
 * UI components must NOT call supabase.from() directly.
 */

import { supabase } from '@/components/utils/supabaseClient';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  is_visible?: boolean;
  is_online?: boolean;
  last_seen?: string;
  verified?: boolean;
  membership_tier?: string;
  preferences?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileFilters {
  isOnline?: boolean;
  isVisible?: boolean;
  nearLocation?: { lat: number; lng: number; radiusKm: number };
  limit?: number;
  offset?: number;
}

/**
 * Get current user's profile
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
    
  if (error) {
    console.error('[profiles] getCurrentProfile error:', error.message);
    return null;
  }
  
  return data;
}

/**
 * Get profile by ID
 */
export async function getProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) {
    console.error('[profiles] getProfileById error:', error.message);
    return null;
  }
  
  return data;
}

/**
 * Get profiles for grid display
 */
export async function getProfiles(filters: ProfileFilters = {}): Promise<Profile[]> {
  let query = supabase
    .from('profiles')
    .select('*')
    .eq('is_visible', true);
    
  if (filters.isOnline !== undefined) {
    query = query.eq('is_online', filters.isOnline);
  }
  
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
  }
  
  const { data, error } = await query.order('last_seen', { ascending: false });
  
  if (error) {
    console.error('[profiles] getProfiles error:', error.message);
    return [];
  }
  
  return data || [];
}

/**
 * Get nearby profiles for grid/globe
 */
export async function getNearbyProfiles(
  lat: number, 
  lng: number, 
  radiusKm: number = 50,
  limit: number = 100
): Promise<Profile[]> {
  // Use PostGIS function if available, otherwise fallback to basic query
  const { data, error } = await supabase
    .rpc('get_nearby_profiles', {
      user_lat: lat,
      user_lng: lng,
      radius_km: radiusKm,
      max_results: limit
    });
    
  if (error) {
    // Fallback to basic query if RPC not available
    console.warn('[profiles] getNearbyProfiles RPC failed, using fallback');
    return getProfiles({ limit, isVisible: true });
  }
  
  return data || [];
}

/**
 * Update current user's profile
 */
export async function updateProfile(updates: Partial<Profile>): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select()
    .single();
    
  if (error) {
    console.error('[profiles] updateProfile error:', error.message);
    return null;
  }
  
  return data;
}

/**
 * Update presence (online status + location)
 */
export async function updatePresence(
  isOnline: boolean, 
  location?: { lat: number; lng: number }
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const updates: Partial<Profile> = {
    is_online: isOnline,
    last_seen: new Date().toISOString(),
  };
  
  if (location) {
    updates.latitude = location.lat;
    updates.longitude = location.lng;
  }
  
  await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);
}

/**
 * Subscribe to profile changes (realtime)
 */
export function subscribeToProfile(
  profileId: string, 
  callback: (profile: Profile) => void
) {
  const channel = supabase
    .channel(`profile:${profileId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profileId}` },
      (payload) => callback(payload.new as Profile)
    )
    .subscribe();
    
  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to nearby profiles (realtime grid updates)
 */
export function subscribeToProfiles(callback: (profiles: Profile[]) => void) {
  const channel = supabase
    .channel('profiles:grid')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles' },
      async () => {
        // Refetch on any change
        const profiles = await getProfiles({ limit: 100 });
        callback(profiles);
      }
    )
    .subscribe();
    
  return () => {
    supabase.removeChannel(channel);
  };
}
