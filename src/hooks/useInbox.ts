/**
 * useInbox — D266 Slice 4.2 client wiring.
 *
 * Single source of truth for the inbox: calls the unified
 * get_inbox_for_viewer() RPC and returns six-category rows.
 *
 * No UI rendering in this file. The shape is the contract — components
 * that render inbox rows must derive icon/color/route from `category`
 * (not from a freeform `type` field).
 *
 * Doctrine refs: outputs/_366_inbox_ontology/ONTOLOGY.md
 *   I-1 — Category recognised structurally before linguistically
 *   I-3 — No fallback renderer. Per-category cells in Slice 4.3.
 *
 * NOT in scope for 4.2:
 *   - L2InboxSheet cell rewrite (Slice 4.3)
 *   - Bell badge wiring in BootGuardContext (Slice 4.5)
 *   - Notification channel routing (Slice 4.4)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

export type InboxCategory =
  | 'conversation'
  | 'signal'
  | 'notification'
  | 'request'
  | 'location-share'
  | 'system_event'
  | 'continuity'; // reserved; never returned in Slice 4.x

export interface InboxItem {
  /** Stable id prefixed by source: `conv:` / `sig:` / `notif:` / `req:` / `loc:` / `sys:` / `legacy_notif:` */
  item_id: string;
  category: InboxCategory;
  /** The other person, when the category is relational. NULL for ambient (notification, system_event). */
  counterpart_id: string | null;
  title: string | null;
  sub_line: string | null;
  created_at: string;
  is_unread: boolean;
  payload: Record<string, unknown> | null;
}

interface UseInboxState {
  items: InboxItem[];
  loading: boolean;
  error: string | null;
  /** Aggregate counts per category — useful for filter chips + smoke verification. */
  countsByCategory: Record<InboxCategory, number>;
  unreadCount: number;
  /** Refetch the RPC. */
  reload: () => Promise<void>;
}

const EMPTY_COUNTS: Record<InboxCategory, number> = {
  conversation: 0,
  signal: 0,
  notification: 0,
  request: 0,
  'location-share': 0,
  system_event: 0,
  continuity: 0,
};

/**
 * Hook: fetch the current viewer's inbox via the unified RPC.
 * Auth gate is enforced server-side via auth.uid() check.
 */
export function useInbox(): UseInboxState {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Slice 4.3 hotfix — supabase-js auth Web Lock races between three
    // parallel hooks (this RPC + useInboxCounterparts + getUser) and
    // throws AbortError: "Lock broken by another request with the
    // 'steal' option". This is a known transient race; one retry after
    // a short backoff is enough. Don't surface it to the user.
    const isAbortError = (e: unknown) =>
      (e instanceof Error && e.name === 'AbortError') ||
      (typeof (e as any)?.message === 'string' && (e as any).message.includes('Lock broken'));

    const tryOnce = async () => supabase.rpc('get_inbox_for_viewer');

    try {
      let { data, error: rpcError } = await tryOnce();
      // Retry once on the auth-lock race.
      if (rpcError && isAbortError(rpcError)) {
        await new Promise(r => setTimeout(r, 150));
        ({ data, error: rpcError } = await tryOnce());
      }

      if (rpcError) {
        if (isAbortError(rpcError)) {
          // Still racing — treat as empty, no user-facing error. The
          // realtime channel will reload us shortly anyway.
          setItems([]);
          return;
        }
        console.error('[useInbox] RPC error:', rpcError.message);
        setError(rpcError.message);
        setItems([]);
        return;
      }

      const rows = (data || []) as InboxItem[];

      // D266 §sort: newest-first within the unified stream.
      rows.sort((a, b) => {
        // pending requests sticky to top (I-1 consequential gravity)
        const aPendingReq = a.category === 'request' && a.is_unread;
        const bPendingReq = b.category === 'request' && b.is_unread;
        if (aPendingReq !== bPendingReq) return aPendingReq ? -1 : 1;
        // then by created_at desc, nulls last
        if (!a.created_at) return 1;
        if (!b.created_at) return -1;
        return b.created_at.localeCompare(a.created_at);
      });

      setItems(rows);

      // Slice 4.2 smoke log — removed in 4.6 once the gauntlet passes.
      if (typeof console !== 'undefined' && rows.length > 0) {
        const dist: Record<string, number> = {};
        for (const r of rows) dist[r.category] = (dist[r.category] || 0) + 1;
        console.log('[useInbox] D266 inbox loaded:', rows.length, 'items', dist);
      }
    } catch (e: unknown) {
      if (isAbortError(e)) {
        // Transient auth-lock race; ignore.
        setItems([]);
        return;
      }
      const message = e instanceof Error ? e.message : String(e);
      console.error('[useInbox] Unexpected error:', message);
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [load]);

  const countsByCategory = useMemo(() => {
    const counts: Record<InboxCategory, number> = { ...EMPTY_COUNTS };
    for (const item of items) counts[item.category] = (counts[item.category] || 0) + 1;
    return counts;
  }, [items]);

  const unreadCount = useMemo(() => items.filter(i => i.is_unread).length, [items]);

  return { items, loading, error, countsByCategory, unreadCount, reload: load };
}

/**
 * Bell-badge count. Only conversations + pending requests contribute,
 * per D266 §bell-badge calc + invariant I-1 (consequential layer rings).
 */
export function useBellBadge() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_bell_badge_count');
      if (error) {
        console.error('[useBellBadge] RPC error:', error.message);
        setCount(0);
        return;
      }
      setCount(typeof data === 'number' ? data : 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { count, loading, reload: load };
}
