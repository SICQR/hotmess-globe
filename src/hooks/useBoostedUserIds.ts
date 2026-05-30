/**
 * useBoostedUserIds — Set of user_ids with an active profile_bump boost.
 *
 * Calls the public.boosted_profile_user_ids() RPC, which is SECURITY DEFINER
 * because RLS on user_active_boosts restricts cross-user reads. The RPC
 * returns only user_ids (no amounts, no expirations, no payment data) so it
 * remains Sacred-Invariant-safe: signals presence, not commerce.
 *
 * Refresh cadence: 60s (active profile_bump windows are 3h; a minute of
 * staleness in either direction is invisible).
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

const REFRESH_MS = 60_000;

export function useBoostedUserIds(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data, error } = await supabase.rpc('boosted_profile_user_ids');
        if (cancelled) return;
        if (error) {
          // Silent — boosted users are an enhancement, not a hard requirement.
          // Falling back to unsorted grid is acceptable.
          if (typeof console !== 'undefined') {
            console.warn('[useBoostedUserIds] RPC failed, skipping boost overlay:', error.message);
          }
          return;
        }
        const next = new Set<string>();
        if (Array.isArray(data)) {
          for (const row of data) {
            // RPC returns SETOF uuid → row is either { boosted_profile_user_ids: '<uuid>' } or '<uuid>'
            const id = typeof row === 'string'
              ? row
              : (row && typeof row === 'object' ? (row as Record<string, unknown>).boosted_profile_user_ids : null);
            if (typeof id === 'string' && id) next.add(id);
          }
        }
        setIds(next);
      } catch {
        // Network blip → keep last-known set; no UI degradation.
      }
    }

    void load();
    const interval = window.setInterval(() => { void load(); }, REFRESH_MS);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, []);

  return ids;
}
