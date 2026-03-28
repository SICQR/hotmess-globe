/**
 * HotmessWordmark — Animated brand wordmark
 *
 * Renders HOTMESS with letter-by-letter stagger animation, gold shimmer
 * underline, and SS-pulse on the second S.
 *
 * Usage:
 *   <HotmessWordmark size="lg" animate />
 *   <HotmessWordmark size="display" color="#fff" />
 */

import React, { useEffect, useState } from 'react';

type Size = 'sm' | 'md' | 'lg' | 'xl' | 'display';

interface HotmessWordmarkProps {
  size?: Size;
  animate?: boolean;
  color?: string;
  accentColor?: string;
  showUnderline?: boolean;
  className?: string;
}

const SIZE_MAP: Record<Size, string> = {
  sm:      'text-xl tracking-tight',
  md:      'text-2xl tracking-tight',
  lg:      'text-4xl tracking-tight',
  xl:      'text-6xl tracking-[-0.03em]',
  display: 'text-[clamp(3rem,12vw,7rem)] tracking-[-0.04em]',
};

const LETTERS = ['H', 'O', 'T', 'M', 'E', 'S', 'S'];
const SS_INDICES = [5, 6]; // The two S letters

export function HotmessWordmark({
  size = 'lg',
  animate = true,
  color = '#FFFFFF',
  accentColor = '#C8962C',
  showUnderline = true,
  className = '',
}: HotmessWordmarkProps) {
  const [mounted, setMounted] = useState(!animate);

  useEffect(() => {
    if (!animate) return;
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, [animate]);

  return (
    <span className={`relative inline-flex flex-col items-center select-none ${className}`}>
      {/* Letters */}
      <span className={`inline-flex font-black italic leading-none ${SIZE_MAP[size]}`}>
        {LETTERS.map((letter, i) => {
          const isSS = SS_INDICES.includes(i);
          return (
            <span
              key={i}
              style={{
                color: isSS ? accentColor : color,
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(0.3em)',
                transition: animate
                  ? `opacity 0.35s ease ${i * 0.06}s, transform 0.35s cubic-bezier(0.22,1,0.36,1) ${i * 0.06}s`
                  : 'none',
                display: 'inline-block',
                animation: isSS && mounted ? 'hm-ss-pulse 3.5s ease-in-out infinite' : undefined,
                animationDelay: isSS ? `${0.6 + (i - 5) * 0.15}s` : undefined,
              }}
            >
              {letter}
            </span>
          );
        })}
      </span>

      {/* Shimmer underline */}
      {showUnderline && (
        <span
          className="block mt-1 rounded-full"
          style={{
            width: '100%',
            height: '2px',
            background: `linear-gradient(90deg, transparent 0%, ${accentColor} 40%, #D4AF37 60%, transparent 100%)`,
            backgroundSize: '200% 100%',
            opacity: mounted ? 1 : 0,
            transition: animate ? 'opacity 0.4s ease 0.5s' : 'none',
            animation: mounted ? 'hm-shimmer 2.5s linear infinite' : undefined,
            animationDelay: '0.8s',
          }}
        />
      )}

      <style>{`
        @keyframes hm-ss-pulse {
          0%, 100% { color: ${accentColor}; }
          50% { color: #D4AF37; text-shadow: 0 0 12px ${accentColor}80; }
        }
        @keyframes hm-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </span>
  );
}

export default HotmessWordmark;
