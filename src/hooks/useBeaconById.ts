/**
 * useBeaconById — fetch a single beacon by id.
 *
 * Used by the entity-aware profile route (`/profile/:userId?beacon=:beaconId`)
 * to render the ActiveBeaconModule at the top of a viewed profile.
 *
 * Returns the beacon row ONLY if it is currently active and has not expired
 * (`status = 'active' AND ends_at > now()`). Beacons in draft/expired states
 * resolve to `null` so the module renders nothing — quiet states are valid.
 *
 * Doctrine: docs/doctrine/beacon-doctrine.md §12
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

export type ActiveBeacon = {
  id: string;
  code: string | null;
  type: string | null;
  beacon_category: string | null;
  owner_id: string;
  title: string | null;
  description: string | null;
  starts_at: string | null;
  ends_at: string;
  geo_lat: number | null;
  geo_lng: number | null;
  city: string | null;
  city_slug: string | null;
  intensity: number | null;
  status: string | null;
  active: boolean | null;
  visibility: string | null;
  metadata: Record<string, unknown> | null;
};

export type UseBeaconByIdResult = {
  beacon: ActiveBeacon | null;
  loading: boolean;
  error: Error | null;
};

/**
 * Globe features and the `pulse_signals` view both surface beacon ids with a
 * synthetic prefix to distinguish them from other signal kinds (presence,
 * music, market). The prefix is structural — it is NOT part of the row's
 * `beacons.id` column.
 *
 * Prefixes observed in production:
 *   - `beacon:` — emitted by `useRealtimeBeacons.js` for GeoJSON feature ids
 *   - `beacon_` — emitted by the `pulse_signals` view (`'beacon_' || b.id`)
 *
 * Both must be stripped before querying the `beacons` table, otherwise the
 * row never matches and `ActiveBeaconModule` renders a faded card for an
 * active beacon. Phil flagged this 2026-05-29 after the Friday seed run.
 */
function normaliseBeaconId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return raw.replace(/^beacon[:_]/, '');
}

export function useBeaconById(beaconId: string | null | undefined): UseBeaconByIdResult {
  const normalisedId = normaliseBeaconId(beaconId);
  const [beacon, setBeacon] = useState<ActiveBeacon | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(normalisedId));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!normalisedId) {
      setBeacon(null);
      setLoading(false);
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const nowIso = new Date().toISOString();
        const { data, error: queryError } = await supabase
          .from('beacons')
          .select('*')
          .eq('id', normalisedId)
          .eq('status', 'active')
          .gt('ends_at', nowIso)
          .maybeSingle();

        if (cancelled) return;

        if (queryError) {
          // PGRST116 = "Results contain 0 rows" — treat as not-found, not an error.
          if ((queryError as { code?: string }).code === 'PGRST116') {
            setBeacon(null);
          } else {
            setError(new Error(queryError.message || 'Failed to load beacon'));
          }
        } else {
          setBeacon((data as ActiveBeacon | null) ?? null);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error('Failed to load beacon'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [normalisedId]);

  return { beacon, loading, error };
}

export default useBeaconById;

