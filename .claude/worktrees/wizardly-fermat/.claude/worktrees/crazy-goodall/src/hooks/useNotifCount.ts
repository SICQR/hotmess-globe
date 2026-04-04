/**
 * useNotifCount
 *
 * Returns the count of unread rows in the `notifications` table for the
 * current user. Used to drive the badge on the Profile tab in OSBottomNav.
 *
 * Separate from useUnreadCount (which handles taps + chat for the Ghosted tab)
 * to keep the two badges independent and avoid accidental double-counting.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

export function useNotifCount(): { notifCount: number; clearNotifBadge: () => void } {
  const [notifCount, setNotifCount] = useState(0);
  const mountedRef  = useRef(true);
  const emailRef    = useRef<string | null>(null);

  const clearNotifBadge = useCallback(() => {
    if (mountedRef.current) setNotifCount(0);
    // Mark all as read in the DB (fire-and-forget)
    if (emailRef.current) {
      supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_email', emailRef.current)
        .eq('read', false)
        .then(({ error }) => {
          if (error) console.warn('[useNotifCount] mark-all-read failed:', error.message);
        });
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const fetchCount = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email || !mountedRef.current) return;
        emailRef.current = user.email;

        const { count, error } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_email', user.email)
          .eq('read', false);

        if (!error && count !== null && mountedRef.current) setNotifCount(count);
      } catch { /* non-fatal */ }
    };

    fetchCount();

    // Live updates: re-count when a new notification is inserted or read status changes
    const channel = supabase
      .channel('notif-count-watcher')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => { if (mountedRef.current) fetchCount(); }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        () => { if (mountedRef.current) fetchCount(); }
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { notifCount, clearNotifBadge };
}

export default useNotifCount;
