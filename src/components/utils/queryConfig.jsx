import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) return [];
        return base44.entities.User.list();
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
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) return null;
        return base44.auth.me();
      } catch (error) {
        console.error('Failed to fetch current user:', error);
        return null;
      }
    },
    staleTime: QUERY_CONFIG.USER_STALE_TIME,
    cacheTime: QUERY_CONFIG.USER_CACHE_TIME,
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
    queryFn: () => base44.entities.Beacon.list(),
    staleTime: QUERY_CONFIG.BEACON_STALE_TIME,
    cacheTime: QUERY_CONFIG.BEACON_CACHE_TIME,
  });
}