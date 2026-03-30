/**
 * Optional CRT-style overlay: scanlines + subtle vignette. Low opacity, non-interactive.
 * Enable via VITE_CRT_OVERLAY=true or the `enabled` prop. Use on Vault or app shell only.
 * @see docs/BRAND-STYLE-GUIDE.md, plan: London OS UI polish
 */

import React from 'react';
import { cn } from '@/lib/utils';

const envEnabled = import.meta.env.VITE_CRT_OVERLAY === 'true';

export function CRTOverlay({ enabled = envEnabled, className, ...props }) {
  if (!enabled) return null;

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-0 z-[100]',
        'opacity-[0.07]',
        className
      )}
      {...props}
    >
      {/* Scanlines */}
      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.15) 2px,
            rgba(0,0,0,0.15) 4px
          )`,
        }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          boxShadow: 'inset 0 0 12rem 4rem rgba(0,0,0,0.4)',
        }}
      />
    </div>
  );
}
