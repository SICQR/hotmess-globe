/**
 * PostGIS ST_SnapToGrid implementation for geospatial privacy
 * Snaps coordinates to a 500m grid to prevent exact location tracking
 */

const GRID_SIZE = 0.0045; // ~500m at equator (0.0045 degrees ≈ 500m)

export function snapToGrid(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return { lat: 0, lng: 0 };
  }
  
  // Snap to grid by rounding to nearest grid point
  const snappedLat = Math.floor(lat / GRID_SIZE) * GRID_SIZE;
  const snappedLng = Math.floor(lng / GRID_SIZE) * GRID_SIZE;
  
  return {
    lat: snappedLat,
    lng: snappedLng
  };
}

/**
 * Calculate fuzzy distance between two grid-snapped locations
 */
export function calculateFuzzyDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal
}