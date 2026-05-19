/**
 * src/lib/tokens.ts
 * HOTMESS Design System — JS mirror of src/styles/tokens.css
 *
 * Use this when a component needs a token value in a style object (inline
 * styles, SVG fills, canvas, framer-motion props). For CSS, use the var.
 *
 * Adding a token? Update tokens.css first, then mirror here. Never the
 * other way around. The CSS file is the source of truth.
 */

export const COLOR = {
  bg:            '#050507',
  bgElevated:    '#0D0D0D',

  text1:         'rgba(255, 255, 255, 0.95)',
  text2:         'rgba(255, 255, 255, 0.70)',
  text3:         'rgba(255, 255, 255, 0.45)',
  textDisabled:  'rgba(255, 255, 255, 0.25)',

  border1:       'rgba(255, 255, 255, 0.08)',
  border2:       'rgba(255, 255, 255, 0.14)',
  borderStrong:  'rgba(255, 255, 255, 0.22)',

  brand:         '#C8962C',
  brandHover:    '#D4A84B',
  brandPressed:  '#9A7020',
  brandTint:     'rgba(200, 150, 44, 0.12)',
  brandTint2:    'rgba(200, 150, 44, 0.20)',
  brandGlow:     'rgba(200, 150, 44, 0.35)',

  signal:        '#30D158',
  signalTint:    'rgba(48, 209, 88, 0.12)',
  signalTint2:   'rgba(48, 209, 88, 0.22)',

  warn:          '#FFB800',
  warnTint:      'rgba(255, 184, 0, 0.12)',

  emergency:     '#FF3B30',
  emergencyTint: 'rgba(255, 59, 48, 0.12)',
  emergencyTint2:'rgba(255, 59, 48, 0.22)',

  destructive:   '#E0524F',
} as const;

export const FONT = {
  display: "'Oswald', 'Bebas Neue', system-ui, -apple-system, sans-serif",
  mono:    "'Space Mono', 'SF Mono', Menlo, Monaco, Consolas, monospace",
} as const;

export const FS = {
  micro:     '10px',
  small:     '12px',
  body:      '14px',
  bodyLg:    '16px',
  h3:        '20px',
  h2:        '24px',
  h1:        '32px',
  hero:      '42px',
  cinematic: '56px',
} as const;

export const SP = {
  s0: '0px', s1: '4px', s2: '8px', s3: '12px', s4: '16px',
  s5: '20px', s6: '24px', s7: '32px', s8: '40px', s9: '48px', s10: '64px',
} as const;

export const R = {
  xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px',
  pill: '9999px', sheet: '28px',
} as const;

export const SHADOW = {
  soft:           '0 8px 24px rgba(0, 0, 0, 0.35)',
  strong:         '0 16px 48px rgba(0, 0, 0, 0.55)',
  brandGlow:      `0 0 20px rgba(200, 150, 44, 0.35)`,
  brandGlowLg:    `0 0 36px rgba(200, 150, 44, 0.35), 0 0 64px rgba(200, 150, 44, 0.18)`,
  emergencyGlow:  '0 0 24px rgba(255, 59, 48, 0.45)',
} as const;

export const MOTION = {
  durMicro:  80,
  durFast:   150,
  durNormal: 250,
  durSheet:  320,
  durPage:   380,
  durModal:  280,
  durCamera: 600,

  easeUi:     'cubic-bezier(0.25, 0.10, 0.25, 1.00)',
  easeEnter:  'cubic-bezier(0.00, 0.00, 0.20, 1.00)',
  easeExit:   'cubic-bezier(0.40, 0.00, 1.00, 1.00)',
  easeSpring: 'cubic-bezier(0.20, 0.80, 0.20, 1.00)',
} as const;

/**
 * Z-INDEX SCALE — single source of truth.
 * Components MUST consume from here, never from arbitrary z-[NNN] literals.
 */
export const Z = {
  base:      0,
  content:   10,
  globeHud:  40,
  dock:      50,
  fab:       60,
  sheet:     80,
  modal:     100,
  toast:     110,
  cookie:    115,
  interrupt: 120,
  emergency: 200,
  debug:     999,
} as const;
