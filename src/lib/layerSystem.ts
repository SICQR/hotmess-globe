/**
 * HOTMESS OS — Layer Discipline System
 *
 * Single source of truth for z-index hierarchy, motion timing,
 * and spatial choreography across the entire OS.
 *
 * Layer model (bottom → top):
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  L0  Base         z:0     Globe, persistent 3-D canvas          │
 * │  L1  HUD          z:50    TopHUD, BottomDock (always visible)    │
 * │  L2  Sheets       z:80    Bottom sheets, drawers, panels         │
 * │  L3  Interrupts   z:100   Modals, confirmations, toasts, alerts  │
 * │  L4  Emergency    z:200   SOS, SafetyOverlay (full-screen lock)  │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Principles
 * 1. One motion at a time.  Camera and UI never animate simultaneously.
 * 2. State before animation. Layout is stable before any transition fires.
 * 3. Staggered entry.       List items delay by STAGGER_ITEM_MS each.
 * 4. Defined exit.          Every element that enters has an exit defined.
 */

// ─── Z-Index Tokens ───────────────────────────────────────────────────────────
export const Z = {
  BASE:        0,    // L0 — globe canvas, background fills
  HUD:         50,   // L1 — TopHUD, BottomDock
  SHEET:       80,   // L2 — bottom-sheets, side drawers, location panels
  MODAL:       100,  // L3 — dialogs, confirmations, cookie banner
  TOAST:       110,  // L3 — toasts sit above modals
  INTERRUPT:   120,  // L3 — AgeGate, OnboardingGate full-screen interrupts
  EMERGENCY:   200,  // L4 — SOS overlay, SafetyOverlay (never obscured)
  DEBUG:       999,  // dev-only perf monitor
} as const;

// Tailwind arbitrary-value class helpers — use these in JSX.
// e.g. className={cn(LAYER.HUD, "fixed top-0 …")}
export const LAYER = {
  BASE:       'z-[0]',
  HUD:        'z-[50]',
  SHEET:      'z-[80]',
  MODAL:      'z-[100]',
  TOAST:      'z-[110]',
  INTERRUPT:  'z-[120]',
  EMERGENCY:  'z-[200]',
  DEBUG:      'z-[999]',
} as const;

// ─── Motion Timing Tokens ─────────────────────────────────────────────────────
export const DURATION = {
  INSTANT:     0,    // state-only changes (no visual feedback needed)
  MICRO:       80,   // button press, icon swap
  FAST:        150,  // hover state, tooltip appear
  NORMAL:      250,  // primary UI transitions
  SHEET:       320,  // bottom-sheet slide in/out
  PAGE:        380,  // page-level cross-fades
  MODAL:       280,  // modal appear/dismiss
  CAMERA:      600,  // globe camera fly-to
  STAGGER_ITEM: 45,  // per-item delay in list reveals
} as const;

export const EASE = {
  UI:      [0.25, 0.1,  0.25, 1.0] as [number,number,number,number],   // standard UI curve
  ENTER:   [0.0,  0.0,  0.2,  1.0] as [number,number,number,number],   // decelerate in
  EXIT:    [0.4,  0.0,  1.0,  1.0] as [number,number,number,number],   // accelerate out
  SPRING:  { type: 'spring', stiffness: 320, damping: 28, mass: 1 } as const,
  SPRING_SOFT: { type: 'spring', stiffness: 180, damping: 24, mass: 1 } as const,
  BOUNCE:  { type: 'spring', stiffness: 400, damping: 22, mass: 0.8 } as const,
} as const;

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
export const staggerContainer = (count: number = 10) => ({
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

// ─── CSS Custom Properties (injected at runtime by OSShell) ──────────────────
/**
 * Inject the layer z-index values as CSS custom properties so plain CSS
 * (keyframes, ::before) can reference them without importing JS.
 *
 * Call once at app boot, e.g. from OSShell or main.tsx.
 */
export function injectLayerCSSVars(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--z-base',      String(Z.BASE));
  root.style.setProperty('--z-hud',       String(Z.HUD));
  root.style.setProperty('--z-sheet',     String(Z.SHEET));
  root.style.setProperty('--z-modal',     String(Z.MODAL));
  root.style.setProperty('--z-toast',     String(Z.TOAST));
  root.style.setProperty('--z-interrupt', String(Z.INTERRUPT));
  root.style.setProperty('--z-emergency', String(Z.EMERGENCY));
  root.style.setProperty('--z-debug',     String(Z.DEBUG));
}
