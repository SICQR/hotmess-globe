/**
 * HOTMESS OS — Boot Guard
 * 
 * Single deterministic startup state machine.
 * Blocks OS mount until all gates pass.
 * 
 * RULE: Nothing renders Globe, HUD, Radio, or modes unless:
 *   - age_verified === true
 *   - username IS NOT NULL
 *   - onboarding_complete === true
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type BootState = 
  | 'AGE_GATE'
  | 'AUTH'
  | 'USERNAME'
  | 'ONBOARDING'
  | 'OS';

export interface BootRoute {
  state: BootState;
  profile?: Profile | null;
  userId?: string;
}

export interface Profile {
  id: string;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  age_verified: boolean;
  consent_accepted: boolean;
  onboarding_complete: boolean;
  is_verified: boolean;
  verification_level: string;
  location_opt_in: boolean;
  persona: string | null;
  role_flags: Record<string, boolean>;
  can_go_live: boolean;
  can_sell: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOOT GUARD (THE SINGLE RULE)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determines what the app should render based on auth + profile state.
 * Call this on EVERY route before rendering OS.
 * 
 * Returns:
 * - AGE_GATE: No session, show age verification
 * - AUTH: Age verified but no session, show login
 * - USERNAME: Logged in but no username set
 * - ONBOARDING: Username set but onboarding incomplete
 * - OS: All gates passed, mount the OS runtime
 */
export async function bootGuard(supabase: SupabaseClient): Promise<BootRoute> {
  // 1. Check session
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;

  // No session: start at age gate
  if (!session?.user?.id) {
    return { state: 'AGE_GATE' };
  }

  const uid = session.user.id;

  // 2. Fetch profile (must exist 1:1 with auth.users)
  let { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single();

  // If missing (race condition), try an upsert then refetch
  if (!profile || error) {
    await supabase.from('profiles').upsert(
      { id: uid },
      { onConflict: 'id' }
    );
    const refetch = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();
    profile = refetch.data;
  }

  // Still no profile = blocked
  if (!profile) {
    return { state: 'AGE_GATE', userId: uid };
  }

  // 3. HARD GATES (server truth, in order)
  
  // Age verification required first
  if (!profile.age_verified) {
    return { state: 'AGE_GATE', profile, userId: uid };
  }

  // Username required before anything else
  if (!profile.username) {
    return { state: 'USERNAME', profile, userId: uid };
  }

  // Onboarding must be complete
  if (!profile.onboarding_complete) {
    return { state: 'ONBOARDING', profile, userId: uid };
  }

  // 4. All gates passed - mount OS
  return { state: 'OS', profile, userId: uid };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if user can go live (Right Now)
 * Requires: onboarding + verified + location opt-in
 */
export function canGoLive(profile: Profile | null): boolean {
  if (!profile) return false;
  return (
    profile.onboarding_complete &&
    profile.is_verified &&
    profile.location_opt_in
  );
}

/**
 * Check if user can sell (P2P marketplace)
 * Requires: onboarding + full verification
 */
export function canSell(profile: Profile | null): boolean {
  if (!profile) return false;
  return (
    profile.onboarding_complete &&
    profile.is_verified &&
    profile.verification_level === 'full'
  );
}

/**
 * Check if user is admin
 */
export function isAdmin(profile: Profile | null): boolean {
  if (!profile) return false;
  return profile.role_flags?.admin === true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE UPDATE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mark age as verified (after age gate passes)
 */
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

/**
 * Claim username (unique, required before onboarding)
 */
export async function claimUsername(
  supabase: SupabaseClient,
  username: string
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Normalize username
  const normalized = username.toLowerCase().trim();
  
  // Validate format
  if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
    return { success: false, error: 'Username must be 3-20 characters, letters, numbers, underscores only' };
  }

  // Reserved words
  const reserved = ['admin', 'support', 'hotmess', 'system', 'help', 'mod', 'moderator'];
  if (reserved.includes(normalized)) {
    return { success: false, error: 'Username is reserved' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ username: normalized })
    .eq('id', user.id);

  if (error) {
    if (error.message.includes('unique') || error.message.includes('duplicate')) {
      return { success: false, error: 'Username already taken' };
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Complete onboarding (after persona + consent)
 */
export async function completeOnboarding(
  supabase: SupabaseClient,
  data: {
    persona: string;
    consents: Record<string, boolean>;
    locationOptIn: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('profiles')
    .update({
      persona: data.persona,
      consents_json: data.consents,
      consent_accepted: true,
      location_opt_in: data.locationOptIn,
      onboarding_complete: true,
    })
    .eq('id', user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACT HOOK
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';

export function useBootGuard(supabase: SupabaseClient) {
  const [bootRoute, setBootRoute] = useState<BootRoute | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    setLoading(true);
    const route = await bootGuard(supabase);
    setBootRoute(route);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    check();

    // Re-check on auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, check]);

  const canMountOS = bootRoute?.state === 'OS';
  const profile = bootRoute?.profile || null;

  return {
    bootRoute,
    loading,
    canMountOS,
    profile,
    refresh: check,
    // Gate helpers
    canGoLive: canGoLive(profile),
    canSell: canSell(profile),
    isAdmin: isAdmin(profile),
  };
}

export default bootGuard;
