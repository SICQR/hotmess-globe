/**
 * useGlowUserIds — Set of user_ids whose beacons should render with an
 * amplified atmospheric aura on the globe (globe_glow boost).
 *
 * Same RPC pattern as useBoostedUserIds. RLS on user_active_boosts blocks
 * cross-user reads (correct for purchase privacy), so the live signal goes
 * through public.globe_glow_user_ids() SECURITY DEFINER — exposes only
 * user_ids, no commerce metadata.
 *
 * Doctrine (Phil 2026-05-27, restraint clauses):
 *   - Atmospheric amplification, NOT billboard.
 *   - Failure is silent — glow is an enhancement, never required.
 *   - Refresh cadence is generous (60s) — boost windows are hours-scale.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

const REFRESH_MS = 60_000;

export function useGlowUserIds(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data, error } = await supabase.rpc('globe_glow_user_ids');
        if (cancelled) return;
        if (error) {
          if (typeof console !== 'undefined') {
            console.warn('[useGlowUserIds] RPC failed, glow disabled this tick:', error.message);
          }
          return;
        }
        const next = new Set<string>();
        if (Array.isArray(data)) {
          for (const row of data) {
            const id = typeof row === 'string'
              ? row
              : (row && typeof row === 'object' ? (row as Record<string, unknown>).globe_glow_user_ids : null);
            if (typeof id === 'string' && id) next.add(id);
          }
        }
        setIds(next);
      } catch {
        // Network blip → keep last-known; silent fallback.
      }
    }

    void load();
    const interval = window.setInterval(() => { void load(); }, REFRESH_MS);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, []);

  return ids;
}
