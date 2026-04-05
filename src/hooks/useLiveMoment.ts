/**
 * useLiveMoment — Unified data hook for LIVE MODE.
 *
 * Pulls from multiple sources: venue check-ins, area presence, radio listeners,
 * travel sessions. Deduplicates users, enforces privacy, and returns a unified
 * data structure for LiveModeOverlay.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';
import type { LiveContext, PresenceState } from '@/contexts/LiveModeContext';

// ── Types ────────────────────────────────────────────────────────────────────

export interface LiveUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  presenceState: PresenceState;
  contextLine: string;
  secondaryLine?: string;
  distanceM: number | null;
  vibe: string | null;
  isVerified: boolean;
  primaryAction: 'ping' | 'pull_up' | 'meet_halfway';
}

export interface ContextChip {
  id: string;
  label: string;
  count: number;
  type: 'venue' | 'area' | 'radio';
  isActive: boolean;
}

export interface LiveMomentData {
  total: number;
  nearbyCount: number;
  venueCount: number;
  movingCount: number;
  radioCount: number;
  users: LiveUser[];
  contextChips: ContextChip[];
}

const EMPTY: LiveMomentData = {
  total: 0,
  nearbyCount: 0,
  venueCount: 0,
  movingCount: 0,
  radioCount: 0,
  users: [],
  contextChips: [],
};

// ── Privacy helpers ──────────────────────────────────────────────────────────

interface PrivacyRow {
  show_at_venues: boolean;
  show_nearby: boolean;
  share_vibe: boolean;
  visibility: string;
}

async function getPrivacyMap(userIds: string[]): Promise<Map<string, PrivacyRow>> {
  const map = new Map<string, PrivacyRow>();
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
  } catch { /* graceful default */ }
  return map;
}

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

async function getVibeMap(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  try {
    const { data } = await supabase
      .from('user_live_vibes')
      .select('user_id, vibe, expires_at')
      .in('user_id', userIds);
    const map = new Map<string, string>();
    const now = new Date();
    for (const row of data || []) {
      if (!row.expires_at || new Date(row.expires_at) > now) {
        map.set(row.user_id, row.vibe);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

// ── Haversine ────────────────────────────────────────────────────────────────

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

// ── Fetch functions ──────────────────────────────────────────────────────────

async function fetchLiveData(
  ctx: LiveContext,
  myUserId: string | null,
): Promise<LiveMomentData> {
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  // Collect raw user records from different sources
  const rawUsers = new Map<string, {
    source: 'venue' | 'area' | 'radio' | 'moving';
    contextLine: string;
    secondaryLine?: string;
    distanceM: number | null;
  }>();

  // 1. Venue check-ins (for venue and global modes)
  if (ctx.type === 'venue' && ctx.venueSlug) {
    const { data: checkins } = await supabase
      .from('venue_checkins')
      .select('user_id')
      .eq('place_slug', ctx.venueSlug)
      .gt('checked_in_at', fourHoursAgo)
      .order('checked_in_at', { ascending: false })
      .limit(30);

    for (const c of checkins || []) {
      if (c.user_id !== myUserId) {
        rawUsers.set(c.user_id, {
          source: 'venue',
          contextLine: `At ${ctx.venueName || 'venue'}`,
          distanceM: null,
        });
      }
    }
  }

  // 2. Area presence (for area and global modes)
  if (ctx.type === 'area' || ctx.type === 'global') {
    const { data: presence } = await supabase
      .from('user_presence')
      .select('user_id, lat, lng')
      .gt('last_seen', thirtyMinAgo)
      .not('lat', 'is', null);

    for (const p of presence || []) {
      if (p.user_id === myUserId || rawUsers.has(p.user_id)) continue;
      if (!p.lat || !p.lng) continue;

      const refLat = ctx.lat ?? 51.5074;
      const refLng = ctx.lng ?? -0.1278;
      const dist = haversineM(refLat, refLng, p.lat, p.lng);
      const radiusM = ctx.type === 'area' ? 1000 : 5000;

      if (dist <= radiusM) {
        rawUsers.set(p.user_id, {
          source: 'area',
          contextLine: ctx.areaLabel ? `Near ${ctx.areaLabel}` : 'Nearby',
          distanceM: Math.round(dist / 10) * 10, // round to 10m for privacy
        });
      }
    }
  }

  // 3. Radio listeners
  if (ctx.type === 'radio' || ctx.type === 'global') {
    const { data: listeners } = await supabase
      .from('radio_listeners')
      .select('user_id, show_id')
      .gt('updated_at', thirtyMinAgo)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

    if (ctx.type === 'radio' && ctx.radioShowId) {
      // Filter to specific show
      for (const l of (listeners || []).filter(l => l.show_id === ctx.radioShowId)) {
        if (l.user_id !== myUserId && !rawUsers.has(l.user_id)) {
          rawUsers.set(l.user_id, {
            source: 'radio',
            contextLine: 'Listening',
            secondaryLine: ctx.radioShowName,
            distanceM: null,
          });
        }
      }
    } else {
      for (const l of listeners || []) {
        if (l.user_id !== myUserId && !rawUsers.has(l.user_id)) {
          rawUsers.set(l.user_id, {
            source: 'radio',
            contextLine: 'Listening',
            distanceM: null,
          });
        }
      }
    }
  }

  // 4. Travel sessions (for global mode only)
  if (ctx.type === 'global') {
    const { data: travelers } = await supabase
      .from('travel_sessions')
      .select('user_id')
      .eq('status', 'active')
      .limit(10);

    for (const t of travelers || []) {
      if (t.user_id !== myUserId && !rawUsers.has(t.user_id)) {
        rawUsers.set(t.user_id, {
          source: 'moving',
          contextLine: 'Moving',
          distanceM: null,
        });
      }
    }
  }

  const allUserIds = Array.from(rawUsers.keys());
  if (allUserIds.length === 0) return EMPTY;

  // Fetch profiles, privacy, vibes, blocks in parallel
  const [blockedIds, privacyMap, vibeMap, profilesResult] = await Promise.all([
    getBlockedIds(myUserId),
    getPrivacyMap(allUserIds),
    getVibeMap(allUserIds),
    supabase
      .from('profiles')
      .select('id, display_name, avatar_url, is_verified, is_visible, visibility_level')
      .in('id', allUserIds.slice(0, 50))
      .eq('is_visible', true),
  ]);

  const profiles = profilesResult.data || [];

  // Build LiveUser array with privacy filtering
  const liveUsers: LiveUser[] = [];
  for (const profile of profiles) {
    if (blockedIds.has(profile.id)) continue;
    if (!profile.display_name) continue;
    if ((profile.visibility_level || 'visible') === 'invisible') continue;

    const priv = privacyMap.get(profile.id);
    if (priv?.visibility === 'invisible') continue;

    const raw = rawUsers.get(profile.id);
    if (!raw) continue;

    // Source-specific privacy checks
    if (raw.source === 'venue' && priv?.show_at_venues === false) continue;
    if ((raw.source === 'area' || raw.source === 'moving') && priv?.show_nearby === false) continue;

    // Determine vibe (only if user allows)
    const vibe = priv?.share_vibe !== false ? (vibeMap.get(profile.id) || null) : null;

    // Determine primary action
    let primaryAction: LiveUser['primaryAction'] = 'ping';
    if (raw.source === 'area') primaryAction = 'pull_up';
    if (raw.source === 'moving') primaryAction = 'meet_halfway';

    // Map source to presence state
    const presenceStateMap: Record<string, PresenceState> = {
      venue: 'at_venue',
      area: 'nearby',
      radio: 'listening',
      moving: 'moving',
    };

    liveUsers.push({
      id: profile.id,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      presenceState: presenceStateMap[raw.source] || 'nearby',
      contextLine: raw.contextLine,
      secondaryLine: raw.secondaryLine,
      distanceM: raw.distanceM,
      vibe,
      isVerified: profile.is_verified || false,
      primaryAction,
    });
  }

  // Sort: venue first, then by distance
  liveUsers.sort((a, b) => {
    const order: Record<PresenceState, number> = {
      at_venue: 0, listening: 1, nearby: 2, moving: 3, aftercare: 4,
    };
    const d = (order[a.presenceState] ?? 5) - (order[b.presenceState] ?? 5);
    if (d !== 0) return d;
    return (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity);
  });

  // Build context chips
  const chipMap = new Map<string, ContextChip>();
  for (const u of liveUsers) {
    if (u.presenceState === 'at_venue' && u.contextLine.startsWith('At ')) {
      const label = u.contextLine.replace('At ', '');
      const existing = chipMap.get(`venue-${label}`);
      if (existing) {
        existing.count++;
      } else {
        chipMap.set(`venue-${label}`, {
          id: `venue-${label}`,
          label,
          count: 1,
          type: 'venue',
          isActive: false,
        });
      }
    }
    if (u.presenceState === 'listening') {
      const label = u.secondaryLine || 'Radio';
      const existing = chipMap.get(`radio-${label}`);
      if (existing) {
        existing.count++;
      } else {
        chipMap.set(`radio-${label}`, {
          id: `radio-${label}`,
          label,
          count: 1,
          type: 'radio',
          isActive: false,
        });
      }
    }
  }

  const venueCount = liveUsers.filter(u => u.presenceState === 'at_venue').length;
  const nearbyCount = liveUsers.filter(u => u.presenceState === 'nearby').length;
  const movingCount = liveUsers.filter(u => u.presenceState === 'moving').length;
  const radioCount = liveUsers.filter(u => u.presenceState === 'listening').length;

  return {
    total: liveUsers.length,
    venueCount,
    nearbyCount,
    movingCount,
    radioCount,
    users: liveUsers,
    contextChips: Array.from(chipMap.values()),
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useLiveMoment(ctx: LiveContext | null) {
  return useQuery<LiveMomentData>({
    queryKey: ['live-moment', ctx?.type, ctx?.venueSlug, ctx?.radioShowId, ctx?.lat, ctx?.lng],
    queryFn: async () => {
      if (!ctx) return EMPTY;
      const { data: { session } } = await supabase.auth.getSession();
      const myUserId = session?.user?.id || null;
      return fetchLiveData(ctx, myUserId);
    },
    enabled: !!ctx,
    refetchInterval: 20_000,
    staleTime: 10_000,
  });
}
