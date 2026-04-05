import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
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

  // ── New context values ───────────────────────────────────────────────────

  // City selector — drives TopHUD label AND globe camera
  const [selectedCity, setSelectedCity] = useState(
    () => localStorage.getItem('hm_city') || 'London'
  );

  // Filter — drives drawer list AND globe beacon visibility
  const [activeFilter, setActiveFilter] = useState('all');

  // Beacon focus — tap in drawer → globe rotates; tap on globe → drawer highlights
  const [focusedBeaconId, setFocusedBeaconId] = useState(null);

  // Camera city — auto-updates as globe rotates, drives TopHUD city label
  const [cameraCity, setCameraCity] = useState('London');

  // Layer toggles — drives which beacon types render
  const [activeLayer, setActiveLayer] = useState({
    events: true,
    venues: true,
    people: false,
    safety: true,
    market: true,
    radio: true,
  });

  // Focused place — set by Globe.jsx on place tap, read by PulseMode for VenuePanel
  const [focusedPlace, setFocusedPlace] = useState(null);

  // Ghosted context — opens GhostedOverlay with venue/area context from Pulse
  const [ghostedContext, setGhostedContext] = useState(null);

  // Amplified beacons Map<id, { multiplier, expiresAt }>
  const [amplifiedBeaconIds, setAmplifiedBeaconIds] = useState(new Map());

  // Clean expired amplifications every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      setAmplifiedBeaconIds(prev => {
        const now = Date.now();
        const next = new Map();
        prev.forEach((val, key) => {
          if (val.expiresAt > now) next.set(key, val);
        });
        return next.size === prev.size ? prev : next;
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const amplifyBeacon = useCallback((id, hours) => {
    setAmplifiedBeaconIds(prev => {
      const next = new Map(prev);
      next.set(id, {
        multiplier: 3,
        expiresAt: Date.now() + hours * 3_600_000,
      });
      return next;
    });
  }, []);

  // ── Existing actions ─────────────────────────────────────────────────────

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

  // ── Supabase Realtime: Beacon INSERT → Globe pulse ───────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('globe:beacon-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'beacons' },
        (payload) => {
          const beacon = payload.new;
          if (!beacon) return;

          const lat = Number(beacon.lat ?? beacon.location_lat);
          const lng = Number(beacon.lng ?? beacon.location_lng);

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

          setMode(GLOBE_MODES.LIVE);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [emitPulse]);

  const value = {
    // Existing
    mode,
    setMode,
    focusCity,
    zoomToCity,
    pulseQueue,
    emitPulse,
    consumePulse,
    // New
    selectedCity,
    setSelectedCity,
    activeFilter,
    setActiveFilter,
    focusedBeaconId,
    setFocusedBeaconId,
    cameraCity,
    setCameraCity,
    activeLayer,
    setActiveLayer,
    amplifiedBeaconIds,
    amplifyBeacon,
    focusedPlace,
    setFocusedPlace,
    ghostedContext,
    setGhostedContext,
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
  selectedCity: 'London',
  setSelectedCity: () => {},
  activeFilter: 'all',
  setActiveFilter: () => {},
  focusedBeaconId: null,
  setFocusedBeaconId: () => {},
  cameraCity: 'London',
  setCameraCity: () => {},
  activeLayer: { events: true, venues: true, people: false, safety: true, market: true, radio: true },
  setActiveLayer: () => {},
  amplifiedBeaconIds: new Map(),
  amplifyBeacon: () => {},
  focusedPlace: null,
  setFocusedPlace: () => {},
  ghostedContext: null,
  setGhostedContext: () => {},
};

export function useGlobe() {
  const ctx = useContext(GlobeContext);
  if (!ctx) return GLOBE_NOOP;
  return ctx;
}

export default GlobeContext;
