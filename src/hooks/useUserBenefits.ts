/**
 * useUserBenefits — reads the user's tier benefits from the DB.
 *
 * Driven by RPC public.get_user_benefits() which is SECURITY DEFINER and
 * NEVER throws — falls back to MESS benefits for anon / missing rows so the
 * client never blocks on a stale tier name.
 *
 * Usage:
 *   const benefits = useUserBenefits();
 *   if (!benefits.has_full_music) <Upsell />
 *
 * Defaults: hard-coded MESS benefits while loading (so first render is safe
 * — never accidentally grants access). Refreshes on auth state change.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

export type UserBenefits = {
  label?: string;
  tagline?: string;
  description?: string;
  can_sell?: boolean;
  can_buy_products?: boolean;
  has_taps?: boolean;
  has_messaging?: boolean;
  has_radio?: boolean;
  has_events?: boolean;
  has_door_app?: boolean;
  has_referral?: boolean;
  has_rightnow?: boolean;
  has_analytics?: boolean;
  has_bookmarks?: boolean;
  has_ticketing?: boolean;
  has_brand_page?: boolean;
  has_challenges?: boolean;
  has_full_music?: boolean;
  has_radio_slot?: boolean;
  has_hand_n_hand?: boolean;
  has_dial_a_daddy?: boolean;
  has_full_ghosted?: boolean;
  has_stripe_connect?: boolean;
  has_business_billing?: boolean;
  has_creator_dashboard?: boolean;
  has_permanent_globe_presence?: boolean;
  max_listings?: number; // -1 = unlimited
  max_personas?: number; // -1 = unlimited
  beacon_drops_monthly?: number; // -1 = unlimited
  ghosted_preview_limit?: number; // -1 = unlimited
  music_preview_seconds?: number; // -1 = full track
  // Phil 2026-05-29 — Founding 250 + Phil + e2e accounts get Ghosted unlocked
  // + 4 beacon drops/day. Driven by public.is_beta_cohort() server-side.
  beta_cohort_active?: boolean;
};

// Safe MESS defaults — used while loading + on RPC failure. Never grants paid
// access. The has_radio + can_buy_products + max_personas:1 stay because
// those are MESS-free baseline, not paid.
const MESS_DEFAULTS: Readonly<UserBenefits> = Object.freeze({
  label: 'MESS',
  can_sell: false,
  can_buy_products: true,
  has_taps: false,
  has_messaging: false,
  has_radio: true,
  has_events: false,
  has_rightnow: false,
  has_analytics: false,
  has_bookmarks: false,
  has_challenges: false,
  has_full_music: false,
  has_hand_n_hand: false,
  has_dial_a_daddy: false,
  has_full_ghosted: false,
  has_creator_dashboard: false,
  max_listings: 0,
  max_personas: 1,
  beacon_drops_monthly: 0,
  ghosted_preview_limit: 3,
  music_preview_seconds: 90,
  beta_cohort_active: false,
});

const REFRESH_MS = 120_000;

export function useUserBenefits(): UserBenefits {
  const [benefits, setBenefits] = useState<UserBenefits>(MESS_DEFAULTS);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data, error } = await supabase.rpc('get_user_benefits');
        if (cancelled) return;
        if (error || !data || typeof data !== 'object') {
          // Silent — keep last-known or MESS default. Never block the UI.
          return;
        }
        setBenefits({ ...MESS_DEFAULTS, ...(data as UserBenefits) });
      } catch {
        /* network blip — keep last-known */
      }
    }

    void load();
    const interval = window.setInterval(() => { void load(); }, REFRESH_MS);

    // Refresh on auth state changes so tier upgrades land within a second
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      subscription?.unsubscribe();
    };
  }, []);

  return benefits;
}

export const MESS_BENEFITS_DEFAULTS = MESS_DEFAULTS;
