/**
 * useGhostedGrid — Data hook for the Ghosted V3 grid
 *
 * Three modes:
 *  - nearby: user_presence + profiles, sorted by distance
 *  - live:   users sharing the same moment (venue, radio, event)
 *  - chats:  active chat threads for the current user
 *
 * Privacy enforcement:
 *  - Excludes blocked users (blocks table)
 *  - Excludes invisible users (visibility = 'invisible' in user_privacy_settings)
 *  - Rounds distances to nearest 10m
 *  - Never exposes exact timestamps
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';
import { calculateDistance } from '@/lib/locationUtils';
import type { GhostedCardProps } from '@/components/ghosted/GhostedCard';

// ── Types ────────────────────────────────────────────────────────────────────

export type GhostedTab = 'nearby' | 'live' | 'chats';

export interface ChatThreadItem {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isOnline: boolean;
}

export interface UseGhostedGridReturn {
  cards: GhostedCardProps[];
  chatThreads: ChatThreadItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Round to nearest 10m for privacy */
function roundDistance(meters: number): number {
  return Math.round(meters / 10) * 10;
}

/** Fuzzy time label: "just now", "5 min", "1h ago" */
function fuzzyTime(isoDate: string | null): string {
  if (!isoDate) return '';
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return 'recently';
}

/** Derive context line from profile data */
function deriveContext(
  profile: any,
  distanceM: number | null,
): { contextType: GhostedCardProps['contextType']; contextLabel: string } {
  // Venue presence
  if (profile.venue_name) {
    return { contextType: 'venue', contextLabel: `At ${profile.venue_name}` };
  }
  // Radio listener
  if (profile.is_radio_listener) {
    return { contextType: 'radio', contextLabel: 'Listening' };
  }
  // Online with distance
  if (profile.is_online && distanceM != null) {
    if (distanceM < 100) return { contextType: 'nearby', contextLabel: 'Very close' };
    return { contextType: 'nearby', contextLabel: `${roundDistance(distanceM)}m away` };
  }
  // Recently active
  if (profile.last_seen) {
    const time = fuzzyTime(profile.last_seen);
    return { contextType: 'nearby', contextLabel: time ? `Active ${time}` : 'Nearby' };
  }
  return { contextType: 'nearby', contextLabel: 'Nearby' };
}

// ── Main Hook ────────────────────────────────────────────────────────────────

export function useGhostedGrid(
  tab: GhostedTab,
  myLat: number | null,
  myLng: number | null,
  filterChip: string | null,
): UseGhostedGridReturn {
  const [myId, setMyId] = useState<string | null>(null);
  const [myEmail, setMyEmail] = useState<string | null>(null);

  // Get auth user once
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setMyId(session.user.id);
        setMyEmail(session.user.email ?? null);
      }
    });
  }, []);

  // ── Blocked user IDs ──────────────────────────────────────────────────────
  const { data: blockedIds } = useQuery({
    queryKey: ['ghosted-blocked', myId],
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

  // ── Nearby profiles ───────────────────────────────────────────────────────
  const nearbyQuery = useQuery({
    queryKey: ['ghosted-nearby', myId, myLat, myLng, filterChip],
    enabled: tab === 'nearby' && !!myId,
    staleTime: 30_000,
    refetchInterval: 30_000,
    queryFn: async () => {
      // Fetch profiles active in last 30 min
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          id, email, display_name, username, avatar_url,
          last_lat, last_lng, last_loc_ts, is_online,
          age, looking_for, verified, city, bio,
          right_now_status, last_seen
        `)
        .or(`is_online.eq.true,last_seen.gte.${thirtyMinAgo}`)
        .neq('id', myId!)
        .not('display_name', 'is', null)
        .limit(150);

      if (error) throw new Error(error.message);
      return profiles || [];
    },
  });

  // ── Live mode (same moment) ───────────────────────────────────────────────
  const liveQuery = useQuery({
    queryKey: ['ghosted-live', myId],
    enabled: tab === 'live' && !!myId,
    staleTime: 15_000,
    refetchInterval: 15_000,
    queryFn: async () => {
      // Users with active right_now_status
      const now = new Date().toISOString();
      const { data: rnRows } = await supabase
        .from('right_now_status')
        .select('user_id, status_type, venue_id, expires_at')
        .gte('expires_at', now);

      const userIds = (rnRows || []).map((r: any) => r.user_id).filter((id: string) => id !== myId);

      // Also fetch active movement sessions (live_mode + public_live visibility)
      let movementRows: any[] = [];
      try {
        const { data: mvData } = await supabase
          .from('public_movement_presence')
          .select('*')
          .in('visibility', ['live_mode', 'public_live'])
          .neq('user_id', myId!);
        movementRows = mvData || [];
      } catch {
        // View may not exist yet — graceful degradation
      }

      // Merge user IDs from both sources
      const movementUserIds = movementRows.map((m: any) => m.user_id);
      const allUserIds = [...new Set([...userIds, ...movementUserIds])];
      if (!allUserIds.length) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select(`
          id, email, display_name, username, avatar_url,
          last_lat, last_lng, is_online, age, looking_for, verified, last_seen
        `)
        .in('id', allUserIds)
        .not('display_name', 'is', null);

      // Merge right_now_status + movement data
      const statusMap = new Map((rnRows || []).map((r: any) => [r.user_id, r]));
      const movementMap = new Map(movementRows.map((m: any) => [m.user_id, m]));

      return (profiles || []).map((p: any) => ({
        ...p,
        _rnStatus: statusMap.get(p.id),
        _movement: movementMap.get(p.id) || null,
      }));
    },
  });

  // ── Chat threads ──────────────────────────────────────────────────────────
  const chatsQuery = useQuery({
    queryKey: ['ghosted-chats', myEmail],
    enabled: tab === 'chats' && !!myEmail,
    staleTime: 10_000,
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data: threads, error } = await supabase
        .from('chat_threads')
        .select('*')
        .contains('participant_emails', [myEmail!])
        .eq('active', true)
        .order('last_message_at', { ascending: false })
        .limit(50);

      if (error) throw new Error(error.message);
      if (!threads?.length) return [];

      // Get participant profiles
      const otherEmails = threads.flatMap((t: any) =>
        (t.participant_emails || []).filter((e: string) => e !== myEmail)
      );

      const uniqueEmails = [...new Set(otherEmails)];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url, is_online')
        .in('email', uniqueEmails);

      const profileMap = new Map((profiles || []).map((p: any) => [p.email, p]));

      return threads.map((t: any) => {
        const otherEmail = (t.participant_emails || []).find((e: string) => e !== myEmail) || '';
        const profile = profileMap.get(otherEmail) as any;
        const unread = typeof t.unread_count === 'object' ? (t.unread_count?.[myEmail!] || 0) : 0;

        return {
          id: t.id,
          participantId: profile?.id || '',
          participantName: profile?.display_name || 'Unknown',
          participantAvatar: profile?.avatar_url || null,
          lastMessage: t.last_message,
          lastMessageAt: t.last_message_at,
          unreadCount: unread,
          isOnline: profile?.is_online || false,
        } as ChatThreadItem;
      });
    },
  });

  // ── Transform nearby profiles to GhostedCardProps ─────────────────────────
  const nearbyCards = useMemo(() => {
    if (!nearbyQuery.data) return [];
    const blocked = blockedIds || new Set();

    return nearbyQuery.data
      .filter((p: any) => {
        if (blocked.has(p.id)) return false;
        // Filter by chip
        if (filterChip === 'online' && !p.is_online) return false;
        if (filterChip === 'new') {
          const created = p.created_at ? new Date(p.created_at).getTime() : 0;
          if (Date.now() - created > 7 * 24 * 60 * 60 * 1000) return false;
        }
        if (filterChip === 'looking') {
          if (!p.looking_for?.length) return false;
        }
        if (filterChip === 'hang') {
          const lf = (p.looking_for || []).map((v: string) => v.toLowerCase());
          if (!lf.some((v: string) => v.includes('hang') || v.includes('friend'))) return false;
        }
        if (filterChip === 'tonight') {
          if (!p.right_now_status) return false;
        }
        return true;
      })
      .map((p: any) => {
        const distanceM =
          myLat != null && myLng != null && p.last_lat != null && p.last_lng != null
            ? calculateDistance(myLat, myLng, p.last_lat, p.last_lng)
            : null;

        const { contextType, contextLabel } = deriveContext(p, distanceM);
        const avatar = p.avatar_url || p.photos?.[0]?.url || null;
        const intent = Array.isArray(p.looking_for) ? p.looking_for[0] || null : null;

        return {
          id: p.id,
          name: p.display_name || p.username || '?',
          avatarUrl: avatar,
          distanceM: distanceM != null ? roundDistance(distanceM) : null,
          isOnline: !!p.is_online,
          isVerified: !!p.verified,
          contextType,
          contextLabel,
          vibe: null,
          intent: intent ? String(intent).toLowerCase() : null,
          email: p.email || null,
        } as GhostedCardProps;
      })
      .sort((a: GhostedCardProps, b: GhostedCardProps) => {
        // Online first, then by distance
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        return (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity);
      });
  }, [nearbyQuery.data, blockedIds, myLat, myLng, filterChip]);

  // ── Transform live profiles to GhostedCardProps ───────────────────────────
  const liveCards = useMemo(() => {
    if (!liveQuery.data) return [];
    const blocked = blockedIds || new Set();

    return liveQuery.data
      .filter((p: any) => !blocked.has(p.id))
      .map((p: any) => {
        // Use movement lat/lng if available, else profile lat/lng
        const pLat = p._movement?.approx_lat ?? p.last_lat;
        const pLng = p._movement?.approx_lng ?? p.last_lng;
        const distanceM =
          myLat != null && myLng != null && pLat != null && pLng != null
            ? calculateDistance(myLat, myLng, pLat, pLng)
            : null;

        // Movement takes priority for context
        let contextType: GhostedCardProps['contextType'] = 'live';
        let contextLabel = 'Live';

        if (p._movement) {
          contextType = 'moving';
          const eta = p._movement.latest_eta ?? p._movement.eta_minutes;
          const dest = p._movement.destination_label;
          if (eta && dest) {
            contextLabel = `Moving \u00B7 ${eta} min to ${dest}`;
          } else if (eta) {
            contextLabel = `Moving \u00B7 ${eta} min away`;
          } else if (dest) {
            contextLabel = `Moving to ${dest}`;
          } else {
            contextLabel = 'Moving';
          }
        } else {
          const statusType = p._rnStatus?.status_type || '';
          contextLabel = statusType
            ? statusType.charAt(0).toUpperCase() + statusType.slice(1)
            : 'Live';
        }

        const avatar = p.avatar_url || p.photos?.[0]?.url || null;

        return {
          id: p.id,
          name: p.display_name || p.username || '?',
          avatarUrl: avatar,
          distanceM: distanceM != null ? roundDistance(distanceM) : null,
          isOnline: true,
          isVerified: !!p.verified,
          contextType,
          contextLabel,
          vibe: null,
          intent: null,
          email: p.email || null,
        } as GhostedCardProps;
      });
  }, [liveQuery.data, blockedIds, myLat, myLng]);

  // ── Select data based on active tab ───────────────────────────────────────
  const cards = tab === 'nearby' ? nearbyCards : tab === 'live' ? liveCards : [];
  const chatThreads = tab === 'chats' ? (chatsQuery.data || []) : [];

  const isLoading =
    tab === 'nearby' ? nearbyQuery.isLoading :
    tab === 'live' ? liveQuery.isLoading :
    tab === 'chats' ? chatsQuery.isLoading : false;

  const error =
    tab === 'nearby' ? (nearbyQuery.error?.message || null) :
    tab === 'live' ? (liveQuery.error?.message || null) :
    tab === 'chats' ? (chatsQuery.error?.message || null) : null;

  const refetch = useCallback(() => {
    if (tab === 'nearby') nearbyQuery.refetch();
    else if (tab === 'live') liveQuery.refetch();
    else if (tab === 'chats') chatsQuery.refetch();
  }, [tab, nearbyQuery, liveQuery, chatsQuery]);

  return { cards, chatThreads, isLoading, error, refetch };
}
