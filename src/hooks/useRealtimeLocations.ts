/**
 * useRealtimeLocations — Live GPS broadcasting for HOTMESS OS
 *
 * Adapted from SICQR/ghosted. Provides:
 * - Real-time location broadcasting via Supabase Realtime channels
 * - Database persistence for location shares
 * - Stale location cleanup (60s timeout)
 * - Start/stop location sharing controls
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { calculateDistance } from '@/lib/locationUtils';

export interface RealtimeLocation {
  userId: string;
  userName: string;
  avatarUrl?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
  isActive: boolean;
}

export interface LocationStats {
  totalActive: number;
  nearbyCount: number;
  lastUpdateTime: number;
}

const UPDATE_THROTTLE_MS = 3000;
const STALE_LOCATION_MS = 60000;

export function useRealtimeLocations(currentUserId: string | null, radiusKm: number = 10) {
  const [locations, setLocations] = useState<Map<string, RealtimeLocation>>(new Map());
  const [stats, setStats] = useState<LocationStats>({
    totalActive: 0,
    nearbyCount: 0,
    lastUpdateTime: 0,
  });
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const locationShareIdRef = useRef<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastBroadcastRef = useRef<number>(0);

  const updateLocationInDatabase = useCallback(
    async (lat: number, lng: number, accuracy?: number, heading?: number, speed?: number) => {
      if (!currentUserId) return;

      try {
        // Update profiles table with location
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            last_lat: lat,
            last_lng: lng,
            last_loc_ts: new Date().toISOString(),
            is_online: true,
          })
          .eq('id', currentUserId);

        if (updateError) {
          console.error('Failed to update location:', updateError);
        }
      } catch (err) {
        console.error('Database update error:', err);
      }
    },
    [currentUserId]
  );

  const broadcastLocation = useCallback(
    async (location: RealtimeLocation) => {
      if (!channelRef.current) return;

      const now = Date.now();
      if (now - lastBroadcastRef.current < UPDATE_THROTTLE_MS) return;

      lastBroadcastRef.current = now;

      try {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'location_update',
          payload: location,
        });
      } catch (err) {
        console.error('Broadcast error:', err);
      }
    },
    []
  );

  const stopSharing = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Mark offline in profiles
    if (currentUserId) {
      try {
        await supabase
          .from('profiles')
          .update({ is_online: false })
          .eq('id', currentUserId);
      } catch (err) {
        console.error('Failed to mark offline:', err);
      }
    }

    setIsSharing(false);
    setMyLocation(null);
  }, [currentUserId]);

  const startSharing = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setError(null);
    setIsSharing(true);

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setMyLocation(newLocation);

        await updateLocationInDatabase(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy,
          position.coords.heading || undefined,
          position.coords.speed || undefined
        );

        // Fetch profile for broadcast
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', currentUserId)
          .single();

        await broadcastLocation({
          userId: currentUserId || 'anonymous',
          userName: profile?.display_name || 'You',
          avatarUrl: profile?.avatar_url,
          latitude: newLocation.lat,
          longitude: newLocation.lng,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
          timestamp: Date.now(),
          isActive: true,
        });
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError(err.message);
        stopSharing();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    watchIdRef.current = watchId;
  }, [currentUserId, updateLocationInDatabase, broadcastLocation, stopSharing]);

  // Set up realtime channel
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('realtime-locations', {
        config: {
          broadcast: { self: false, ack: false },
          presence: { key: currentUserId },
        },
      })
      .on('broadcast', { event: 'location_update' }, ({ payload }) => {
        const location = payload as RealtimeLocation;

        if (location.userId !== currentUserId && location.isActive) {
          setLocations((current) => {
            const updated = new Map(current);
            updated.set(location.userId, location);
            return updated;
          });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime locations connected');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime locations channel error');
          setError('Failed to connect to realtime updates');
        }
      });

    channelRef.current = channel;

    // Load nearby users from DB
    const loadNearbyUsers = async () => {
      try {
        const { data: nearbyUsers, error: fetchError } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, last_lat, last_lng, is_online, last_loc_ts')
          .eq('is_online', true)
          .not('last_lat', 'is', null)
          .not('last_lng', 'is', null)
          .neq('id', currentUserId);

        if (!fetchError && nearbyUsers) {
          setLocations((current) => {
            const updated = new Map(current);
            nearbyUsers.forEach((user: any) => {
              updated.set(user.id, {
                userId: user.id,
                userName: user.display_name || 'Unknown',
                avatarUrl: user.avatar_url,
                latitude: user.last_lat,
                longitude: user.last_lng,
                timestamp: new Date(user.last_loc_ts).getTime(),
                isActive: user.is_online,
              });
            });
            return updated;
          });
        }
      } catch (err) {
        console.error('Failed to load nearby users:', err);
      }
    };

    loadNearbyUsers();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentUserId]);

  // Cleanup stale locations
  useEffect(() => {
    const cleanupStaleLocations = () => {
      const now = Date.now();
      setLocations((current) => {
        const updated = new Map(current);
        current.forEach((location, userId) => {
          if (now - location.timestamp > STALE_LOCATION_MS) {
            updated.delete(userId);
          }
        });
        return updated.size !== current.size ? updated : current;
      });
    };

    const interval = setInterval(cleanupStaleLocations, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate stats
  useEffect(() => {
    const nearbyLocations = myLocation
      ? Array.from(locations.values()).filter((loc) => {
          const distance = calculateDistance(myLocation.lat, myLocation.lng, loc.latitude, loc.longitude);
          return distance / 1000 <= radiusKm;
        })
      : [];

    setStats({
      totalActive: locations.size,
      nearbyCount: nearbyLocations.length,
      lastUpdateTime: Date.now(),
    });
  }, [locations, myLocation, radiusKm]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSharing();
    };
  }, [stopSharing]);

  return {
    locations: Array.from(locations.values()),
    myLocation,
    isSharing,
    error,
    stats,
    startSharing,
    stopSharing,
    toggleSharing: (enabled: boolean) => {
      if (enabled) {
        startSharing();
      } else {
        stopSharing();
      }
    },
  };
}
