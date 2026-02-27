/**
 * useShakeSOS
 *
 * Detects a deliberate 3-shake pattern via the DeviceMotion API and triggers
 * a 5-second countdown before activating SOS. Entirely opt-in — the user must
 * enable the feature via SafetyFAB. Preference persists in localStorage.
 *
 * Detection algorithm:
 *  - Listen to `devicemotion` events
 *  - Per event: compute acceleration magnitude (prefer no-gravity vector)
 *  - Threshold: 25 m/s² (deliberate hard shake, not pocket movement)
 *  - Count 3 distinct shakes within a 1500ms rolling window
 *  - Min 300ms between counted shakes (debounce single oscillation)
 *  - On 3 shakes: start 5-second countdown → caller triggers SOS on 0
 *
 * iOS 13+ requires DeviceMotionEvent.requestPermission() from a user gesture.
 * Android / desktop: permission is 'not_applicable', listener attaches directly.
 */

import { useEffect, useState, useCallback, useRef } from 'react';

const STORAGE_KEY      = 'hm_shake_sos_v1';
const SHAKE_THRESHOLD  = 25;   // m/s² — deliberate shake
const SHAKE_WINDOW_MS  = 1500; // rolling window for 3 shakes
const SHAKE_DEBOUNCE   = 300;  // min ms between counted shakes
const COUNTDOWN_START  = 5;    // seconds before SOS fires

export type ShakePermission = 'unknown' | 'granted' | 'denied' | 'not_applicable';

export interface ShakeSosState {
  /** Whether the user has opted in */
  enabled: boolean;
  /** iOS permission state; 'not_applicable' on Android/desktop */
  permission: ShakePermission;
  /** True during the 5-second countdown */
  isCountingDown: boolean;
  /** Seconds remaining in the countdown (5..0) */
  secondsLeft: number;
  /** Toggle opt-in preference. On first enable on iOS, triggers requestPermission. */
  toggle: () => Promise<void>;
  /** Manually request iOS DeviceMotion permission (call from user gesture) */
  requestPermission: () => Promise<ShakePermission>;
  /** Cancel an in-progress countdown */
  cancelCountdown: () => void;
}

function readEnabled(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    return JSON.parse(raw)?.enabled === true;
  } catch {
    return false;
  }
}

function writeEnabled(val: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: val }));
  } catch { /* ignore */ }
}

function isIOS(): boolean {
  return (
    typeof DeviceMotionEvent !== 'undefined' &&
    typeof (DeviceMotionEvent as { requestPermission?: () => Promise<string> }).requestPermission === 'function'
  );
}

export function useShakeSOS(onFire: () => void): ShakeSosState {
  const [enabled, setEnabled]           = useState(readEnabled);
  const [permission, setPermission]     = useState<ShakePermission>(() =>
    isIOS() ? 'unknown' : 'not_applicable'
  );
  const [isCountingDown, setCountingDown] = useState(false);
  const [secondsLeft, setSecondsLeft]     = useState(COUNTDOWN_START);

  const shakeTimestamps = useRef<number[]>([]);
  const lastShakeTime   = useRef<number>(0);
  const countdownRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const firedRef        = useRef(false);

  const cancelCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountingDown(false);
    setSecondsLeft(COUNTDOWN_START);
    firedRef.current = false;
  }, []);

  const startCountdown = useCallback(() => {
    if (isCountingDown || firedRef.current) return;
    firedRef.current = false;
    setCountingDown(true);
    setSecondsLeft(COUNTDOWN_START);

    let remaining = COUNTDOWN_START;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        setCountingDown(false);
        setSecondsLeft(COUNTDOWN_START);
        if (!firedRef.current) {
          firedRef.current = true;
          onFire();
        }
      }
    }, 1000);
  }, [isCountingDown, onFire]);

  // Attach / detach the DeviceMotion listener
  useEffect(() => {
    if (!enabled) {
      shakeTimestamps.current = [];
      return;
    }
    if (permission === 'denied') return;
    if (permission === 'unknown') return; // waiting for iOS grant

    const handleMotion = (event: DeviceMotionEvent) => {
      if (isCountingDown) return; // already counting down

      const a = event.acceleration;
      const ag = event.accelerationIncludingGravity;

      // Prefer acceleration (no gravity). Fall back to gravity-included z-axis minus g.
      let magnitude: number;
      if (a && a.x != null && a.y != null && a.z != null) {
        magnitude = Math.sqrt(a.x ** 2 + a.y ** 2 + a.z ** 2);
      } else if (ag && ag.x != null && ag.y != null && ag.z != null) {
        // Approximate by subtracting gravity from z-axis
        magnitude = Math.sqrt(ag.x ** 2 + ag.y ** 2 + (ag.z! - 9.81) ** 2);
      } else {
        return;
      }

      if (magnitude < SHAKE_THRESHOLD) return;

      const now = Date.now();
      if (now - lastShakeTime.current < SHAKE_DEBOUNCE) return;
      lastShakeTime.current = now;

      // Keep only timestamps within the rolling window
      shakeTimestamps.current = [
        ...shakeTimestamps.current.filter(t => now - t < SHAKE_WINDOW_MS),
        now,
      ];

      if (shakeTimestamps.current.length >= 3) {
        shakeTimestamps.current = [];
        startCountdown();
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [enabled, permission, isCountingDown, startCountdown]);

  // Clean up countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const requestPermission = useCallback(async (): Promise<ShakePermission> => {
    if (!isIOS()) {
      setPermission('not_applicable');
      return 'not_applicable';
    }
    try {
      const result = await (
        DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }
      ).requestPermission();
      const perm: ShakePermission = result === 'granted' ? 'granted' : 'denied';
      setPermission(perm);
      return perm;
    } catch {
      setPermission('denied');
      return 'denied';
    }
  }, []);

  const toggle = useCallback(async () => {
    const next = !enabled;
    if (next) {
      // On first enable, get iOS permission
      if (isIOS() && permission === 'unknown') {
        const perm = await requestPermission();
        if (perm === 'denied') return; // don't enable if permission denied
      }
    } else {
      cancelCountdown();
    }
    setEnabled(next);
    writeEnabled(next);
  }, [enabled, permission, requestPermission, cancelCountdown]);

  return {
    enabled,
    permission,
    isCountingDown,
    secondsLeft,
    toggle,
    requestPermission,
    cancelCountdown,
  };
}
