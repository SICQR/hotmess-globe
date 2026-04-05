import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';

export interface PulsePlace {
  id: string;
  slug: string;
  name: string;
  type: 'city' | 'zone' | 'club' | 'curated';
  country: string | null;
  lat: number;
  lng: number;
  priority: number;
  parent_slug: string | null;
  is_active: boolean;
  notes: string | null;
}

/**
 * Fetches all active pulse_places for the globe cultural anchor layer.
 * Cached aggressively — this data rarely changes.
 */
export function usePulsePlaces() {
  return useQuery<PulsePlace[]>({
    queryKey: ['pulse-places'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pulse_places')
        .select('id, slug, name, type, country, lat, lng, priority, parent_slug, is_active, notes')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) {
        console.warn('[usePulsePlaces] query error:', error.message);
        return [];
      }
      return (data ?? []) as PulsePlace[];
    },
    staleTime: 5 * 60 * 1000, // 5 min — these are static anchors
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Split places by type for zoom-level visibility in the globe.
 */
export function usePulsePlacesByType() {
  const { data: places = [], ...rest } = usePulsePlaces();

  const cities   = places.filter(p => p.type === 'city');
  const zones    = places.filter(p => p.type === 'zone');
  const clubs    = places.filter(p => p.type === 'club');
  const curated  = places.filter(p => p.type === 'curated');

  return { cities, zones, clubs, curated, allPlaces: places, ...rest };
}
