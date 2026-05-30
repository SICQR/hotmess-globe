/**
 * useNearbyMovement — Query nearby users who are actively moving
 *
 * Reads from public_movement_presence view (already privacy-filtered).
 * Calculates distance from current user, marks isPassingNear if within 500m.
 * Excludes blocked users. 20s refetch interval.
 */

import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';
import { calculateDistance } from '@/lib/locationUtils';

// ── Types ────────────────────────────────────────────────────────────────────

export interface NearbyMover {
  sessionId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  originArea: string | null;
  destinationLabel: string | null;
  etaMinutes: number | null;
  approxLat: number | null;
  approxLng: number | null;
  headingDegrees: number | null;
  distanceM: number | null;
  isPassingNear: boolean;
  lastUpdate: string | null;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

const PASSING_NEAR_M = 500;

export function useNearbyMovement(
  lat: number | null,
  lng: number | null,
  radiusM: number = 10_000,
): {
  movers: NearbyMover[];
  loading: boolean;
} {
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setMyId(session.user.id);
    });
  }, []);

  // Blocked user IDs
  const { data: blockedIds } = useQuery({
    queryKey: ['movement-blocked', myId],
    enabled: !!myId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', myId!);
      return new Set((data || []).map((r: any) => r.blocked_id));
    },
  });

  // Query public_movement_presence view
  const { data: rawMovers, isLoading } = useQuery({
    queryKey: ['nearby-movement', myId, lat, lng],
    enabled: !!myId,
    staleTime: 15_000,
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_movement_presence')
        .select('*')
        .in('visibility', ['live_mode', 'public_live'])
        .neq('user_id', myId!);

      if (error) throw error;
      return data || [];
    },
  });

  // Transform + filter + sort
  const movers = useMemo(() => {
    if (!rawMovers) return [];
    const blocked = blockedIds || new Set();

    return rawMovers
      .filter((m: any) => !blocked.has(m.user_id))
      .map((m: any) => {
        const distanceM =
          lat != null && lng != null && m.approx_lat != null && m.approx_lng != null
            ? calculateDistance(lat, lng, m.approx_lat, m.approx_lng)
            : null;

        return {
          sessionId: m.session_id,
          userId: m.user_id,
          displayName: m.display_name || 'Someone',
          avatarUrl: m.avatar_url,
          isVerified: !!m.is_verified,
          originArea: m.origin_area,
          destinationLabel: m.destination_label,
          etaMinutes: m.latest_eta ?? m.eta_minutes,
          approxLat: m.approx_lat,
          approxLng: m.approx_lng,
          headingDegrees: m.heading_degrees,
          distanceM,
          isPassingNear: distanceM != null && distanceM <= PASSING_NEAR_M,
          lastUpdate: m.last_update,
        } as NearbyMover;
      })
      .filter((m: NearbyMover) => m.distanceM == null || m.distanceM <= radiusM)
      .sort((a: NearbyMover, b: NearbyMover) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity));
  }, [rawMovers, blockedIds, lat, lng, radiusM]);

  return { movers, loading: isLoading };
}
