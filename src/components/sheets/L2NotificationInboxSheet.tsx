/**
 * L2NotificationInboxSheet — In-app notification feed
 *
 * Slice 4.2 (D266): client now reads from the unified
 * get_inbox_for_viewer() RPC via useInbox() hook. Six-category rows are
 * mapped back to the existing Notif shape so the UI rendering stays
 * unchanged. Slice 4.3 will rewrite the cells per-category (I-3).
 *
 * Type → action mapping (preserved from pre-4.2):
 *   boo                    → /ghosted (no separate sheet)
 *   message                → openSheet('chat', { threadId })   metadata.thread_id
 *   event / event_reminder → openSheet('event', { id })        metadata.event_id
 *   location_share_started → openSheet('location-watcher', …)
 *   request                → no tap action yet (Slice 4.3 wires L2RequestSheet)
 *   default                → no action
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, MessageCircle, Ghost, MapPin, Radio, Calendar, CheckCheck, Loader2, Inbox, Settings, Mail } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useInbox, type InboxItem, type InboxCategory } from '@/hooks/useInbox';

// ── Types ─────────────────────────────────────────────────────────────────────
// Local view-model shape — kept to minimise diff against pre-4.2 render code.
// Slice 4.3 will replace this with per-category cell components (I-3).
interface Notif {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  metadata: any;
  read: boolean;
  created_at: string;
  category: InboxCategory;
}

// ── Icon + colour per legacy type (kept for 4.2; rewritten 4.3) ──────────────
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
    case 'request':
      // D266 §1.4 — requests are consequential; pulse-able gold border
      // arrives in Slice 4.3 with the dedicated cell component.
      return { Icon: Mail,           color: '#C8962C', bg: 'rgba(200,150,44,0.20)' };
    default:
      return { Icon: Bell,           color: '#C8962C', bg: 'rgba(200,150,44,0.15)' };
  }
}

// ── Map InboxItem → legacy Notif shape (4.2 bridge) ──────────────────────────
function inboxItemToNotif(item: InboxItem): Notif {
  const payload = (item.payload || {}) as Record<string, any>;

  // Derive a legacy `type` from the new `category` so the existing
  // typeConfig() switch keeps working. Slice 4.3 deletes this mapping.
  let type = 'default';
  switch (item.category) {
    case 'conversation':
      type = 'message';
      break;
    case 'signal':
      // payload.tap_type holds 'boo' | 'save' | …
      type = (payload.tap_type as string) || 'boo';
      break;
    case 'notification': {
      // Fall through to existing metadata.notification_type where present
      // (legacy `notifications` table rows carry it in metadata).
      const inner = (payload.notification_type || payload.type) as string | undefined;
      type = inner || 'default';
      break;
    }
    case 'request':
      type = 'request';
      break;
    case 'location-share':
      type = 'location_share_started';
      break;
    case 'system_event':
      type = 'default';
      break;
    case 'continuity':
      // Never returned in Slice 4.x — defensive default.
      type = 'default';
      break;
  }

  // Body fallback — signal sub-line ("3 times") becomes the body when present
  // so the user sees the count without us redesigning the cell.
  let body = item.sub_line || '';
  if (item.category === 'signal') {
    const tapType = (payload.tap_type as string) || 'boo';
    const count = (payload.count as number) || 1;
    const verb = tapType === 'boo' ? "BOO'd" : tapType === 'save' ? 'saved' : tapType;
    body = count > 1
      ? `${verb} you · ${count} times`
      : `${verb} you`;
  } else if (item.category === 'request') {
    body = `${payload.request_type || 'request'} · ${payload.status || 'pending'}`;
  }

  // Title fallback — conversation rows have no `title` from the RPC;
  // surface the counterpart hint until 4.3 resolves names properly.
  let title = item.title || '';
  if (item.category === 'conversation') {
    title = 'Message';
  } else if (item.category === 'request') {
    title = `${payload.request_type || 'Request'}`;
  } else if (item.category === 'signal') {
    title = (payload.tap_type as string) === 'save' ? 'New save' : 'New BOO';
  } else if (item.category === 'system_event' && !title) {
    title = 'Account update';
  } else if (!title) {
    title = 'Update';
  }

  return {
    id: item.item_id,
    type,
    title,
    body,
    link: null,
    metadata: payload,
    read: !item.is_unread,
    created_at: item.created_at,
    category: item.category,
  };
}

// ── Main component ────────────────────────────────────────────────────────────
export default function L2NotificationInboxSheet() {
  const { openSheet, closeSheet } = useSheet();
  const navigate = useNavigate();
  const { items, loading, error, reload } = useInbox();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [legacyReadMarked, setLegacyReadMarked] = useState(false);

  // Map RPC rows into legacy Notif shape for the existing cell renderer.
  const notifs: Notif[] = items.map(inboxItemToNotif);

  // ── Resolve viewer email + mark legacy `notifications` rows read ────────
  // Mark-as-read still writes to the legacy table so any other reader of it
  // stays in sync. Slice 4.5 rationalises unread semantics across categories.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const email = data.user?.email ?? null;
      setUserEmail(email);
    });
    return () => { cancelled = true; };
  }, []);

  const markLegacyRead = useCallback(async (email: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_email', email)
        .eq('read', false);
    } catch (err) {
      console.warn('[Inbox] legacy mark-read skipped:', err);
    }
  }, []);

  useEffect(() => {
    if (loading || legacyReadMarked || !userEmail) return;
    setLegacyReadMarked(true);
    markLegacyRead(userEmail);
  }, [loading, legacyReadMarked, userEmail, markLegacyRead]);

  // ── Realtime: any insert into `notifications` or `notification_outbox`
  // triggers a soft RPC reload. Keeps live-updates working through the
  // 4.2 wiring without us managing optimistic state per category. ─────────
  useEffect(() => {
    const channel = supabase
      .channel('d266-inbox-live')
      .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          () => { reload(); })
      .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notification_outbox' },
          () => { reload(); })
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'requests' },
          () => { reload(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [reload]);

  // ── Handle tap on a notification row ────────────────────────────────────
  const handleTap = useCallback((n: Notif) => {
    const meta = n.metadata ?? {};

    switch (n.type) {
      case 'boo':
        // Phil 2026-05-28 (#263): unified inbox — boos no longer pop a separate
        // 'taps' sheet; tapping the boo row sends the user to /ghosted where
        // they can boo back.
        closeSheet();
        navigate('/ghosted');
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

      case 'request':
        // L2RequestSheet lands in Slice 4.3. Until then, requests are
        // visible but tap is a no-op (intentional — no half-built path).
        break;

      // location_share_ended, welcome, default — no action
      default:
        break;
    }
  }, [openSheet, closeSheet, navigate]);

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
        <div className="flex items-center gap-3">
          {notifs.length > 0 && (
            <button
              onClick={() => userEmail && markLegacyRead(userEmail).then(() => reload())}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-[#C8962C] transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
          <button
            type="button"
            onClick={() => openSheet && openSheet('notification-settings')}
            aria-label="Notification settings"
            title="Notification settings"
            className="text-white/40 hover:text-[#C8962C] transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Empty state — D266 dignity floor: "the empty state is the answer". */}
      {notifs.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 px-6 text-center">
          <Inbox className="w-10 h-10 text-white/15" />
          <p className="text-sm font-semibold text-white/30">All clear</p>
          <p className="text-xs text-white/20">New boos, messages and alerts will appear here.</p>
        </div>
      )}

      {/* Error state — soft, honest, retry-able. */}
      {notifs.length === 0 && error && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
          <Inbox className="w-9 h-9 text-white/15" />
          <p className="text-sm font-semibold text-white/40">Couldn't load your inbox</p>
          <button
            onClick={reload}
            className="text-xs text-[#C8962C] hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Notification list */}
      <div className="flex flex-col divide-y divide-white/[0.05]">
        <AnimatePresence initial={false}>
          {notifs.map((n) => {
            const { Icon, color, bg } = typeConfig(n.type);
            const tappable = isTappable(n.type);
            const timeAgo  = n.created_at
              ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true })
              : '';

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
                  {n.body && (
                    <p className="text-xs text-white/45 mt-0.5 leading-snug line-clamp-2">
                      {n.body}
                    </p>
                  )}
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
