/**
 * src/components/system/Button.tsx
 * HOTMESS Design System — Button primitive
 *
 * Variants are intentionally minimal. If you want a new variant, you're
 * probably designing in the wrong layer — surfaces should compose
 * primitives, not customize them.
 *
 *   variant="primary"   gold CTA, the highest-emphasis button
 *   variant="signal"    green confirm action (delivered / live / OK)
 *   variant="emergency" red SOS action — use ONLY for emergencies
 *   variant="secondary" white-on-dark, low emphasis
 *   variant="ghost"     no fill, no border
 *   variant="outline"   bordered, transparent
 *
 *   size="sm"    36px tall — chip-adjacent rows
 *   size="md"    44px tall — default, hits a11y touch target
 *   size="lg"    52px tall — splash & primary CTAs
 */
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

type Variant = 'primary' | 'signal' | 'emergency' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const SIZE_CLS: Record<Size, string> = {
  sm: 'h-9  px-3 text-small  rounded-md',
  md: 'h-11 px-4 text-body   rounded-md',
  lg: 'h-13 px-6 text-body-lg rounded-lg',
};

// Sized at heights matching the design system. Tailwind doesn't have h-13 by default,
// so we use arbitrary value.
const LG_H = 'h-[52px]';

const VAR_CLS: Record<Variant, string> = {
  primary:
    'bg-brand text-bg shadow-brand-glow hover:bg-brand-hover active:bg-brand-pressed disabled:bg-brand/40',
  signal:
    'bg-signal text-bg hover:brightness-110 active:brightness-90 disabled:bg-signal/40',
  emergency:
    'bg-emergency text-white shadow-emergency-glow hover:brightness-110 active:brightness-90 disabled:bg-emergency/40',
  secondary:
    'bg-white/8 text-text-1 hover:bg-white/14 active:bg-white/20 border border-white/10',
  ghost:
    'bg-transparent text-text-1 hover:bg-white/8 active:bg-white/14',
  outline:
    'bg-transparent text-brand border border-brand/40 hover:bg-brand/12 hover:border-brand active:bg-brand/20',
};

const BASE =
  'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap ' +
  'transition-colors duration-fast ease-ui ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg ' +
  'disabled:cursor-not-allowed disabled:opacity-60 ' +
  '[&_svg]:size-4 [&_svg]:shrink-0 ' +
  'touch-target';

function cn(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export const Button = React.forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'primary', size = 'md', asChild, className, children, loading, disabled, iconLeft, iconRight, ...rest }, ref) => {
    const Comp: any = asChild ? Slot : 'button';
    const sized = size === 'lg' ? `${LG_H} px-6 text-body-lg rounded-lg` : SIZE_CLS[size];
    return (
      <Comp
        ref={ref}
        className={cn(BASE, sized, VAR_CLS[variant], className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...rest}
      >
        {iconLeft && <span className="shrink-0">{iconLeft}</span>}
        {loading ? <span className="animate-pulse">…</span> : <span>{children}</span>}
        {iconRight && <span className="shrink-0">{iconRight}</span>}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export default Button;
