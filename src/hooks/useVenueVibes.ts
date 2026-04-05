/**
 * useVenueVibes — live energy/intent layer for venues.
 *
 * Reads aggregated vibe mix from venue_vibe_mix VIEW.
 * Writes/updates user's live vibe to user_live_vibes TABLE.
 *
 * Vibes: RAW | HUNG | HIGH | LOOKING | CHILLING
 * These are live-state (4h expiry), not permanent identity.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';

export type Vibe = 'RAW' | 'HUNG' | 'HIGH' | 'LOOKING' | 'CHILLING';

export interface VibeMixEntry {
  place_slug: string;
  vibe: Vibe;
  count: number;
}

export interface VibeMix {
  total: number;
  vibes: Record<Vibe, number>;
  dominant: Vibe | null;
}

export const VIBE_CONFIG: Record<Vibe, { label: string; color: string; emoji: string }> = {
  RAW:      { label: 'Raw',      color: '#9B1B2A', emoji: '🔥' },
  HUNG:     { label: 'Hung',     color: '#C41230', emoji: '💪' },
  HIGH:     { label: 'High',     color: '#A899D8', emoji: '✨' },
  LOOKING:  { label: 'Looking',  color: '#FF5500', emoji: '👀' },
  CHILLING: { label: 'Chilling', color: '#00C2E0', emoji: '🧊' },
};

export const VIBES: Vibe[] = ['RAW', 'HUNG', 'HIGH', 'LOOKING', 'CHILLING'];

/**
 * Fetch aggregated vibe mix for a venue.
 */
export function useVenueVibeMix(placeSlug: string | null | undefined) {
  return useQuery<VibeMix>({
    queryKey: ['venue-vibe-mix', placeSlug],
    queryFn: async () => {
      if (!placeSlug) return { total: 0, vibes: emptyVibes(), dominant: null };

      const { data, error } = await supabase
        .from('venue_vibe_mix')
        .select('vibe, count')
        .eq('place_slug', placeSlug);

      if (error || !data || data.length === 0) {
        return { total: 0, vibes: emptyVibes(), dominant: null };
      }

      const vibes = emptyVibes();
      let total = 0;
      let maxCount = 0;
      let dominant: Vibe | null = null;

      for (const row of data as VibeMixEntry[]) {
        const v = row.vibe as Vibe;
        const c = Number(row.count) || 0;
        vibes[v] = c;
        total += c;
        if (c > maxCount) {
          maxCount = c;
          dominant = v;
        }
      }

      return { total, vibes, dominant };
    },
    enabled: !!placeSlug,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

/**
 * Fetch current user's active vibe (if any).
 */
export function useMyVibe() {
  return useQuery<{ vibe: Vibe; place_slug: string | null } | null>({
    queryKey: ['my-vibe'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return null;

      const { data, error } = await supabase
        .from('user_live_vibes')
        .select('vibe, place_slug, expires_at')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error || !data) return null;

      // Check expiry
      if (data.expires_at && new Date(data.expires_at) < new Date()) return null;

      return { vibe: data.vibe as Vibe, place_slug: data.place_slug };
    },
    staleTime: 30_000,
  });
}

/**
 * Set or update the current user's live vibe.
 */
export function useSetVibe() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      vibe,
      placeSlug,
      venueId,
      lat,
      lng,
    }: {
      vibe: Vibe;
      placeSlug?: string | null;
      venueId?: string | null;
      lat?: number | null;
      lng?: number | null;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('Not authenticated');

      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('user_live_vibes')
        .upsert({
          user_id: session.user.id,
          vibe,
          place_slug: placeSlug || null,
          venue_id: venueId || null,
          lat: lat || null,
          lng: lng || null,
          updated_at: new Date().toISOString(),
          expires_at: expiresAt,
        }, { onConflict: 'user_id' });

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['my-vibe'] });
      if (variables.placeSlug) {
        qc.invalidateQueries({ queryKey: ['venue-vibe-mix', variables.placeSlug] });
      }
    },
  });
}

function emptyVibes(): Record<Vibe, number> {
  return { RAW: 0, HUNG: 0, HIGH: 0, LOOKING: 0, CHILLING: 0 };
}
