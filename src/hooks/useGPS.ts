/**
 * useGPS — Adaptive geolocation sync for HOTMESS OS
 *
 * Battery-optimised:
 *  - Active (tab visible):    60s interval
 *  - Background (tab hidden): 300s interval
 *
 * Writes to profiles table (canonical).
 * nearby_candidates_secure RPC reads from profiles + user_presence_locations.
 *
 * Persona auto-switch:
 *  - On each position update, checks if any persona has a geo_fence in its
 *    settings JSONB: { geo_fence: { lat, lng, radius_m } }
 *  - If user enters a fence, switches to that persona (once per fence entry).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

type Position = {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
};

type UseGPSResult = {
  position: Position | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
};

const ACTIVE_INTERVAL_MS = 60_000;    // 60 seconds when visible
const BACKGROUND_INTERVAL_MS = 300_000; // 5 minutes when hidden

/** Haversine distance in metres between two lat/lng points */
function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useGPS(autoUpdate = true): UseGPSResult {
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastWriteRef = useRef<number>(0);
  // Track which persona fence we last auto-switched into to avoid thrashing
  const lastFencePersonaRef = useRef<string | null>(null);

  const updatePosition = useCallback(async (pos: GeolocationPosition) => {
    console.log('[useGPS] 📍 New position from browser:', {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy
    });

    const newPosition: Position = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      timestamp: pos.timestamp,
    };

    setPosition(newPosition);
    setError(null);
    setLoading(false);

    // Throttle DB writes — skip if last write was < 30s ago
    const now = Date.now();
    if (now - lastWriteRef.current < 30_000) {
      console.log('[useGPS] ⏳ Throttling DB write (last write too recent)');
      return;
    }
    lastWriteRef.current = now;

    try {
      console.log('[useGPS] 🔄 Fetching auth user for DB sync...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('[useGPS] 🛑 No auth user found. Skipping DB sync.');
        return;
      }

      // Check for location consent
      const { data: profile } = await supabase
        .from('profiles')
        .select('location_consent')
        .eq('id', user.id)
        .single();

      if (profile && profile.location_consent === false) {
        console.log('[useGPS] 🛡️ Location consent is OFF. Skipping DB sync.');
        return;
      }

      // ── Reverse Geocode for Area Name ──────────────────────────────────────
      let locationArea = null;
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDZBzKf5oO1zhdQph9F5j_1JUihMkFQXM0';
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${newPosition.lat},${newPosition.lng}&key=${apiKey}&result_type=neighborhood|sublocality|locality`
        );
        const geoData = await response.json();
        if (geoData.status === 'OK' && geoData.results?.length > 0) {
          // Find the most descriptive "neighborhood" or "sublocality"
          const bestMatch = geoData.results.find(r => r.types.includes('neighborhood')) 
                        || geoData.results.find(r => r.types.includes('sublocality'))
                        || geoData.results[0];
          
          locationArea = bestMatch.address_components[0].long_name;
          console.log('[useGPS] 📍 Reverse geocoded area:', locationArea);
        }
      } catch (err) {
        console.warn('[useGPS] Reverse geocoding failed:', err);
      }

      const locUpdate: Record<string, any> = {
        last_lat: newPosition.lat,
        last_lng: newPosition.lng,
        location: `POINT(${newPosition.lng} ${newPosition.lat})`,
        last_loc_ts: new Date().toISOString(),
        loc_accuracy_m: Math.round(newPosition.accuracy),
        location_area: locationArea,
        is_online: true,
      };

      // Write to profiles (canonical table)
      const { data: pData, error: pError } = await supabase
        .from('profiles')
        .update(locUpdate)
        .eq('id', user.id)
        .select();

      if (pError) {
        console.error('[useGPS] ❌ Supabase "profiles" Update Error:', pError);
        console.error('Context:', { 
          hint: pError.hint, 
          details: pError.details, 
          code: pError.code,
          columns_tried: Object.keys(locUpdate)
        });
      } else {
        console.log('[useGPS] ✅ Supabase "profiles" Update Success:', pData);
      }

      // Also update user_presence if it exists (legacy compatibility)
      try {
        const { error: presError } = await supabase
          .from('user_presence')
          .upsert({
            user_id: user.id,
            status: 'online',
            last_seen_at: new Date().toISOString(),
          }, { on_conflict: 'user_id' });
        
        if (presError) console.warn('[useGPS] user_presence sync warning:', presError.message);
      } catch (e) { /* ignore */ }

      // ── Persona geo-fence auto-switch ──────────────────────────────────────
      console.log('[useGPS] 🛡️ Checking persona geo-fences...');
      const { data: personas, error: perError } = await supabase
        .from('personas')
        .select('id, persona_type, is_active, settings')
        .eq('user_id', user.id);

      if (perError) {
        console.error('[useGPS] ❌ Persona fetch error:', perError);
      } else if (!personas?.length) {
        console.log('[useGPS] ℹ️ No personas found for geo-fencing.');
      } else {
        let matchedPersonaId: string | null = null;
        for (const p of personas) {
          const fence = p.settings?.geo_fence as { lat?: number; lng?: number; radius_m?: number } | undefined;
          if (!fence?.lat || !fence?.lng || !fence?.radius_m) continue;

          const dist = distanceMetres(newPosition.lat, newPosition.lng, fence.lat, fence.lng);
          if (dist <= fence.radius_m) {
            matchedPersonaId = p.id;
            break; 
          }
        }

        if (matchedPersonaId && matchedPersonaId !== lastFencePersonaRef.current) {
          const current = personas.find(p => p.is_active);
          if (current?.id !== matchedPersonaId) {
            console.log(`[useGPS] 🔄 Crossing into fence! Switching to persona ${matchedPersonaId}`);
            const { error: swError } = await supabase.rpc('switch_persona', { p_persona_id: matchedPersonaId });
            if (swError) console.error('[useGPS] Persona switch RPC failed:', swError);
            lastFencePersonaRef.current = matchedPersonaId;
          }
        } else if (!matchedPersonaId) {
          lastFencePersonaRef.current = null;
        }
      }
    } catch (err) {
      console.error('[useGPS] 💥 Critical Unhandled Sync Error:', err);
    }
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    setLoading(false);
    console.error('[useGPS] 🧭 Geolocation API Error:', {
      code: err.code,
      message: err.message
    });

    switch (err.code) {
      case err.PERMISSION_DENIED:
        setError('Location permission denied. Please allow location in your browser settings.');
        break;
      case err.POSITION_UNAVAILABLE:
        setError('Location unavailable. Check if GPS is enabled on your device.');
        break;
      case err.TIMEOUT:
        setError('Location request timed out. Retrying...');
        break;
      default:
        setError('Failed to get location. Unspecified error.');
    }
  }, []);

  const refresh = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log('[useGPS] 🛰️ Initiating adaptive location request...');

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 8000, // Shorter timeout for high accuracy
      maximumAge: 30000,
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => updatePosition(pos),
      (err) => {
        console.warn('[useGPS] ⚠️ High accuracy failed, retrying with low accuracy...', err.message);
        // Fallback: Low accuracy
        navigator.geolocation.getCurrentPosition(
          (pos) => updatePosition(pos),
          (err2) => handleError(err2),
          { enableHighAccuracy: false, timeout: 15000 }
        );
      },
      options
    );
  }, [updatePosition, handleError]);

  // Adaptive interval based on tab visibility
  const startInterval = useCallback((intervalMs: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(refresh, intervalMs);
  }, [refresh]);

  useEffect(() => {
    refresh();

    if (!autoUpdate) return;

    // Start with active interval
    startInterval(
      document.visibilityState === 'visible' ? ACTIVE_INTERVAL_MS : BACKGROUND_INTERVAL_MS
    );

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Came back — refresh immediately + switch to active interval
        refresh();
        startInterval(ACTIVE_INTERVAL_MS);
      } else {
        // Gone to background — switch to slow interval
        startInterval(BACKGROUND_INTERVAL_MS);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refresh, autoUpdate, startInterval]);

  return { position, error, loading, refresh };
}

export default useGPS;
