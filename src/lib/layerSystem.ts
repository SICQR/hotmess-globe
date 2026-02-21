/**
 * HOTMESS OS — Layer Discipline System
 *
 * Single source of truth for z-index hierarchy, motion timing,
 * and spatial choreography across the entire OS.
 *
 * Layer model (bottom → top):
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  L0  Base        z:0    Globe, persistent 3-D canvas (never unmounts)   │
 * │  L1  UI          z:50   TopHUD, BottomDock, mode panels, glass panels   │
 * │  L2  Overlay     z:80   Sheets, drawers, detail panels, profile pop     │
 * │  L3  Micro       z:110  Tooltips, hover cards, live stat callouts       │
 * │  L3  Modal       z:100  Dialogs, confirmations, full-screen interrupts  │
 * │  L4  Toast       z:120  Toasts, realtime banners, system warnings       │
 * │  L4  Emergency   z:200  SOS, SafetyOverlay (full-screen lock, inviolate)│
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * CSS aliases (for plain CSS / keyframes):
 *   --z-ui:       50   (L1)
 *   --z-overlay:  80   (L2)
 *   --z-micro:    110  (L3 micro)
 *   --z-toast:    120  (L4 notification)
 *
 * Motion Authority Rules:
 *   1. ONE MAJOR MOTION AT A TIME. Camera + UI never animate simultaneously.
 *   2. Intent → Commit → Animate → Settle. Never animate into uncertainty.
 *   3. Layout must be stable before any transition fires (no auto-height).
 *   4. Camera move → settle → sheet slide.  Sheet exit → camera refocus.
 *   5. Micro (fast) never blocks primary interaction.
 *
 * Spatial Element Declaration (every fixed/absolute element must define):
 *   - entryTrigger: what causes it to appear
 *   - spatialAnchor: where it is positioned
 *   - exitBehavior: how it leaves
 *   - blockingPriority: which layer it belongs to
 *   - owner: which context/provider owns its state
 */

// ─── Z-Index Tokens ───────────────────────────────────────────────────────────
export const Z = {
  BASE:        0,    // L0 — globe canvas, background fills
  UI:          50,   // L1 — TopHUD, BottomDock, mode panels
  OVERLAY:     80,   // L2 — bottom-sheets, side drawers, location panels
  MODAL:       100,  // L3 — dialogs, confirmations
  MICRO:       110,  // L3 — tooltips, hover cards, XP animations
  TOAST:       120,  // L4 — toasts, banners, AgeGate/Interrupt gates
  EMERGENCY:   200,  // L4 — SOS overlay, SafetyOverlay (never obscured)
  DEBUG:       999,  // dev-only perf monitor
} as const;

// Legacy aliases — kept so existing code using the old names compiles
export const { UI: HUD, OVERLAY: SHEET, TOAST: INTERRUPT } = Z;

// Tailwind arbitrary-value class helpers — use these in JSX.
// e.g. className={cn(LAYER.UI, "fixed top-0 …")}
export const LAYER = {
  BASE:       'z-[0]',
  UI:         'z-[50]',
  HUD:        'z-[50]',   // alias
  OVERLAY:    'z-[80]',
  SHEET:      'z-[80]',   // alias
  MODAL:      'z-[100]',
  MICRO:      'z-[110]',
  TOAST:      'z-[120]',
  INTERRUPT:  'z-[120]',  // alias
  EMERGENCY:  'z-[200]',
  DEBUG:      'z-[999]',
} as const;

// ─── Canonical Motion Tokens (Architectural Law) ──────────────────────────────
/**
 * The spec-canonical motion object. Use ONLY these values for animation timing.
 *
 *   Rules:
 *   - Micro interactions:  motion.fast   (180ms)
 *   - Panel transitions:   motion.medium (320ms)
 *   - Camera transitions:  motion.slow   (600ms)
 *   - Never mix slow + slow simultaneously
 */
export const motion = {
  fast:   180,
  medium: 320,
  slow:   600,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

// ─── Extended Duration Tokens ─────────────────────────────────────────────────
export const DURATION = {
  INSTANT:      0,
  MICRO:        motion.fast,      // 180ms
  FAST:         motion.fast,      // 180ms
  NORMAL:       motion.medium,    // 320ms
  SHEET:        motion.medium,    // 320ms
  PAGE:         motion.medium,    // 320ms
  MODAL:        motion.medium,    // 320ms
  CAMERA:       motion.slow,      // 600ms
  STAGGER_ITEM: 45,
} as const;

export const EASE = {
  // Spec-canonical easing (decelerate-in, feels snappy and settled)
  UI:      [0.22, 1, 0.36, 1] as [number,number,number,number],
  ENTER:   [0.22, 1, 0.36, 1] as [number,number,number,number],
  EXIT:    [0.4,  0, 1,    1] as [number,number,number,number],
  SPRING:  { type: 'spring', stiffness: 320, damping: 28, mass: 1 } as const,
  SPRING_SOFT: { type: 'spring', stiffness: 180, damping: 24, mass: 1 } as const,
  BOUNCE:  { type: 'spring', stiffness: 400, damping: 22, mass: 0.8 } as const,
} as const;

// ─── Spatial Element Declaration Interface ────────────────────────────────────
/**
 * Every fixed/absolute UI element must be describable by these five properties.
 * If it cannot be described — it should not exist.
 */
export interface SpatialElement {
  /** What causes this element to appear (e.g. 'dock-tab-click', 'beacon-tap') */
  entryTrigger: string;
  /** Spatial anchor (e.g. 'fixed bottom-0', 'fixed inset-0') */
  spatialAnchor: string;
  /** How it leaves (e.g. 'swipe-down', 'backdrop-click', 'explicit-close') */
  exitBehavior: string;
  /** Layer token (Z.OVERLAY, Z.TOAST, etc.) */
  blockingPriority: number;
  /** State provider that owns this element (e.g. 'SheetContext', 'SOSContext') */
  owner: string;
}

// ─── Motion Orchestrator ──────────────────────────────────────────────────────
/**
 * Singleton guard that enforces "one major motion at a time".
 *
 * Usage:
 *   if (MotionOrchestrator.canAnimate('camera')) {
 *     MotionOrchestrator.start('camera', DURATION.CAMERA);
 *     globeRef.current.pointOfView(coord, DURATION.CAMERA);
 *   }
 */
let _activeMotion: string | null = null;
let _motionTimer: ReturnType<typeof setTimeout> | null = null;

export const MotionOrchestrator = {
  /** Returns true when no other major motion is in progress */
  canAnimate(name: string): boolean {
    return _activeMotion === null || _activeMotion === name;
  },

  /** Register a motion as active; auto-clears after durationMs */
  start(name: string, durationMs: number): void {
    if (_motionTimer) clearTimeout(_motionTimer);
    _activeMotion = name;
    _motionTimer = setTimeout(() => {
      _activeMotion = null;
      _motionTimer = null;
    }, durationMs + 50); // +50ms settle buffer
  },

  /** Manually clear (call when motion ends early) */
  clear(): void {
    if (_motionTimer) clearTimeout(_motionTimer);
    _activeMotion = null;
    _motionTimer = null;
  },

  get active(): string | null { return _activeMotion; },
};

// ─── Standard Framer Motion Variants ─────────────────────────────────────────
/** Fade + tiny Y lift — general purpose card/panel appear */
export const fadeUp = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0,  transition: { duration: DURATION.NORMAL / 1000, ease: EASE.ENTER } },
  exit:    { opacity: 0, y: -8,  transition: { duration: DURATION.FAST   / 1000, ease: EASE.EXIT  } },
} as const;

/** Fade only — for overlays where Y shift is unwanted */
export const fade = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.NORMAL / 1000, ease: EASE.ENTER } },
  exit:    { opacity: 0, transition: { duration: DURATION.FAST   / 1000, ease: EASE.EXIT  } },
} as const;

/** Bottom sheet slide from bottom edge */
export const sheetSlide = {
  hidden:  { y: '100%', opacity: 0 },
  visible: { y: 0,      opacity: 1, transition: { duration: DURATION.SHEET / 1000, ease: EASE.ENTER } },
  exit:    { y: '100%', opacity: 0, transition: { duration: DURATION.SHEET / 1000, ease: EASE.EXIT  } },
} as const;

/** Modal scale + fade */
export const modalScale = {
  hidden:  { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1,    transition: { duration: DURATION.MODAL / 1000, ease: EASE.ENTER } },
  exit:    { opacity: 0, scale: 0.96, transition: { duration: DURATION.FAST  / 1000, ease: EASE.EXIT  } },
} as const;

/** Full-screen interrupt (AgeGate, OnboardingGate) — cross-fade only, no shift */
export const interruptFade = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.PAGE / 1000, ease: EASE.ENTER } },
  exit:    { opacity: 0, transition: { duration: DURATION.PAGE / 1000, ease: EASE.EXIT  } },
} as const;

/** Emergency (SOS) — instant appear, never exits without explicit dismiss */
export const emergencyAppear = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.MICRO / 1000 } },
} as const;

/** Stagger container — apply to parent; children read from context */
export const staggerContainer = (_count: number = 10) => ({
  hidden:  {},
  visible: { transition: { staggerChildren: DURATION.STAGGER_ITEM / 1000, delayChildren: 0.06 } },
}) as const;

/** Stagger child — pair with staggerContainer on parent */
export const staggerChild = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0,  transition: { duration: DURATION.NORMAL / 1000, ease: EASE.ENTER } },
} as const;

// ─── Spatial Guard Helpers ────────────────────────────────────────────────────
/**
 * Returns true when a sheet/modal is open, signalling the globe camera
 * should NOT start a fly-to animation (to avoid two simultaneous motions).
 */
export function isCameraBlocked(activeSheet: string | null, isModalOpen: boolean): boolean {
  return !!activeSheet || isModalOpen;
}

/**
 * Returns the standard sheet backdrop class — semi-transparent scrim
 * that sits between L1 (HUD) and L2 (Sheet) so the dock remains visible.
 */
export const SHEET_BACKDROP = 'fixed inset-0 bg-black/60 backdrop-blur-[2px]';

// ─── CSS Custom Properties (injected at runtime by main.jsx) ─────────────────
/**
 * Inject z-index values as CSS custom properties so plain CSS
 * (keyframes, ::before, ::after) can reference them without importing JS.
 *
 * Also injects spec aliases: --z-ui, --z-overlay, --z-micro, --z-toast
 *
 * Called once at app boot from main.jsx.
 */
export function injectLayerCSSVars(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  // Primary tokens
  root.style.setProperty('--z-base',      String(Z.BASE));
  root.style.setProperty('--z-hud',       String(Z.UI));
  root.style.setProperty('--z-sheet',     String(Z.OVERLAY));
  root.style.setProperty('--z-modal',     String(Z.MODAL));
  root.style.setProperty('--z-micro',     String(Z.MICRO));
  root.style.setProperty('--z-toast',     String(Z.TOAST));
  root.style.setProperty('--z-interrupt', String(Z.TOAST));
  root.style.setProperty('--z-emergency', String(Z.EMERGENCY));
  root.style.setProperty('--z-debug',     String(Z.DEBUG));
  // Spec-canonical aliases (L1–L4 names)
  root.style.setProperty('--z-ui',        String(Z.UI));
  root.style.setProperty('--z-overlay',   String(Z.OVERLAY));
  // Motion tokens
  root.style.setProperty('--motion-fast',   `${motion.fast}ms`);
  root.style.setProperty('--motion-medium', `${motion.medium}ms`);
  root.style.setProperty('--motion-slow',   `${motion.slow}ms`);
  root.style.setProperty('--motion-easing',  motion.easing);
}
