/**
 * SpatialElement — Architectural Contract for Fixed UI Elements
 *
 * Every fixed-position element that participates in the OS layer stack MUST
 * declare a SpatialElement descriptor. This acts as a compile-time contract
 * that forces intentional spatial design.
 *
 * If a component cannot describe its spatial behaviour, it should not exist
 * as a fixed element.
 *
 * @see docs/BACKEND_CONTRACT.md
 * @see src/lib/motionOrchestrator.ts
 */

import type { MotionDomain } from '@/lib/motionOrchestrator';

// ─── Layer system (canonical OS BIBLE L0-L3) ─────────────────────────────────

/** OS layer identifiers — matches the BIBLE overlay architecture */
export type OSLayer = 'L0' | 'L1' | 'L2' | 'L3';

/** Maps OS layers to their canonical z-index values */
export const OS_LAYER_Z: Record<OSLayer, number> = {
  L0: 0,   // Globe
  L1: 50,  // HUD
  L2: 80,  // Sheets
  L3: 100, // Interrupts
} as const;

// ─── Spatial anchor positions ─────────────────────────────────────────────────

/** Where the element anchors in the viewport */
export type SpatialAnchor =
  | 'full-screen'   // Covers entire viewport (fixed inset-0)
  | 'top-bar'       // Pinned to top edge
  | 'bottom-bar'    // Pinned to bottom edge
  | 'bottom-sheet'  // Slides up from bottom
  | 'side-drawer'   // Slides in from a side
  | 'floating'      // Floating widget (fixed position, partial coverage)
  | 'toast';        // Transient notification (corner)

// ─── Entry / exit triggers ───────────────────────────────────────────────────

/** What causes the element to become visible */
export type EntryTrigger =
  | 'boot'            // App initialisation (splash, age gate)
  | 'user-action'     // Explicit user tap / press
  | 'url-param'       // URL query parameter (e.g. ?sheet=profile)
  | 'system-event'    // System-generated (SOS long-press, check-in alarm)
  | 'realtime-event'  // Incoming realtime message / notification
  | 'animation-tick'; // Internal animation sequence

/** How the element leaves the viewport */
export type ExitBehavior =
  | 'swipe-dismiss'   // User swipes it away
  | 'tap-backdrop'    // Tapping outside closes it
  | 'programmatic'    // Code calls close() / dismiss()
  | 'timeout'         // Auto-dismisses after a duration
  | 'navigate-away';  // Route change removes it

// ─── SpatialElement descriptor ───────────────────────────────────────────────

/**
 * Descriptor that every fixed-position OS element must implement.
 *
 * @example
 * ```ts
 * export const SOS_OVERLAY_SPATIAL: SpatialElement = {
 *   id: 'sos-overlay',
 *   owner: 'safety',
 *   layer: 'L3',
 *   spatialAnchor: 'full-screen',
 *   entryTrigger: 'system-event',
 *   exitBehavior: 'programmatic',
 *   blockingPriority: 'interrupt',
 *   blocksInteraction: true,
 * };
 * ```
 */
export interface SpatialElement {
  /**
   * Unique identifier for this spatial element.
   * Used for debugging and orchestrator tracking.
   */
  id: string;

  /**
   * Feature / subsystem that owns this element.
   * Prevents anonymous spatial elements.
   *
   * @example 'safety' | 'shell' | 'social' | 'gamification'
   */
  owner: string;

  /**
   * OS layer this element occupies.
   * Determines z-index via OS_LAYER_Z.
   */
  layer: OSLayer;

  /**
   * Viewport position / layout behaviour.
   */
  spatialAnchor: SpatialAnchor;

  /**
   * What causes this element to enter.
   */
  entryTrigger: EntryTrigger;

  /**
   * How this element exits.
   */
  exitBehavior: ExitBehavior;

  /**
   * MotionOrchestrator domain — used to serialize animations and prevent
   * competing animation stacks.
   */
  blockingPriority: MotionDomain;

  /**
   * Whether this element should block pointer interaction with layers below.
   * Elements at L3 always block. L2 sheets may partially block.
   */
  blocksInteraction: boolean;

  /**
   * Optional: human-readable description for tooling / audits.
   */
  description?: string;
}

// ─── Validation helper ────────────────────────────────────────────────────────

/**
 * Validates that a SpatialElement descriptor is internally consistent.
 * Throws a descriptive error for constraint violations.
 *
 * Call this once per component (e.g. at module load) to catch misconfigurations
 * before they reach production.
 *
 * @example
 * ```ts
 * assertSpatialElement(MY_COMPONENT_SPATIAL);
 * ```
 */
export function assertSpatialElement(el: SpatialElement): void {
  if (!el.id) {
    throw new Error('[SpatialElement] Missing required field: id');
  }
  if (!el.owner) {
    throw new Error(`[SpatialElement "${el.id}"] Missing required field: owner`);
  }

  // L3 interrupts must block interaction
  if (el.layer === 'L3' && !el.blocksInteraction) {
    throw new Error(
      `[SpatialElement "${el.id}"] L3 interrupt elements must set blocksInteraction: true`,
    );
  }

  // L3 elements must use 'interrupt' blocking priority
  if (el.layer === 'L3' && el.blockingPriority !== 'interrupt') {
    throw new Error(
      `[SpatialElement "${el.id}"] L3 elements must use blockingPriority: 'interrupt'`,
    );
  }

  // HUD elements (L1) must not use full-screen anchor
  if (el.layer === 'L1' && el.spatialAnchor === 'full-screen') {
    throw new Error(
      `[SpatialElement "${el.id}"] L1 HUD elements cannot use spatialAnchor: 'full-screen'`,
    );
  }
}
