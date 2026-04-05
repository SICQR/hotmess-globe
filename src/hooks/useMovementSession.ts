/**
 * useMovementSession — Manages the current user's active movement session
 *
 * Start/stop/arrive/update movement. Rounds coords to 3 decimal places (~111m).
 * Auto-expires sessions based on share_until setting.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';

// ── Types ────────────────────────────────────────────────────────────────────

export type MovementVisibility = 'off' | 'chats_only' | 'live_mode' | 'public_live';
export type ShareUntil = '15_min' | '30_min' | '60_min' | 'arrival';

export interface MovementSession {
  id: string;
  user_id: string;
  origin_area: string | null;
  destination_label: string | null;
  destination_place_id: string | null;
  eta_minutes: number | null;
  visibility: MovementVisibility;
  share_until: ShareUntil;
  active: boolean;
  started_at: string;
  expires_at: string | null;
  arrived_at: string | null;
  stopped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StartMovementOpts {
  originArea?: string;
  destinationLabel?: string;
  destinationPlaceId?: string;
  etaMinutes?: number;
  visibility: MovementVisibility;
  shareUntil: ShareUntil;
}

export interface MovementSessionState {
  session: MovementSession | null;
  isMoving: boolean;
  startMovement: (opts: StartMovementOpts) => Promise<void>;
  updatePosition: (lat: number, lng: number, heading?: number, eta?: number) => Promise<void>;
  stopMovement: () => Promise<void>;
  markArrived: () => Promise<void>;
  loading: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Round to 3 decimal places (~111m precision) for privacy */
function roundCoord(val: number): number {
  return Math.round(val * 1000) / 1000;
}

/** Calculate expires_at from shareUntil */
function calcExpiresAt(shareUntil: ShareUntil): string | null {
  const mins: Record<string, number> = {
    '15_min': 15,
    '30_min': 30,
    '60_min': 60,
  };
  const m = mins[shareUntil];
  if (!m) return null; // 'arrival' = no auto-expiry
  return new Date(Date.now() + m * 60 * 1000).toISOString();
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useMovementSession(): MovementSessionState {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const autoExpireRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get auth user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
  }, []);

  // Query active session
  const { data: session, isLoading } = useQuery({
    queryKey: ['movement-session', userId],
    enabled: !!userId,
    staleTime: 10_000,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movement_sessions')
        .select('*')
        .eq('user_id', userId!)
        .eq('active', true)
        .is('stopped_at', null)
        .is('arrived_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Auto-expire check
      if (data.expires_at && new Date(data.expires_at) <= new Date()) {
        await supabase
          .from('movement_sessions')
          .update({ active: false, stopped_at: new Date().toISOString() })
          .eq('id', data.id);
        return null;
      }

      return data as MovementSession;
    },
  });

  // Auto-expire timer
  useEffect(() => {
    if (autoExpireRef.current) clearInterval(autoExpireRef.current);
    if (session?.expires_at) {
      autoExpireRef.current = setInterval(() => {
        if (session.expires_at && new Date(session.expires_at) <= new Date()) {
          queryClient.invalidateQueries({ queryKey: ['movement-session'] });
        }
      }, 15_000);
    }
    return () => {
      if (autoExpireRef.current) clearInterval(autoExpireRef.current);
    };
  }, [session?.expires_at, queryClient]);

  // ── Start mutation ──────────────────────────────────────────────────────
  const startMutation = useMutation({
    mutationFn: async (opts: StartMovementOpts) => {
      if (!userId) throw new Error('Not authenticated');

      // Stop any existing active session first
      await supabase
        .from('movement_sessions')
        .update({ active: false, stopped_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('active', true);

      const { data, error } = await supabase
        .from('movement_sessions')
        .insert({
          user_id: userId,
          origin_area: opts.originArea ?? null,
          destination_label: opts.destinationLabel ?? null,
          destination_place_id: opts.destinationPlaceId ?? null,
          eta_minutes: opts.etaMinutes ?? null,
          visibility: opts.visibility,
          share_until: opts.shareUntil,
          expires_at: calcExpiresAt(opts.shareUntil),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movement-session'] });
      queryClient.invalidateQueries({ queryKey: ['nearby-movement'] });
    },
  });

  // ── Update position mutation ────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async ({
      lat,
      lng,
      heading,
      eta,
    }: {
      lat: number;
      lng: number;
      heading?: number;
      eta?: number;
    }) => {
      if (!userId || !session) throw new Error('No active session');

      const { error } = await supabase.from('movement_updates').insert({
        session_id: session.id,
        user_id: userId,
        approx_lat: roundCoord(lat),
        approx_lng: roundCoord(lng),
        heading_degrees: heading ?? null,
        eta_minutes: eta ?? null,
      });

      if (error) throw error;

      // Also update ETA on the session if provided
      if (eta != null) {
        await supabase
          .from('movement_sessions')
          .update({ eta_minutes: eta })
          .eq('id', session.id);
      }
    },
  });

  // ── Stop mutation ───────────────────────────────────────────────────────
  const stopMutation = useMutation({
    mutationFn: async () => {
      if (!session) return;
      const { error } = await supabase
        .from('movement_sessions')
        .update({ active: false, stopped_at: new Date().toISOString() })
        .eq('id', session.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movement-session'] });
      queryClient.invalidateQueries({ queryKey: ['nearby-movement'] });
    },
  });

  // ── Arrive mutation ─────────────────────────────────────────────────────
  const arriveMutation = useMutation({
    mutationFn: async () => {
      if (!session) return;
      const { error } = await supabase
        .from('movement_sessions')
        .update({ active: false, arrived_at: new Date().toISOString() })
        .eq('id', session.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movement-session'] });
      queryClient.invalidateQueries({ queryKey: ['nearby-movement'] });
    },
  });

  // ── Public API ──────────────────────────────────────────────────────────

  const startMovement = useCallback(
    async (opts: StartMovementOpts) => {
      await startMutation.mutateAsync(opts);
    },
    [startMutation],
  );

  const updatePosition = useCallback(
    async (lat: number, lng: number, heading?: number, eta?: number) => {
      await updateMutation.mutateAsync({ lat, lng, heading, eta });
    },
    [updateMutation],
  );

  const stopMovement = useCallback(async () => {
    await stopMutation.mutateAsync();
  }, [stopMutation]);

  const markArrived = useCallback(async () => {
    await arriveMutation.mutateAsync();
  }, [arriveMutation]);

  return {
    session: session ?? null,
    isMoving: !!session,
    startMovement,
    updatePosition,
    stopMovement,
    markArrived,
    loading: isLoading,
  };
}
