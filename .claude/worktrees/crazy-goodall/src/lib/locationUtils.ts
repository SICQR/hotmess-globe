/**
 * Location utilities for HOTMESS OS
 *
 * Adapted from SICQR/ghosted. Haversine distance, travel time,
 * reverse geocoding, and geolocation helpers.
 */

/** Haversine distance in meters between two lat/lng points. */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/** Format distance for display: "450 m" or "2.3 km". */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${meters} m`;
}

/** Estimate walking time in minutes (default 1.4 m/s ≈ 5 km/h). */
export function calculateTravelTime(meters: number, speedMps: number = 1.4): number {
  return Math.round(meters / speedMps / 60);
}

/** Format travel time: "5 min walk" or "1h 20min". */
export function formatTravelTime(meters: number): string {
  const mins = calculateTravelTime(meters);
  if (mins < 60) return `${mins} min walk`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/** Get current position as a Promise. */
export function getUserLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    });
  });
}

/** Watch position updates. Returns the watchId (pass to clearLocationWatch). */
export function watchUserLocation(
  onUpdate: (position: GeolocationPosition) => void,
  onError: (error: GeolocationPositionError) => void
): number {
  if (!navigator.geolocation) {
    onError({
      code: 0,
      message: 'Geolocation is not supported',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    } as GeolocationPositionError);
    return -1;
  }

  return navigator.geolocation.watchPosition(onUpdate, onError, {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 30000,
  });
}

/** Clear a geolocation watch. */
export function clearLocationWatch(watchId: number): void {
  if (navigator.geolocation && watchId !== -1) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/** Reverse geocode via OSM Nominatim (free, no API key). */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const data = await res.json();
    return data.address?.city || data.address?.town || data.address?.village || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

/** Check if geolocation permission is already granted. */
export async function isLocationPermissionGranted(): Promise<boolean> {
  if (!navigator.permissions) return false;
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state === 'granted';
  } catch {
    return false;
  }
}
