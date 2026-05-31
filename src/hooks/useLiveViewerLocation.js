import { useEffect, useRef, useState } from 'react';
import { requestGeoPermissionOnce } from '@/lib/geo/sharedGeolocation';

const haversineMeters = (a, b) => {
  if (!a || !b) return Infinity;
  const R = 6371e3;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const normalizeErrorCode = (err) => {
  const code = err?.code;
  if (code === 1) return 'denied';
  if (code === 2) return 'unavailable';
  if (code === 3) return 'timeout';
  return 'error';
};

const isAppleDesktop = () => {
  if (typeof navigator === 'undefined') return false;
  const platform = String(navigator.platform || '');
  const ua = String(navigator.userAgent || '');
  return platform.includes('Mac') || ua.includes('Macintosh');
};

export function bucketLatLng(loc, decimals = 3) {
  if (!loc) return null;
  const factor = Math.pow(10, decimals);
  const lat = Math.round(loc.lat * factor) / factor;
  const lng = Math.round(loc.lng * factor) / factor;
  return { lat, lng };
}

// Real-time viewer location (throttled): uses watchPosition when enabled.
// Designed to be safe for battery + rate limits.
export default function useLiveViewerLocation({
  enabled = false,
  enableHighAccuracy = false,
  timeoutMs = 10_000,
  maximumAgeMs = 15_000,
  minUpdateMs = 10_000,
  minDistanceM = 25,
  disableWatchPositionOnAppleDesktop = true,
} = {}) {
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState(enabled ? 'starting' : 'disabled');
  const [error, setError] = useState(null);

  const lastAcceptedRef = useRef({
    atMs: 0,
    loc: null,
  });

  useEffect(() => {
    if (!enabled) {
      setStatus('disabled');
      setError(null);
      setLocation(null);
      return;
    }

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatus('unavailable');
      setError({ code: 'unavailable' });
      setLocation(null);
      return;
    }

    let cancelled = false;
    const shouldUseWatchPosition = !(disableWatchPositionOnAppleDesktop && isAppleDesktop());
    setStatus(shouldUseWatchPosition ? 'watching' : 'polling');
    setError(null);

    const acceptIfAllowed = (next) => {
      const now = Date.now();
      const prev = lastAcceptedRef.current;

      if (!prev.loc) {
        lastAcceptedRef.current = { atMs: now, loc: next };
        setLocation(next);
        return;
      }

      const dt = now - (prev.atMs || 0);
      const moved = haversineMeters(prev.loc, next);

      if (dt < minUpdateMs && moved < minDistanceM) return;

      lastAcceptedRef.current = { atMs: now, loc: next };
      setLocation(next);
    };

    let watchId = null;
    let intervalId = null;

    const onPosition = (pos) => {
      if (cancelled) return;
      const lat = pos?.coords?.latitude;
      const lng = pos?.coords?.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      acceptIfAllowed({ lat, lng });
    };

    const onError = (err) => {
      if (cancelled) return;
      const code = normalizeErrorCode(err);

      // Treat transient CoreLocation failures as degraded, but keep the last known fix.
      if (code === 'unavailable' || code === 'timeout') {
        setStatus('degraded');
        setError({ code, message: err?.message || 'Geolocation temporarily unavailable' });
        return;
      }

      setStatus(code === 'denied' ? 'denied' : 'error');
      setError({ code, message: err?.message || 'Geolocation error' });
      if (code === 'denied') setLocation(null);
    };

    const geoOpts = {
      enableHighAccuracy,
      timeout: timeoutMs,
      maximumAge: maximumAgeMs,
    };

    // Phil 2026-05-31 hotfix — duplicate GPS prompt on /pulse first-entry.
    //
    // Pre-warm via sharedGeolocation.requestGeoPermissionOnce so the OS
    // permission prompt rides the same in-flight promise as any concurrent
    // caller (safeGetViewerLatLng on Globe.jsx mount, beacon-drop GPS
    // shortcut, presence heartbeat, etc.). Once permission resolves we
    // start watchPosition/polling — at that point the browser has the
    // permission cached and watchPosition does not re-prompt.
    //
    // Net effect: a single OS prompt on first-entry instead of two,
    // and the prewarm fix surfaces immediately to the consumer state
    // so the map / self-marker don't wait for the first watch tick.
    requestGeoPermissionOnce(geoOpts).then((pos) => {
      if (cancelled) return;

      // Surface the prewarm fix immediately if we got one. This lets the
      // Globe self-marker render at the right coordinate on first paint
      // instead of waiting for the watchPosition / poll to settle.
      const prewarmLat = pos?.coords?.latitude;
      const prewarmLng = pos?.coords?.longitude;
      if (Number.isFinite(prewarmLat) && Number.isFinite(prewarmLng)) {
        acceptIfAllowed({ lat: prewarmLat, lng: prewarmLng });
      } else if (pos === null) {
        // sharedGeolocation returned null — denial / unavailable. Surface
        // the error state for callers that care; watch/poll below will
        // also surface its own onError, but this short-circuits the
        // common case so we don't sit in 'watching' status forever.
        setStatus('denied');
        setError({ code: 'denied' });
        setLocation(null);
        // Do NOT start watch/poll — they would just spin against a denied
        // permission. The user re-enabling location will re-mount the hook.
        return;
      }

      if (cancelled) return;

      if (shouldUseWatchPosition) {
        watchId = navigator.geolocation.watchPosition(onPosition, onError, geoOpts);
      } else {
        // Apple desktop (CoreLocation) can spam the console with kCLErrorLocationUnknown
        // when using watchPosition. Use low-frequency polling instead.
        const poll = () => {
          try {
            navigator.geolocation.getCurrentPosition(onPosition, (err) => {
              // Stop polling if permission is explicitly denied.
              if (err?.code === 1 && intervalId != null) {
                try {
                  clearInterval(intervalId);
                } catch {
                  // ignore
                }
                intervalId = null;
              }
              onError(err);
            }, geoOpts);
          } catch {
            // ignore
          }
        };

        poll();
        intervalId = setInterval(poll, Math.max(2_500, minUpdateMs));
      }
    });

    return () => {
      cancelled = true;
      if (intervalId != null) {
        try {
          clearInterval(intervalId);
        } catch {
          // ignore
        }
      }
      if (watchId != null) {
        try {
          navigator.geolocation.clearWatch(watchId);
        } catch {
          // ignore
        }
      }
    };
  }, [
    enabled,
    enableHighAccuracy,
    maximumAgeMs,
    minDistanceM,
    minUpdateMs,
    timeoutMs,
    disableWatchPositionOnAppleDesktop,
  ]);

  return { location, status, error };
}
