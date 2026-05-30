import { supabase } from '@/components/utils/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { QUERY_CONFIG } from './constants';

/**
 * Global user cache - prevents redundant API calls
 * Use this hook instead of fetching users in every component
 */
export function useAllUsers() {
  return useQuery({
    queryKey: ['all-users-global'],
    queryFn: async () => {
      try {
        const isAuth = await supabase.auth.getSession().then(r => !!r.data.session);
        if (!isAuth) return [];
        const { data } = await supabase.from('profiles').select('*');
        return data || [];
      } catch (error) {
        console.error('Failed to fetch users:', error);
        return [];
      }
    },
    staleTime: QUERY_CONFIG.USER_STALE_TIME,
    cacheTime: QUERY_CONFIG.USER_CACHE_TIME,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/**
 * Get current authenticated user
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        let { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        return { ...user, ...(profile || {}), auth_user_id: user.id, email: user.email || profile?.email };
      } catch (error) {
        console.error('Failed to fetch current user:', error);
        return null;
      }
    },
    staleTime: 0,
    cacheTime: 0,
    retry: false,
    enabled: true,
  });
}

/**
 * Global beacons cache
 */
export function useAllBeacons() {
  return useQuery({
    queryKey: ['all-beacons-global'],
    queryFn: () => supabase.from('beacons').select('*'),
    staleTime: QUERY_CONFIG.BEACON_STALE_TIME,
    cacheTime: QUERY_CONFIG.BEACON_CACHE_TIME,
  });
}
