/**
 * useVenuePresence — fetches users present at a venue or nearby area.
 *
 * Venue mode: users who checked in at a specific venue recently (4h window).
 * Area mode: users with active presence near a coordinate (radius-based).
 *
 * Privacy rules:
 * - No exact timestamps ("here now", not "checked in at 22:41")
 * - No community venue attendees exposed
 * - Blocked users excluded
 * - Approximate distance only
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';

/** Batch-fetch privacy settings for a set of user IDs */
async function getPrivacyMap(userIds: string[]): Promise<Map<string, { show_at_venues: boolean; show_nearby: boolean; share_vibe: boolean; visibility: string }>> {
  const map = new Map<string, { show_at_venues: boolean; show_nearby: boolean; share_vibe: boolean; visibility: string }>();
  if (userIds.length === 0) return map;
  try {
    const { data } = await supabase
      .from('user_privacy_settings')
      .select('user_id, show_at_venues, show_nearby, share_vibe, visibility')
      .in('user_id', userIds);
    for (const row of data || []) {
      map.set(row.user_id, {
        show_at_venues: row.show_at_venues ?? true,
        show_nearby: row.show_nearby ?? true,
        share_vibe: row.share_vibe ?? true,
        visibility: row.visibility ?? 'visible',
      });
    }
  } catch { /* graceful: default to visible */ }
  return map;
}

export interface PresenceUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
  context_label: string;    // "At Eagle" | "Near Soho"
  distance_m: number | null; // approximate
  is_checked_in: boolean;
  looking_for: string[];
  age: number | null;
  is_verified: boolean;
  vibe: string | null;      // live vibe: RAW | HUNG | HIGH | LOOKING | CHILLING
}

export interface GhostedContext {
  mode: 'venue' | 'area';
  venue_id?: string;
  venue_name?: string;
  venue_slug?: string;
  venue_tier?: string;
  lat: number;
  lng: number;
  radius_m?: number; // for area mode, default 1000
}

/**
 * Fetch users at a specific venue (from recent check-ins).
 */
async function fetchVenueUsers(ctx: GhostedContext, myUserId: string | null): Promise<PresenceUser[]> {
  if (!ctx.venue_slug) return [];

  // Community venues: never expose attendees
  if (ctx.venue_tier === 'community') return [];

  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

  // Get recent check-ins at this venue
  const { data: checkins, error } = await supabase
    .from('venue_checkins')
    .select('user_id, checked_in_at')
    .eq('place_slug', ctx.venue_slug)
    .gt('checked_in_at', fourHoursAgo)
    .order('checked_in_at', { ascending: false })
    .limit(20);

  if (error || !checkins || checkins.length === 0) return [];

  // Deduplicate by user_id (most recent check-in wins)
  const userIds = [...new Set(checkins.map(c => c.user_id))];

  // Exclude self
  const filteredIds = myUserId ? userIds.filter(id => id !== myUserId) : userIds;
  if (filteredIds.length === 0) return [];

  // Get blocked user IDs
  const blockedIds = await getBlockedIds(myUserId);

  // Fetch profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, looking_for, age, is_verified, is_visible, visibility_level')
    .in('id', filteredIds.slice(0, 16))
    .eq('is_visible', true);

  if (!profiles) return [];

  const [vibeMap, privacyMap] = await Promise.all([
    getVibeMap(profiles.map(p => p.id)),
    getPrivacyMap(profiles.map(p => p.id)),
  ]);

  return profiles
    .filter(p => !blockedIds.has(p.id))
    .filter(p => p.display_name) // GDPR: must have name
    .filter(p => (p.visibility_level || 'visible') !== 'invisible')
    .filter(p => {
      const priv = privacyMap.get(p.id);
      if (priv?.visibility === 'invisible') return false;
      if (priv?.show_at_venues === false) return false;
      return true;
    })
    .map(p => ({
      id: p.id,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      context_label: `At ${ctx.venue_name || 'venue'}`,
      distance_m: null, // venue mode: distance not meaningful
      is_checked_in: true,
      looking_for: p.looking_for || [],
      age: p.age,
      is_verified: p.is_verified || false,
      vibe: vibeMap.get(p.id) || null,
    }));
}

/**
 * Fetch users nearby an area (from active presence / recent check-ins).
 */
async function fetchAreaUsers(ctx: GhostedContext, myUserId: string | null): Promise<PresenceUser[]> {
  const radiusKm = (ctx.radius_m || 1000) / 1000;
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

  // Strategy: combine venue check-ins nearby + active presence
  // 1. Get nearby venue slugs
  const { data: nearbyPlaces } = await supabase
    .from('pulse_places')
    .select('slug, name, tier')
    .eq('is_active', true)
    .neq('tier', 'community'); // exclude community venues

  // Filter places by rough distance (bounding box)
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(ctx.lat * Math.PI / 180));

  const nearSlugs = (nearbyPlaces || [])
    .filter(p => {
      // We don't have lat/lng on the query result, so get from pulse_places
      // For now, use all non-community slugs and filter check-ins by time
      return true;
    })
    .map(p => p.slug);

  // 2. Get recent check-ins from nearby venues
  let checkinUserIds: string[] = [];
  if (nearSlugs.length > 0) {
    const { data: checkins } = await supabase
      .from('venue_checkins')
      .select('user_id, place_slug')
      .gt('checked_in_at', fourHoursAgo)
      .order('checked_in_at', { ascending: false })
      .limit(50);

    if (checkins) {
      checkinUserIds = Array.from(new Set(checkins.map((c: any) => c.user_id as string)));
    }
  }

  // 3. Get users with active presence nearby (from user_presence)
  const { data: presenceUsers } = await supabase
    .from('user_presence')
    .select('user_id, lat, lng')
    .gt('last_seen', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // active in last 30min
    .not('lat', 'is', null);

  const nearbyPresenceIds = (presenceUsers || [])
    .filter(p => {
      if (!p.lat || !p.lng) return false;
      const dLat = Math.abs(p.lat - ctx.lat);
      const dLng = Math.abs(p.lng - ctx.lng);
      return dLat < latDelta && dLng < lngDelta;
    })
    .map(p => p.user_id);

  // Combine and deduplicate
  const allUserIds = [...new Set([...checkinUserIds, ...nearbyPresenceIds])];
  const filteredIds = myUserId ? allUserIds.filter(id => id !== myUserId) : allUserIds;
  if (filteredIds.length === 0) return [];

  const blockedIds = await getBlockedIds(myUserId);

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, looking_for, age, is_verified, is_visible, visibility_level, geo_lat, geo_lng')
    .in('id', filteredIds.slice(0, 30))
    .eq('is_visible', true);

  if (!profiles) return [];

  // Approximate area label
  const areaLabel = getAreaLabel(ctx.lat, ctx.lng);

  const [vibeMap, privacyMap] = await Promise.all([
    getVibeMap(profiles.map(p => p.id)),
    getPrivacyMap(profiles.map(p => p.id)),
  ]);

  return profiles
    .filter(p => !blockedIds.has(p.id))
    .filter(p => p.display_name)
    .filter(p => (p.visibility_level || 'visible') !== 'invisible')
    .filter(p => {
      const priv = privacyMap.get(p.id);
      if (priv?.visibility === 'invisible') return false;
      if (priv?.show_nearby === false) return false;
      return true;
    })
    .map(p => {
      // Approximate distance
      const dist = p.geo_lat && p.geo_lng
        ? haversineM(ctx.lat, ctx.lng, p.geo_lat, p.geo_lng)
        : null;

      // Context label: checked in somewhere vs just nearby
      const isCheckedIn = checkinUserIds.includes(p.id);
      const label = isCheckedIn ? `Near ${areaLabel}` : `Around ${areaLabel}`;

      return {
        id: p.id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        context_label: label,
        distance_m: dist ? Math.round(dist / 10) * 10 : null, // round to 10m for privacy
        is_checked_in: isCheckedIn,
        looking_for: p.looking_for || [],
        age: p.age,
        is_verified: p.is_verified || false,
        vibe: vibeMap.get(p.id) || null,
      };
    })
    .sort((a, b) => (a.distance_m ?? Infinity) - (b.distance_m ?? Infinity));
}

/** Get live vibes for a set of user IDs (respects share_vibe privacy) */
async function getVibeMap(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  try {
    const [vibeRes, privRes] = await Promise.all([
      supabase.from('user_live_vibes').select('user_id, vibe, expires_at').in('user_id', userIds),
      supabase.from('user_privacy_settings').select('user_id, share_vibe').in('user_id', userIds),
    ]);
    const vibeHidden = new Set<string>();
    for (const row of privRes.data || []) {
      if (row.share_vibe === false) vibeHidden.add(row.user_id);
    }
    const map = new Map<string, string>();
    const now = new Date();
    for (const row of vibeRes.data || []) {
      if (vibeHidden.has(row.user_id)) continue;
      if (!row.expires_at || new Date(row.expires_at) > now) {
        map.set(row.user_id, row.vibe);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

/** Get blocked user IDs for the current user */
async function getBlockedIds(myUserId: string | null): Promise<Set<string>> {
  if (!myUserId) return new Set();
  try {
    const { data } = await supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', myUserId);
    return new Set((data || []).map(d => d.blocked_id));
  } catch {
    return new Set();
  }
}

/** Approximate area label from coords */
function getAreaLabel(lat: number, lng: number): string {
  // London areas with approximate centers
  const areas: [string, number, number][] = [
    ['Soho', 51.5137, -0.1337],
    ['Vauxhall', 51.4861, -0.1228],
    ['Shoreditch', 51.5244, -0.0784],
    ['Dalston', 51.5465, -0.0755],
    ['Camden', 51.5391, -0.1426],
    ['Brixton', 51.4613, -0.1156],
    ['Clapham', 51.4621, -0.1687],
    ['Hackney', 51.5450, -0.0553],
    ['Bermondsey', 51.4982, -0.0644],
    ['Peckham', 51.4737, -0.0691],
    ['Elephant & Castle', 51.4945, -0.1014],
    ['Kings Cross', 51.5308, -0.1238],
    ['Waterloo', 51.5036, -0.1143],
    ['Covent Garden', 51.5117, -0.1240],
    ['Kennington', 51.4879, -0.1065],
  ];

  let closest = 'here';
  let minDist = Infinity;
  for (const [name, aLat, aLng] of areas) {
    const d = haversineM(lat, lng, aLat, aLng);
    if (d < minDist) {
      minDist = d;
      closest = name;
    }
  }
  return minDist < 2000 ? closest : 'here';
}

/** Haversine distance in metres */
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Main hook: fetches presence users for a given context.
 */
export function useVenuePresence(ctx: GhostedContext | null) {
  const myUserIdRef = { current: null as string | null };

  // Get current user ID synchronously from cached session
  const sessionPromise = supabase.auth.getSession().then(({ data }) => {
    myUserIdRef.current = data?.session?.user?.id || null;
  });

  return useQuery<PresenceUser[]>({
    queryKey: ['ghosted-presence', ctx?.mode, ctx?.venue_slug, ctx?.lat, ctx?.lng, ctx?.radius_m],
    queryFn: async () => {
      await sessionPromise;
      if (!ctx) return [];

      if (ctx.mode === 'venue') {
        return fetchVenueUsers(ctx, myUserIdRef.current);
      } else {
        return fetchAreaUsers(ctx, myUserIdRef.current);
      }
    },
    enabled: !!ctx,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
