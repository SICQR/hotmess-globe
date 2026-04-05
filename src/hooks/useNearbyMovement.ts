/**
 * useNearbyMovement — Query nearby users who are currently moving.
 *
 * Returns movement data with approximate positions, ETAs, and
 * "passing near" detection. Respects privacy settings.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';

export interface NearbyMover {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  lat: number;
  lng: number;
  eta: string | null;
  destinationLabel: string | null;
  isPassingNear: boolean;
  distanceM: number;
  email: string | null;
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchNearbyMovers(lat: number, lng: number): Promise<NearbyMover[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const myId = session?.user?.id;

  // Query movement_sessions that are active
  const { data: sessions } = await supabase
    .from('movement_sessions')
    .select('user_id, destination_label, eta_minutes, visibility')
    .eq('status', 'active')
    .in('visibility', ['public_live', 'live_mode']);

  if (!sessions || sessions.length === 0) return [];

  const userIds = sessions.map(s => s.user_id).filter(id => id !== myId);
  if (userIds.length === 0) return [];

  // Get latest positions from movement_updates
  const { data: updates } = await supabase
    .from('movement_updates')
    .select('user_id, lat, lng, created_at')
    .in('user_id', userIds)
    .order('created_at', { ascending: false })
    .limit(100);

  // Deduplicate: latest position per user
  const latestPos = new Map<string, { lat: number; lng: number }>();
  for (const u of updates || []) {
    if (!latestPos.has(u.user_id) && u.lat && u.lng) {
      // Round to ~111m for privacy
      latestPos.set(u.user_id, {
        lat: Math.round(u.lat * 1000) / 1000,
        lng: Math.round(u.lng * 1000) / 1000,
      });
    }
  }

  // Get privacy settings
  const { data: privacyRows } = await supabase
    .from('user_privacy_settings')
    .select('user_id, show_nearby, visibility')
    .in('user_id', userIds);

  const privMap = new Map<string, { show_nearby: boolean; visibility: string }>();
  for (const p of privacyRows || []) {
    privMap.set(p.user_id, { show_nearby: p.show_nearby ?? true, visibility: p.visibility ?? 'visible' });
  }

  // Get profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, email')
    .in('id', userIds);

  const profileMap = new Map<string, { display_name: string; avatar_url: string | null; email: string | null }>();
  for (const p of profiles || []) {
    profileMap.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url, email: p.email });
  }

  // Build movers
  const movers: NearbyMover[] = [];
  const radiusM = 5000; // 5km

  for (const session of sessions) {
    if (session.user_id === myId) continue;

    const priv = privMap.get(session.user_id);
    if (priv?.show_nearby === false) continue;
    if (priv?.visibility === 'invisible') continue;

    const pos = latestPos.get(session.user_id);
    if (!pos) continue;

    const dist = haversineM(lat, lng, pos.lat, pos.lng);
    if (dist > radiusM) continue;

    const profile = profileMap.get(session.user_id);
    const isPassingNear = dist < 500; // within 500m = "passing near"

    movers.push({
      userId: session.user_id,
      displayName: profile?.display_name || 'Anonymous',
      avatarUrl: profile?.avatar_url || null,
      lat: pos.lat,
      lng: pos.lng,
      eta: session.eta_minutes ? `${session.eta_minutes} min` : null,
      destinationLabel: session.destination_label || null,
      isPassingNear,
      distanceM: Math.round(dist),
      email: profile?.email || null,
    });
  }

  // Sort by distance
  movers.sort((a, b) => a.distanceM - b.distanceM);
  return movers;
}

export function useNearbyMovement(lat?: number | null, lng?: number | null) {
  return useQuery<NearbyMover[]>({
    queryKey: ['nearby-movement', lat, lng],
    queryFn: () => fetchNearbyMovers(lat!, lng!),
    enabled: lat != null && lng != null,
    refetchInterval: 20_000,
    staleTime: 10_000,
  });
}
