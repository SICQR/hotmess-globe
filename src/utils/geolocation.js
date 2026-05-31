import logger from '@/utils/logger';
import { requestGeoPermissionOnce, geoPermissionState } from '@/lib/geo/sharedGeolocation';

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

// Phil 2026-05-31 hotfix — duplicate GPS prompt on /pulse first-entry.
//
// Was: direct navigator.geolocation.getCurrentPosition. When this util and
// useLiveViewerLocation (or any other geolocation hook) both fired on the
// same first-mount, iOS Safari queued separate OS prompts — the user saw
// the same permission request twice and the map race during the second
// prompt produced a visual glitch.
//
// Now: route through sharedGeolocation.requestGeoPermissionOnce so all
// callers coalesce into a single in-flight promise. Cached positions (≤60s
// old) skip the prompt entirely. On denial / unavailability we synthesise
// a PositionError-shaped object so the retry/backoff loop above can
// distinguish denial (no retry) from transient errors (retry).
//
// sharedGeolocation.ts already documented this pattern: "useRealtimeLocations
// were double-prompting on iOS" — the fix existed at the shared layer but
// safeGetViewerLatLng was still bypassing it. This hotfix routes the legacy
// path through the dedup mechanism without changing safeGetViewerLatLng's
// public contract.
const getCurrentPositionOnce = async (options) => {
  const pos = await requestGeoPermissionOnce(options);
  if (pos) return pos;

  // Null = denied / unavailable / timeout. Differentiate via Permissions API
  // so we throw the right code for the retry decision. Without this, every
  // null would be treated as retryable and the loop would spin on denial.
  let state = 'unknown';
  try {
    state = await geoPermissionState();
  } catch {
    // permissions API unavailable; assume transient
  }
  const code = state === 'denied' ? 1 : 2; // 1 = denied (no retry), 2 = unavailable (retry)
  throw Object.assign(new Error(`Geolocation ${state}`), { code });
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
