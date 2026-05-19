/**
 * src/components/system/Pill.tsx
 * Pill — small, rounded, badge-like indicator. Status chips, filter chips,
 * channel labels, count badges.
 *
 *   tone="default" | "brand" | "signal" | "warn" | "emergency" | "muted"
 *   variant="solid" | "tint" | "outline"
 *
 * Always uppercase, always tracked. If you need a non-uppercase pill,
 * you probably wanted Badge — but Badge doesn't exist on purpose. Compose
 * <span class="rounded-pill bg-... px-2 py-0.5"> if you need a one-off.
 */
import * as React from 'react';

type Tone = 'default' | 'brand' | 'signal' | 'warn' | 'emergency' | 'muted';
type Variant = 'solid' | 'tint' | 'outline';

interface Props extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  variant?: Variant;
  iconLeft?: React.ReactNode;
}

const COMBO: Record<Tone, Record<Variant, string>> = {
  default:  {
    solid:   'bg-white/20 text-text-1',
    tint:    'bg-white/8 text-text-1',
    outline: 'bg-transparent text-text-1 border border-white/20',
  },
  brand:    {
    solid:   'bg-brand text-bg',
    tint:    'bg-brand-tint text-brand border border-brand/25',
    outline: 'bg-transparent text-brand border border-brand/40',
  },
  signal:   {
    solid:   'bg-signal text-bg',
    tint:    'bg-signal-tint text-signal border border-signal/25',
    outline: 'bg-transparent text-signal border border-signal/40',
  },
  warn:     {
    solid:   'bg-warn text-bg',
    tint:    'bg-warn-tint text-warn border border-warn/25',
    outline: 'bg-transparent text-warn border border-warn/40',
  },
  emergency:{
    solid:   'bg-emergency text-white',
    tint:    'bg-emergency-tint text-emergency border border-emergency/30',
    outline: 'bg-transparent text-emergency border border-emergency/40',
  },
  muted:    {
    solid:   'bg-white/15 text-text-3',
    tint:    'bg-white/5 text-text-3',
    outline: 'bg-transparent text-text-3 border border-white/15',
  },
};

function cn(...p: Array<string | false | undefined>) { return p.filter(Boolean).join(' '); }

export const Pill: React.FC<Props> = ({ tone = 'default', variant = 'tint', className, children, iconLeft, ...rest }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 font-mono font-bold uppercase tracking-micro',
      'rounded-pill px-2 py-0.5 text-micro',
      COMBO[tone][variant],
      className,
    )}
    {...rest}
  >
    {iconLeft && <span className="shrink-0">{iconLeft}</span>}
    {children}
  </span>
);

export default Pill;
