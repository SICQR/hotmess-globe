/**
 * useUnreadCount
 *
 * Returns the total unread count for the Ghosted tab badge:
 *   - Unread chat messages (from chat_threads.unread_count JSONB, or localStorage fallback)
 *   - Unseen boos (taps received since localStorage key "ghosted_taps_seen_at")
 *
 * Call clearTapsBadge() when the user opens the Ghosted tab to reset the taps badge.
 */

import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { showLocalNotification } from '@/lib/notifications/showNotification';

const TAPS_SEEN_KEY = 'ghosted_taps_seen_at';

export function useUnreadCount(): { unreadCount: number; clearTapsBadge: () => void; fetchChatCount: () => Promise<void> } {
  const [chatCount, setChatCount]   = useState(0);
  const [tapsCount, setTapsCount]   = useState(0);
  const mountedRef = useRef(true);
  const retryRef   = useRef(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const uid = useId().replace(/:/g, '-');

  const unreadCount = chatCount + tapsCount;

  const clearTapsBadge = useCallback(() => {
    localStorage.setItem(TAPS_SEEN_KEY, Date.now().toString());
    if (mountedRef.current) setTapsCount(0);
  }, []);

  // ── Fetch chat unread count ────────────────────────────────────────────
  const fetchChatCount = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || !mountedRef.current) return;
      const userEmail = user.email;
      if (!userEmail) return;

      try {
        const { data: threads, error } = await supabase
          .from('chat_threads')
          .select('id, last_message_at, unread_count')
          .contains('participant_emails', [userEmail])
          .eq('active', true);

        if (!error && threads) {
          const hasUnreadCountField = threads.some(
            (t) => t.unread_count !== undefined && t.unread_count !== null
          );

          if (hasUnreadCountField) {
            const total = threads.reduce((sum, thread) => {
              const counts = thread.unread_count as Record<string, number> || {};
              const userKey = userEmail.toLowerCase();
              const threadUnread = Object.entries(counts)
                .filter(([k]) => k.toLowerCase() === userKey)
                .reduce((s, [_, v]) => s + v, 0);
              return sum + threadUnread;
            }, 0);
            if (mountedRef.current) setChatCount(total);
            return;
          }

          const unreadThreads = threads.filter((t) => {
            if (!t.last_message_at) return false;
            try {
              const lastRead = parseInt(localStorage.getItem(`chat_read_${t.id}`) || '0', 10);
              return new Date(t.last_message_at).getTime() > lastRead;
            } catch { return false; }
          });
          if (mountedRef.current) setChatCount(unreadThreads.length);
          return;
        }
      } catch { }
      if (mountedRef.current) setChatCount(0);
    } catch {
      if (mountedRef.current) setChatCount(0);
    }
  }, []);

  // ── Fetch boos unread count ─────────────────────────────────────────────
  const fetchTapsCount = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user?.id || !mountedRef.current) return;

      const seenAt = parseInt(localStorage.getItem(TAPS_SEEN_KEY) || '0', 10);
      const seenAtISO = seenAt > 0
        ? new Date(seenAt).toISOString()
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { count, error } = await supabase
        .from('taps')
        .select('id', { count: 'exact', head: true })
        .eq('to_user_id', user.id)
        .gt('created_at', seenAtISO);

      if (!error && count !== null && mountedRef.current) setTapsCount(count);
    } catch { }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const fetchCount = () => {
      fetchChatCount();
      fetchTapsCount();
    };

    fetchCount();

    const subscribe = () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      const ch = supabase
        .channel(`unread-count-watcher-${uid}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_threads' }, fetchChatCount)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_threads' }, fetchChatCount)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
          fetchChatCount();
          if (document.hidden) {
            const msg = payload.new as { sender_email?: string; content?: string };
            const senderLabel = msg.sender_email?.split('@')[0] || 'New message';
            const preview = msg.content?.slice(0, 60) ?? '';
            showLocalNotification('New message', preview ? `${senderLabel}: ${preview}` : senderLabel, '/ghosted', 'hotmess-chat');
          }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'taps' }, () => {
          fetchTapsCount();
          if (document.hidden) {
            showLocalNotification('Someone Boo\'d you 👻', 'Check it out on Ghosted', '/ghosted', 'hotmess-tap');
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            retryRef.current = 0;
          } else if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && mountedRef.current) {
            const delay = Math.min(1000 * Math.pow(2, retryRef.current), 30_000);
            retryRef.current += 1;
            setTimeout(() => { if (mountedRef.current) subscribe(); }, delay);
          }
        });
      channelRef.current = ch;
    };

    subscribe();

    return () => {
      mountedRef.current = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [fetchChatCount, fetchTapsCount, uid]);

  return { unreadCount, clearTapsBadge, fetchChatCount };
}

export default useUnreadCount;
