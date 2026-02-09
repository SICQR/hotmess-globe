/**
 * HOTMESS OS — Beacon System
 * 
 * Supabase → Globe adapter. 
 * Owns realtime subscriptions + normalization + TTL pruning.
 * The Globe ONLY understands beacons. It never decides.
 */

import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type BeaconType = 'SOCIAL' | 'EVENT' | 'RADIO' | 'MARKET' | 'SAFETY';

export interface Beacon {
  id: string;
  type: BeaconType;
  lat: number;
  lng: number;
  intensity: number; // 0..1
  expiresAt?: string; // ISO
  meta?: Record<string, unknown>;
}

export interface BeaconSources {
  presenceTable?: string;  // default: 'presence'
  eventsTable?: string;    // default: 'events'
  marketTable?: string;    // default: 'marketplace'
  safetyTable?: string;    // default: 'panic_events'
}

export type OnBeaconsChange = (beacons: Beacon[]) => void;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Normalize any geo format to { lat, lng }
 * Supports: { lat, lng }, GeoJSON Point, WKT POINT()
 */
export function normalizePoint(row: Record<string, unknown>): { lat: number; lng: number } | null {
  const lat = row?.lat ?? row?.latitude;
  const lng = row?.lng ?? row?.longitude;
  if (typeof lat === 'number' && typeof lng === 'number') return { lat, lng };

  const g = row?.geo ?? row?.location ?? row?.coordinates;
  if (!g) return null;

  // GeoJSON Point
  if (typeof g === 'object' && g !== null) {
    const gObj = g as Record<string, unknown>;
    if (gObj.type === 'Point' && Array.isArray(gObj.coordinates) && gObj.coordinates.length >= 2) {
      const [LNG, LAT] = gObj.coordinates as number[];
      if (typeof LAT === 'number' && typeof LNG === 'number') return { lat: LAT, lng: LNG };
    }
  }

  // WKT: "POINT(lng lat)"
  if (typeof g === 'string') {
    const m = g.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (m) {
      const LNG = Number(m[1]);
      const LAT = Number(m[2]);
      if (!Number.isNaN(LAT) && !Number.isNaN(LNG)) return { lat: LAT, lng: LNG };
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTENSITY POLICY (exact mapping)
// ═══════════════════════════════════════════════════════════════════════════════

export function intensityFromRow(type: BeaconType, row: Record<string, unknown>): number {
  switch (type) {
    case 'SAFETY':
      return 1; // Always max
    case 'SOCIAL':
      return 0.7; // Fixed for presence
    case 'MARKET':
      return 0.6; // Fixed for drops
    case 'EVENT': {
      const rsvp = Number(row?.rsvp_count ?? row?.going_count ?? row?.attending_count ?? 0);
      return clamp01(rsvp / 50); // 50 RSVPs = full intensity
    }
    case 'RADIO': {
      const bpm = Number(row?.bpm ?? 0);
      return clamp01(bpm / 140); // 140 bpm = full intensity
    }
    default:
      return 0.5;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ID POLICY (stable + unique across tables)
// ═══════════════════════════════════════════════════════════════════════════════

function assertNever(x: never): never {
  throw new Error(`Unhandled BeaconType in beaconId: ${String(x)}`);
}

export function beaconId(type: BeaconType, row: Record<string, unknown>): string {
  switch (type) {
    case 'SOCIAL':
      return `presence:${row.user_id ?? row.id}`;
    case 'EVENT':
      return `event:${row.id}`;
    case 'MARKET':
      return `market:${row.id}`;
    case 'SAFETY':
      return `safety:${row.user_id ?? row.id}`;
    case 'RADIO':
      return `radio:live`;
    default: {
      // Exhaustive type check: ensures all BeaconType cases are handled
      assertNever(type);
      return `unknown:${row.id ?? crypto.randomUUID()}`;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BEACON BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildBeacon(type: BeaconType, row: Record<string, unknown>): Beacon | null {
  const pt = normalizePoint(row);
  if (!pt) return null;

  const expiresAt = (
    row.expires_at ?? row.ends_at ?? row.active_until ?? row.resolved_at ?? undefined
  ) as string | undefined;

  return {
    id: beaconId(type, row),
    type,
    lat: pt.lat,
    lng: pt.lng,
    intensity: intensityFromRow(type, row),
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    meta: (row?.metadata ?? row?.meta ?? undefined) as Record<string, unknown> | undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TTL PRUNE (client-side safety net)
// ═══════════════════════════════════════════════════════════════════════════════

function pruneExpired(map: Map<string, Beacon>): void {
  const now = Date.now();
  for (const [id, b] of map) {
    if (b.expiresAt && Date.parse(b.expiresAt) < now) {
      map.delete(id);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SUBSCRIPTION
// ═══════════════════════════════════════════════════════════════════════════════

export function subscribeBeacons(
  supabase: SupabaseClient,
  onChange: OnBeaconsChange,
  sources: BeaconSources = {}
): () => void {
  const presenceTable = sources.presenceTable ?? 'presence';
  const eventsTable = sources.eventsTable ?? 'events';
  const marketTable = sources.marketTable ?? 'marketplace';
  const safetyTable = sources.safetyTable ?? 'panic_events';

  const beacons = new Map<string, Beacon>();
  const channels: RealtimeChannel[] = [];
  let pruneTimer: ReturnType<typeof setInterval> | null = null;

  const emit = () => {
    pruneExpired(beacons);
    onChange(Array.from(beacons.values()));
  };

  const upsertFromRow = (type: BeaconType, row: Record<string, unknown>) => {
    const b = buildBeacon(type, row);
    if (!b) return;
    beacons.set(b.id, b);
    emit();
  };

  const deleteFromRow = (type: BeaconType, row: Record<string, unknown>) => {
    const id = beaconId(type, row);
    beacons.delete(id);
    emit();
  };

  // Initial load
  async function initialLoad() {
    const nowIso = new Date().toISOString();

    // Presence (active only)
    try {
      const { data } = await supabase
        .from(presenceTable)
        .select('*')
        .gt('expires_at', nowIso);
      data?.forEach((r) => upsertFromRow('SOCIAL', r));
    } catch (e) {
      console.warn('[Beacons] Presence load failed:', e);
    }

    // Events (within time window)
    try {
      const { data } = await supabase
        .from(eventsTable)
        .select('*')
        .lte('starts_at', nowIso)
        .gte('ends_at', nowIso);
      data?.forEach((r) => upsertFromRow('EVENT', r));
    } catch (e) {
      // Events table might have different schema
      console.warn('[Beacons] Events load failed:', e);
    }

    // Market (active only)
    try {
      const { data } = await supabase
        .from(marketTable)
        .select('*')
        .or(`active_until.is.null,active_until.gt.${nowIso}`);
      data?.forEach((r) => upsertFromRow('MARKET', r));
    } catch (e) {
      console.warn('[Beacons] Market load failed:', e);
    }

    // Safety (unresolved only)
    try {
      const { data } = await supabase
        .from(safetyTable)
        .select('*')
        .is('resolved_at', null);
      data?.forEach((r) => upsertFromRow('SAFETY', r));
    } catch (e) {
      console.warn('[Beacons] Safety load failed:', e);
    }

    emit();
  }

  function bindTable(table: string, type: BeaconType) {
    const ch = supabase
      .channel(`beacons:${table}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table },
        (payload) => upsertFromRow(type, payload.new as Record<string, unknown>)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table },
        (payload) => upsertFromRow(type, payload.new as Record<string, unknown>)
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table },
        (payload) => deleteFromRow(type, payload.old as Record<string, unknown>)
      )
      .subscribe();

    channels.push(ch);
  }

  // Start
  void initialLoad();
  bindTable(presenceTable, 'SOCIAL');
  bindTable(eventsTable, 'EVENT');
  bindTable(marketTable, 'MARKET');
  bindTable(safetyTable, 'SAFETY');

  // Client-side prune (belt + suspenders)
  pruneTimer = setInterval(() => emit(), 10_000);

  // Cleanup function
  return () => {
    if (pruneTimer) clearInterval(pruneTimer);
    channels.forEach((c) => supabase.removeChannel(c));
    beacons.clear();
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACT HOOK
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';

export function useBeacons(supabase: SupabaseClient, sources?: BeaconSources): Beacon[] {
  const [beacons, setBeacons] = useState<Beacon[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeBeacons(supabase, setBeacons, sources);
    return unsubscribe;
  }, [supabase, sources]);

  return beacons;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RADIO BEACON (special case - singleton)
// ═══════════════════════════════════════════════════════════════════════════════

export function createRadioBeacon(options: {
  lat: number;
  lng: number;
  bpm?: number;
  isLive?: boolean;
}): Beacon | null {
  if (!options.isLive) return null;

  return {
    id: 'radio:live',
    type: 'RADIO',
    lat: options.lat,
    lng: options.lng,
    intensity: clamp01((options.bpm ?? 120) / 140),
    meta: { bpm: options.bpm },
  };
}
