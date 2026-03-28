/**
 * useGlobeRealtime — Unified realtime data layer for the globe
 *
 * Three data channels:
 * 1. globe_events (Supabase Realtime INSERT) → transient visual effects
 * 2. beacons (Supabase Realtime *) → persistent beacon dots
 * 3. night_pulse_realtime (poll every 60s) → city heat glow
 *
 * Returns everything the globe renderer needs to be alive.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CityHeat {
  city_id: string;
  city_name: string;
  lat: number;
  lng: number;
  active_beacons: number;
  heat_intensity: number;
  scans_last_hour: number;
}

export interface GlobeEvent {
  id: string;
  event_type: string;
  lat: number;
  lng: number;
  city_slug: string | null;
  intensity: number;
  color: string;
  pulse_type: string;
  duration_ms: number;
  metadata: Record<string, unknown>;
  created_at: string;
  expires_at: string;
}

export interface GlobeBeacon {
  id: string;
  code: string;
  type: string;            // checkin | event | drop | chat | vendor | ticket
  beacon_category: string; // venue | user | event | hotmess | safety
  title: string;
  status: string;
  geo_lat: number;
  geo_lng: number;
  city_slug: string | null;
  globe_color: string;
  globe_pulse_type: string;
  globe_size_base: number;
  intensity: number;
  checkin_count: number;
  venue_id: string | null;
  ends_at: string | null;
  starts_at: string | null;
  description: string | null;
  owner_id: string | null;
}

// ─── Beacon category visual config ──────────────────────────────────────────

export const BEACON_VISUALS: Record<string, { color: string; pulse: string; size: number }> = {
  venue:   { color: '#00C2E0', pulse: 'steady',   size: 2.0 },
  user:    { color: '#C8962C', pulse: 'standard', size: 1.0 },
  event:   { color: '#FF4F9A', pulse: 'flare',    size: 2.5 },
  hotmess: { color: '#F5C842', pulse: 'ripple',   size: 3.0 },
  safety:  { color: '#FF3B30', pulse: 'private',  size: 0   },
};

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useGlobeRealtime() {
  const [cityHeat, setCityHeat] = useState<CityHeat[]>([]);
  const [beacons, setBeacons] = useState<GlobeBeacon[]>([]);
  const [globeEvents, setGlobeEvents] = useState<GlobeEvent[]>([]);
  const mountedRef = useRef(true);

  // ── 1. City heat: poll night_pulse_realtime every 60s ───────────────────

  const fetchCityHeat = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('night_pulse_realtime')
        .select('city_id, city_name, latitude, longitude, active_beacons, heat_intensity, scans_last_hour');
      if (error) throw error;
      if (!mountedRef.current) return;
      setCityHeat(
        (data || []).map((c: Record<string, unknown>) => ({
          city_id: String(c.city_id),
          city_name: String(c.city_name),
          lat: Number(c.latitude),
          lng: Number(c.longitude),
          active_beacons: Number(c.active_beacons) || 0,
          heat_intensity: Number(c.heat_intensity) || 0,
          scans_last_hour: Number(c.scans_last_hour) || 0,
        }))
      );
    } catch (e) {
      console.warn('[GlobeRealtime] city heat fetch failed:', e);
    }
  }, []);

  // ── 2. Beacons: initial load + realtime subscription ────────────────────

  const fetchBeacons = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('beacons')
        .select(
          'id, code, type, beacon_category, title, status, geo_lat, geo_lng, city_slug, ' +
          'globe_color, globe_pulse_type, globe_size_base, intensity, checkin_count, ' +
          'venue_id, ends_at, starts_at, description, owner_id'
        )
        .eq('status', 'active');
      if (error) throw error;
      if (!mountedRef.current) return;

      const now = new Date();
      setBeacons(
        (data || [])
          .filter((b: Record<string, unknown>) => !b.ends_at || new Date(String(b.ends_at)) > now)
          .map((b: Record<string, unknown>) => ({
            id: String(b.id),
            code: String(b.code || ''),
            type: String(b.type || 'checkin'),
            beacon_category: String(b.beacon_category || 'user'),
            title: String(b.title || ''),
            status: String(b.status || 'active'),
            geo_lat: Number(b.geo_lat),
            geo_lng: Number(b.geo_lng),
            city_slug: b.city_slug ? String(b.city_slug) : null,
            globe_color: String(b.globe_color || BEACON_VISUALS[String(b.beacon_category)]?.color || '#C8962C'),
            globe_pulse_type: String(b.globe_pulse_type || BEACON_VISUALS[String(b.beacon_category)]?.pulse || 'standard'),
            globe_size_base: Number(b.globe_size_base) || BEACON_VISUALS[String(b.beacon_category)]?.size || 1.0,
            intensity: Number(b.intensity) || 1,
            checkin_count: Number(b.checkin_count) || 0,
            venue_id: b.venue_id ? String(b.venue_id) : null,
            ends_at: b.ends_at ? String(b.ends_at) : null,
            starts_at: b.starts_at ? String(b.starts_at) : null,
            description: b.description ? String(b.description) : null,
            owner_id: b.owner_id ? String(b.owner_id) : null,
          }))
      );
    } catch (e) {
      console.warn('[GlobeRealtime] beacons fetch failed:', e);
    }
  }, []);

  // ── 3. Globe events: subscribe to INSERT for visual effects ─────────────

  // Cleanup expired events every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setGlobeEvents((prev) =>
        prev.filter((e) => {
          const created = new Date(e.created_at).getTime();
          return now - created < e.duration_ms + 1000; // +1s grace
        })
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Setup all subscriptions ─────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    // Initial fetches
    fetchCityHeat();
    fetchBeacons();

    // City heat poll
    const heatInterval = setInterval(fetchCityHeat, 60_000);

    // Globe events realtime
    const globeEventsChannel = supabase
      .channel('globe-events-rt')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'globe_events' },
        (payload) => {
          if (!mountedRef.current) return;
          const e = payload.new as Record<string, unknown>;
          if (String(e.pulse_type) === 'private') return; // never render safety

          const evt: GlobeEvent = {
            id: String(e.id),
            event_type: String(e.event_type || ''),
            lat: Number(e.lat),
            lng: Number(e.lng),
            city_slug: e.city_slug ? String(e.city_slug) : null,
            intensity: Number(e.intensity) || 1,
            color: String(e.color || '#C8962C'),
            pulse_type: String(e.pulse_type || 'standard'),
            duration_ms: Number(e.duration_ms) || 3000,
            metadata: (e.metadata as Record<string, unknown>) || {},
            created_at: String(e.created_at),
            expires_at: String(e.expires_at),
          };

          setGlobeEvents((prev) => [...prev, evt]);
        }
      )
      .subscribe();

    // Beacons realtime
    const beaconsChannel = supabase
      .channel('beacons-globe-rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'beacons' },
        (payload) => {
          if (!mountedRef.current) return;
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const b = payload.new as Record<string, unknown>;
            if (String(b.status) !== 'active') {
              setBeacons((prev) => prev.filter((x) => x.id !== String(b.id)));
              return;
            }
            const beacon: GlobeBeacon = {
              id: String(b.id),
              code: String(b.code || ''),
              type: String(b.type || 'checkin'),
              beacon_category: String(b.beacon_category || 'user'),
              title: String(b.title || ''),
              status: 'active',
              geo_lat: Number(b.geo_lat),
              geo_lng: Number(b.geo_lng),
              city_slug: b.city_slug ? String(b.city_slug) : null,
              globe_color: String(b.globe_color || '#C8962C'),
              globe_pulse_type: String(b.globe_pulse_type || 'standard'),
              globe_size_base: Number(b.globe_size_base) || 1.0,
              intensity: Number(b.intensity) || 1,
              checkin_count: Number(b.checkin_count) || 0,
              venue_id: b.venue_id ? String(b.venue_id) : null,
              ends_at: b.ends_at ? String(b.ends_at) : null,
              starts_at: b.starts_at ? String(b.starts_at) : null,
              description: b.description ? String(b.description) : null,
              owner_id: b.owner_id ? String(b.owner_id) : null,
            };
            setBeacons((prev) => {
              const idx = prev.findIndex((x) => x.id === beacon.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = beacon;
                return next;
              }
              return [...prev, beacon];
            });
          } else if (payload.eventType === 'DELETE') {
            const id = String((payload.old as Record<string, unknown>)?.id);
            setBeacons((prev) => prev.filter((x) => x.id !== id));
          }
        }
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      clearInterval(heatInterval);
      supabase.removeChannel(globeEventsChannel);
      supabase.removeChannel(beaconsChannel);
    };
  }, [fetchCityHeat, fetchBeacons]);

  return { cityHeat, beacons, globeEvents };
}
