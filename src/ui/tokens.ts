/**
 * HOTMESS OS — Unified Design Tokens
 * 
 * Single source of truth for all UI tokens.
 * Import this file instead of using hardcoded values.
 * 
 * @see docs/UI_WIREFRAME_STRUCTURE.md
 */

// ============================================
// Z-INDEX LAYERS (NO RANDOM VALUES)
// Canonical layer stack matching OS BIBLE L0-L3
// ============================================

export const Z = {
  globe: 0,      // L0 — Three.js globe (always behind)
  page: 10,      // Page content (below HUD)
  hud: 50,       // L1 — TopHUD, BottomDock
  sheet: 80,     // L2 — Sheets (SheetRouter, URL-synced)
  modal: 90,     // Non-emergency modals (between sheet and interrupt)
  interrupt: 100, // L3 — SOS, emergency interrupts (highest authority)
} as const;

export type ZLayer = keyof typeof Z;

/**
 * Get z-index value for a layer
 * @example zIndex('sheet') // 80
 */
export const zIndex = (layer: ZLayer): number => Z[layer];

// ============================================
// COLORS
// ============================================

export const colors = {
  // Background
  bg: '#0b0b10',
  
  // Surfaces (white with opacity)
  surface: {
    1: 'rgba(255, 255, 255, 0.06)',
    2: 'rgba(255, 255, 255, 0.10)',
    3: 'rgba(255, 255, 255, 0.14)',
  },
  
  // Text
  text: {
    primary: 'rgba(255, 255, 255, 0.92)',
    secondary: 'rgba(255, 255, 255, 0.72)',
    tertiary: 'rgba(255, 255, 255, 0.54)',
  },
  
  // Borders
  border: {
    subtle: 'rgba(255, 255, 255, 0.10)',
    default: 'rgba(255, 255, 255, 0.16)',
  },
  
  // Brand accents
  accent: {
    primary: '#ff3bd4',   // HOTMESS pink
    secondary: '#7c5cff', // Ultraviolet
  },
  
  // Status colors
  status: {
    success: '#41d07a',
    warning: '#ffcc33',
    error: '#ff4d4d',
    info: '#3b82f6',
  },
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

export const typography = {
  // Font families
  fontFamily: {
    sans: 'ui-sans-serif, system-ui, -apple-system, "SF Pro Display", "Inter", "Segoe UI", Roboto, Arial, sans-serif',
    mono: 'ui-monospace, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  
  // Font sizes (px)
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 22,
    '2xl': 28,
    '3xl': 36,
  },
  
  // Line heights
  lineHeight: {
    tight: 1.15,
    base: 1.35,
    loose: 1.55,
  },
  
  // Font weights
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

// ============================================
// SPACING (8pt Grid)
// ============================================

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
  10: 48,
  12: 64,
  16: 80,
} as const;

export type SpacingKey = keyof typeof spacing;

/**
 * Get spacing value in pixels
 * @example sp(4) // 16
 */
export const sp = (key: SpacingKey): number => spacing[key];

// ============================================
// RADIUS
// ============================================

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

// ============================================
// SHADOWS
// ============================================

export const shadows = {
  sm: '0 10px 30px rgba(0,0,0,0.35)',
  md: '0 14px 40px rgba(0,0,0,0.45)',
  lg: '0 20px 60px rgba(0,0,0,0.55)',
} as const;

// ============================================
// BLUR / GLASS
// ============================================

export const blur = {
  sm: 10,
  md: 18,
  lg: 24,
} as const;

// ============================================
// MOTION
// ============================================

export const motion = {
  duration: {
    fast: 120,
    base: 180,
    slow: 260,
  },
  
  easing: {
    // Smooth deceleration
    ease1: [0.2, 0.8, 0.2, 1],
    // Standard ease
    ease2: [0.4, 0, 0.2, 1],
    // Spring-like
    spring: [0.43, 0.13, 0.23, 0.96],
  },
} as const;

// ============================================
// LAYOUT CONSTANTS
// ============================================

export const layout = {
  // Bottom dock height (without safe area)
  dockHeight: 64,
  
  // Optional top bar height
  topbarHeight: 52,
  
  // Sheet grabber height
  sheetGrabber: 18,
  
  // Max content width (desktop)
  maxWidth: 480,
  
  // Grid columns
  gridColumns: {
    mobile: 4,
    tablet: 6,
    desktop: 8,
  },
} as const;

// ============================================
// SAFE AREAS (CSS env variables)
// ============================================

export const safeArea = {
  top: 'env(safe-area-inset-top)',
  bottom: 'env(safe-area-inset-bottom)',
  left: 'env(safe-area-inset-left)',
  right: 'env(safe-area-inset-right)',
} as const;

// ============================================
// BREAKPOINTS
// ============================================

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

/**
 * Media query helper
 * @example mq('md') // '@media (min-width: 768px)'
 */
export const mq = (bp: keyof typeof breakpoints): string =>
  `@media (min-width: ${breakpoints[bp]}px)`;

// ============================================
// BACKDROP MODES
// ============================================

export const backdropModes = {
  pulse: {
    opacity: 0,
    blur: 0,
  },
  ghosted: {
    opacity: 0.85,
    blur: 10,
  },
  market: {
    opacity: 0.92,
    blur: 0,
  },
  radio: {
    opacity: 0.90,
    blur: 5,
  },
  profile: {
    opacity: 0.80,
    blur: 10,
  },
} as const;

export type BackdropMode = keyof typeof backdropModes;

// ============================================
// TOUCH TARGETS
// ============================================

export const touch = {
  minSize: 44, // Minimum touch target size
  hitSlop: 8,  // Additional hit area
} as const;

// ============================================
// CSS VARIABLE NAMES
// ============================================

export const cssVars = {
  // Colors
  '--c-bg': colors.bg,
  '--c-surface-1': colors.surface[1],
  '--c-surface-2': colors.surface[2],
  '--c-surface-3': colors.surface[3],
  '--c-text-1': colors.text.primary,
  '--c-text-2': colors.text.secondary,
  '--c-text-3': colors.text.tertiary,
  '--c-border-1': colors.border.subtle,
  '--c-border-2': colors.border.default,
  '--c-accent': colors.accent.primary,
  '--c-accent-2': colors.accent.secondary,
  '--c-good': colors.status.success,
  '--c-warn': colors.status.warning,
  '--c-bad': colors.status.error,
  
  // Z-index
  '--z-globe': Z.globe,
  '--z-page': Z.page,
  '--z-hud': Z.hud,
  '--z-sheet': Z.sheet,
  '--z-modal': Z.modal,
  '--z-interrupt': Z.interrupt,
  
  // Layout
  '--dock-h': `${layout.dockHeight}px`,
  '--topbar-h': `${layout.topbarHeight}px`,
  '--safe-top': safeArea.top,
  '--safe-bottom': safeArea.bottom,
} as const;

// ============================================
// EXPORTS
// ============================================

export default {
  Z,
  zIndex,
  colors,
  typography,
  spacing,
  sp,
  radius,
  shadows,
  blur,
  motion,
  layout,
  safeArea,
  breakpoints,
  mq,
  backdropModes,
  touch,
  cssVars,
};
