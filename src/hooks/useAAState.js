/**
 * HOTMESS v6 — AA System: React Hook
 * src/hooks/useAAState.js
 *
 * Polls compute_aa_state every 60s (spec §3.1: ACTIVE updates every 60s).
 * Defaults to PASSIVE on stale or unavailable (spec §8).
 *
 * Usage:
 *   const { state, intensity, glow, stale, loading } = useAAState({ lat, lng });
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  computeAAState,
  getAAGlowStyle,
  isAAStateStale,
  AA_DEFAULT_STATE,
  AA_INTENSITY,
  AA_STATES,
} from '@/lib/v6/aaSystem';
import { useV6Flag } from '@/hooks/useV6Flag';

// Poll interval: 60s (spec §3.1)
const POLL_INTERVAL_MS = 60_000;

export function useAAState({ lat, lng, radiusKm = 2.0 } = {}) {
  const flagOn = useV6Flag('v6_aa_system');

  const [state,     setState]     = useState(AA_DEFAULT_STATE);
  const [intensity, setIntensity] = useState(AA_INTENSITY.PASSIVE);
  const [reason,    setReason]    = useState('ambient');
  const [stale,     setStale]     = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [fetchedAt, setFetchedAt] = useState(null);

  const timerRef    = useRef(null);
  const mountedRef  = useRef(true);

  const fetch = useCallback(async () => {
    // Flag off → stay PASSIVE, don't call RPC
    if (!flagOn || lat == null || lng == null) {
      if (mountedRef.current) {
        setState(AA_DEFAULT_STATE);
        setIntensity(AA_INTENSITY.PASSIVE);
        setLoading(false);
      }
      return;
    }

    const result = await computeAAState(lat, lng, radiusKm);
    if (!mountedRef.current) return;

    const now = Date.now();
    setState(result.state);
    setIntensity(result.intensity);
    setReason(result.reason);
    setFetchedAt(now);
    setStale(false);
    setLoading(false);
  }, [flagOn, lat, lng, radiusKm]);

  // Initial fetch + poll
  useEffect(() => {
    mountedRef.current = true;
    fetch();

    timerRef.current = setInterval(fetch, POLL_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(timerRef.current);
    };
  }, [fetch]);

  // Staleness check — runs every 30s between polls
  useEffect(() => {
    const staleTimer = setInterval(() => {
      if (!mountedRef.current) return;
      if (fetchedAt && isAAStateStale(fetchedAt)) {
        // Spec §8: stale → reduce to PASSIVE
        setStale(true);
        setState(AA_DEFAULT_STATE);
        setIntensity(AA_INTENSITY.PASSIVE);
      }
    }, 30_000);
    return () => clearInterval(staleTimer);
  }, [fetchedAt]);

  const glow = getAAGlowStyle(state, stale);

  return {
    state,
    intensity,
    reason,
    stale,
    loading,
    glow,
    isPassive:   state === AA_STATES.PASSIVE,
    isActive:    state === AA_STATES.ACTIVE,
    isEscalated: state === AA_STATES.ESCALATED,
  };
}
