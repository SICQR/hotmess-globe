import { createContext, useContext, useState, useCallback } from 'react';

/**
 * Globe Context
 * Controls globe visualization mode and camera state
 * 
 * Modes:
 * - ambient: passive background, slow rotation
 * - explore: user-driven navigation
 * - live: event-driven pulses and signals
 */

const GlobeContext = createContext(null);

export const GLOBE_MODES = {
  AMBIENT: 'ambient',
  EXPLORE: 'explore',
  LIVE: 'live',
};

export function GlobeProvider({ children }) {
  const [mode, setMode] = useState(GLOBE_MODES.AMBIENT);
  const [focusCity, setFocusCity] = useState(null);
  const [pulseQueue, setPulseQueue] = useState([]);

  const zoomToCity = useCallback((cityId, coords) => {
    setFocusCity({ id: cityId, ...coords });
    setMode(GLOBE_MODES.EXPLORE);
  }, []);

  const emitPulse = useCallback((pulse) => {
    setPulseQueue(q => [...q, { ...pulse, id: Date.now() }]);
  }, []);

  const consumePulse = useCallback(() => {
    setPulseQueue(q => q.slice(1));
  }, []);

  const value = {
    mode,
    setMode,
    focusCity,
    zoomToCity,
    pulseQueue,
    emitPulse,
    consumePulse,
  };

  return (
    <GlobeContext.Provider value={value}>
      {children}
    </GlobeContext.Provider>
  );
}

export function useGlobe() {
  const ctx = useContext(GlobeContext);
  if (!ctx) throw new Error('useGlobe must be used within GlobeProvider');
  return ctx;
}

export default GlobeContext;
