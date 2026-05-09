import { supabase } from '@/components/utils/supabaseClient';
import { safeGetViewerLatLng } from './geolocation';

/**
 * Reverse geocode coordinates to get a neighbourhood / area name.
 *
 * 2026-05-09: moved from a direct browser fetch to maps.googleapis.com
 * over to the /api/geocode/reverse server-side proxy. Google rejects
 * referer-restricted keys on the Geocoding REST API when called from
 * the browser; the proxy uses GOOGLE_MAPS_API_KEY (server-side env) so
 * the key is never exposed and no Referer header is required.
 */
export async function reverseGeocode(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  try {
    const r = await fetch('/api/geocode/reverse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (data?.error === 'GOOGLE_MAPS_API_KEY not configured') {
        console.warn('[LocationService] Google Maps server-side key not set; skipping reverse geocode.');
      } else {
        console.warn('[LocationService] Reverse geocode proxy error:', data?.error || r.status);
      }
      return null;
    }
    return data?.area || null;
  } catch (err) {
    console.warn('[LocationService] Reverse geocode failed:', err?.message || err);
    return null;
  }
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
