/**
 * src/hooks/useProximityFailure.ts — Chunk 14
 *
 * React hook wrapping ProximityFailureSystem.
 * Gated by v6_proximity_failure feature flag.
 *
 * When flag OFF: returns { enabled: false } — caller uses existing GPS behaviour.
 * When flag ON:  returns live ProximityFailureState + feed() + setDistance() + destroy
 *
 * Usage:
 *   const { enabled, state, feed, setDistance } = useProximityFailure();
 *   // On GPS update:
 *   feed(lat, lng, accuracy);
 *   // On signal loss:
 *   feed(null, null);
 *   // Wire state into UI
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useV6Flag } from '@/hooks/useV6Flag';
import {
  ProximityFailureSystem,
  buildStateObject,
  type ProximityFailureState,
} from '@/lib/proximity/failureSystem';

// ── Types ─────────────��────────────────────────────���──────────────────────────

export interface UseProximityFailureResult {
  enabled:     boolean;
  state:       ProximityFailureState | null;
  feed:        (lat: number | null, lng: number | null, accuracy?: number) => void;
  setDistance: (distM: number) => void;
}

// ── Initial full state ────────────────��───────────────────────────────────────

function initialState(): ProximityFailureState {
  return {
    state:         'full',
    showDots:      true,
    dotsOpacity:   1,
    showRoute:     true,
    routeOpacity:  1,
    showETA:       true,
    proximityText: null,
    headerCopy:    '',
    hapticPattern: null,
    hapticInterval: null,
  };
}

// ── Hook ──────────────────────────────────────────���───────────────────────────

export function useProximityFailure(): UseProximityFailureResult {
  const flagOn = useV6Flag('v6_proximity_failure');

  const [failState, setFailState] = useState<ProximityFailureState | null>(
    flagOn ? initialState() : null
  );

  const monitorRef = useRef<ProximityFailureSystem | null>(null);

  useEffect(() => {
    if (!flagOn) {
      monitorRef.current?.destroy();
      monitorRef.current = null;
      setFailState(null);
      return;
    }

    monitorRef.current = new ProximityFailureSystem((s) => setFailState(s));
    setFailState(initialState());

    return () => {
      monitorRef.current?.destroy();
      monitorRef.current = null;
    };
  }, [flagOn]);

  const feed = useCallback((lat: number | null, lng: number | null, accuracy = 10) => {
    if (!monitorRef.current) return;
    if (lat === null || lng === null) {
      monitorRef.current.setNoSignal();
    } else {
      monitorRef.current.update(lat, lng, accuracy);
    }
  }, []);

  const setDistance = useCallback((distM: number) => {
    monitorRef.current?.setTargetDistance(distM);
  }, []);

  return {
    enabled:     flagOn,
    state:       failState,
    feed,
    setDistance,
  };
}
