import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

export interface PlaceIntensity {
  slug: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  checkins_30m: number;
  checkins_1h: number;
  checkins_4h: number;
  effective_count: number;
  intensity_level: number; // 0-5
  momentum: number; // check-ins in last 10min
  last_checkin_at: string | null;
}

/**
 * 5-level intensity states for venue nodes.
 *
 * Level 0 — EMPTY:     0 check-ins, dim, no pulse
 * Level 1 — PRESENCE:  1-3 effective, small pulse (3s)
 * Level 2 — EARLY:     4-9 effective, faster pulse (2s), shimmer
 * Level 3 — ACTIVE:    10-24 effective, strong pulse (1.4s), ripple
 * Level 4 — HOT:       25-60 effective, fast pulse (1.1s), heat bloom
 * Level 5 — PEAK:      60+ effective, intense glow, layered pulses
 */
export const INTENSITY_VISUALS = {
  0: { label: 'Quiet',    pulseSpeed: 0,    glowMultiplier: 0.3, sizeMultiplier: 1.0, color: 0x333333, heatColor: null },
  1: { label: 'Someone here', pulseSpeed: 0.33, glowMultiplier: 0.5, sizeMultiplier: 1.1, color: 0x666666, heatColor: null },
  2: { label: 'Starting', pulseSpeed: 0.5,  glowMultiplier: 0.7, sizeMultiplier: 1.2, color: 0xBBBBBB, heatColor: null },
  3: { label: 'Active',   pulseSpeed: 0.71, glowMultiplier: 1.0, sizeMultiplier: 1.4, color: 0xFFFFFF, heatColor: 0xFF8800 },
  4: { label: 'Hot',      pulseSpeed: 0.91, glowMultiplier: 1.4, sizeMultiplier: 1.7, color: 0xFFCC44, heatColor: 0xFF6600 },
  5: { label: 'Peak',     pulseSpeed: 1.11, glowMultiplier: 1.8, sizeMultiplier: 2.0, color: 0xC8962C, heatColor: 0xFF4400 },
} as const;

/**
 * Conversion hook labels — maps intensity + momentum to live copy.
 */
export function getConversionLabel(intensity: PlaceIntensity): string | null {
  if (intensity.intensity_level >= 4 && intensity.momentum >= 3) return 'PEAKING RIGHT NOW';
  if (intensity.intensity_level >= 4) return 'HOT TONIGHT';
  if (intensity.intensity_level >= 3 && intensity.momentum >= 2) return 'BUILDING FAST';
  if (intensity.intensity_level >= 3) return 'IT\'S HAPPENING';
  if (intensity.intensity_level >= 2 && intensity.momentum >= 1) return 'STARTING UP';
  if (intensity.intensity_level >= 1) return 'SOMEONE\'S HERE';
  return null;
}

/**
 * Momentum label — shows recent arrival rate.
 */
export function getMomentumLabel(intensity: PlaceIntensity): string | null {
  if (intensity.momentum >= 5) return `+${intensity.momentum} in last 10 min`;
  if (intensity.momentum >= 2) return `+${intensity.momentum} just arrived`;
  if (intensity.momentum === 1) return '+1 just walked in';
  return null;
}

/**
 * Fetches time-weighted intensity for all venues/curated places.
 * Polled every 30s + realtime subscription on venue_checkins.
 */
export function useVenueIntensity() {
  const queryClient = useQueryClient();

  const query = useQuery<PlaceIntensity[]>({
    queryKey: ['place-intensity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('place_intensity')
        .select('*');

      if (error) {
        console.warn('[useVenueIntensity] query error:', error.message);
        return [];
      }
      return (data ?? []) as PlaceIntensity[];
    },
    refetchInterval: 30_000, // 30s poll
    staleTime: 15_000,
  });

  // Realtime: any venue_checkins INSERT → refetch intensity
  useEffect(() => {
    const channel = supabase
      .channel('venue-checkins-intensity')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'venue_checkins' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['place-intensity'] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Build a Map for O(1) lookup by slug
  const intensityMap = new Map<string, PlaceIntensity>();
  (query.data ?? []).forEach(p => intensityMap.set(p.slug, p));

  return { intensityMap, data: query.data ?? [], isLoading: query.isLoading };
}
