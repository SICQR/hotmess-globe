/**
 * OSHome — Clean Globe OS Home Screen
 * 
 * Uses OSShell for the brutalist mobile-first design.
 * BottomDock switches modes, which open L2 sheets.
 * Globe is always visible in background.
 */

import React, { useState, Suspense, lazy } from 'react';
import { OSShell } from '@/components/shell/OSShell';
import { SheetProvider, useSheet, SHEET_TYPES } from '@/contexts/SheetContext';
import SheetRouter from '@/components/sheets/SheetRouter';
import ErrorBoundary from '@/components/error/ErrorBoundary';

// Lazy load the globe for performance
const GlobeHero = lazy(() => import('@/components/globe/GlobeHero'));

// Loading fallback for globe
const GlobeLoadingFallback = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-[#050507]">
    <div className="w-8 h-8 border-4 border-[#39FF14]/20 border-t-[#39FF14] rounded-full animate-spin" />
  </div>
);

// Mode to sheet mapping
const MODE_TO_SHEET = {
  NOW: null, // NOW = globe idle, no sheet
  SOCIAL: SHEET_TYPES.GHOSTED,
  EVENTS: 'events',
  RADIO: 'radio',
  SHOP: SHEET_TYPES.SHOP,
  PROFILE: SHEET_TYPES.PROFILE,
};

function OSHomeContent() {
  const [activeMode, setActiveMode] = useState('NOW');
  const { openSheet, closeSheet } = useSheet();

  // Handle mode changes from BottomDock
  const handleModeChange = (mode) => {
    setActiveMode(mode);
    
    const sheetType = MODE_TO_SHEET[mode];
    if (sheetType) {
      openSheet(sheetType);
    } else {
      closeSheet(); // NOW mode = close any open sheet
    }
  };

  return (
    <OSShell
      globe={
        <Suspense fallback={<GlobeLoadingFallback />}>
          <GlobeHero />
        </Suspense>
      }
      activeMode={activeMode}
      onModeChange={handleModeChange}
      radioProps={{
        isPlaying: false,
        trackTitle: 'HOTMESS Radio',
        bpm: 92,
        isLive: false,
        onToggle: () => {},
      }}
    >
      {/* Sheet content renders via SheetRouter */}
      <SheetRouter />
    </OSShell>
  );
}

export default function OSHome() {
  return (
    <ErrorBoundary>
      <SheetProvider>
        <OSHomeContent />
      </SheetProvider>
    </ErrorBoundary>
  );
}
