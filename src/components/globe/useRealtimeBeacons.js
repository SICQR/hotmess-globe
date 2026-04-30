/**
 * HOTMESS OS — Globe Beacon Integration
 * 
 * Drop-in integration for existing EnhancedGlobe3D.
 * Converts Supabase realtime presence → beacon format for the Globe.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

// Beacon types matching our core system
const BEACON_TYPES = {
  SOCIAL: 'SOCIAL',
  EVENT: 'EVENT',
  MARKET: 'MARKET',
  SAFETY: 'SAFETY',
  RADIO: 'RADIO',
};

// Convert presence rows to beacon format for EnhancedGlobe3D
function presenceToBeacon(presence) {
  // PostGIS location column: POINT(lng lat)
  let lat = presence.last_lat;
  let lng = presence.last_lng;

  if (!lat || !lng) {
    if (typeof presence.location === 'string') {
      const match = presence.location.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
      if (match) {
        lng = parseFloat(match[1]);
        lat = parseFloat(match[2]);
      }
    } else if (presence.location?.coordinates) {
      [lng, lat] = presence.location.coordinates;
    }
  }

  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  // Extract metadata (usually baked in via heartbeat or profile join)
  const meta = presence.metadata || {};
  const displayName = String(presence.display_name || meta.display_name || '').trim();
  const avatarUrl = String(presence.avatar_url || meta.avatar_url || '').trim();

  return {
    id: `presence:${presence.user_id}`,
    user_id: presence.user_id,
    lat,
    lng,
    kind: 'hookup', // For existing Globe compatibility
    mode: 'hookup',
    intensity: 0.8,
    active: true,
    isRightNow: true,
    title: displayName || 'Live Now',
    type: BEACON_TYPES.SOCIAL,
    avatarUrl: avatarUrl || undefined,
  };
}

// Convert events to beacon format
function eventToBeacon(event) {
  if (!event.lat || !event.lng) return null;
  
  return {
    id: `event:${event.id}`,
    lat: event.lat,
    lng: event.lng,
    kind: 'event',
    mode: 'event',
    intensity: Math.min(1, (event.rsvp_count || 0) / 50),
    active: true,
    title: event.title || 'Event',
    type: BEACON_TYPES.EVENT,
  };
}

/**
 * Hook to get realtime beacons from user_presence + events tables
 * Returns beacons in format compatible with existing EnhancedGlobe3D
 */
export function useRealtimeBeacons() {
  const [presenceBeacons, setPresenceBeacons] = useState([]);
  const [eventBeacons, setEventBeacons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load initial data
  const loadInitial = useCallback(async () => {
    const now = new Date().toISOString();

    // Load active presence from user_presence (only if is_online)
    try {
      const { data: presence } = await supabase
        .from('user_presence')
        .select('*')
        .eq('is_online', true)
        .gt('expires_at', now);
      
      if (presence) {
        const beacons = presence
          .map(presenceToBeacon)
          .filter(Boolean);
        setPresenceBeacons(beacons);
      }
    } catch (e) {
      console.warn('[RealtimeBeacons] Presence load failed:', e);
    }

    // Load all active beacons from beacons table (all kinds)
    try {
      // Join with profiles to check location_consent
      const { data: activeBeacons, error: fetchError } = await supabase
        .from('beacons')
        .select('*');
      
      if (fetchError) {
        console.error('[Pulse] Database fetch failed:', fetchError);
        setLoading(false);
        return;
      }

      
      if (activeBeacons) {
        console.log(`[Pulse] Found ${activeBeacons.length} beacons in DB`);
        const beacons = activeBeacons
          .map(b => {
            const lat = b.lat || b.geo_lat || b.latitude;
            const lng = b.lng || b.geo_lng || b.longitude;
            
            if (!lat || !lng) return null;

            // Filter by expiration date if it exists
            if (b.ends_at && new Date(b.ends_at) < new Date()) return null;

            // Map any beacon type to the format expected by EnhancedGlobe3D
            const visual = (b.type || b.kind || 'social').toLowerCase();
            return {
              ...b,
              id: `beacon:${b.id}`,
              lat: Number(lat),
              lng: Number(lng),
              kind: visual,
              mode: visual,
              intensity: b.intensity || 0.5,
              active: true,
              title: b.title || b.metadata?.title || 'Signal',
              type: visual,
            };
          })
          .filter(Boolean);

        console.log(`[Pulse] Final mapped beacons: ${beacons.length}`, beacons);
        setEventBeacons(beacons);
      }

    } catch (e) {
      console.warn('[RealtimeBeacons] Beacons load failed:', e);
    }


    setLoading(false);
  }, []);

  // Subscribe to realtime changes
  useEffect(() => {
    loadInitial();

    // user_presence channel
    const presenceChannel = supabase
      .channel('user-presence-beacons')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_presence' },
        (payload) => {
          if (payload.eventType === 'DELETE' || !payload.new.is_online) {
            setPresenceBeacons(prev => 
              prev.filter(b => b.id !== `presence:${payload.old?.user_id || payload.new?.user_id}`)
            );
          } else {
            const beacon = presenceToBeacon(payload.new);
            if (beacon) {
              setPresenceBeacons(prev => {
                const existing = prev.findIndex(b => b.id === beacon.id);
                if (existing >= 0) {
                  const updated = [...prev];
                  updated[existing] = beacon;
                  return updated;
                }
                return [...prev, beacon];
              });
            }
          }
        }
      )
      .subscribe();

    // Beacons channel (ALL kinds)
    const beaconsChannel = supabase
      .channel('all-beacons-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'beacons' },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            setEventBeacons(prev => 
              prev.filter(b => b.id !== `beacon:${payload.old.id}`)
            );
          } else {
            // For new/updated beacons, we need to check consent
            // Realtime payload doesn't include joins, so we do a quick lookup
            const { data: profile } = await supabase
              .from('profiles')
              .select('location_consent')
              .eq('id', payload.new.owner_id)
              .single();

            const b = payload.new;
            const lat = b.lat || b.geo_lat || b.latitude;
            const lng = b.lng || b.geo_lng || b.longitude;
            
            if (lat && lng && new Date(b.ends_at) > new Date()) {
              const visual = (b.type || b.kind || 'social').toLowerCase();
              const beacon = {
                ...b,
                id: `beacon:${b.id}`,
                lat: Number(lat),
                lng: Number(lng),
                kind: visual,
                mode: visual,
                intensity: b.intensity || 0.5,
                active: true,
                title: b.title || b.metadata?.title || 'Signal',
                type: visual,
              };

              setEventBeacons(prev => {

                const existing = prev.findIndex(item => item.id === beacon.id);
                if (existing >= 0) {
                  const updated = [...prev];
                  updated[existing] = beacon;
                  return updated;
                }
                return [...prev, beacon];
              });
            } else {
              // If consent revoked or expired, remove it
              setEventBeacons(prev => prev.filter(item => item.id !== `beacon:${payload.new.id}`));
            }
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(beaconsChannel);
    };

  }, [loadInitial]);

  // Combine all beacons
  const allBeacons = [...presenceBeacons, ...eventBeacons];

  return {
    beacons: allBeacons,
    presenceCount: presenceBeacons.length,
    eventCount: eventBeacons.length,
    loading,
    refresh: loadInitial,
  };
}

/**
 * Hook to get "Right Now" count from user_presence table
 */
export function useRightNowCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      // 5 minutes ago
      const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('last_seen_at', cutoff);
      
      setCount(count || 0);
    };

    fetchCount();

    // Subscribe to profile changes for real-time member count
    const channel = supabase
      .channel('online-members-count')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  return count;
}

export default useRealtimeBeacons;

// ---------------------------------------------------------------------------
// useRealtimeLocations
// Subscribes to INSERT/UPDATE/DELETE on the `locations` table and returns
// the live array of spike records (each has lat, lng, kind, intensity, …).
// ---------------------------------------------------------------------------
export function useRealtimeLocations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Table not yet provisioned — skip initial fetch to avoid 404 console errors.
    // When the `locations` table is created, remove this line and uncomment the fetch below.
    setLoading(false);

    const channel = supabase
      .channel('globe-locations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'locations' },
        (payload) => {
          setLocations((prev) => [payload.new, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'locations' },
        (payload) => {
          setLocations((prev) =>
            prev.map((r) => (r.id === payload.new.id ? payload.new : r))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'locations' },
        (payload) => {
          setLocations((prev) => prev.filter((r) => r.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { locations, loading };
}

// ---------------------------------------------------------------------------
// useRealtimeRoutes
// Subscribes to INSERT/UPDATE/DELETE on the `routes` table and returns
// the live array of arc records (each has from_lat, from_lng, to_lat, to_lng, …).
// ---------------------------------------------------------------------------
export function useRealtimeRoutes() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Table not yet provisioned — skip initial fetch to avoid 404 console errors.
    // When the `routes` table is created, remove this line and uncomment the fetch below.
    setLoading(false);

    const channel = supabase
      .channel('globe-routes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'routes' },
        (payload) => {
          setRoutes((prev) => [payload.new, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'routes' },
        (payload) => {
          setRoutes((prev) =>
            prev.map((r) => (r.id === payload.new.id ? payload.new : r))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'routes' },
        (payload) => {
          setRoutes((prev) => prev.filter((r) => r.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { routes, loading };
}
