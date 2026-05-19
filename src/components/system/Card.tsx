/**
 * src/components/system/Card.tsx
 * Card — a surface for grouping content. One look. One radius. No exceptions.
 *
 *   tone="default"   subtle white/5 surface
 *   tone="elevated"  slightly stronger surface (sheets, hero cards)
 *   tone="brand"     gold-tinted, for promotional / membership upsells
 *   tone="emergency" red-tinted, for SOS-related cards only
 *
 *   padding="none" | "sm" | "md" | "lg"
 *   interactive    adds hover/active states + focus ring
 */
import * as React from 'react';

type Tone = 'default' | 'elevated' | 'brand' | 'emergency';
type Padding = 'none' | 'sm' | 'md' | 'lg';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  padding?: Padding;
  interactive?: boolean;
  as?: keyof JSX.IntrinsicElements;
}

const TONE: Record<Tone, string> = {
  default:   'bg-white/5 border border-white/8',
  elevated:  'bg-bg-elevated border border-white/10 shadow-soft',
  brand:     'bg-brand-tint border border-brand/30',
  emergency: 'bg-emergency-tint border border-emergency/40',
};

const PAD: Record<Padding, string> = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
};

function cn(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export const Card = React.forwardRef<HTMLDivElement, Props>(
  ({ tone = 'default', padding = 'md', interactive, className, as = 'div', children, ...rest }, ref) => {
    const Tag: any = as;
    return (
      <Tag
        ref={ref}
        className={cn(
          'rounded-lg',
          TONE[tone],
          PAD[padding],
          interactive && 'transition-colors duration-fast ease-ui hover:bg-white/8 active:bg-white/12 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60',
          className,
        )}
        tabIndex={interactive ? 0 : undefined}
        {...rest}
      >
        {children}
      </Tag>
    );
  }
);
Card.displayName = 'Card';

export default Card;
