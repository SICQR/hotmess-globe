/**
 * useGPS — Adaptive geolocation sync for HOTMESS OS
 *
 * Battery-optimised:
 *  - Active (tab visible):    60s interval
 *  - Background (tab hidden): 300s interval
 *
 * Writes to profiles table (canonical).
 * nearby_candidates_secure RPC reads from profiles + user_presence_locations.
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

export function useGPS(autoUpdate = true): UseGPSResult {
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastWriteRef = useRef<number>(0);

  const updatePosition = useCallback(async (pos: GeolocationPosition) => {
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
    if (now - lastWriteRef.current < 30_000) return;
    lastWriteRef.current = now;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const locUpdate = {
        last_lat: newPosition.lat,
        last_lng: newPosition.lng,
        last_loc_ts: new Date().toISOString(),
        loc_accuracy_m: Math.round(newPosition.accuracy),
        is_online: true,
      };

      // Write to profiles (canonical table)
      // nearby_candidates_secure RPC reads from profiles + user_presence_locations
      await supabase
        .from('profiles')
        .update(locUpdate)
        .eq('id', user.id);
    } catch (err) {
      console.warn('[useGPS] Failed to update position:', err);
    }
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    setLoading(false);
    switch (err.code) {
      case err.PERMISSION_DENIED:
        setError('Location permission denied');
        break;
      case err.POSITION_UNAVAILABLE:
        setError('Location unavailable');
        break;
      case err.TIMEOUT:
        setError('Location request timed out');
        break;
      default:
        setError('Failed to get location');
    }
  }, []);

  const refresh = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setLoading(false);
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(updatePosition, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    });
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
