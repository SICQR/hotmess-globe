/**
 * sharedGeolocation — single source of truth for the browser geolocation
 * permission prompt.
 *
 * Coalesces the FIRST position request into a single in-flight promise and
 * caches the result briefly. Any caller (getCurrentPosition-style or a
 * watchPosition starter) awaits requestGeoPermissionOnce() first, so the OS
 * prompt is surfaced exactly once across all location-using hooks
 * (usePresenceHeartbeat + useRealtimeLocations were double-prompting on iOS).
 *
 * Fail-soft: if geolocation is unavailable or denied, callers get null and
 * fall back to existing behaviour. No throw paths.
 */

const POSITION_TTL_MS = 60_000;

let inflight: Promise<GeolocationPosition | null> | null = null;
let cached: { pos: GeolocationPosition; at: number } | null = null;

const DEFAULT_OPTS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 8000,
  maximumAge: 60_000,
};

/**
 * Returns a position, triggering AT MOST ONE permission prompt across all
 * concurrent callers. Resolves null on denial / unavailability (never throws).
 */
export function requestGeoPermissionOnce(opts?: PositionOptions): Promise<GeolocationPosition | null> {
  if (cached && Date.now() - cached.at < POSITION_TTL_MS) {
    return Promise.resolve(cached.pos);
  }
  if (inflight) return inflight;

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  inflight = new Promise<GeolocationPosition | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cached = { pos, at: Date.now() };
        inflight = null;
        resolve(pos);
      },
      () => {
        inflight = null;
        resolve(null);
      },
      opts ?? DEFAULT_OPTS,
    );
  });
  return inflight;
}

/** Latest cached position, if any (no prompt, no request). */
export function getCachedPosition(): GeolocationPosition | null {
  if (cached && Date.now() - cached.at < POSITION_TTL_MS) return cached.pos;
  return null;
}

/**
 * Has the geolocation permission already been granted? Uses the Permissions
 * API when available. Resolves 'granted' | 'denied' | 'prompt' | 'unknown'.
 */
export async function geoPermissionState(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  try {
    const anyNav = navigator as unknown as { permissions?: { query: (d: { name: string }) => Promise<{ state: string }> } };
    if (!anyNav.permissions?.query) return 'unknown';
    const res = await anyNav.permissions.query({ name: 'geolocation' });
    if (res.state === 'granted' || res.state === 'denied' || res.state === 'prompt') return res.state;
    return 'unknown';
  } catch {
    return 'unknown';
  }
}
