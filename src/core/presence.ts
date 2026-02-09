/**
 * HOTMESS OS — Presence System
 * 
 * TTL-based presence rows. NOT profile flags. NOT UI filters.
 * This is the truth of "Right Now".
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type PresenceMode = 'SOCIAL' | 'EVENT' | 'TRAVEL';

export interface PresenceRow {
  id: string;
  user_id: string;
  mode: PresenceMode;
  geo: { lat: number; lng: number } | null;
  expires_at: string;
  created_at: string;
}

export interface GoLiveOptions {
  mode: PresenceMode;
  lat?: number;
  lng?: number;
  durationMinutes?: number; // Default: 60
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESENCE OPERATIONS (via RPC - no direct writes)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Go Live — Insert/upsert presence row with TTL
 * Uses rpc_go_live on server to enforce capabilities
 */
export async function goLive(
  supabase: SupabaseClient,
  options: GoLiveOptions
): Promise<{ success: boolean; error?: string }> {
  const { mode, lat, lng, durationMinutes = 60 } = options;

  // Build geography point if coords provided
  let geo: string | null = null;
  if (typeof lat === 'number' && typeof lng === 'number') {
    geo = `POINT(${lng} ${lat})`;
  }

  const { error } = await supabase.rpc('rpc_go_live', {
    p_mode: mode,
    p_geo: geo,
    p_minutes: durationMinutes,
  });

  if (error) {
    // Handle specific errors
    if (error.message?.includes('ONBOARDING_REQUIRED')) {
      return { success: false, error: 'Complete onboarding to go live' };
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Stop Early — Delete own presence row
 */
export async function stopLive(
  supabase: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('presence')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Extend — Update expires_at on own presence row
 */
export async function extendLive(
  supabase: SupabaseClient,
  additionalMinutes: number = 30
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Calculate new expiry
  const newExpiry = new Date(Date.now() + additionalMinutes * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('presence')
    .update({ expires_at: newExpiry })
    .eq('user_id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update location while live
 */
export async function updateLiveLocation(
  supabase: SupabaseClient,
  lat: number,
  lng: number
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const geo = `POINT(${lng} ${lat})`;

  const { error } = await supabase
    .from('presence')
    .update({ geo })
    .eq('user_id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESENCE QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get active presence count (for "X people live" display)
 */
export async function getActivePresenceCount(
  supabase: SupabaseClient,
  mode?: PresenceMode
): Promise<number> {
  const now = new Date().toISOString();
  
  let query = supabase
    .from('presence')
    .select('id', { count: 'exact', head: true })
    .gt('expires_at', now);

  if (mode) {
    query = query.eq('mode', mode);
  }

  const { count } = await query;
  return count ?? 0;
}

/**
 * Get active presence rows (for Social mode list)
 */
export async function getActivePresence(
  supabase: SupabaseClient,
  options: {
    mode?: PresenceMode;
    limit?: number;
    nearLat?: number;
    nearLng?: number;
    radiusKm?: number;
  } = {}
): Promise<PresenceRow[]> {
  const { mode, limit = 50, nearLat, nearLng, radiusKm } = options;
  const now = new Date().toISOString();

  let query = supabase
    .from('presence')
    .select('*')
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (mode) {
    query = query.eq('mode', mode);
  }

  // Note: For geo queries, you'd use PostGIS functions via RPC
  // This is a simplified version
  const { data, error } = await query;

  if (error) {
    console.error('[Presence] Query error:', error);
    return [];
  }

  return (data || []).map(row => ({
    ...row,
    geo: parseGeo(row.geo),
  }));
}

/**
 * Check if current user is live
 */
export async function isCurrentUserLive(
  supabase: SupabaseClient
): Promise<{ isLive: boolean; presence?: PresenceRow }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isLive: false };

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('presence')
    .select('*')
    .eq('user_id', user.id)
    .gt('expires_at', now)
    .single();

  if (error || !data) {
    return { isLive: false };
  }

  return {
    isLive: true,
    presence: {
      ...data,
      geo: parseGeo(data.geo),
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REALTIME SUBSCRIPTION
// ═══════════════════════════════════════════════════════════════════════════════

export type PresenceChange = {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  row: PresenceRow;
};

export function subscribeToPresence(
  supabase: SupabaseClient,
  onChange: (change: PresenceChange) => void,
  mode?: PresenceMode
): () => void {
  const channel = supabase
    .channel('presence-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'presence',
        ...(mode ? { filter: `mode=eq.${mode}` } : {}),
      },
      (payload) => {
        const type = payload.eventType.toUpperCase() as PresenceChange['type'];
        const row = (type === 'DELETE' ? payload.old : payload.new) as any;
        
        onChange({
          type,
          row: {
            ...row,
            geo: parseGeo(row.geo),
          },
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function parseGeo(geo: any): { lat: number; lng: number } | null {
  if (!geo) return null;

  // GeoJSON Point
  if (geo?.type === 'Point' && Array.isArray(geo?.coordinates)) {
    const [lng, lat] = geo.coordinates;
    return { lat, lng };
  }

  // WKT: "POINT(lng lat)"
  if (typeof geo === 'string') {
    const match = geo.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (match) {
      return { lat: parseFloat(match[2]), lng: parseFloat(match[1]) };
    }
  }

  // Already parsed
  if (typeof geo.lat === 'number' && typeof geo.lng === 'number') {
    return geo;
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACT HOOK
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';

export function usePresence(supabase: SupabaseClient) {
  const [isLive, setIsLive] = useState(false);
  const [myPresence, setMyPresence] = useState<PresenceRow | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Check current status
  const refresh = useCallback(async () => {
    const { isLive: live, presence } = await isCurrentUserLive(supabase);
    setIsLive(live);
    setMyPresence(presence || null);

    const count = await getActivePresenceCount(supabase);
    setActiveCount(count);

    setLoading(false);
  }, [supabase]);

  // Go live
  const goLiveAction = useCallback(async (options: GoLiveOptions) => {
    const result = await goLive(supabase, options);
    if (result.success) {
      await refresh();
    }
    return result;
  }, [supabase, refresh]);

  // Stop
  const stopLiveAction = useCallback(async () => {
    const result = await stopLive(supabase);
    if (result.success) {
      setIsLive(false);
      setMyPresence(null);
    }
    return result;
  }, [supabase]);

  // Extend
  const extendLiveAction = useCallback(async (minutes?: number) => {
    const result = await extendLive(supabase, minutes);
    if (result.success) {
      await refresh();
    }
    return result;
  }, [supabase, refresh]);

  // Initial load + subscription
  useEffect(() => {
    refresh();

    const unsubscribe = subscribeToPresence(supabase, (change) => {
      // Update count on any change
      getActivePresenceCount(supabase).then(setActiveCount);
      
      // If it's our own presence, update state
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user && change.row.user_id === user.id) {
          if (change.type === 'DELETE') {
            setIsLive(false);
            setMyPresence(null);
          } else {
            setIsLive(true);
            setMyPresence(change.row);
          }
        }
      });
    });

    return unsubscribe;
  }, [supabase, refresh]);

  return {
    isLive,
    myPresence,
    activeCount,
    loading,
    goLive: goLiveAction,
    stopLive: stopLiveAction,
    extendLive: extendLiveAction,
    refresh,
  };
}
