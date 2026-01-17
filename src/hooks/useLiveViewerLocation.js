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
    setStatus('watching');
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

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (cancelled) return;
        const lat = pos?.coords?.latitude;
        const lng = pos?.coords?.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        acceptIfAllowed({ lat, lng });
      },
      (err) => {
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
      },
      {
        enableHighAccuracy,
        timeout: timeoutMs,
        maximumAge: maximumAgeMs,
      }
    );

    return () => {
      cancelled = true;
      try {
        navigator.geolocation.clearWatch(watchId);
      } catch {
        // ignore
      }
    };
  }, [
    enabled,
    enableHighAccuracy,
    maximumAgeMs,
    minDistanceM,
    minUpdateMs,
    timeoutMs,
  ]);

  return { location, status, error };
}
