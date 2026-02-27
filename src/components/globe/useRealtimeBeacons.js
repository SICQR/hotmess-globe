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
  if (!presence.geo) return null;
  
  // Parse geo (could be GeoJSON or WKT)
  let lat, lng;
  if (presence.geo?.coordinates) {
    [lng, lat] = presence.geo.coordinates;
  } else if (typeof presence.geo === 'string') {
    const match = presence.geo.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (match) {
      lng = parseFloat(match[1]);
      lat = parseFloat(match[2]);
    }
  }
  
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  return {
    id: `presence:${presence.user_id}`,
    lat,
    lng,
    kind: 'hookup', // For existing Globe compatibility
    mode: 'hookup',
    intensity: 0.8,
    active: true,
    isRightNow: true,
    title: 'Live Now',
    type: BEACON_TYPES.SOCIAL,
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
 * Hook to get realtime beacons from presence + events tables
 * Returns beacons in format compatible with existing EnhancedGlobe3D
 */
export function useRealtimeBeacons() {
  const [presenceBeacons, setPresenceBeacons] = useState([]);
  const [eventBeacons, setEventBeacons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load initial data
  const loadInitial = useCallback(async () => {
    const now = new Date().toISOString();

    // Load active presence
    try {
      const { data: presence } = await supabase
        .from('presence')
        .select('*')
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

    // Load active events
    try {
      const { data: events } = await supabase
        .from('beacons')
        .select('*')
        .eq('kind', 'event')
        .lte('starts_at', now)
        .gte('end_at', now);
      
      if (events) {
        const beacons = events
          .map(eventToBeacon)
          .filter(Boolean);
        setEventBeacons(beacons);
      }
    } catch (e) {
      console.warn('[RealtimeBeacons] Events load failed:', e);
    }

    setLoading(false);
  }, []);

  // Subscribe to realtime changes
  useEffect(() => {
    loadInitial();

    // Presence channel
    const presenceChannel = supabase
      .channel('presence-beacons')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'presence' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setPresenceBeacons(prev => 
              prev.filter(b => b.id !== `presence:${payload.old.user_id}`)
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

    // Events channel
    const eventsChannel = supabase
      .channel('events-beacons')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'beacons' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setEventBeacons(prev => 
              prev.filter(b => b.id !== `event:${payload.old.id}`)
            );
          } else {
            const beacon = eventToBeacon(payload.new);
            if (beacon) {
              setEventBeacons(prev => {
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

    // Cleanup
    return () => {
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(eventsChannel);
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
 * Hook to get "Right Now" count from presence table
 */
export function useRightNowCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const now = new Date().toISOString();
      const { count } = await supabase
        .from('presence')
        .select('*', { count: 'exact', head: true })
        .gt('expires_at', now);
      
      setCount(count || 0);
    };

    fetchCount();

    // Refresh every 10 seconds
    const interval = setInterval(fetchCount, 10000);

    // Subscribe to changes
    const channel = supabase
      .channel('presence-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'presence' },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
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
