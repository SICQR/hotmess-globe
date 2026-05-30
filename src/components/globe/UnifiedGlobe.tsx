/**
 * UnifiedGlobe — L0 Persistent Background Layer
 *
 * Only renders on /pulse (the dedicated Pulse tab).
 * Returns null on all other routes — eliminates canvas bleed-through
 * on Market, Ghosted, Home, Music, and More tabs.
 *
 * Why null (not AmbientGlobe): the ambient canvas was causing visible
 * bleed-through on Market and other content tabs because the canvas
 * z-layer sat behind but was painting over transparent areas in route content.
 */

import React, { Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';

const GlobePage = lazy(() => import('@/pages/Globe'));

/**
 * Render the 3D interactive globe ONLY on the /pulse route.
 * All other routes return null.
 */
export function UnifiedGlobe() {
  const location = useLocation();
  const isPulse = location.pathname === '/pulse' || location.pathname === '/globe';

  // Null on all non-Pulse routes — do NOT render canvas elsewhere
  if (!isPulse) return null;

  // Full interactive 3D globe on Pulse route only.
  // Bottom constrained to 83px so Three.js canvas never steals touch events from nav.
  // 2026-05-12: touch-action: none + overscroll-behavior: contain stops the browser
  // hijacking vertical drag on the canvas as a pull-to-refresh gesture, which
  // previously caused the globe to "stick" mid-rotate or trigger a page reload.
  return (
    <div
      className="absolute z-0"
      style={{
        top: 'calc(36px + env(safe-area-inset-top, 0px))',
        left: 0,
        right: 0,
        bottom: '83px',
        pointerEvents: 'auto',
        touchAction: 'none',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'auto',
      }}
      onTouchMove={(e) => {
        // Belt-and-braces: prevent the document-level pull-to-refresh on iOS Safari
        // where touch-action alone isn't always honoured inside fixed-position layers.
        if (e.cancelable) e.preventDefault();
      }}
    >
      <Suspense fallback={
        <div className="w-full h-full bg-black flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-white/20 border-t-[#C8962C] rounded-full animate-spin" />
        </div>
      }>
        <GlobePage />
      </Suspense>
    </div>
  );
}

export default UnifiedGlobe;
