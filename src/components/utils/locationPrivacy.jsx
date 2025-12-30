/**
 * Grid-snap coordinates to 500m radius for privacy
 * Uses 0.005 degree grid (~500m at London latitude)
 */
export function snapToGrid(lat, lng, gridSize = 0.005) {
  const snappedLat = Math.round(lat / gridSize) * gridSize;
  const snappedLng = Math.round(lng / gridSize) * gridSize;
  return { lat: snappedLat, lng: snappedLng };
}

/**
 * Add random jitter within grid cell for additional obfuscation
 */
export function addJitter(lat, lng, maxJitter = 0.002) {
  const jitterLat = (Math.random() - 0.5) * maxJitter;
  const jitterLng = (Math.random() - 0.5) * maxJitter;
  return {
    lat: lat + jitterLat,
    lng: lng + jitterLng
  };
}

/**
 * Calculate distance between two points in meters
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Process location based on user's privacy setting
 */
export function processLocationForPrivacy(lat, lng, privacyMode = 'fuzzy') {
  switch (privacyMode) {
    case 'precise':
      return { lat, lng };
    case 'fuzzy':
      return snapToGrid(lat, lng);
    case 'hidden':
      return null;
    default:
      return snapToGrid(lat, lng);
  }
}

/**
 * Format location for display (shows approximate area, not exact coords)
 */
export function formatLocationDisplay(lat, lng) {
  return `~${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
}