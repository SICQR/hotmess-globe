/**
 * TierGate — wraps a feature with a per-benefit check.
 *
 * Reads useUserBenefits(); if the named benefit is truthy, renders children.
 * Otherwise renders the fallback (or null). Fail-open behaviour matches the
 * hook: while benefits are loading, the MESS defaults are used so no paid
 * feature is accidentally exposed.
 *
 * Usage:
 *   <TierGate benefit="has_full_music" fallback={<UpgradePrompt feature="music" />}>
 *     <FullTrackPlayer />
 *   </TierGate>
 *
 * Replaced FeatureGate.jsx (PR #593 cleanup) — that component used dead
 * PREMIUM/ELITE tier names that never matched the live mess/hotmess/
 * connected/promoter/venue schema. TierGate reads benefits JSON directly.
 */

import React from 'react';
import { useUserBenefits, type UserBenefits } from '@/hooks/useUserBenefits';

type BooleanBenefit = {
  [K in keyof UserBenefits]: UserBenefits[K] extends boolean | undefined ? K : never
}[keyof UserBenefits];

export interface TierGateProps {
  /** Name of the boolean benefit on the user's tier (e.g. 'has_full_music'). */
  benefit: BooleanBenefit;
  /** What to render when the user has access. */
  children: React.ReactNode;
  /** What to render when the user does NOT have access. Null by default. */
  fallback?: React.ReactNode;
}

export function TierGate({ benefit, children, fallback = null }: TierGateProps) {
  const benefits = useUserBenefits();
  const hasAccess = !!benefits[benefit];
  return <>{hasAccess ? children : fallback}</>;
}

/**
 * useTierBenefit — imperative variant for inline checks (e.g. button disabled).
 *
 *   const canMessage = useTierBenefit('has_messaging');
 *   <button disabled={!canMessage}>Send</button>
 */
export function useTierBenefit(benefit: BooleanBenefit): boolean {
  const benefits = useUserBenefits();
  return !!benefits[benefit];
}

/**
 * useTierLimit — for numeric quotas (e.g. beacon_drops_monthly). -1 = unlimited.
 *
 *   const cap = useTierLimit('beacon_drops_monthly'); // 0 mess, 3 hotmess, -1 venue
 *   if (cap !== -1 && used >= cap) <Upsell />
 */
export function useTierLimit(
  benefit: 'max_listings' | 'max_personas' | 'beacon_drops_monthly' | 'ghosted_preview_limit' | 'music_preview_seconds',
): number {
  const benefits = useUserBenefits();
  const v = benefits[benefit];
  return typeof v === 'number' ? v : 0;
}
