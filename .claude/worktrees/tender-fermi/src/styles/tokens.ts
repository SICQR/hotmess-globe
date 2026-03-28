// src/styles/tokens.ts
// TypeScript helper for z-layers and design tokens

/**
 * Z-Index Layers - NO RANDOM Z-INDEX VALUES
 * Use these constants instead of raw numbers
 */
export const Z = {
  globe: 0,
  page: 10,
  dock: 20,
  sheet: 30,
  modal: 40,
  critical: 50,
} as const;

export type ZLayer = keyof typeof Z;

/**
 * Get z-index value for a layer
 * @example layerZ('sheet') // 30
 */
export const layerZ = (layer: ZLayer): number => Z[layer];

/**
 * Spacing scale (matches CSS tokens)
 */
export const SPACING = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '32px',
  8: '40px',
} as const;

export type SpacingKey = keyof typeof SPACING;

/**
 * Color tokens (matches CSS tokens)
 */
export const COLORS = {
  bg: '#0b0b10',
  surface1: 'rgba(255, 255, 255, 0.06)',
  surface2: 'rgba(255, 255, 255, 0.10)',
  surface3: 'rgba(255, 255, 255, 0.14)',
  text1: 'rgba(255, 255, 255, 0.92)',
  text2: 'rgba(255, 255, 255, 0.72)',
  text3: 'rgba(255, 255, 255, 0.54)',
  border1: 'rgba(255, 255, 255, 0.10)',
  border2: 'rgba(255, 255, 255, 0.16)',
  accent: '#C8962C',
  accent2: '#D4A84B',
  good: '#41d07a',
  warn: '#ffcc33',
  bad: '#ff4d4d',
} as const;

/**
 * Layout constants (matches CSS tokens)
 */
export const LAYOUT = {
  dockHeight: 64,
  topbarHeight: 52,
  sheetGrabberHeight: 18,
} as const;

/**
 * Radius tokens
 */
export const RADIUS = {
  1: '10px',
  2: '14px',
  3: '18px',
  pill: '999px',
} as const;

/**
 * Duration tokens for animations
 */
export const DURATION = {
  fast: 120,
  base: 180,
  slow: 260,
} as const;

/**
 * Easing functions
 */
export const EASING = {
  1: [0.2, 0.8, 0.2, 1],
  2: [0.4, 0, 0.2, 1],
} as const;

/**
 * Font sizes
 */
export const FONT_SIZE = {
  1: '12px',
  2: '14px',
  3: '16px',
  4: '18px',
  5: '22px',
  6: '28px',
} as const;

/**
 * Font weights
 */
export const FONT_WEIGHT = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export default {
  Z,
  SPACING,
  COLORS,
  LAYOUT,
  RADIUS,
  DURATION,
  EASING,
  FONT_SIZE,
  FONT_WEIGHT,
  layerZ,
};
