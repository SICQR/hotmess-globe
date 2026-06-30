import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';

export type VenueTier = 'free' | 'standard' | 'pro' | 'community';

export interface PulsePlace {
  id: string;
  slug: string;
  name: string;
  type: 'city' | 'zone' | 'club' | 'curated' | 'recovery' | 'cruising_area';

  country: string | null;
  lat: number;
  lng: number;
  priority: number;
  parent_slug: string | null;
  is_active: boolean;
  notes: string | null;
  tier: VenueTier;
  event_active: boolean;
  subscription_status: 'active' | 'inactive' | 'trial';
  /** HOTMESS Beacon Identity category — picks the per-category Mapbox sprite.
   *  Distinct from `type` (constraint-restricted legacy bucket: club/zone/city/curated/recovery/cruising_area). */
  beacon_category: 'gym' | 'club' | 'sauna' | 'leather' | 'cafe' | 'clinic' | 'aftercare' | 'cruising' | 'market' | null;
  // Venue details (Phil 2026-05-27): surfaced on tap.
  address: string | null;
  opening_hours: Record<string, unknown> | null;
  website: string | null;
  phone: string | null;
  // Globe render gate (Brief 0 — relevance gate).
  globe_render_status: 'keep' | 'suppress' | 'review' | null;
  // Polygon + intelligence (cruising_area rows only).
  boundary_geojson: Record<string, unknown> | null;
  area_metadata: Record<string, unknown> | null;
  image_url: string | null;
}

/**
 * Fetches all active pulse_places for the globe cultural anchor layer.
 * Only returns globe_render_status='keep' rows (suppressed places never render).
 * Cached aggressively — this data rarely changes.
 */
export function usePulsePlaces() {
  return useQuery<PulsePlace[]>({
    queryKey: ['pulse-places'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pulse_places')
        .select('id, slug, name, type, country, lat, lng, priority, parent_slug, is_active, notes, tier, event_active, subscription_status, beacon_category, address, opening_hours, website, phone, globe_render_status, boundary_geojson, area_metadata, image_url')
        .eq('is_active', true)
        .neq('globe_render_status', 'suppress')
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

  const cities        = places.filter(p => p.type === 'city');
  const zones         = places.filter(p => p.type === 'zone');
  const clubs         = places.filter(p => p.type === 'club');
  const curated       = places.filter(p => p.type === 'curated');
  const recovery      = places.filter(p => p.type === 'recovery');
  const cruisingAreas = places.filter(p => p.type === 'cruising_area');

  return { cities, zones, clubs, curated, recovery, cruisingAreas, allPlaces: places, ...rest };
}
