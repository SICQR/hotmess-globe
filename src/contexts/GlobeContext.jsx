import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

/**
 * Globe Context
 * Controls globe visualization mode and camera state
 *
 * Modes:
 * - ambient: passive background, slow rotation
 * - explore: user-driven navigation
 * - live: event-driven pulses and signals
 *
 * Realtime:
 * - Subscribes to Beacon INSERT events via Supabase Realtime
 * - Each new Beacon emits a 'beacon_drop' pulse into pulseQueue
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
    setPulseQueue(q => [...q, { ...pulse, id: `${Date.now()}_${Math.random()}` }]);
  }, []);

  const consumePulse = useCallback(() => {
    setPulseQueue(q => q.slice(1));
  }, []);

  // ── Supabase Realtime: Beacon INSERT → Globe pulse ──────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('globe:beacon-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'Beacon' },
        (payload) => {
          const beacon = payload.new;
          if (!beacon) return;

          const lat = Number(beacon.lat ?? beacon.location_lat);
          const lng = Number(beacon.lng ?? beacon.location_lng);

          // Only emit if we have usable coordinates
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

          emitPulse({
            type: 'beacon_drop',
            lat,
            lng,
            metadata: {
              beaconId: beacon.id,
              title: beacon.title,
              category: beacon.category,
            },
          });

          // Switch globe to live mode so the pulse is visible
          setMode(GLOBE_MODES.LIVE);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [emitPulse]);

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

/** Safe fallback when component renders outside GlobeProvider boundary */
const GLOBE_NOOP = {
  mode: GLOBE_MODES.AMBIENT,
  setMode: () => {},
  focusCity: null,
  zoomToCity: () => {},
  pulseQueue: [],
  emitPulse: () => {},
  consumePulse: () => {},
};

export function useGlobe() {
  const ctx = useContext(GlobeContext);
  // Graceful fallback instead of crash — components outside GlobeProvider get a noop
  if (!ctx) return GLOBE_NOOP;
  return ctx;
}

export default GlobeContext;
