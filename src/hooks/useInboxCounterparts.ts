/**
 * useInboxCounterparts — batch-fetch profile rows for inbox counterparts.
 *
 * Slice 4.3: each cell that surfaces another user (conversation, signal,
 * request) needs their display_name and avatar_url. Doing this per-cell
 * would N+1 query the profiles table; we instead collect every unique
 * counterpart_id once and fetch them in a single round-trip.
 *
 * Returns a Map<id, Counterpart>. Cells look up their counterpart by id
 * and fall back to safeName('Member') + Ghost glyph if not present —
 * the dignity floor invariant.
 */

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import type { InboxItem } from '@/hooks/useInbox';

export interface InboxCounterpart {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function useInboxCounterparts(items: InboxItem[]): Map<string, InboxCounterpart> {
  const ids = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.counterpart_id) set.add(item.counterpart_id);
    }
    return Array.from(set).sort();
  }, [items]);

  const [byId, setById] = useState<Map<string, InboxCounterpart>>(new Map());

  useEffect(() => {
    if (ids.length === 0) {
      setById(new Map());
      return;
    }

    let cancelled = false;

    // Slice 4.3 hotfix — retry once on supabase-js Web Lock AbortError
    // race, same pattern as useInbox. The counterpart fetch is the
    // most likely victim because it fires AFTER useInbox returns,
    // and both contend for the auth-refresh lock.
    const isAbortError = (e: unknown) =>
      (e instanceof Error && e.name === 'AbortError') ||
      (typeof (e as any)?.message === 'string' && (e as any).message.includes('Lock broken'));

    const tryOnce = async () => supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', ids);

    // Stagger the fetch a tick to let useInbox's lock release first.
    (async () => {
      await new Promise(r => setTimeout(r, 50));
      try {
        let { data, error } = await tryOnce();
        if (error && isAbortError(error)) {
          await new Promise(r => setTimeout(r, 200));
          ({ data, error } = await tryOnce());
        }
        if (cancelled) return;
        if (error) {
          if (!isAbortError(error)) {
            console.error('[useInboxCounterparts] fetch error:', error.message);
          }
          return;
        }
        const map = new Map<string, InboxCounterpart>();
        for (const row of data || []) {
          map.set((row as any).id, row as InboxCounterpart);
        }
        setById(map);
      } catch (e) {
        if (cancelled) return;
        if (!isAbortError(e)) {
          console.error('[useInboxCounterparts] unexpected:', e);
        }
      }
    })();
    return () => { cancelled = true; };
  // ids.join is the canonical dependency — array identity changes per render
  // but the joined string is stable across equal id sets.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')]);

  return byId;
}
