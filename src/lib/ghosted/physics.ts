/**
 * Ghosted physics constants — locked from interaction bible v1, 2026-05-13.
 *
 * Single source of truth for every spring, threshold, and timing budget in
 * the Ghosted loop. Engineering MUST NOT redefine these in component code.
 * Adjustments go through this file or they don't ship.
 *
 * Calibration ceilings live in ./physics-guardrails.test.ts — those tests
 * fail the build if any constant drifts past the bible's bounds.
 *
 * Bible §1.2 · §1.3 · §2.2 · §4.1
 */

export interface SpringConfig {
  tension:  number
  friction: number
  mass:     number
}

// §1.2 — one config per philosophy. Never tune per-component.
export const SPRING_PRIMARY: SpringConfig = { tension: 220, friction: 28, mass: 1   }
export const SPRING_RETRACT: SpringConfig = { tension: 280, friction: 32, mass: 1   }
export const SPRING_RUBBER:  SpringConfig = { tension: 260, friction: 24, mass: 0.9 }

// §1.3 — commit thresholds. Distance is fraction of card dimension (0–1).
export const THRESHOLDS = {
  swipeX: {
    distance:        0.35,   // 35% of card width
    velocity:        0.6,    // px/ms — short-circuits distance gate
    boundaryElastic: 0.30,   // rubber-band at first / last image
  },
  dragUp: {
    distance:        0.28,   // 28% to arm
    distanceCommit:  0.35,   // 35% release commits to armed-pinned
    velocity:        0.5,
    boundaryElastic: 0.40,   // resistance past max
    maxDrag:         0.65,   // §4.1 — image always visible at top
  },
  dragDownIntent: {
    distance: 0.18,
    velocity: 0.7,
  },
  dragDownProfile: {
    distance: 0.22,
    velocity: 0.7,
  },
} as const

// §2.2 — image stack mechanics
export const IMAGE_STACK = {
  edgePeekPx: {
    wide:   11,   // viewport ≥ 390
    narrow: 8,    // viewport < 390
    floor:  6,
  },
  pullHandle: {
    widthPx:  1,
    heightPx: 24,
    color:    'rgba(255,255,255,0.25)',
  },
  parallax: {
    currentTrack: 1.00,   // image follows finger 1:1
    nextTrack:    1.05,   // subtle parallax on the under-image
  },
  overlayFadeStart: 0.00,
  overlayFadeEnd:   0.25,
  commitMs:         320,
  overlayReturnMs:  280,
  firstImageLockMs: 600,   // §1 lock — 600ms hold before swipe-x accepted
  preload: {
    immediate: [1],
    onIdle:    [2],
    onCross50: [3, 4],
  },
} as const

// §4.1 — intent layer compression
export const INTENT = {
  primingFrom:        0.08,
  armedFrom:          0.28,
  commitAt:           0.35,
  maxDrag:            0.65,
  heroScaleAtArmed:   0.85,
  heroScaleAtCommit:  0.65,
  retractTriggerPct:  0.10,
} as const

// §6 — perceived-latency budgets (ms). Engineering MUST hit these.
export const LATENCY_BUDGET_MS = {
  swipeXFirstFrame:        16,
  dragUpFirstFrame:        32,
  swipeXSettle:           380,
  dragUpSettle:           400,
  profileOpenFirstPaint:  280,
  mutualOverlayFirstRing:  80,
} as const

// §1.5 — haptic plan
export type HapticLevel = 'selection' | 'medium' | 'success'

export const HAPTIC_PLAN: Record<string, HapticLevel> = {
  imageCommit:       'selection',
  intentCommit:      'selection',
  booSent:           'medium',
  mutualReveal:      'success',
} as const

// §3 — orthogonal state axes
export type PresenceState     = 'online' | 'recently_active' | 'offline' | 'hidden'
export type AvailabilityState = 'looking' | 'passing_through' | 'unavailable' | 'unspecified'
export type RelationshipState = 'none' | 'i_booed_them' | 'they_booed_me' | 'mutual' | 'expired' | 'blocked'
export type SpatialState      = 'nearby' | 'at_venue' | 'travelling' | 'beacon_active' | 'out_of_range'

export interface OrthogonalState {
  presence:     PresenceState
  availability: AvailabilityState
  relationship: RelationshipState
  spatial:      SpatialState
}

// §5 — chat-layer state
export type MeetupState = 'proposed' | 'confirmed' | 'eta_shared' | 'en_route' | 'arrived' | 'completed' | 'cancelled'

export const MEETUP = {
  autoDeclineMs:     6 * 60 * 60 * 1000,    // 6h — bible answer 3
  arrivedDisplayMs:  5 * 60 * 1000,
} as const

export const ETA_DURATIONS_MIN = [10, 30, 60] as const   // bible answer 5
export const BEACON_DEFAULT_DURATION_MIN = 60 as const   // bible answer 4
export const MUTUAL_EXPIRY_DAYS = 30 as const            // bible answer 6
