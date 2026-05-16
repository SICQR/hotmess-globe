/**
 * useLiveTierData — Founding-cohort tier data layer (engine-agnostic).
 *
 * Subscribes to persistent partner beacons + chain aggregates + filled counts
 * and returns six tier-keyed GeoJSON FeatureCollections + chain aggregate FC +
 * filled counts.
 *
 * Engine-agnostic: portable between three.js (P0 weekend ship) and Mapbox (P1).
 * Data shape matches the architecture brief's recommended pattern.
 *
 * Returns:
 *   tiers.founding_venue   : FeatureCollection
 *   tiers.founding_signal  : FeatureCollection
 *   tiers.founding_anchor  : FeatureCollection
 *   tiers.founding_promoter: FeatureCollection
 *   tiers.founding_chain   : FeatureCollection (per-location beacons, for renderers
 *                                              that want to expand chains)
 *   tiers.founding_wellness: FeatureCollection
 *   chains                 : FeatureCollection (one feature per chain — centroid + count)
 *   filledCounts           : { members: {...}, partners: {...} }
 *   loading                : boolean
 *   error                  : Error | null
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import type { FeatureCollection, Feature, Point } from 'geojson';
import { supabase } from '@/components/utils/supabaseClient';

// ─── Canonical tier visual config ──────────────────────────────────────────
// Reference: the founding-partner brief's six tier treatments.
// Renderers (three.js sprite groups or Mapbox paint configs) read from here.

export type FoundingTier =
  | 'founding_venue'
  | 'founding_signal'
  | 'founding_anchor'
  | 'founding_promoter'
  | 'founding_chain'
  | 'founding_wellness';

export const TIER_VISUAL_CONFIG: Record<FoundingTier, {
  label: string;
  cap: number;
  color: string;            // base pin color
  ringColor?: string;       // present on Anchor (named-label tier)
  accentColor?: string;     // present on Promoter (magenta stroke)
  glowColor?: string;       // present on Wellness/Recovery (muted glow)
  pulse: 'none' | 'breath' | 'ring' | 'migration' | 'glow' | 'steady';
  sizeBase: number;         // baseline sprite size multiplier
  persistentLabel: boolean; // Anchor only
  emissiveStrength: number; // Mapbox only — 1.0 max under night lightPreset
}> = {
  founding_venue: {
    label: 'Founding Venue', cap: 50,
    color: '#C8962C', pulse: 'steady', sizeBase: 1.0,
    persistentLabel: false, emissiveStrength: 0.9,
  },
  founding_signal: {
    label: 'Founding Signal', cap: 25,
    color: '#C8962C', pulse: 'breath', sizeBase: 1.2,
    persistentLabel: false, emissiveStrength: 1.0,
  },
  founding_anchor: {
    label: 'Founding Anchor', cap: 10,
    color: '#C8962C', ringColor: '#C8962C',
    pulse: 'ring', sizeBase: 1.5,
    persistentLabel: true, emissiveStrength: 1.0,
  },
  founding_promoter: {
    label: 'Founding Promoter', cap: 15,
    color: '#C8962C', accentColor: '#E91E63',
    pulse: 'migration', sizeBase: 1.1,
    persistentLabel: false, emissiveStrength: 1.0,
  },
  founding_chain: {
    label: 'Founding Chain', cap: 5,
    color: '#C8962C', pulse: 'steady', sizeBase: 1.3,
    persistentLabel: false, emissiveStrength: 0.9,
  },
  founding_wellness: {
    label: 'Founding Wellness', cap: 10,
    color: '#9aaab8', glowColor: '#7a8b9a',
    pulse: 'glow', sizeBase: 0.9,
    persistentLabel: false, emissiveStrength: 0.7,
  },
};

export const ALL_FOUNDING_TIERS = Object.keys(TIER_VISUAL_CONFIG) as FoundingTier[];

// ─── Empty FC helper ────────────────────────────────────────────────────────
const emptyFC = (): FeatureCollection<Point> => ({ type: 'FeatureCollection', features: [] });

// ─── Counts shape ───────────────────────────────────────────────────────────
export interface FilledCounts {
  members: { original_50: number; founding: number; early: number };
  partners: Record<FoundingTier, number>;
}
const emptyCounts: FilledCounts = {
  members: { original_50: 0, founding: 0, early: 0 },
  partners: {
    founding_venue: 0, founding_signal: 0, founding_anchor: 0,
    founding_promoter: 0, founding_chain: 0, founding_wellness: 0,
  },
};

// ─── The hook ───────────────────────────────────────────────────────────────

export interface LiveTierData {
  tiers: Record<FoundingTier, FeatureCollection<Point>>;
  chains: FeatureCollection<Point>;
  filledCounts: FilledCounts;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useLiveTierData(): LiveTierData {
  const [tiers, setTiers] = useState<Record<FoundingTier, FeatureCollection<Point>>>(() => {
    const init = {} as Record<FoundingTier, FeatureCollection<Point>>;
    for (const t of ALL_FOUNDING_TIERS) init[t] = emptyFC();
    return init;
  });
  const [chains, setChains] = useState<FeatureCollection<Point>>(emptyFC());
  const [filledCounts, setFilledCounts] = useState<FilledCounts>(emptyCounts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const splitByTier = useCallback((all: FeatureCollection<Point>) => {
    const grouped = {} as Record<FoundingTier, FeatureCollection<Point>>;
    for (const t of ALL_FOUNDING_TIERS) grouped[t] = emptyFC();
    for (const f of all.features) {
      const tier = (f.properties?.tier as FoundingTier) || 'founding_venue';
      if (grouped[tier]) {
        grouped[tier].features.push(f);
      }
    }
    return grouped;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [beaconsRes, chainsRes, countsRes] = await Promise.all([
        supabase.rpc('partner_beacons_geojson'),
        supabase.rpc('chain_aggregates_geojson'),
        supabase.rpc('founding_filled_counts'),
      ]);
      if (!mountedRef.current) return;
      if (beaconsRes.error) throw beaconsRes.error;
      if (chainsRes.error) throw chainsRes.error;
      if (countsRes.error) throw countsRes.error;

      const allBeacons = (beaconsRes.data ?? { type: 'FeatureCollection', features: [] }) as FeatureCollection<Point>;
      setTiers(splitByTier(allBeacons));
      setChains((chainsRes.data ?? { type: 'FeatureCollection', features: [] }) as FeatureCollection<Point>);
      setFilledCounts((countsRes.data ?? emptyCounts) as FilledCounts);
      setError(null);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [splitByTier]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();

    // Realtime: any change to persistent partner beacons triggers a refetch.
    // We could be more surgical (merge by id) but at <175 partners total the
    // full refetch is cheap and keeps the data shape simple.
    const ch = supabase
      .channel('founding-tier-beacons')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'beacons', filter: 'is_persistent=eq.true' },
        () => { refresh(); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chain_partners' },
        () => { refresh(); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'founding_partner_inquiries' },
        () => { refresh(); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'founding_member_waitlist' },
        () => { refresh(); },
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(ch);
    };
  }, [refresh]);

  return { tiers, chains, filledCounts, loading, error, refresh };
}
