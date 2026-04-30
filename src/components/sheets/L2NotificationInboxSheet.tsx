/**
 * L2NotificationInboxSheet — In-app notification feed
 *
 * Reads from the `notifications` table for the current user.
 * Marks everything as read on open.
 * Tapping a row deep-links into the relevant sheet.
 *
 * Type → action mapping:
 *   boo                 → openSheet('taps')
 *   message             → openSheet('chat', { threadId })      metadata.thread_id
 *   event / event_reminder → openSheet('event', { id })        metadata.event_id
 *   location_share_started → openSheet('location-watcher', { shareId, sharerName })
 *   location_share_ended   → no action (info only)
 *   welcome / *            → no action
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, MessageCircle, Ghost, MapPin, Radio,
  Calendar, CheckCheck, Loader2, Inbox,
} from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Notif {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  metadata: any;
  read: boolean;
  created_at: string;
}

// ── Icon + colour per type ────────────────────────────────────────────────────
function typeConfig(type: string): { Icon: React.ElementType; color: string; bg: string } {
  switch (type) {
    case 'boo':
      return { Icon: Ghost,          color: '#C8962C', bg: 'rgba(200,150,44,0.15)' };
    case 'message':
      return { Icon: MessageCircle,  color: '#00C2E0', bg: 'rgba(0,194,224,0.12)' };
    case 'event':
    case 'event_reminder':
      return { Icon: Calendar,       color: '#C8962C', bg: 'rgba(200,150,44,0.15)' };
    case 'location_share_started':
      return { Icon: Radio,          color: '#39FF14', bg: 'rgba(57,255,20,0.12)' };
    case 'location_share_ended':
      return { Icon: MapPin,         color: '#8E8E93', bg: 'rgba(142,142,147,0.12)' };
    default:
      return { Icon: Bell,           color: '#C8962C', bg: 'rgba(200,150,44,0.15)' };
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function L2NotificationInboxSheet() {
  const { openSheet } = useSheet();
  const [notifs, setNotifs]     = useState<Notif[]>([]);
  const [loading, setLoading]   = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // ── Load notifications ──────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email || !mountedRef.current) {
        console.warn('[Inbox] No user email found or component unmounted');
        return;
      }
      setUserEmail(user.email);

      console.log('[Inbox] Looking for notifications for:', user.email);

      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, body, link, metadata, read, created_at')
        .eq('user_email', user.email)
        .order('created_at', { ascending: false })
        .limit(60);

      if (error) {
        console.error('[Inbox] Fetch error:', error.message);
      } else {
        console.log('[Inbox] Notifications found:', data?.length || 0);
        if (data && mountedRef.current) setNotifs(data as Notif[]);
      }
    } catch (err: any) { 
      console.error('[Inbox] Critical error:', err.message);
    }
    finally { if (mountedRef.current) setLoading(false); }
  }, []);

  // ── Mark all as read when the sheet opens ──────────────────────────────
  const markAllRead = useCallback(async (email: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_email', email)
      .eq('read', false);

    // Optimistically update local state
    if (mountedRef.current) {
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load().then(() => {
      // After loading, mark all read
      supabase.auth.getUser().then(({ data }) => {
        if (data.user?.email) markAllRead(data.user.email);
      });
    });

    // Realtime: prepend new notifications as they arrive
    const channel = supabase
      .channel('notif-inbox-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          if (!mountedRef.current) return;
          const n = payload.new as Notif & { user_email?: string };
          // Only show if it's for this user
          if (userEmail && n.user_email !== userEmail) return;
          setNotifs(prev => [{ ...n, read: false }, ...prev]);
        }
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [load, markAllRead, userEmail]);

  // ── Handle tap on a notification row ───────────────────────────────────
  const handleTap = useCallback((n: Notif) => {
    const meta = n.metadata ?? {};

    switch (n.type) {
      case 'boo':
        openSheet('taps', {});
        break;

      case 'message':
        if (meta.thread_id) {
          openSheet('chat', { threadId: meta.thread_id });
        }
        break;

      case 'event':
      case 'event_reminder':
        if (meta.event_id) {
          openSheet('event', { id: meta.event_id });
        }
        break;

      case 'location_share_started': {
        const shareId    = meta.share_id as string | undefined;
        const sharerName = (n.title.split(' is sharing')[0]) || 'Someone';
        if (shareId) {
          openSheet('location-watcher', { shareId, sharerName });
        }
        break;
      }

      // location_share_ended, welcome, unknown — no action
      default:
        break;
    }
  }, [openSheet]);

  // ── Whether a row is tappable ───────────────────────────────────────────
  const isTappable = (type: string) =>
    ['boo', 'message', 'event', 'event_reminder', 'location_share_started'].includes(type);

  // ── Render ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-7 h-7 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <div className="flex flex-col min-h-0">

      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#C8962C]" />
          <span className="text-sm font-semibold text-white">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 text-xs bg-[#C8962C] text-black font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </span>
        </div>
        {notifs.length > 0 && (
          <button
            onClick={() => userEmail && markAllRead(userEmail)}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-[#C8962C] transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Empty state */}
      {notifs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 px-6 text-center">
          <Inbox className="w-10 h-10 text-white/15" />
          <p className="text-sm font-semibold text-white/30">All clear</p>
          <p className="text-xs text-white/20">New boos, messages and alerts will appear here.</p>
        </div>
      )}

      {/* Notification list */}
      <div className="flex flex-col divide-y divide-white/[0.05]">
        <AnimatePresence initial={false}>
          {notifs.map((n) => {
            const { Icon, color, bg } = typeConfig(n.type);
            const tappable = isTappable(n.type);
            const timeAgo  = formatDistanceToNow(new Date(n.created_at), { addSuffix: true });

            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => tappable && handleTap(n)}
                className={cn(
                  'flex items-start gap-3 px-4 py-3.5 transition-colors',
                  tappable && 'active:bg-white/[0.04] cursor-pointer',
                  !n.read && 'bg-white/[0.025]'
                )}
              >
                {/* Icon */}
                <div
                  className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: bg }}
                >
                  <Icon className="w-4.5 h-4.5" style={{ color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={cn(
                      'text-sm leading-tight truncate',
                      n.read ? 'text-white/70 font-normal' : 'text-white font-semibold'
                    )}>
                      {n.title}
                    </p>
                    <span className="text-[10px] text-white/25 flex-shrink-0">{timeAgo}</span>
                  </div>
                  <p className="text-xs text-white/45 mt-0.5 leading-snug line-clamp-2">
                    {n.body}
                  </p>
                  {tappable && (
                    <p className="text-[10px] mt-1" style={{ color: `${color}99` }}>
                      Tap to view →
                    </p>
                  )}
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <div className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-[#C8962C]" />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Bottom spacer for nav */}
      <div className="h-6" />
    </div>
  );
}
