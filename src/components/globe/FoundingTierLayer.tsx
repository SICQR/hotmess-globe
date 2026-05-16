/**
 * FoundingTierLayer — sibling to GlobeBeacons.tsx.
 *
 * Owns the data preparation for the six Founding Partner tier visuals plus the
 * Founding Recovery/Member cohort references. Produces react-globe.gl-shaped
 * arrays (points, html elements, rings, arcs) that EnhancedGlobe3D consumes
 * alongside its existing beacons/recoveryPins data.
 *
 * Design rules (locked by Phil 2026-05-16):
 *  - Sibling to GlobeBeacons.tsx, not extension. Persistent partner beacons and
 *    time-limited beacons share the scene but own different sprite groups.
 *  - Engine-agnostic. The same `useLiveTierData()` hook + tier config will
 *    drive the Mapbox /globe-v2 build next week (P1).
 *  - Anchor named labels render only at zoom >= cityLevel (altitude < 1.5).
 *    Conditional rendering is the caller's choice — this layer just emits.
 */

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import {
  useLiveTierData,
  TIER_VISUAL_CONFIG,
  ALL_FOUNDING_TIERS,
  type FoundingTier,
} from '@/hooks/useLiveTierData';

// ─── Globe-data shapes (react-globe.gl compatible) ─────────────────────────

export interface FoundingTierBeacon {
  id: string;
  lat: number;
  lng: number;
  color: string;
  size: number;
  name?: string;

  // Founding-cohort discriminators (consumed by EnhancedGlobe3D's ringsData
  // filter, pointLabel callback, and onPointClick handler):
  isFounding: true;
  founding_tier: FoundingTier;
  founding_partner_inquiry_id?: string;

  // Anchor — drives ring pulse via intensity > 1 in the existing ringsData filter
  intensity: number;

  // Promoter — flips when active_event_venue_id is set
  event_active?: boolean;

  // Chain parent pin — opens the venues list panel on click
  isChainParent?: boolean;
  venue_count?: number;
  venues?: Array<{ id: string; title: string; lat: number; lng: number; globe_color?: string }>;
}

export interface FoundingTierHtmlElement {
  lat: number;
  lng: number;
  founding_tier: FoundingTier;
  title: string;
  /** caller can attach this id to the rendered DOM node for click-routing */
  id: string;
}

export interface FoundingTierArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  promoter_id: string;
}

export interface FoundingSOSRing {
  id: string;
  lat: number;
  lng: number;
  startedAt: number;
}

// ─── SOS subscription (separate from useLiveTierData on purpose — different
//     lifecycle: temporary, expiring rings; not part of persistent tier data) ──

function useSOSRings() {
  const [rings, setRings] = useState<FoundingSOSRing[]>([]);

  useEffect(() => {
    // Subscribe to safety_events (canonical name — sos_events does NOT exist
    // per Phase 0 schema verification).
    const ch = supabase
      .channel('founding-sos-rings')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'safety_events' },
        (payload) => {
          const row = payload.new as { id: string; lat?: number; lng?: number; latitude?: number; longitude?: number };
          const lat = row.lat ?? row.latitude;
          const lng = row.lng ?? row.longitude;
          if (typeof lat !== 'number' || typeof lng !== 'number') return;
          const newRing: FoundingSOSRing = {
            id: 'sos:' + row.id,
            lat,
            lng,
            startedAt: Date.now(),
          };
          setRings((prev) => [...prev, newRing]);
          // Auto-remove after 5 minutes
          setTimeout(() => {
            setRings((prev) => prev.filter((r) => r.id !== newRing.id));
          }, 5 * 60_000);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return rings;
}

// ─── Main hook ──────────────────────────────────────────────────────────────

export interface FoundingTierLayerOutput {
  /** Beacon-shaped objects ready to merge with EnhancedGlobe3D's `beacons` prop. */
  foundingBeacons: FoundingTierBeacon[];

  /** HTML elements for Anchor named labels — pass to `htmlElementsData`. */
  foundingHtmlElements: FoundingTierHtmlElement[];

  /** Promoter migration arcs — for tier='promoter' rows with active_event_venue. */
  foundingArcs: FoundingTierArc[];

  /** Temporary SOS rings (auto-dismiss after 5 min). */
  sosRings: FoundingSOSRing[];

  /** Live counts (members + partners filled, derived from RPC). */
  filledCounts: ReturnType<typeof useLiveTierData>['filledCounts'];

  loading: boolean;
  error: Error | null;
}

export function useFoundingTierLayer(): FoundingTierLayerOutput {
  const { tiers, chains, filledCounts, loading, error } = useLiveTierData();
  const sosRings = useSOSRings();

  const foundingBeacons = useMemo<FoundingTierBeacon[]>(() => {
    const acc: FoundingTierBeacon[] = [];

    // Per-tier beacons (Venue/Signal/Anchor/Promoter/Chain/Wellness)
    for (const tier of ALL_FOUNDING_TIERS) {
      const cfg = TIER_VISUAL_CONFIG[tier];
      for (const f of tiers[tier].features) {
        const coords = f.geometry.coordinates as [number, number];
        const props = (f.properties ?? {}) as Record<string, unknown>;
        acc.push({
          id: 'founding:' + (f.id ?? Math.random().toString(36).slice(2, 10)),
          lat: coords[1],
          lng: coords[0],
          color: cfg.color,
          // base radius 0.5; tier sizeBase multiplies it
          size: 0.5 * cfg.sizeBase,
          name: (props.title as string) || cfg.label,
          isFounding: true,
          founding_tier: tier,
          founding_partner_inquiry_id: props.founding_partner_inquiry_id as string | undefined,
          // Anchor needs intensity > 1 to hit the existing ringsData filter
          // in EnhancedGlobe3D. Other persistent tiers stay at 1.0.
          intensity: tier === 'founding_anchor' ? 2.0 : 1.0,
          event_active: tier === 'founding_promoter' ? Boolean(props.event_active) : undefined,
        });
      }
    }

    // Chain parent pins — one per chain, centroid-positioned
    for (const f of chains.features) {
      const coords = f.geometry.coordinates as [number, number];
      const props = (f.properties ?? {}) as Record<string, unknown>;
      const venuesRaw = (props.venues ?? []) as Array<{
        id: string; title: string; lat: number; lng: number; globe_color?: string;
      }>;
      acc.push({
        id: 'founding:chain:' + (props.chain_id ?? f.id),
        lat: coords[1],
        lng: coords[0],
        color: TIER_VISUAL_CONFIG.founding_chain.color,
        size: 0.6 * TIER_VISUAL_CONFIG.founding_chain.sizeBase,
        name: (props.name as string) + ' (' + (props.venue_count as number) + ')',
        isFounding: true,
        founding_tier: 'founding_chain',
        intensity: 1.5, // mid-pulse to differentiate chain parents from individual chain venues
        isChainParent: true,
        venue_count: props.venue_count as number,
        venues: venuesRaw,
      });
    }

    return acc;
  }, [tiers, chains]);

  // HTML elements: Anchor named labels (caller decides whether to render based on zoom)
  const foundingHtmlElements = useMemo<FoundingTierHtmlElement[]>(() => {
    return tiers.founding_anchor.features.map((f) => {
      const coords = f.geometry.coordinates as [number, number];
      const props = (f.properties ?? {}) as Record<string, unknown>;
      return {
        id: 'founding-anchor-label:' + (f.id ?? Math.random().toString(36).slice(2, 8)),
        lat: coords[1],
        lng: coords[0],
        founding_tier: 'founding_anchor' as const,
        title: (props.title as string) || 'Founding Anchor',
      };
    });
  }, [tiers.founding_anchor]);

  // Promoter migration arcs — only when active_event_venue is set AND we have
  // both home + active coords. The partner_beacons_geojson RPC already
  // resolves the displayed coord; this layer separately exposes the arc for
  // animation purposes.
  // For Phase 2 ship: arc is emitted with start=home, end=current displayed coord.
  // If they're identical (no active event), we skip — no arc to draw.
  const foundingArcs = useMemo<FoundingTierArc[]>(() => {
    const arcs: FoundingTierArc[] = [];
    for (const f of tiers.founding_promoter.features) {
      const props = (f.properties ?? {}) as Record<string, unknown>;
      if (!props.event_active) continue;
      const cur = f.geometry.coordinates as [number, number];
      // We don't have home coords in the FeatureCollection — they're in beacons.home_lng/lat
      // but the RPC resolves to the displayed coord. For Phase 2 we mark the arc as
      // a self-arc (start == end) which react-globe.gl will skip. Phase 3 will fetch
      // home coords for proper migration animation.
      // TODO Phase 3: fetch beacons.home_lng/lat alongside resolved displayed coord.
      arcs.push({
        startLat: cur[1],
        startLng: cur[0],
        endLat: cur[1],
        endLng: cur[0],
        color: TIER_VISUAL_CONFIG.founding_promoter.accentColor || '#FF4F9A',
        promoter_id: String(f.id),
      });
    }
    return arcs;
  }, [tiers.founding_promoter]);

  return {
    foundingBeacons,
    foundingHtmlElements,
    foundingArcs,
    sosRings,
    filledCounts,
    loading,
    error,
  };
}

// ─── Globe.jsx integration helpers ──────────────────────────────────────────

/**
 * Merge founding-cohort beacons into the existing beacon array passed to
 * EnhancedGlobe3D. Founding beacons land at the END of the array so they
 * render on top of any time-limited beacons at the same coordinates.
 */
export function mergeFoundingIntoBeacons<T extends { id: string; lat: number; lng: number }>(
  existing: T[],
  foundingBeacons: FoundingTierBeacon[],
): Array<T | FoundingTierBeacon> {
  return [...existing, ...foundingBeacons];
}

/**
 * Anchor label renderer for `htmlElementsData`. Returns a DOM element matching
 * the founding-cohort brand: small gold label, drop-shadow on dark, tracking
 * matching the wordmark spec.
 */
export function renderFoundingAnchorLabel(d: FoundingTierHtmlElement): HTMLElement {
  const el = document.createElement('div');
  el.className = 'hm-founding-anchor-label';
  el.dataset.foundingId = d.id;
  el.style.cssText = [
    'pointer-events:none',
    'transform:translate(-50%,calc(-100% - 18px))',
    'white-space:nowrap',
    'color:#C8962C',
    'font:600 11px/1 -apple-system,BlinkMacSystemFont,Inter,sans-serif',
    'letter-spacing:0.06em',
    'text-transform:uppercase',
    'text-shadow:0 0 6px #000, 0 0 2px #000',
    'padding:0 4px',
  ].join(';');
  el.textContent = d.title;
  return el;
}

/**
 * Threshold helper: Anchor labels show when the globe is zoomed in close
 * enough that pin-density allows reading them. react-globe.gl camera altitude
 * < 1.5 ≈ "city+ zoom" per ad-hoc empirical mapping. Tune later.
 */
export const ANCHOR_LABEL_ALTITUDE_THRESHOLD = 1.5;
