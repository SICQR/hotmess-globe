import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Global user cache - prevents redundant API calls
 * Use this hook instead of fetching users in every component
 */
export function useAllUsers() {
  return useQuery({
    queryKey: ['all-users-global'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return [];
      return base44.entities.User.list();
    },
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
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
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return null;
      return base44.auth.me();
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
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
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000,
  });
}