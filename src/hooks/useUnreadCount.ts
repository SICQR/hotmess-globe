/**
 * useUnreadCount
 *
 * Returns the total unread count for the Ghosted tab badge:
 *   - Unread chat messages (from chat_threads.unread_count JSONB, or localStorage fallback)
 *   - Unseen taps/woofs (taps received since localStorage key "ghosted_taps_seen_at")
 *
 * Call clearTapsBadge() when the user opens the Ghosted tab to reset the taps badge.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { showLocalNotification } from '@/lib/notifications/showNotification';

const TAPS_SEEN_KEY = 'ghosted_taps_seen_at';

export function useUnreadCount(): { unreadCount: number; clearTapsBadge: () => void } {
  const [chatCount, setChatCount]   = useState(0);
  const [tapsCount, setTapsCount]   = useState(0);
  const mountedRef = useRef(true);

  const unreadCount = chatCount + tapsCount;

  const clearTapsBadge = useCallback(() => {
    localStorage.setItem(TAPS_SEEN_KEY, Date.now().toString());
    if (mountedRef.current) setTapsCount(0);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // ── Fetch chat unread count ────────────────────────────────────────────
    const fetchChatCount = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mountedRef.current) return;
        const userEmail = user.email;
        if (!userEmail) return;

        // Primary: unread_count JSONB field on chat_threads
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
                const count =
                  typeof thread.unread_count === 'object' &&
                  thread.unread_count !== null
                    ? (thread.unread_count as Record<string, number>)[userEmail] || 0
                    : 0;
                return sum + count;
              }, 0);
              if (mountedRef.current) setChatCount(total);
              return;
            }

            // Fallback: localStorage-based last-read comparison
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
        } catch { /* fall through */ }

        if (mountedRef.current) setChatCount(0);
      } catch {
        if (mountedRef.current) setChatCount(0);
      }
    };

    // ── Fetch taps/woofs unread count ──────────────────────────────────────
    const fetchTapsCount = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mountedRef.current) return;
        const userEmail = user.email;
        if (!userEmail) return;

        const seenAt = parseInt(localStorage.getItem(TAPS_SEEN_KEY) || '0', 10);
        const seenAtISO = seenAt > 0
          ? new Date(seenAt).toISOString()
          : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7-day window max

        const { count, error } = await supabase
          .from('taps')
          .select('id', { count: 'exact', head: true })
          .eq('tapped_email', userEmail)
          .gt('created_at', seenAtISO);

        if (!error && count !== null && mountedRef.current) setTapsCount(count);
      } catch {
        // Non-fatal
      }
    };

    const fetchCount = () => {
      fetchChatCount();
      fetchTapsCount();
    };

    fetchCount();

    // ── Realtime: re-fetch on chat_threads, messages, and taps changes ────
    const channel = supabase
      .channel('unread-count-watcher')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_threads' }, fetchChatCount)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_threads' }, fetchChatCount)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          fetchChatCount();
          if (document.hidden) {
            const msg = payload.new as { sender_name?: string; content?: string };
            const senderLabel = msg.sender_name || 'New message';
            const preview = msg.content?.slice(0, 60) ?? '';
            showLocalNotification(
              'New message',
              preview ? `${senderLabel}: ${preview}` : senderLabel,
              '/ghosted',
              'hotmess-chat'
            );
          }
        }
      )
      // Watch taps for live badge updates
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'taps' },
        (payload) => {
          fetchTapsCount();
          if (document.hidden) {
            const tap = payload.new as { tap_type?: string };
            showLocalNotification(
              tap.tap_type === 'woof' ? 'New Woof 🐾' : 'Someone Boo\'d you 👻',
              'Check it out on Ghosted',
              '/ghosted',
              'hotmess-tap'
            );
          }
        }
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { unreadCount, clearTapsBadge };
}

export default useUnreadCount;
