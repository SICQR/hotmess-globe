/**
 * usePresence — Channel-based presence tracking for HOTMESS OS
 *
 * Adapted from SICQR/ghosted. Provides:
 * - usePresence(): Track who's online in a Supabase Realtime channel
 * - useUserPresence(): Watch a single user's online/last_seen status
 * - useHeartbeat(): Periodic online heartbeat + beforeunload cleanup
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceUser {
  userId: string;
  name: string;
  avatar: string;
  onlineAt: number;
}

/**
 * Track all online users in a Realtime presence channel.
 * Use for proximity grids, "who's nearby" indicators, etc.
 */
export function usePresence(channelName: string = 'nearby-users') {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, PresenceUser>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase.channel(channelName, {
      config: { presence: { key: '' } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const users = new Map<string, PresenceUser>();
        Object.values(presenceState).forEach((presences) => {
          (presences as any[]).forEach((p) => {
            if (p.userId) {
              users.set(p.userId, {
                userId: p.userId,
                name: p.name || 'Anonymous',
                avatar: p.avatar || '',
                onlineAt: p.onlineAt || Date.now(),
              });
            }
          });
        });
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        setOnlineUsers((current) => {
          const updated = new Map(current);
          (newPresences as any[]).forEach((p) => {
            if (p.userId) {
              updated.set(p.userId, {
                userId: p.userId,
                name: p.name || 'Anonymous',
                avatar: p.avatar || '',
                onlineAt: p.onlineAt || Date.now(),
              });
            }
          });
          return updated;
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        setOnlineUsers((current) => {
          const updated = new Map(current);
          (leftPresences as any[]).forEach((p) => {
            if (p.userId) updated.delete(p.userId);
          });
          return updated;
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelName]);

  const trackPresence = async (userId: string, name: string, avatar: string) => {
    if (channelRef.current) {
      await channelRef.current.track({ userId, name, avatar, onlineAt: Date.now() });
    }
  };

  const untrackPresence = async () => {
    if (channelRef.current) {
      await channelRef.current.untrack();
    }
  };

  return {
    onlineUsers,
    onlineCount: onlineUsers.size,
    trackPresence,
    untrackPresence,
    isOnline: (userId: string) => onlineUsers.has(userId),
  };
}

/**
 * Watch a single user's online status via DB polling + realtime.
 */
export function useUserPresence(userId: string | null) {
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsOnline(false);
      return;
    }

    async function checkPresence() {
      const { data } = await supabase
        .from('profiles')
        .select('is_online, last_loc_ts')
        .eq('auth_user_id', userId)
        .single();

      if (data) {
        setIsOnline(data.is_online || false);
        setLastSeen(data.last_loc_ts ? new Date(data.last_loc_ts) : null);
      }
    }

    checkPresence();

    const channel = supabase
      .channel(`user-presence-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `auth_user_id=eq.${userId}`,
        },
        (payload: any) => {
          if (payload.new) {
            setIsOnline(payload.new.is_online || false);
            setLastSeen(payload.new.last_loc_ts ? new Date(payload.new.last_loc_ts) : null);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]);

  return { isOnline, lastSeen };
}

/**
 * Heartbeat: periodically update the user's online status.
 * Sets is_online=false on beforeunload.
 */
export function useHeartbeat(userId: string | null, intervalMs: number = 30000) {
  useEffect(() => {
    if (!userId) return;

    const updatePresence = async () => {
      await supabase
        .from('profiles')
        .update({ is_online: true, last_loc_ts: new Date().toISOString() })
        .eq('auth_user_id', userId);
    };

    updatePresence();
    const interval = setInterval(updatePresence, intervalMs);

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable beforeunload
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?auth_user_id=eq.${userId}`;
      const body = JSON.stringify({ is_online: false, last_loc_ts: new Date().toISOString() });
      navigator.sendBeacon?.(url, new Blob([body], { type: 'application/json' }));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Mark offline on unmount
      supabase
        .from('profiles')
        .update({ is_online: false, last_loc_ts: new Date().toISOString() })
        .eq('auth_user_id', userId);
    };
  }, [userId, intervalMs]);
}
