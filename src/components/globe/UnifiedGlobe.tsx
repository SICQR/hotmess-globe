/**
 * UnifiedGlobe — L0 Persistent Background Layer
 *
 * On /pulse or /globe: renders full GlobePage (canvas + all UI)
 * On all other routes: null — each mode provides its own background.
 * WebGL canvas is NOT rendered outside Pulse (no GPU waste).
 */

import React, { Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';

const GlobePage = lazy(() => import('@/pages/Globe'));

export function UnifiedGlobe() {
  const location = useLocation();
  const isPulse = location.pathname === '/pulse' || location.pathname === '/globe';

  if (!isPulse) return null;

  return (
    <div className="absolute inset-0 z-0">
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
