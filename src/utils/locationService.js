import { supabase } from '@/components/utils/supabaseClient';
import { safeGetViewerLatLng } from './geolocation';

/**
 * Reverse geocode coordinates to get a neighbourhood / area name.
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

async function getBrowserLocationPermissionState() {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unknown';
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status?.state || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Update user location in DB.
 *
 * Consent is two-layered:
 * - app consent: stored in profiles.location_consent
 * - browser consent: native Safari/Chrome permission
 *
 * Passive app boot must never trigger the native browser prompt. Native prompts
 * should only happen from explicit user actions like Go Live, Nearby, Beacon Drop,
 * or Safety location sharing.
 */
export async function syncLocation({ allowNativePrompt = false } = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('location_consent')
      .eq('id', session.user.id)
      .single();

    if (!profile?.location_consent) {
      console.log('[LocationService] No app location consent. Skipping sync.');
      return null;
    }

    if (!allowNativePrompt) {
      const permissionState = await getBrowserLocationPermissionState();
      if (permissionState !== 'granted') {
        console.log('[LocationService] Browser location not already granted. Skipping passive sync.');
        return null;
      }
    }

    const loc = await safeGetViewerLatLng();
    if (!loc) return null;

    const { lat, lng } = loc;
    const areaName = await reverseGeocode(lat, lng);

    await supabase.from('profiles').update({
      last_lat: lat,
      last_lng: lng,
      location: `POINT(${lng} ${lat})`,
      location_area: areaName,
      last_loc_ts: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', session.user.id);

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
