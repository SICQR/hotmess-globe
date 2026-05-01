/**
 * useV6Flag — resolves a v6 feature flag for the current session user.
 *
 * Returns false while loading (safe default — no flash of unreleased UI).
 * Caches for 60s via React Query; busts on window focus.
 *
 * Usage:
 *   const showAAGlow = useV6Flag('v6_aa_system');
 *   if (!showAAGlow) return null;
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/components/utils/supabaseClient';
import { resolveFlag } from '@/lib/v6Flags';

// Fetch current user's role once (cached alongside flag resolution)
async function fetchUserRole(userId) {
  if (!userId) return 'user';
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  return data?.role ?? 'user';
}

export function useV6Flag(flagKey) {
  const { user } = useAuth();
  const userId   = user?.id ?? null;

  const { data } = useQuery({
    queryKey:  ['v6-flag', flagKey, userId],
    queryFn:   async () => {
      if (!userId) return false;
      const role   = await fetchUserRole(userId);
      return resolveFlag(flagKey, userId, role);
    },
    enabled:      !!userId,
    staleTime:    60_000,
    gcTime:       5 * 60_000,
    refetchOnWindowFocus: true,
  });

  return data ?? false;
}

export default useV6Flag;
