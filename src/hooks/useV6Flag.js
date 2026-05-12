/**
 * useV6Flag — resolves a v6 feature flag for the current session user.
 *
 * Returns the last-known cached value on first render (from localStorage),
 * falling back to false. Once the network resolves the real value, that
 * becomes authoritative and is cached for next session. This eliminates the
 * "flash of old UI before new" problem on flag-gated screens.
 *
 * Caches for 60s via React Query in-memory; busts on window focus.
 * Persists across sessions via localStorage (`hm_v6_flag_<key>_<userId>`).
 *
 * Usage:
 *   const showAAGlow = useV6Flag('v6_aa_system');
 *   if (!showAAGlow) return null;
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/components/utils/supabaseClient';
import { resolveFlag } from '@/lib/v6Flags';
import { useEffect } from 'react';
import { trackOnce } from '@/lib/analytics';

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

const LS_PREFIX = 'hm_v6_flag_';

function readCachedFlag(flagKey, userId) {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(`${LS_PREFIX}${flagKey}_${userId || 'anon'}`);
    return raw === 'true';
  } catch {
    return false;
  }
}
function writeCachedFlag(flagKey, userId, value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${LS_PREFIX}${flagKey}_${userId || 'anon'}`, value ? 'true' : 'false');
  } catch {
    /* quota / private mode — non-fatal */
  }
}

export function useV6Flag(flagKey) {
  const { user } = useAuth();
  const userId   = user?.id ?? null;

  const { data } = useQuery({
    queryKey:  ['v6-flag', flagKey, userId],
    queryFn:   async () => {
      if (!userId) return false;
      const role   = await fetchUserRole(userId);
      const resolved = await resolveFlag(flagKey, userId, role);
      writeCachedFlag(flagKey, userId, resolved);
      return resolved;
    },
    enabled:      !!userId,
    staleTime:    60_000,
    gcTime:       5 * 60_000,
    refetchOnWindowFocus: true,
    // Synchronous initial value from localStorage — prevents flag-loading flicker
    initialData:  () => readCachedFlag(flagKey, userId),
    initialDataUpdatedAt: 0, // mark as stale so a real fetch still runs
  });

  const flagValue = data ?? false;

  // Chunk 17c: fire flag_exposure once per session when flag resolves to true
  useEffect(() => {
    if (!flagValue || !userId) return;
    trackOnce(
      `flag_exposure:${flagKey}:${userId}`,
      'flag_exposure',
      'flags',
      flagKey,
      undefined,
      { flag_key: flagKey, user_id: userId },
    );
  }, [flagValue, flagKey, userId]);

  return flagValue;
}

export default useV6Flag;
