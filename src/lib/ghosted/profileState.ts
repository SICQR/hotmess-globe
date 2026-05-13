/**
 * profileState — orthogonal state composer for the Ghosted profile shell.
 *
 * Bible §3 (Orthogonal State Axes). Profiles in v6 are NOT a single status
 * string. They are the cross-product of four independent axes:
 *
 *   presence     × availability × relationship × spatial
 *
 * Each axis describes ONE thing. The UI composes them — never the backend.
 * This module is the only place where raw profile + status rows are mapped
 * onto the bible's enums, and the only place where downstream UI helpers
 * (badge labels, ring colours, CTA gating) are derived.
 *
 * Keep this file pure: no React, no Supabase, no DOM. Inputs in, derived
 * state out. Hooks layer that pulls the rows lives in useProfileState.ts.
 */

import {
  OrthogonalState,
  PresenceState,
  AvailabilityState,
  RelationshipState,
  SpatialState,
} from './physics'

// ─── Inputs ──────────────────────────────────────────────────────────────

/** Subset of `profiles` columns relevant to state composition. */
export interface ProfileRow {
  id:                  string
  last_seen?:          string | null   // ISO timestamp
  is_online?:          boolean | null
  hidden?:             boolean | null
  is_blocked_by_me?:   boolean | null
  is_blocked_them?:    boolean | null
  distance_km?:        number | null
  distance_m?:         number | null
  is_travel?:          boolean | null
  persona?:            string | null
  beacon_active_until?: string | null
}

/** Subset of `right_now_status` rows. */
export interface RightNowRow {
  intent?:        string | null
  expires_at?:    string | null   // ISO
  visibility?:    string | null   // 'public' | 'matches' | etc
}

/** Subset of `taps` aggregated against this profile (from viewer's side). */
export interface TapsSummary {
  i_booed_them?:  boolean
  they_booed_me?: boolean
  /** Days since the mutual boo locked in; null if never mutual */
  mutual_age_days?: number | null
  /** ISO timestamp the mutual fired — used for newness pulse */
  mutual_at?:     string | null
}

export interface VenueSnapshot {
  at_venue?:      boolean
  venue_name?:    string | null
}

export interface ComposeInput {
  profile:   ProfileRow
  rightNow?: RightNowRow | null
  taps?:     TapsSummary | null
  venue?:    VenueSnapshot | null
  /** Viewer-side flag — viewer signalled looking-mode within last 60 min */
  viewerInLookingMode?: boolean
  /** Bible §3.4 — explicit `out_of_range` toggle from presence service */
  outOfRange?: boolean
}

// ─── Axis resolvers (each does ONE thing) ───────────────────────────────

const ONLINE_WINDOW_MS    = 10 * 60_000   // 10m
const RECENT_WINDOW_MS    = 60 * 60_000   // 60m

export function resolvePresence(p: ProfileRow): PresenceState {
  if (p.hidden) return 'hidden'
  if (p.is_online) return 'online'
  if (!p.last_seen) return 'offline'
  const ms = Date.now() - new Date(p.last_seen).getTime()
  if (Number.isNaN(ms)) return 'offline'
  if (ms < ONLINE_WINDOW_MS) return 'online'
  if (ms < RECENT_WINDOW_MS) return 'recently_active'
  return 'offline'
}

export function resolveAvailability(
  rn: RightNowRow | null | undefined,
  isTravel: boolean | undefined,
): AvailabilityState {
  if (!rn || !rn.intent) return isTravel ? 'passing_through' : 'unspecified'
  const expired = rn.expires_at
    ? new Date(rn.expires_at).getTime() < Date.now()
    : false
  if (expired) return isTravel ? 'passing_through' : 'unspecified'
  const intent = String(rn.intent).toLowerCase()
  if (intent === 'unavailable' || intent === 'off')      return 'unavailable'
  if (intent === 'hookup' || intent === 'looking' ||
      intent === 'hang'   || intent === 'explore')        return 'looking'
  if (isTravel) return 'passing_through'
  return 'unspecified'
}

export function resolveRelationship(taps: TapsSummary | null | undefined): RelationshipState {
  if (!taps) return 'none'
  const both = taps.i_booed_them && taps.they_booed_me
  if (both) {
    if (taps.mutual_age_days != null && taps.mutual_age_days > 30) return 'expired'
    return 'mutual'
  }
  if (taps.i_booed_them) return 'i_booed_them'
  if (taps.they_booed_me) return 'they_booed_me'
  return 'none'
}

export function resolveSpatial(input: ComposeInput): SpatialState {
  const { profile, venue, outOfRange } = input
  if (outOfRange) return 'out_of_range'
  if (venue?.at_venue) return 'at_venue'
  if (profile.beacon_active_until) {
    const t = new Date(profile.beacon_active_until).getTime()
    if (!Number.isNaN(t) && t > Date.now()) return 'beacon_active'
  }
  if (profile.is_travel || profile.persona === 'TRAVEL') return 'travelling'
  const distM = profile.distance_m != null ? profile.distance_m
              : profile.distance_km != null ? profile.distance_km * 1000
              : null
  if (distM != null && distM <= 2000) return 'nearby'
  return 'nearby'
}

// ─── Composer ────────────────────────────────────────────────────────────

export function composeProfileState(input: ComposeInput): OrthogonalState {
  return {
    presence:     resolvePresence(input.profile),
    availability: resolveAvailability(input.rightNow ?? null, input.profile.is_travel ?? false),
    relationship: resolveRelationship(input.taps ?? null),
    spatial:      resolveSpatial(input),
  }
}

// ─── Derived helpers — what the UI actually consumes ────────────────────

/** Bible §4 — overlay tone for the dormant card border. */
export function deriveBorderTone(s: OrthogonalState): 'gold' | 'soft' | 'none' {
  if (s.relationship === 'mutual')   return 'gold'
  if (s.relationship === 'expired')  return 'soft'
  return 'none'
}

/** Bible §3 — short caption for the meta line. */
export function derivePresenceLabel(s: OrthogonalState): string {
  if (s.presence === 'online')           return 'Online now'
  if (s.presence === 'recently_active')  return 'Recently active'
  if (s.presence === 'hidden')           return 'Hidden'
  return 'Offline'
}

/** Bible §3 — colour token for the presence dot. */
export function derivePresenceDot(s: OrthogonalState): string {
  if (s.presence === 'online')          return '#30D158'
  if (s.presence === 'recently_active') return '#FFAB00'
  if (s.presence === 'hidden')          return 'rgba(255,255,255,0.16)'
  return '#8E8E93'
}

/** Bible §5 — chat sheets are gated on relationship being non-zero. */
export function canMessage(s: OrthogonalState): boolean {
  return s.relationship === 'mutual'
      || s.relationship === 'i_booed_them'
      || s.relationship === 'they_booed_me'
}

/** Bible §2 — Mutual is the only state that unlocks the locked-after-mutual stack. */
export function isLockedStack(s: OrthogonalState): boolean {
  return s.relationship === 'mutual'
}

/** Bible §7 — RecoveryState v0.1 hooks read this. */
export function shouldOfferRecovery(
  s: OrthogonalState,
  triggers: { meetup_completed?: boolean; location_revoked?: boolean } = {},
): boolean {
  if (!triggers.meetup_completed && !triggers.location_revoked) return false
  return s.relationship === 'mutual' || s.relationship === 'expired'
}

export default composeProfileState
