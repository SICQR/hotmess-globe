/**
 * useGlobeActivity — Reactor core for the Living Globe
 *
 * Provides three data layers that make the globe breathe:
 *
 *  A) Seed Heat — 8 London nightlife zones with time-of-day intensity.
 *     Fades toward 0 as real beacon count increases (cold-start fallback).
 *
 *  B) Venue Glow — Every venue gets a glow proportional to recent activity.
 *     Fetched from `venues` table + `venue_kings` scan counts. Refreshes 60s.
 *
 *  C) Activity Events — Ephemeral flash/arc array (stubbed for now; wired
 *     during the AI Trigger Wiring session via Supabase Realtime channels).
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

// ── Colour constants (THREE.js hex) ─────────────────────────────────────────

const GOLD   = 0xC8962C;

// ── Types ────────────────────────────────────────────────────────────────────

export interface SeedZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;            // degrees (visual spread on globe)
  peakStart: number;         // hour (0-23)
  peakEnd: number;           // hour (0-23), wraps past midnight
  currentIntensity: number;  // 0–1  (time-of-day × fade factor)
}

export interface VenueGlow {
  id: string;
  name: string;
  lat: number;
  lng: number;
  checkinCount: number;
  intensity: number;         // 0–1  min(1, checkinCount / 30)
}

export interface GlobeActivityEvent {
  id: string;
  type: 'purchase' | 'message' | 'checkin' | 'listing' | 'radio_listen' | 'sos';
  lat: number;
  lng: number;
  color: number;             // THREE.js hex
  targetLat?: number;
  targetLng?: number;
  intensity: number;
  createdAt: number;
  duration: number;          // ms
}

export interface GlobeActivityData {
  activityEvents: GlobeActivityEvent[];
  venueGlows: VenueGlow[];
  seedZones: SeedZone[];
}

// ── Seed Zone definitions ────────────────────────────────────────────────────

const SEED_ZONES_RAW: Omit<SeedZone, 'currentIntensity'>[] = [
  { id: 'vauxhall',   name: 'Vauxhall',          lat: 51.4855, lng: -0.1230, radius: 0.012, peakStart: 22, peakEnd: 5 },
  { id: 'soho',       name: 'Soho',              lat: 51.5130, lng: -0.1320, radius: 0.014, peakStart: 20, peakEnd: 3 },
  { id: 'shoreditch', name: 'Shoreditch',        lat: 51.5246, lng: -0.0790, radius: 0.011, peakStart: 21, peakEnd: 4 },
  { id: 'dalston',    name: 'Dalston',           lat: 51.5462, lng: -0.0750, radius: 0.010, peakStart: 22, peakEnd: 4 },
  { id: 'elephant',   name: 'Elephant & Castle', lat: 51.4943, lng: -0.1005, radius: 0.010, peakStart: 22, peakEnd: 4 },
  { id: 'kingscross', name: 'Kings Cross',       lat: 51.5305, lng: -0.1240, radius: 0.011, peakStart: 20, peakEnd: 2 },
  { id: 'brixton',    name: 'Brixton',           lat: 51.4613, lng: -0.1156, radius: 0.010, peakStart: 21, peakEnd: 3 },
  { id: 'limehouse',  name: 'Limehouse',         lat: 51.5106, lng: -0.0398, radius: 0.009, peakStart: 23, peakEnd: 5 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Compute 0–1 intensity based on current hour and a zone's peak window. */
function timeOfDayIntensity(peakStart: number, peakEnd: number): number {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;

  // Normalise the peak window (wraps past midnight)
  const inPeak = peakEnd > peakStart
    ? hour >= peakStart && hour < peakEnd
    : hour >= peakStart || hour < peakEnd;

  if (inPeak) return 1;

  // Ramp up/down within 2 hours of the peak window
  const RAMP = 2;

  // Distance to nearest peak boundary (circular)
  const distToStart = ((peakStart - hour) + 24) % 24;
  const distToEnd   = ((hour - peakEnd)   + 24) % 24;
  const closest = Math.min(distToStart, distToEnd);

  if (closest <= RAMP) return 1 - closest / RAMP;

  // Daytime baseline (globe is never completely dead)
  return 0.08;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useGlobeActivity(liveBeaconCount: number): GlobeActivityData {
  const [venueGlows, setVenueGlows] = useState<VenueGlow[]>([]);
  const [activityEvents, setActivityEvents] = useState<GlobeActivityEvent[]>([]);
  const fetchTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const MAX_EVENTS = 50;

  // ── Push a new activity flash (auto-pruned by duration + cap) ───────────

  const pushEvent = useCallback((evt: GlobeActivityEvent) => {
    setActivityEvents(prev => {
      const next = [...prev, evt];
      // Hard cap — oldest first
      return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next;
    });
  }, []);

  // ── Prune expired events every second ──────────────────────────────────

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setActivityEvents(prev => {
        const alive = prev.filter(e => now - e.createdAt < e.duration);
        return alive.length === prev.length ? prev : alive;
      });
    }, 1_000);
    return () => clearInterval(id);
  }, []);

  // ── Realtime Layer C: Subscribe to platform events ─────────────────────

  useEffect(() => {
    // Default London coordinates for events without location data
    const DEFAULT_LAT = 51.51;
    const DEFAULT_LNG = -0.12;

    // 1. Purchases — shopify_orders INSERT
    const ordersChannel = supabase
      .channel('globe-orders')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'shopify_orders',
      }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        pushEvent({
          id: `purchase-${row.id || Date.now()}`,
          type: 'purchase',
          lat: (row.lat as number) || DEFAULT_LAT + (Math.random() - 0.5) * 0.05,
          lng: (row.lng as number) || DEFAULT_LNG + (Math.random() - 0.5) * 0.05,
          color: GOLD,
          intensity: 0.9,
          createdAt: Date.now(),
          duration: 3_000,
        });
      })
      .subscribe();

    // 2. Messages — messages INSERT → faint arc
    const messagesChannel = supabase
      .channel('globe-messages')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
      }, () => {
        // Messages don't carry lat/lng, use random London scatter
        pushEvent({
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'message',
          lat: DEFAULT_LAT + (Math.random() - 0.5) * 0.06,
          lng: DEFAULT_LNG + (Math.random() - 0.5) * 0.06,
          targetLat: DEFAULT_LAT + (Math.random() - 0.5) * 0.06,
          targetLng: DEFAULT_LNG + (Math.random() - 0.5) * 0.06,
          color: GOLD,
          intensity: 0.3,
          createdAt: Date.now(),
          duration: 2_000,
        });
      })
      .subscribe();

    // 3. Preloved listings — preloved_listings INSERT → sparkle
    const listingsChannel = supabase
      .channel('globe-listings')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'preloved_listings',
      }, () => {
        pushEvent({
          id: `listing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'listing',
          lat: DEFAULT_LAT + (Math.random() - 0.5) * 0.05,
          lng: DEFAULT_LNG + (Math.random() - 0.5) * 0.05,
          color: GOLD,
          intensity: 0.5,
          createdAt: Date.now(),
          duration: 2_000,
        });
      })
      .subscribe();

    // 4. Venue check-ins — venue_kings UPDATE (scan_count change)
    const venueKingsChannel = supabase
      .channel('globe-venue-kings')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'venue_kings',
      }, () => {
        // Trigger a venue glow refresh on next cycle (venues are fetched every 60s,
        // but a check-in should update faster — force a re-fetch)
        setVenueGlows(prev => [...prev]); // trigger re-render
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(listingsChannel);
      supabase.removeChannel(venueKingsChannel);
    };
  }, [pushEvent]);

  // ── Seed zones (recomputed every minute) ─────────────────────────────────

  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const seedZones: SeedZone[] = useMemo(() => {
    // Fade factor: seed heat → 0 when 15+ beacons are live
    const fadeFactor = Math.max(0, 1 - liveBeaconCount / 15);

    return SEED_ZONES_RAW.map(zone => ({
      ...zone,
      currentIntensity: timeOfDayIntensity(zone.peakStart, zone.peakEnd) * fadeFactor,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveBeaconCount, tick]);

  // ── Venue glow (fetch every 60s) ─────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const fetchVenues = async () => {
      try {
        // 1. Get venues with coordinates
        const { data: venues, error: vErr } = await supabase
          .from('venues')
          .select('id, name, latitude, longitude')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .limit(60);

        if (vErr || !venues || cancelled) return;

        // 2. Get venue activity from venue_kings (scan_count as proxy)
        const { data: kings } = await supabase
          .from('venue_kings')
          .select('venue_id, scan_count');

        const kingMap = new Map<string, number>();
        if (kings) {
          for (const k of kings) {
            const existing = kingMap.get(k.venue_id) ?? 0;
            kingMap.set(k.venue_id, existing + (k.scan_count ?? 0));
          }
        }

        const glows: VenueGlow[] = venues.map(v => {
          const count = kingMap.get(v.id) ?? 0;
          return {
            id: v.id,
            name: v.name,
            lat: v.latitude,
            lng: v.longitude,
            checkinCount: count,
            // Base intensity 0.12 so every venue has a faint glow,
            // scaling up with activity. Cap at 1.
            intensity: Math.min(1, 0.12 + count / 30),
          };
        });

        if (!cancelled) setVenueGlows(glows);
      } catch (err) {
        console.error('[useGlobeActivity] venue fetch failed:', err);
      }
    };

    fetchVenues();
    fetchTimer.current = setInterval(fetchVenues, 60_000);

    return () => {
      cancelled = true;
      if (fetchTimer.current) clearInterval(fetchTimer.current);
    };
  }, []);

  return { activityEvents, venueGlows, seedZones };
}
