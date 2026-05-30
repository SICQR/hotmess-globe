/**
 * HOTMESS OS — Safety System
 * 
 * Panic override: press-and-hold → DB incident → red beacon → UI lock.
 * Safety ignores modes, filters, and UI state.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type SafetyStatus = 'active' | 'acknowledged' | 'resolved';

export interface SafetyIncident {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  status: SafetyStatus;
  created_at: string;
  resolved_at: string | null;
}

export interface SafetyState {
  isActive: boolean;
  incident: SafetyIncident | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PANIC START (creates incident + beacon)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Start panic sequence
 * - Creates safety_incident row
 * - Creates safety beacon (admin_only visibility)
 * - Returns incident ID for tracking
 */
export async function panicStart(
  supabase: SupabaseClient,
  location: { lat: number; lng: number }
): Promise<{ success: boolean; incidentId?: string; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Try RPC first (server-authoritative)
  const { data, error } = await supabase.rpc('panic_start', {
    p_lat: location.lat,
    p_lng: location.lng,
  });

  if (error) {
    // Fallback: direct insert if RPC doesn't exist yet
    const { data: incident, error: insertError } = await supabase
      .from('safety_incidents')
      .insert({
        user_id: user.id,
        lat: location.lat,
        lng: location.lng,
        status: 'active',
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    // Create safety beacon
    await supabase.from('beacons').insert({
      type: 'safety',
      owner_id: user.id,
      lat: location.lat,
      lng: location.lng,
      intensity: 10,
      visibility: 'admin_only',
      metadata: { incident_id: incident.id },
    });

    return { success: true, incidentId: incident.id };
  }

  return { success: true, incidentId: data };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PANIC RESOLVE (user ends incident)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve active panic incident
 * - Updates incident status to 'resolved'
 * - Removes safety beacon
 */
export async function panicResolve(
  supabase: SupabaseClient,
  incidentId?: string
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Update incident
  const { error: updateError } = await supabase
    .from('safety_incidents')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Remove safety beacon
  await supabase
    .from('beacons')
    .delete()
    .eq('type', 'safety')
    .eq('owner_id', user.id);

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET ACTIVE INCIDENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if user has an active safety incident
 */
export async function getActiveIncident(
  supabase: SupabaseClient
): Promise<SafetyIncident | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('safety_incidents')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as SafetyIncident;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN: ACKNOWLEDGE INCIDENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Admin acknowledges an incident (shows user help is on the way)
 */
export async function adminAcknowledge(
  supabase: SupabaseClient,
  incidentId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('safety_incidents')
    .update({ status: 'acknowledged' })
    .eq('id', incidentId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN: GET ALL ACTIVE INCIDENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all active/acknowledged incidents (admin only)
 */
export async function getActiveIncidents(
  supabase: SupabaseClient
): Promise<SafetyIncident[]> {
  const { data, error } = await supabase
    .from('safety_incidents')
    .select('*')
    .in('status', ['active', 'acknowledged'])
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as SafetyIncident[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACT HOOK
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';

export function useSafety(supabase: SupabaseClient) {
  const [state, setState] = useState<SafetyState>({
    isActive: false,
    incident: null,
  });
  const [loading, setLoading] = useState(true);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

  // Check for active incident
  const checkIncident = useCallback(async () => {
    const incident = await getActiveIncident(supabase);
    setState({
      isActive: !!incident,
      incident,
    });
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    checkIncident();

    // Subscribe to safety_incidents changes
    const channel = supabase
      .channel('safety-incidents')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'safety_incidents',
        },
        () => checkIncident()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, checkIncident]);

  // Start panic (after hold completes)
  const triggerPanic = useCallback(async () => {
    // Get location
    let location = { lat: 0, lng: 0 };
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
        });
      });
      location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      // Use last known or default
      console.warn('[Safety] Could not get location');
    }

    const result = await panicStart(supabase, location);
    if (result.success) {
      await checkIncident();
    }
    return result;
  }, [supabase, checkIncident]);

  // Resolve panic
  const resolve = useCallback(async () => {
    const result = await panicResolve(supabase);
    if (result.success) {
      setState({ isActive: false, incident: null });
    }
    return result;
  }, [supabase]);

  // Hold gesture handlers (3 second hold to trigger)
  const HOLD_DURATION = 3000;
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startHold = useCallback(() => {
    if (state.isActive) return; // Already in panic mode
    
    setIsHolding(true);
    setHoldProgress(0);
    
    const startTime = Date.now();
    
    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / HOLD_DURATION, 1);
      setHoldProgress(progress);
    }, 50);

    holdTimerRef.current = setTimeout(async () => {
      setIsHolding(false);
      setHoldProgress(0);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      
      // Trigger panic
      await triggerPanic();
    }, HOLD_DURATION);
  }, [state.isActive, triggerPanic]);

  const cancelHold = useCallback(() => {
    setIsHolding(false);
    setHoldProgress(0);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
  }, []);

  return {
    // State
    isActive: state.isActive,
    incident: state.incident,
    loading,
    
    // Hold gesture
    isHolding,
    holdProgress,
    startHold,
    cancelHold,
    
    // Actions
    triggerPanic,
    resolve,
    refresh: checkIncident,
  };
}

export default useSafety;
