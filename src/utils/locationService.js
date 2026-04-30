import { supabase } from '@/components/utils/supabaseClient';
import { safeGetViewerLatLng } from './geolocation';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.GOOGLE_MAPS_API_KEY;

/**
 * Reverse geocode coordinates to get a neighbourhood/area name using Google Maps API.
 */
export async function reverseGeocode(lat, lng) {
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'your_google_maps_key') {
    console.warn('[LocationService] Google Maps API key not configured.');
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      // Look for neighborhood, sublocality, or locality
      const result = data.results.find(r => 
        r.types.includes('neighborhood') || 
        r.types.includes('sublocality') || 
        r.types.includes('locality')
      ) || data.results[0];

      // Extract the short name of the specific area
      const areaComponent = result.address_components.find(c => 
        c.types.includes('neighborhood') || 
        c.types.includes('sublocality_level_1') || 
        c.types.includes('locality')
      );

      return areaComponent ? areaComponent.long_name : result.formatted_address.split(',')[0];
    }
  } catch (err) {
    console.error('[LocationService] Reverse geocode failed:', err);
  }
  return null;
}

/**
 * Update user location in DB (Part B)
 */
export async function syncLocation() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    // 1. Check consent from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('location_consent')
      .eq('id', session.user.id)
      .single();

    if (!profile?.location_consent) {
      console.log('[LocationService] No location consent. Skipping sync.');
      return null;
    }

    // 2. Get GPS coordinates
    const loc = await safeGetViewerLatLng();
    if (!loc) return null;

    const { lat, lng } = loc;

    // 3. Reverse Geocode (only if we need a fresh area name)
    // For now, we update it every time the app opens as requested.
    const areaName = await reverseGeocode(lat, lng);

    // 4. Update Database
    // profiles table
    await supabase.from('profiles').update({
      last_lat: lat,
      last_lng: lng,
      location: `POINT(${lng} ${lat})`,
      location_area: areaName,
      last_loc_ts: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', session.user.id);

    // user_presence table (Part B)
    await supabase.from('user_presence').upsert({
      user_id: session.user.id,
      location: `POINT(${lng} ${lat})`,
      last_seen_at: new Date().toISOString()
    }, { on_conflict: 'user_id' });

    console.log('[LocationService] Location synced:', { lat, lng, area: areaName });
    return { lat, lng, area: areaName };
  } catch (err) {
    console.error('[LocationService] Sync failed:', err);
    return null;
  }
}
