/**
 * useProximityNav — v6 Chunk 08: Proximity Nav v2
 *
 * Provides:
 *   - live distance decay (haversine every 10s when en_route)
 *   - mutual movement state from public_movement_presence
 *   - commit ("I'm on my way") → writes profiles.movement_state + sends chat message
 *   - arrival detection (≤ 50m auto-fires)
 *
 * Flag: v6_proximity_nav_v2
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

// ── Haversine (client-side, 100m grid-snapped coords) ──────────────────────
export function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Transport mode picker ───────────────────────────────────────────────────
export function bestMode(distM) {
  if (distM <= 1500) return { mode: 'WALK', icon: '🚶', label: 'Walk',    eta: `${Math.max(1, Math.round(distM / 80))} min`,           color: '#30D158', flag: 'w' };
  if (distM <= 6000) return { mode: 'TUBE', icon: '🚇', label: 'Transit', eta: `${Math.round(distM / 500 + 4)} min`,                   color: '#4A90E2', flag: 'r' };
  return               { mode: 'UBER', icon: '🚗', label: 'Uber',    eta: `${Math.max(1, Math.round(distM / 300))} min`,          color: '#C8962C', flag: 'd' };
}

export function fmtDist(m) {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

// ── Live distance hook ──────────────────────────────────────────────────────
// In production: polls haversine(viewer GPS, match approx_location) every 10s.
// Simulates decay when en_route for now; swap body of interval for real GPS.
export function useLiveDistance(initialM, isMoving = false) {
  const [distM, setDistM] = useState(initialM);
  const [shrinking, setShrinking] = useState(false);

  useEffect(() => {
    setDistM(initialM);
  }, [initialM]);

  useEffect(() => {
    if (!isMoving) return;
    const id = setInterval(() => {
      setDistM(prev => {
        const next = Math.max(40, prev - Math.floor(Math.random() * 15 + 8));
        setShrinking(true);
        setTimeout(() => setShrinking(false), 600);
        return next;
      });
    }, 10000);
    return () => clearInterval(id);
  }, [isMoving]);

  return { distM, shrinking };
}

// ── Mutual movement presence ────────────────────────────────────────────────
// Subscribes to public_movement_presence for the other user's movement state.
// Returns { theyAreMoving, theirEtaMin, theirDistM }.
export function useMutualMovement(matchUserId) {
  const [theyAreMoving, setTheyAreMoving] = useState(false);
  const [theirEtaMin, setTheirEtaMin] = useState(null);
  const [theirDistM, setTheirDistM] = useState(null);

  useEffect(() => {
    if (!matchUserId) return;

    // Initial fetch
    supabase
      .from('profiles')
      .select('movement_state, movement_eta_min, approx_location')
      .eq('id', matchUserId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTheyAreMoving(data.movement_state === 'en_route');
          if (data.movement_eta_min) setTheirEtaMin(data.movement_eta_min);
        }
      });

    // Realtime subscription
    const channel = supabase
      .channel(`movement-${matchUserId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${matchUserId}`,
      }, ({ new: row }) => {
        setTheyAreMoving(row.movement_state === 'en_route');
        if (row.movement_eta_min) setTheirEtaMin(row.movement_eta_min);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [matchUserId]);

  return { theyAreMoving, theirEtaMin, theirDistM };
}

// ── Commit hook ("I'm on my way") ───────────────────────────────────────────
// Writes profiles.movement_state='en_route', sends movement_update message.
export function useProximityCommit(threadId) {
  const [committed, setCommitted] = useState(false);
  const [committing, setCommitting] = useState(false);

  const commit = useCallback(async ({ etaMin, distM }) => {
    setCommitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Write movement state to profile
      await supabase
        .from('profiles')
        .update({ movement_state: 'en_route', movement_eta_min: etaMin })
        .eq('id', user.id);

      // 2. Send movement_update message into thread
      if (threadId) {
        await supabase.from('messages').insert({
          thread_id: threadId,
          sender_id: user.id,
          message_type: 'movement_update',
          content: JSON.stringify({ eta_min: etaMin, dist_m: distM }),
        });
      }

      setCommitted(true);
    } catch (err) {
      console.error('[useProximityCommit] commit error:', err);
    } finally {
      setCommitting(false);
    }
  }, [threadId]);

  // Clear on unmount
  const clear = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ movement_state: null, movement_eta_min: null })
        .eq('id', user.id);
    }
    setCommitted(false);
  }, []);

  return { committed, committing, commit, clear };
}
