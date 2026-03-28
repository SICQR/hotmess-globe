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

/**
 * Render the application's globe background: show the full interactive 3D globe for the Pulse routes and the lightweight ambient 2D globe for all other routes.
 *
 * @returns The globe background element: an absolutely positioned interactive `GlobePage` when the current path is `/pulse` or `/globe`, otherwise the `AmbientGlobe` component.
 */
export function UnifiedGlobe() {
  const location = useLocation();
  const isPulse = location.pathname === '/pulse' || location.pathname === '/globe';

  // Full interactive 3D globe on Pulse route
  // Height stops at nav bar (83px) so Three.js canvas never steals touch events from nav
  if (isPulse) {
    return (
      <div className="absolute z-0" style={{ top: 0, left: 0, right: 0, bottom: '83px', pointerEvents: 'auto' }}>
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
