/**
 * useGlobeBeacons — Supabase Realtime subscription for Globe beacon list
 *
 * Subscribes to the Beacon table and returns active beacons (not expired).
 * Used by the Globe to render Lime (social/Right Now), Cyan (event), Gold (marketplace).
 * Complements GlobeContext.emitPulse for immediate UI pulses; this is the persistent list.
 *
 * @see docs/HOTMESS-LONDON-OS-REMAP-MASTER.md §6 Data and component wire-flow
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

const BEACON_COLOR = {
  social: '#39FF14',
  event: '#00D9FF',
  marketplace: '#FFD700',
  release: '#B026FF',
};

const DEFAULT_EXPIRY_HOURS = 4;

/** Map beacon kind (from API) to REMAP type for BEACON_COLOR; used by list/detail pages and Globe. */
function kindToType(kind) {
  const k = (kind || 'event').toLowerCase();
  if (k === 'social') return 'social';
  if (k === 'event' || k === 'venue' || k === 'hookup' || k === 'drop' || k === 'private') return 'event';
  if (k === 'marketplace') return 'marketplace';
  if (k === 'release' || k === 'popup') return 'release';
  return 'event';
}

/** Get hex color for a beacon kind (single source for list, detail, Globe). */
export function getBeaconColorForKind(kind) {
  return BEACON_COLOR[kindToType(kind)] || BEACON_COLOR.event;
}

/**
 * Map Beacon row to a normalized shape for the Globe (id, type, lat, lng, color, metadata).
 * Beacon table uses "kind" (release, event, social, etc.) and may use promoter_id for user-linked beacons.
 */
function mapBeaconToGlobe(row) {
  const kind = (row?.kind || row?.beacon_type || 'event').toLowerCase();
  // Normalize to remap types: social (Right Now), event, release, marketplace
  const type =
    kind === 'social' ? 'social' :
    kind === 'event' ? 'event' :
    kind === 'release' ? 'release' :
    kind === 'marketplace' ? 'marketplace' : 'event';
  return {
    id: row.id,
    type,
    lat: row.lat,
    lng: row.lng,
    city: row.city,
    color: BEACON_COLOR[type] || BEACON_COLOR.event,
    userId: row.promoter_id || row.user_id,
    metadata: {
      title: row.title,
      intensity: row.intensity,
    },
    expiresAt: row.end_at || row.beacon_expires_at,
  };
}

/**
 * Fetch current active beacons (not expired), then subscribe to INSERT/UPDATE/DELETE.
 */
export function useGlobeBeacons(options = {}) {
  const { kindFilter = null } = options; // e.g. 'social' to only show Right Now
  const [beacons, setBeacons] = useState([]);
  const [error, setError] = useState(null);

  const fetchBeacons = useCallback(async () => {
    try {
      let q = supabase
        .from('beacons')
        .select('id, kind, type, lat, lng, city, title, intensity, end_at, promoter_id, created_date, metadata')
        .eq('active', true);

      if (kindFilter) {
        q = q.eq('kind', kindFilter);
      }

      const { data, error: e } = await q;
      if (e) throw e;
      const now = new Date();
      const notExpired = (row) => {
        const end = row.end_at || row.beacon_expires_at;
        return !end || new Date(end) > now;
      };
      setBeacons((data || []).filter(notExpired).map(mapBeaconToGlobe));
      setError(null);
    } catch (e) {
      console.warn('[useGlobeBeacons] fetch failed:', e);
      setError(e.message);
      setBeacons([]);
    }
  }, [kindFilter]);

  useEffect(() => {
    fetchBeacons();
  }, [fetchBeacons]);

  useEffect(() => {
    const channel = supabase
      .channel('globe-beacons')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Beacon',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const b = mapBeaconToGlobe(payload.new);
            if (!b.expiresAt || new Date(b.expiresAt) > new Date()) {
              setBeacons((prev) => [...prev.filter((x) => x.id !== b.id), b]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const b = mapBeaconToGlobe(payload.new);
            if (payload.new.active && (!b.expiresAt || new Date(b.expiresAt) > new Date())) {
              setBeacons((prev) => prev.map((x) => (x.id === b.id ? b : x)));
            } else {
              setBeacons((prev) => prev.filter((x) => x.id !== b.id));
            }
          } else if (payload.eventType === 'DELETE') {
            setBeacons((prev) => prev.filter((x) => x.id !== payload.old?.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { beacons, error, refetch: fetchBeacons };
}

export { BEACON_COLOR };
