/**
 * UnifiedGlobe — L0 Persistent Background Layer
 *
 * The globe is the OS backbone — persistent on EVERY route.
 *
 * On /pulse or /globe: renders full interactive GlobePage (3D WebGL canvas + UI).
 * On ALL other routes:  renders AmbientGlobe (lightweight 2D canvas, non-interactive,
 *                       dimmed) — giving the signature atmospheric backdrop everywhere.
 *
 * This ensures the "Pulse Globe = OS Backbone" design law is honoured:
 * every screen feels connected to the living, breathing global network.
 */

import React, { Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';
import AmbientGlobe from '@/components/globe/AmbientGlobe';

const GlobePage = lazy(() => import('@/pages/Globe'));

export function UnifiedGlobe() {
  const location = useLocation();
  const isPulse = location.pathname === '/pulse' || location.pathname === '/globe';

  // Full interactive 3D globe on Pulse route
  if (isPulse) {
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

  // Ambient 2D globe on every other route — the OS heartbeat
  return <AmbientGlobe />;
}

export default UnifiedGlobe;
