/**
 * src/components/system/Fab.tsx
 * Fab — the floating action button. Always 56px round. Always anchored to
 * a screen corner. Z index from `--z-fab`.
 *
 *   tone="brand"     gold — Beacon FAB, main page-level primary
 *   tone="emergency" red — never used; emergency is the SOS shield not a FAB
 *   tone="neutral"   subtle — Safety shield (top-right, always-on)
 *
 *   anchor="bottom-right" | "bottom-left" | "top-right" | "top-left"
 *
 * If you need a non-corner FAB, you don't want a FAB.
 */
import * as React from 'react';

type Tone = 'brand' | 'emergency' | 'neutral';
type Anchor = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  anchor?: Anchor;
  ariaLabel: string;     // required
  size?: 'md' | 'sm';
}

const TONE: Record<Tone, string> = {
  brand:     'bg-brand text-bg shadow-brand-glow hover:bg-brand-hover active:bg-brand-pressed',
  emergency: 'bg-emergency text-white shadow-emergency-glow hover:brightness-110 active:brightness-90',
  neutral:   'bg-white/10 text-text-1 border border-white/15 backdrop-blur hover:bg-white/15 active:bg-white/20',
};

const ANCHOR: Record<Anchor, string> = {
  // safe-area aware. Keeps FAB clear of iOS notch & home-indicator AND
  // never collides with cookie banner (which sits center-bottom at z-cookie).
  'bottom-right': 'fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+96px)]',
  'bottom-left':  'fixed left-4  bottom-[calc(env(safe-area-inset-bottom)+96px)]',
  'top-right':    'fixed right-4 top-[calc(env(safe-area-inset-top)+16px)]',
  'top-left':     'fixed left-4  top-[calc(env(safe-area-inset-top)+16px)]',
};

function cn(...p: Array<string | false | undefined>) { return p.filter(Boolean).join(' '); }

export const Fab = React.forwardRef<HTMLButtonElement, Props>(
  ({ tone = 'brand', anchor = 'bottom-right', size = 'md', ariaLabel, className, children, ...rest }, ref) => {
    const dim = size === 'sm' ? 'w-12 h-12' : 'w-14 h-14';
    return (
      <button
        ref={ref}
        aria-label={ariaLabel}
        className={cn(
          'z-fab rounded-pill flex items-center justify-center',
          'transition-all duration-fast ease-ui',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          dim,
          ANCHOR[anchor],
          TONE[tone],
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  }
);
Fab.displayName = 'Fab';

export default Fab;
