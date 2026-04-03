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
}

interface BoostRow {
  boost_key: string;
  expires_at: string;
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
        .select('boost_key, expires_at')
        .eq('user_id', session.user.id)
        .gt('expires_at', new Date().toISOString());

      if (error) {
        console.warn('[usePowerups] fetch error:', error.message);
        if (mountedRef.current) setLoading(false);
        return;
      }

      if (mountedRef.current) {
        const rows = (data || []) as BoostRow[];
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

  return { boosts, isActive, expiresAt, loading, refresh: load };
}
