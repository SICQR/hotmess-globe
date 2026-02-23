import { useState, useEffect, useCallback } from 'react';
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

const UPDATE_INTERVAL = 30000; // 30 seconds

export function useGPS(autoUpdate = true): UseGPSResult {
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

    // Update user's position in database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('User')
          .update({
            last_lat: newPosition.lat,
            last_lng: newPosition.lng,
            last_loc_ts: new Date().toISOString(),
            loc_accuracy_m: Math.round(newPosition.accuracy),
            is_online: true,
          })
          .eq('auth_user_id', user.id);
      }
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

  useEffect(() => {
    refresh();

    if (!autoUpdate) return;

    // Update position every 30 seconds
    const interval = setInterval(refresh, UPDATE_INTERVAL);
    
    return () => clearInterval(interval);
  }, [refresh, autoUpdate]);

  return { position, error, loading, refresh };
}

export default useGPS;
