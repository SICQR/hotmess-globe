/**
 * HOTMESS OS — Viewer State
 * 
 * Single boot guard. Called once at app start.
 * Returns the authoritative viewer state from database.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ViewerState = 
  | 'AGE_REQUIRED'
  | 'CONSENT_REQUIRED'
  | 'ONBOARDING_REQUIRED'
  | 'OS_READY'
  | 'BLOCKED';

// ═══════════════════════════════════════════════════════════════════════════════
// VIEWER STATE CHECK (via RPC)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get viewer state from database via RPC
 * This is the ONLY way the app determines state.
 */
export async function getViewerState(
  supabase: SupabaseClient
): Promise<ViewerState> {
  try {
    // Check auth first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return 'AGE_REQUIRED'; // No auth = start from beginning
    }

    // Call RPC to get authoritative state
    const { data, error } = await supabase.rpc('rpc_viewer_state');
    
    if (error) {
      console.error('[ViewerState] RPC error:', error);
      // Fallback: check profile manually
      return await getViewerStateFallback(supabase);
    }

    // Validate response
    const validStates: ViewerState[] = [
      'AGE_REQUIRED',
      'CONSENT_REQUIRED', 
      'ONBOARDING_REQUIRED',
      'OS_READY',
      'BLOCKED'
    ];

    if (validStates.includes(data as ViewerState)) {
      return data as ViewerState;
    }

    console.warn('[ViewerState] Invalid RPC response:', data);
    return 'BLOCKED';
  } catch (e) {
    console.error('[ViewerState] Exception:', e);
    return 'BLOCKED';
  }
}

/**
 * Fallback: Check profile directly (if RPC doesn't exist yet)
 */
async function getViewerStateFallback(
  supabase: SupabaseClient
): Promise<ViewerState> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'AGE_REQUIRED';

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('age_verified, consent_accepted, onboarding_complete')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    return 'BLOCKED';
  }

  if (!profile.age_verified) return 'AGE_REQUIRED';
  if (!profile.consent_accepted) return 'CONSENT_REQUIRED';
  if (!profile.onboarding_complete) return 'ONBOARDING_REQUIRED';
  
  return 'OS_READY';
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOOT ROUTER
// ═══════════════════════════════════════════════════════════════════════════════

export interface BootRouterOptions {
  onAgeRequired: () => void;
  onConsentRequired: () => void;
  onOnboardingRequired: () => void;
  onOsReady: () => void;
  onBlocked: () => void;
}

/**
 * Route based on viewer state
 * Called once at app boot
 */
export async function bootRouter(
  supabase: SupabaseClient,
  options: BootRouterOptions
): Promise<ViewerState> {
  const state = await getViewerState(supabase);

  switch (state) {
    case 'AGE_REQUIRED':
      options.onAgeRequired();
      break;
    case 'CONSENT_REQUIRED':
      options.onConsentRequired();
      break;
    case 'ONBOARDING_REQUIRED':
      options.onOnboardingRequired();
      break;
    case 'OS_READY':
      options.onOsReady();
      break;
    case 'BLOCKED':
    default:
      options.onBlocked();
      break;
  }

  return state;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACT HOOK
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';

export function useViewerState(supabase: SupabaseClient) {
  const [state, setState] = useState<ViewerState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const viewerState = await getViewerState(supabase);
    setState(viewerState);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    refresh();

    // Re-check on auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, refresh]);

  const isReady = state === 'OS_READY';
  const needsAge = state === 'AGE_REQUIRED';
  const needsConsent = state === 'CONSENT_REQUIRED';
  const needsOnboarding = state === 'ONBOARDING_REQUIRED';
  const isBlocked = state === 'BLOCKED';

  return {
    state,
    loading,
    isReady,
    needsAge,
    needsConsent,
    needsOnboarding,
    isBlocked,
    refresh,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE UPDATES (for gate completion)
// ═══════════════════════════════════════════════════════════════════════════════

export async function markAgeVerified(
  supabase: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('profiles')
    .update({ age_verified: true })
    .eq('id', user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function markConsentAccepted(
  supabase: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('profiles')
    .update({ consent_accepted: true })
    .eq('id', user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function markOnboardingComplete(
  supabase: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_complete: true })
    .eq('id', user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
