/**
 * src/components/system/Heading.tsx
 * Heading — H1/H2/H3 with the canonical type rules baked in.
 *
 *   level="hero"    splash/cinematic — Oswald caps, fs-cinematic
 *   level="h1"      page hero — Oswald caps, fs-hero
 *   level="h2"      section hero — Oswald caps, fs-h2
 *   level="h3"      subsection — Space Mono, fs-h3 (no caps; less drama)
 *   level="meta"    chip/micro labels — Space Mono caps, fs-micro
 *
 * RULE: display caps (Oswald) for hero/h1/h2. Mono for h3 and below.
 * That's the entire rule. The CSS does the rest.
 */
import * as React from 'react';

type Level = 'hero' | 'h1' | 'h2' | 'h3' | 'meta';
type Tone  = 'default' | 'brand' | 'muted' | 'signal' | 'emergency';

interface Props extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: Level;
  tone?: Tone;
  as?: keyof JSX.IntrinsicElements;
}

const TAG: Record<Level, keyof JSX.IntrinsicElements> = {
  hero: 'h1', h1: 'h1', h2: 'h2', h3: 'h3', meta: 'p',
};

const STYLE: Record<Level, string> = {
  hero: 'font-display uppercase tracking-display font-bold text-cinematic leading-tight',
  h1:   'font-display uppercase tracking-display font-bold text-hero leading-tight',
  h2:   'font-display uppercase tracking-display font-bold text-h2 leading-tight',
  h3:   'font-mono font-bold text-h3 leading-snug',
  meta: 'font-mono uppercase tracking-micro font-bold text-micro',
};

const TONE_CLS: Record<Tone, string> = {
  default:   'text-text-1',
  brand:     'text-brand',
  muted:     'text-text-3',
  signal:    'text-signal',
  emergency: 'text-emergency',
};

function cn(...p: Array<string | false | undefined>) { return p.filter(Boolean).join(' '); }

export const Heading: React.FC<Props> = ({ level = 'h2', tone = 'default', as, className, children, ...rest }) => {
  const Tag: any = as ?? TAG[level];
  return (
    <Tag className={cn(STYLE[level], TONE_CLS[tone], className)} {...rest}>
      {children}
    </Tag>
  );
};

export default Heading;
