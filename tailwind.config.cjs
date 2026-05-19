/** @type {import('tailwindcss').Config} */
/* ─────────────────────────────────────────────────────────────────────────────
 * HOTMESS Design System — Tailwind config
 * Mirrors src/styles/tokens.css. Adding a token? Update tokens.css first.
 * ──────────────────────────────────────────────────────────────────────────── */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    fontFamily: {
      // Default `sans` IS mono. This is the HOTMESS look.
      sans:    ['Space Mono', 'SF Mono', 'Menlo', 'Monaco', 'monospace'],
      mono:    ['Space Mono', 'SF Mono', 'Menlo', 'Monaco', 'monospace'],
      display: ['Oswald', 'Bebas Neue', 'system-ui', '-apple-system', 'sans-serif'],
    },
    extend: {
      // ── Z-INDEX SCALE (mirrors src/lib/tokens.ts Z) ─────────────────────
      zIndex: {
        base:      '0',
        content:   '10',
        'globe-hud': '40',
        dock:      '50',
        fab:       '60',
        sheet:     '80',
        modal:     '100',
        toast:     '110',
        cookie:    '115',
        interrupt: '120',
        emergency: '200',
        debug:     '999',
      },
      // ── Motion duration scale (ms) ──────────────────────────────────────
      transitionDuration: {
        micro:  '80ms',
        fast:   '150ms',
        normal: '250ms',
        sheet:  '320ms',
        page:   '380ms',
        modal:  '280ms',
        camera: '600ms',
      },
      transitionTimingFunction: {
        ui:     'cubic-bezier(0.25, 0.10, 0.25, 1.00)',
        enter:  'cubic-bezier(0.00, 0.00, 0.20, 1.00)',
        exit:   'cubic-bezier(0.40, 0.00, 1.00, 1.00)',
        spring: 'cubic-bezier(0.20, 0.80, 0.20, 1.00)',
      },
      spacing: {
        // 4px scale aliases
        '0.5': '2px',
        // Safe area
        'safe-t': 'env(safe-area-inset-top)',
        'safe-b': 'env(safe-area-inset-bottom)',
        'safe-l': 'env(safe-area-inset-left)',
        'safe-r': 'env(safe-area-inset-right)',
        // Layout constants
        'dock':   '64px',
        'topbar': '52px',
      },
      padding: {
        'safe': 'env(safe-area-inset-bottom)',
      },
      borderRadius: {
        xs:    '4px',
        sm:    '8px',
        md:    '12px',
        lg:    '16px',
        xl:    '24px',
        pill:  '9999px',
        sheet: '28px',
        // shadcn legacy (kept for shadcn components only)
        DEFAULT: 'var(--radius)',
      },
      fontSize: {
        // Type scale tokens
        'micro':     ['10px', { lineHeight: '1.10' }],
        'small':     ['12px', { lineHeight: '1.25' }],
        'body':      ['14px', { lineHeight: '1.45' }],
        'body-lg':   ['16px', { lineHeight: '1.45' }],
        'h3':        ['20px', { lineHeight: '1.25' }],
        'h2':        ['24px', { lineHeight: '1.10' }],
        'h1':        ['32px', { lineHeight: '1.10' }],
        'hero':      ['42px', { lineHeight: '1.10' }],
        'cinematic': ['56px', { lineHeight: '1.00' }],
      },
      letterSpacing: {
        tight:   '-0.01em',
        normal:  '0',
        loose:   '0.05em',
        display: '0.15em',
        micro:   '0.20em',
      },
      colors: {
        // shadcn HSL bridge — kept for shadcn primitives only.
        // App code should reference brand/signal/emergency directly.
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input:  'hsl(var(--input))',
        ring:   'hsl(var(--ring))',

        // ───── HOTMESS canonical color tokens ───────────────────────────
        // Use these for everything. Hex literals in JSX are deprecated.
        'bg':           '#050507',
        'bg-elevated':  '#0D0D0D',
        'text-1':       'rgba(255, 255, 255, 0.95)',
        'text-2':       'rgba(255, 255, 255, 0.70)',
        'text-3':       'rgba(255, 255, 255, 0.45)',

        'brand': {
          DEFAULT:  '#C8962C',
          hover:    '#D4A84B',
          pressed:  '#9A7020',
          tint:     'rgba(200, 150, 44, 0.12)',
          'tint-2': 'rgba(200, 150, 44, 0.20)',
          glow:     'rgba(200, 150, 44, 0.35)',
        },
        'signal': {
          DEFAULT:  '#30D158',
          tint:     'rgba(48, 209, 88, 0.12)',
          'tint-2': 'rgba(48, 209, 88, 0.22)',
        },
        'warn': {
          DEFAULT: '#FFB800',
          tint:    'rgba(255, 184, 0, 0.12)',
        },
        'emergency': {
          DEFAULT:  '#FF3B30',
          tint:     'rgba(255, 59, 48, 0.12)',
          'tint-2': 'rgba(255, 59, 48, 0.22)',
        },

        // ───── DEPRECATED ALIASES ───────────────────────────────────────
        // Kept temporarily to unblock the rolling migration. Each surface
        // migration to the new system removes its usage. Delete this block
        // once `grep -r "text-hot\|bg-gold\|text-cyan" src/` returns empty.
        // DO NOT ADD NEW USAGES.
        hot:  { DEFAULT: '#C8962C', light: '#D4A84B', dark: '#9A7020', glow: 'rgba(200, 150, 44, 0.45)' },
        gold: { DEFAULT: '#C8962C', light: '#D4A84B', dark: '#9A7020', glow: 'rgba(200, 150, 44, 0.45)' },
        cyan: { DEFAULT: '#00D9FF', light: '#67E8F9', dark: '#0891B2', glow: 'rgba(0, 217, 255, 0.55)' },
        danger:  '#FF3B30',
        success: '#30D158',
        online:  '#30D158',
        // Pulse-page visualisers only — DO NOT use in UI:
        neon: { green: '#39FF14', gold: '#C8962C', orange: '#FFB800', yellow: '#FFEB3B' },
      },
      boxShadow: {
        // Canonical
        soft:           '0 8px 24px rgba(0, 0, 0, 0.35)',
        strong:         '0 16px 48px rgba(0, 0, 0, 0.55)',
        'brand-glow':   '0 0 20px rgba(200, 150, 44, 0.35)',
        'brand-glow-lg':'0 0 36px rgba(200, 150, 44, 0.35), 0 0 64px rgba(200, 150, 44, 0.18)',
        'emergency-glow':'0 0 24px rgba(255, 59, 48, 0.45)',
        // Deprecated aliases (kept while surfaces migrate)
        gold:      "0 0 12px 2px rgba(200, 150, 44, 0.35)",
        navbar:    "0 2px 18px 0 #000000e0",
        'glow-hot':    '0 0 20px rgba(200, 150, 44, 0.5), 0 0 40px rgba(200, 150, 44, 0.3)',
        'glow-hot-lg': '0 0 30px rgba(200, 150, 44, 0.6), 0 0 60px rgba(200, 150, 44, 0.4)',
        'glow-brand':  '0 0 20px rgba(200, 150, 44, 0.5), 0 0 40px rgba(200, 150, 44, 0.3)',
        'glow-gold':   '0 0 20px rgba(200, 150, 44, 0.5), 0 0 40px rgba(200, 150, 44, 0.3)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #C8962C 0%, #D4A84B 100%)',
        // Deprecated, kept for back-compat during migration:
        'gradient-hot':   'linear-gradient(135deg, #C8962C 0%, #9A7020 100%)',
        'gradient-gold':  'linear-gradient(135deg, #C8962C 0%, #D4A84B 100%)',
        'gradient-night': 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to:   { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'glow-pulse': {
          '0%, 100%': { opacity: '1',   boxShadow: '0 0 20px rgba(200, 150, 44, 0.5)' },
          '50%':      { opacity: '0.7', boxShadow: '0 0 40px rgba(200, 150, 44, 0.8)' }
        },
        'float': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        'shimmer': { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'pulse-ring': {
          '0%':   { transform: 'scale(1)',   opacity: '0.5' },
          '100%': { transform: 'scale(1.5)', opacity: '0' }
        },
        'slide-up':  { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        'scale-in':  { '0%': { transform: 'scale(0.9)',       opacity: '0' }, '100%': { transform: 'scale(1)',     opacity: '1' } },
        'spin-slow': { '0%': { transform: 'rotate(0deg)' },   '100%': { transform: 'rotate(360deg)' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'glow-pulse':     'glow-pulse 2s ease-in-out infinite',
        'float':          'float 3s ease-in-out infinite',
        'shimmer':        'shimmer 2s linear infinite',
        'pulse-ring':     'pulse-ring 2s ease-out infinite',
        'slide-up':       'slide-up 0.5s ease-out',
        'scale-in':       'scale-in 0.3s ease-out',
        'spin-slow':      'spin-slow 8s linear infinite',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
