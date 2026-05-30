/**
 * L2NotificationInboxSheet — D266 Slice 4.3 rewrite.
 *
 * Per-category cells replace the legacy Notif bridge. Invariants:
 *   I-1 — category recognised structurally before linguistically
 *   I-2 — no parallel author paths
 *   I-3 — no fallback renderer; the category→component dispatch below is
 *         a router, not a generic. If a future category is added, it ships
 *         with its own dedicated cell or it does not ship.
 *
 * Q15 — filter resets to All every open
 * Q19 — system_event hidden in All; Account chip explicitly opts in
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Loader2, Inbox, Settings } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { useInbox, type InboxItem } from '@/hooks/useInbox';
import { useInboxCounterparts } from '@/hooks/useInboxCounterparts';
import InboxFilterChips, { type InboxFilterValue } from '@/components/inbox/InboxFilterChips';
import InboxCellConversation  from '@/components/inbox/cells/InboxCellConversation';
import InboxCellSignal        from '@/components/inbox/cells/InboxCellSignal';
import InboxCellNotification  from '@/components/inbox/cells/InboxCellNotification';
import InboxCellRequest       from '@/components/inbox/cells/InboxCellRequest';
import InboxCellLocationShare from '@/components/inbox/cells/InboxCellLocationShare';
import InboxCellSystemEvent   from '@/components/inbox/cells/InboxCellSystemEvent';

export default function L2NotificationInboxSheet() {
  const { openSheet } = useSheet();
  const { items, loading, error, reload } = useInbox();
  const counterparts = useInboxCounterparts(items);
  const [filter, setFilter] = useState<InboxFilterValue>('all');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [legacyReadMarked, setLegacyReadMarked] = useState(false);

  // ── Counts per category — drives filter chips + empty-state logic ─────
  const countsByCategory = useMemo(() => {
    const counts: Record<string, number> = {
      conversation: 0, signal: 0, notification: 0,
      request: 0, 'location-share': 0, system_event: 0, continuity: 0,
    };
    for (const item of items) counts[item.category] = (counts[item.category] || 0) + 1;
    return counts as Record<import('@/hooks/useInbox').InboxCategory, number>;
  }, [items]);

  // ── Filter view — Q19 hide system_event from All ──────────────────────
  const visibleItems = useMemo(() => {
    if (filter === 'all') {
      return items.filter(i => i.category !== 'system_event' && i.category !== 'continuity');
    }
    return items.filter(i => i.category === filter);
  }, [items, filter]);

  // ── Resolve viewer email ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setUserEmail(data.user?.email ?? null);
    });
    return () => { cancelled = true; };
  }, []);

  // ── Mark-as-read: legacy `notifications` table for 4.3 (signals
  //    auto-read on render per D266; mark-as-read affects rows still
  //    written by the legacy dispatcher until Slice 4.4 routes through
  //    notification_outbox.category) ─────────────────────────────────────
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

  // ── Realtime: soft RPC reload on any source insert/update ─────────────
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

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-7 h-7 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  // ── Unread for header pill (excludes hidden categories) ───────────────
  const headerUnread = items
    .filter(i => i.category !== 'system_event' && i.category !== 'continuity')
    .filter(i => i.is_unread).length;

  // ── Per-category dispatch — NOT a fallback renderer (I-3).
  //     Every branch returns a dedicated cell. continuity logs and
  //     renders nothing (defensive; never written in Slice 4.x). ──────────
  const renderItem = (item: InboxItem) => {
    const props = { item, counterparts };
    switch (item.category) {
      case 'conversation':   return <InboxCellConversation  {...props} />;
      case 'signal':         return <InboxCellSignal        {...props} />;
      case 'notification':   return <InboxCellNotification  {...props} />;
      case 'request':        return <InboxCellRequest       {...props} />;
      case 'location-share': return <InboxCellLocationShare {...props} />;
      case 'system_event':   return <InboxCellSystemEvent   {...props} />;
      case 'continuity':
        // Reserved but never returned in Slice 4.x. If it appears, log
        // once and render nothing — surfacing it without a doctrine is
        // worse than hiding it.
        console.warn('[Inbox] continuity row encountered before doctrine locked');
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#C8962C]" />
          <span className="text-sm font-semibold text-white">
            Inbox
            {headerUnread > 0 && (
              <span className="ml-2 text-xs bg-[#C8962C] text-black font-bold px-1.5 py-0.5 rounded-full">
                {headerUnread}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {items.length > 0 && (
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

      {/* Filter chips */}
      <InboxFilterChips
        active={filter}
        counts={countsByCategory}
        onChange={setFilter}
      />

      {/* Empty state — D266 "the empty state is the answer" */}
      {visibleItems.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 px-6 text-center">
          <Inbox className="w-10 h-10 text-white/15" />
          <p className="text-sm font-semibold text-white/30">
            {filter === 'all' ? 'All clear' :
             filter === 'conversation' ? 'Quiet inbox. Go BOO someone.' :
             filter === 'signal' ? "No one's left a mark yet. Yet." :
             filter === 'notification' ? 'Nothing the system needs to tell you. Restful.' :
             filter === 'request' ? 'Nothing needs a decision from you.' :
             filter === 'location-share' ? "No one's sharing with you right now." :
             filter === 'system_event' ? 'Your account is quiet.' :
             'All clear'}
          </p>
        </div>
      )}

      {/* Error state */}
      {visibleItems.length === 0 && error && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
          <Inbox className="w-9 h-9 text-white/15" />
          <p className="text-sm font-semibold text-white/40">Couldn't load your inbox</p>
          <button onClick={reload} className="text-xs text-[#C8962C] hover:underline">
            Try again
          </button>
        </div>
      )}

      {/* Per-category rendered list */}
      <div className="flex flex-col divide-y divide-white/[0.05]">
        <AnimatePresence initial={false}>
          {visibleItems.map((item) => (
            <motion.div
              key={item.item_id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
            >
              {renderItem(item)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Bottom spacer for nav */}
      <div className="h-6" />
    </div>
  );
}
