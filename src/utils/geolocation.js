import { logger } from '@/utils/logger';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const isGeolocationSupported = () => {
  return typeof navigator !== 'undefined' && !!navigator.geolocation;
};

export const normalizeGeolocationError = (err) => {
  const code = err?.code;
  if (code === 1) return { code, reason: 'denied', message: err?.message || 'Permission denied' };
  if (code === 2) return { code, reason: 'unavailable', message: err?.message || 'Position unavailable' };
  if (code === 3) return { code, reason: 'timeout', message: err?.message || 'Timed out' };
  return { code: code ?? null, reason: 'error', message: err?.message || 'Geolocation error' };
};

const shouldRetryError = (norm) => {
  // Retry transient failures.
  return norm.reason === 'unavailable' || norm.reason === 'timeout';
};

const getCurrentPositionOnce = (options) => {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
};

export const getLatLngFromPosition = (pos) => {
  const lat = pos?.coords?.latitude;
  const lng = pos?.coords?.longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    accuracy: pos?.coords?.accuracy ?? null,
    heading: pos?.coords?.heading ?? null,
    speed: pos?.coords?.speed ?? null,
    timestamp: pos?.timestamp ?? Date.now(),
  };
};

/**
 * Best-effort geolocation with small retry/backoff.
 *
 * - Retries on POSITION_UNAVAILABLE/TIMEOUT (common with CoreLocation)
 * - Does not retry on PERMISSION_DENIED
 * - Returns `null` if location can’t be obtained
 */
export async function safeGetViewerLatLng(
  geoOptions = { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
  { retries = 2, baseDelayMs = 400, backoff = 2, jitterMs = 120, logKey = 'geo' } = {}
) {
  if (!isGeolocationSupported()) return null;

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const pos = await getCurrentPositionOnce(geoOptions);
      const loc = getLatLngFromPosition(pos);
      if (loc) return loc;

      // Treat malformed coords as retryable once.
      lastError = new Error('Invalid geolocation coordinates');
    } catch (err) {
      const norm = normalizeGeolocationError(err);
      lastError = err;

      if (!shouldRetryError(norm) || attempt === retries) {
        // Keep logs quiet: this is very often user/device/environment dependent.
        if (norm.reason !== 'denied') {
          logger.debug('Geolocation unavailable', { key: logKey, reason: norm.reason, message: norm.message });
        }
        return null;
      }
    }

    const delay = Math.round(baseDelayMs * Math.pow(backoff, attempt) + Math.random() * jitterMs);
    await sleep(delay);
  }

  // Should never reach, but keep behavior predictable.
  if (lastError) {
    const norm = normalizeGeolocationError(lastError);
    if (norm.reason !== 'denied') {
      logger.debug('Geolocation unavailable', { key: logKey, reason: norm.reason, message: norm.message });
    }
  }

  return null;
}
