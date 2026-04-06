/**
 * useTravelSession — manages travel sessions for the meet flow.
 *
 * Creates sessions, tracks status, listens for realtime updates.
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';

export interface TravelSession {
  id: string;
  user_id: string;
  chat_thread_id: string | null;
  destination_type: string;
  destination_label: string;
  destination_lat: number | null;
  destination_lng: number | null;
  origin_lat: number | null;
  origin_lng: number | null;
  mode: string;
  provider: string | null;
  eta_minutes: number | null;
  estimated_cost_min: number | null;
  estimated_cost_max: number | null;
  distance_km: number | null;
  status: string;
  share_mode: string;
  recipient_user_id: string | null;
  provider_booking_ref: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
  arrived_at: string | null;
}

export interface TravelUpdate {
  id: string;
  travel_session_id: string;
  status: string;
  eta_minutes: number | null;
  message: string | null;
  created_at: string;
}

interface CreateSessionParams {
  destination_type: string;
  destination_label: string;
  destination_lat?: number;
  destination_lng?: number;
  origin_lat?: number;
  origin_lng?: number;
  mode?: string;
  chat_thread_id?: string;
  recipient_user_id?: string;
  share_mode?: string;
  eta_minutes?: number;
  estimated_cost_min?: number;
  estimated_cost_max?: number;
  distance_km?: number;
}

/**
 * Active travel session for the current user.
 */
export function useActiveTravelSession() {
  const queryClient = useQueryClient();

  const query = useQuery<TravelSession | null>({
    queryKey: ['travel-session-active'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return null;

      const { data, error } = await supabase
        .from('travel_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .not('status', 'in', '("arrived","cancelled")')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('[useTravelSession] query error:', error.message);
        return null;
      }
      return data as TravelSession | null;
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  // Realtime: listen for updates on own sessions
  useEffect(() => {
    const channel = supabase
      .channel('travel-session-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'travel_sessions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['travel-session-active'] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

/**
 * Travel session shared with the current user (recipient view).
 */
export function useSharedTravelSession(threadId: string | null) {
  return useQuery<TravelSession | null>({
    queryKey: ['travel-session-shared', threadId],
    enabled: !!threadId,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id || !threadId) return null;

      const { data, error } = await supabase
        .from('travel_sessions')
        .select('*')
        .eq('chat_thread_id', threadId)
        .eq('recipient_user_id', session.user.id)
        .neq('share_mode', 'off')
        .not('status', 'in', '("cancelled")')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return null;
      return data as TravelSession | null;
    },
    refetchInterval: 15_000,
  });
}

/**
 * Create a new travel session.
 */
export function useCreateTravelSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateSessionParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('travel_sessions')
        .insert({
          user_id: session.user.id,
          ...params,
          status: 'routing',
        })
        .select()
        .single();

      if (error) throw error;
      return data as TravelSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-session-active'] });
    },
  });
}

/**
 * Update travel session status.
 */
export function useUpdateTravelStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, status, eta_minutes, message }: {
      sessionId: string;
      status: string;
      eta_minutes?: number;
      message?: string;
    }) => {
      // Update session
      const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === 'arrived') updates.arrived_at = new Date().toISOString();
      if (eta_minutes !== undefined) updates.eta_minutes = eta_minutes;

      const { error: sessionErr } = await supabase
        .from('travel_sessions')
        .update(updates)
        .eq('id', sessionId);
      if (sessionErr) throw sessionErr;

      // Write update record
      await supabase.from('travel_updates').insert({
        travel_session_id: sessionId,
        status,
        eta_minutes,
        message,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-session-active'] });
    },
  });
}

/**
 * Share ETA with chat recipient.
 */
export function useShareETA() {
  return useMutation({
    mutationFn: async ({ sessionId, shareMode }: { sessionId: string; shareMode: string }) => {
      const { error } = await supabase
        .from('travel_sessions')
        .update({ share_mode: shareMode, updated_at: new Date().toISOString() })
        .eq('id', sessionId);
      if (error) throw error;
    },
  });
}
