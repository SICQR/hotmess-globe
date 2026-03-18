/**
 * UnifiedGlobe — L0 Persistent Background Layer
 *
 * Only renders on /pulse or /globe — returns null everywhere else.
 *
 * On /pulse or /globe: renders full interactive GlobePage (3D WebGL canvas + UI).
 * On ALL other routes:  returns null (no rendering overhead outside Pulse).
 */

import React, { Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';

const GlobePage = lazy(() => import('@/pages/Globe'));

/**
 * Render the application's globe background on the Pulse route only.
 *
 * @returns The full interactive `GlobePage` container when the current path is `/pulse` or `/globe`, otherwise `null`.
 */
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
