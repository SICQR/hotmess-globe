/**
 * usePowerups — fetch and cache the current user's active boosts.
 *
 * Queries `user_active_boosts` where expires_at > now().
 * Returns a Set of active boost keys, an isActive(key) helper,
 * an expiresAt(key) helper, and a refresh() callback.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

export interface PowerupsState {
  /** Set of currently active boost keys */
  boosts: Set<string>;
  /** Check if a specific boost is active */
  isActive: (key: string) => boolean;
  /** Get expiry date for a boost (null if not active) */
  expiresAt: (key: string) => Date | null;
  /** Whether initial load is in progress */
  loading: boolean;
  /** Re-fetch active boosts from DB */
  refresh: () => void;
  /**
   * Consume a single-use boost charge (atomic RPC). Call after the
   * boosted action lands. No-op for timed boosts (uses_remaining=null).
   * Auto-refreshes the local set on success.
   */
  consume: (key: string) => Promise<{ ok: boolean; uses_remaining: number | null }>;
}

interface BoostRow {
  boost_key: string;
  expires_at: string;
  uses_remaining: number | null;
}

export function usePowerups(): PowerupsState {
  const [boosts, setBoosts] = useState<Set<string>>(new Set());
  const [expiryMap, setExpiryMap] = useState<Record<string, Date>>({});
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        if (mountedRef.current) {
          setBoosts(new Set());
          setExpiryMap({});
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from('user_active_boosts')
        .select('boost_key, expires_at, uses_remaining')
        .eq('user_id', session.user.id)
        .gt('expires_at', new Date().toISOString());

      if (error) {
        console.warn('[usePowerups] fetch error:', error.message);
        if (mountedRef.current) setLoading(false);
        return;
      }

      if (mountedRef.current) {
        const rows = ((data || []) as BoostRow[]).filter(
          // Phil 2026-05-27 — exclude consumed single-use credits.
          // Timed boosts (uses_remaining=null) are always considered active
          // within their window; single-use (uses_remaining>0) only while
          // they have charges left.
          (r) => r.uses_remaining === null || r.uses_remaining > 0
        );
        setBoosts(new Set(rows.map((r) => r.boost_key)));
        const exp: Record<string, Date> = {};
        rows.forEach((r) => {
          exp[r.boost_key] = new Date(r.expires_at);
        });
        setExpiryMap(exp);
        setLoading(false);
      }
    } catch {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const isActive = useCallback(
    (key: string) => boosts.has(key),
    [boosts],
  );

  const expiresAt = useCallback(
    (key: string): Date | null => expiryMap[key] ?? null,
    [expiryMap],
  );

  const consume = useCallback(async (key: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return { ok: false, uses_remaining: null };
      const { data, error } = await supabase.rpc('consume_boost', {
        p_user_id: session.user.id,
        p_boost_key: key,
      });
      if (error) {
        console.warn('[usePowerups] consume error:', error.message);
        return { ok: false, uses_remaining: null };
      }
      const row = Array.isArray(data) ? data[0] : data;
      // Refresh local cache so isActive reflects the new uses_remaining.
      load();
      return { ok: !!row?.ok, uses_remaining: row?.uses_remaining ?? null };
    } catch (e) {
      console.warn('[usePowerups] consume threw:', e);
      return { ok: false, uses_remaining: null };
    }
  }, [load]);

  return { boosts, isActive, expiresAt, loading, refresh: load, consume };
}
