/**
 * UnifiedGlobe — L0 Persistent Background Layer
 * 
 * This is THE globe that mounts once and never unmounts.
 * It sits at Z-0, behind all sheets and navigation.
 * 
 * Key architectural principle:
 * - Mounts at app root, OUTSIDE of Router
 * - Never remounts during navigation
 * - Provides spatial context for all OS operations
 */

import React from 'react';
import GlobePage from '@/pages/Globe';

export function UnifiedGlobe() {
  return (
    <div className="absolute inset-0 z-0" style={{ pointerEvents: 'auto' }}>
      <GlobePage />
    </div>
  );
}

export default UnifiedGlobe;
