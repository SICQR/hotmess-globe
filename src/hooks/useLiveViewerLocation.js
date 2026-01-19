import { useEffect, useRef, useState } from 'react';

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

    if (shouldUseWatchPosition) {
      watchId = navigator.geolocation.watchPosition(onPosition, onError, {
        enableHighAccuracy,
        timeout: timeoutMs,
        maximumAge: maximumAgeMs,
      });
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
          }, {
            enableHighAccuracy,
            timeout: timeoutMs,
            maximumAge: maximumAgeMs,
          });
        } catch {
          // ignore
        }
      };

      poll();
      intervalId = setInterval(poll, Math.max(2_500, minUpdateMs));
    }

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
