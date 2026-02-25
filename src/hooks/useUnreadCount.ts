/**
 * useUnreadCount
 *
 * Returns the total number of unread messages for the current user.
 *
 * Schema notes:
 * - messages table uses: thread_id, sender_email, content, message_type,
 *   created_date — there is NO recipient_id column and NO read_at column.
 * - chat_threads has: participant_emails[], last_message_at, unread_count (JSONB keyed by email)
 *
 * Strategy:
 *   1. Primary: sum chat_threads.unread_count[userEmail] for all threads
 *      the user participates in (same approach as useRealtimeChat).
 *   2. Fallback: count threads where last_message_at is newer than the
 *      localStorage "last read" timestamp we write on openThread.
 *   3. If both fail, return 0 silently.
 *
 * Live updates come via Supabase Realtime on the chat_threads table.
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { showLocalNotification } from '@/lib/notifications/showNotification';

export function useUnreadCount(): { unreadCount: number } {
  const [unreadCount, setUnreadCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const fetchCount = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || !mountedRef.current) return;

        const userEmail = user.email;
        if (!userEmail) return;

        // ── Primary: unread_count JSONB field on chat_threads ──────────────
        try {
          const { data: threads, error } = await supabase
            .from('chat_threads')
            .select('id, last_message_at, unread_count')
            .contains('participant_emails', [userEmail])
            .eq('active', true);

          if (!error && threads) {
            // Try summing unread_count[userEmail] if the field exists
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

              if (mountedRef.current) setUnreadCount(total);
              return;
            }

            // ── Fallback: localStorage-based last-read comparison ───────────
            const unreadThreads = threads.filter((t) => {
              if (!t.last_message_at) return false;
              try {
                const lastRead = parseInt(
                  localStorage.getItem(`chat_read_${t.id}`) || '0',
                  10
                );
                return new Date(t.last_message_at).getTime() > lastRead;
              } catch {
                return false;
              }
            });

            if (mountedRef.current) setUnreadCount(unreadThreads.length);
            return;
          }
        } catch {
          // fall through to 0
        }

        // If all queries failed, leave count at 0
        if (mountedRef.current) setUnreadCount(0);
      } catch {
        // Non-fatal: leave count at 0
        if (mountedRef.current) setUnreadCount(0);
      }
    };

    fetchCount();

    // ── Realtime: re-fetch on any chat_threads change ──────────────────────
    const channel = supabase
      .channel('unread-count-watcher')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_threads' },
        fetchCount
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_threads' },
        fetchCount
      )
      // Also watch messages inserts so the badge reacts when a new message lands
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          fetchCount();
          // Fire a local push notification when the tab is backgrounded
          if (document.hidden) {
            const msg = payload.new as {
              sender_name?: string;
              content?: string;
            };
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
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { unreadCount };
}

export default useUnreadCount;
