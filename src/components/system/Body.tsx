/**
 * src/components/system/Body.tsx
 * Body text — for paragraphs, captions, descriptions.
 *
 * DEFAULT FONT: sans stack (system-ui / -apple-system / etc.).
 * Mono is reserved for: channel chips, ticker text, timestamps, member
 * IDs, system status, and code. Use a `font-mono` className on the
 * specific span when you need it; do not change this default.
 *
 *   size="default"  fs-body (14px)
 *   size="lg"       fs-body-lg (16px) — readable body
 *   size="sm"       fs-small (12px) — captions
 *
 *   tone="default" | "muted" | "subtle" | "brand" | "signal" | "emergency"
 */
import * as React from 'react';

type Size = 'sm' | 'default' | 'lg';
type Tone = 'default' | 'muted' | 'subtle' | 'brand' | 'signal' | 'emergency';

interface Props extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: Size;
  tone?: Tone;
  as?: keyof JSX.IntrinsicElements;
}

const SIZE: Record<Size, string> = {
  sm: 'text-small',
  default: 'text-body',
  lg: 'text-body-lg',
};
const TONE: Record<Tone, string> = {
  default: 'text-text-1',
  muted:   'text-text-2',
  subtle:  'text-text-3',
  brand:   'text-brand',
  signal:  'text-signal',
  emergency:'text-emergency',
};

function cn(...p: Array<string | false | undefined>) { return p.filter(Boolean).join(' '); }

export const Body: React.FC<Props> = ({ size = 'default', tone = 'default', as = 'p', className, children, ...rest }) => {
  const Tag: any = as;
  return (
    <Tag className={cn('font-sans leading-base', SIZE[size], TONE[tone], className)} {...rest}>
      {children}
    </Tag>
  );
};

export default Body;
