import logger from '@/utils/logger';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const isGeolocationSupported = () => {
  return typeof navigator !== 'undefined' && !!navigator.geolocation;
};

export async function getGeolocationPermissionState() {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unknown';
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status?.state || 'unknown';
  } catch {
    return 'unknown';
  }
}

export const normalizeGeolocationError = (err) => {
  const code = err?.code;
  if (code === 1) return { code, reason: 'denied', message: err?.message || 'Permission denied' };
  if (code === 2) return { code, reason: 'unavailable', message: err?.message || 'Position unavailable' };
  if (code === 3) return { code, reason: 'timeout', message: err?.message || 'Timed out' };
  return { code: code ?? null, reason: 'error', message: err?.message || 'Geolocation error' };
};

const shouldRetryError = (norm) => {
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
 * Prompt-safe geolocation.
 *
 * Default behavior is passive: it will only read location if browser permission
 * is already granted. This prevents Safari/Chrome native permission popups from
 * being triggered by app boot, pull-to-refresh, route remounts, or passive tabs.
 *
 * Pass `{ allowNativePrompt: true }` only from explicit user actions such as
 * Go Live, Nearby, Beacon Drop, Safety sharing, or Directions.
 */
export async function safeGetViewerLatLng(
  geoOptions = { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
  {
    retries = 2,
    baseDelayMs = 400,
    backoff = 2,
    jitterMs = 120,
    logKey = 'geo',
    allowNativePrompt = false,
  } = {}
) {
  if (!isGeolocationSupported()) return null;

  if (!allowNativePrompt) {
    const permissionState = await getGeolocationPermissionState();
    if (permissionState !== 'granted') {
      logger.debug('Skipping passive geolocation to avoid native prompt', { key: logKey, permissionState });
      return null;
    }
  }

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const pos = await getCurrentPositionOnce(geoOptions);
      const loc = getLatLngFromPosition(pos);
      if (loc) return loc;
      lastError = new Error('Invalid geolocation coordinates');
    } catch (err) {
      const norm = normalizeGeolocationError(err);
      lastError = err;

      if (!shouldRetryError(norm) || attempt === retries) {
        if (norm.reason !== 'denied') {
          logger.debug('Geolocation unavailable', { key: logKey, reason: norm.reason, message: norm.message });
        }
        return null;
      }
    }

    const delay = Math.round(baseDelayMs * Math.pow(backoff, attempt) + Math.random() * jitterMs);
    await sleep(delay);
  }

  if (lastError) {
    const norm = normalizeGeolocationError(lastError);
    if (norm.reason !== 'denied') {
      logger.debug('Geolocation unavailable', { key: logKey, reason: norm.reason, message: norm.message });
    }
  }

  return null;
}
