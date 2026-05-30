/**
 * HOTMESS City Pack Loader
 * 
 * Rule: Globe reads city pack only when zoom ≥ City (zoom >= 3)
 * Below that, only generic world heat is shown.
 * 
 * NOTE: City packs are optional. If files don't exist, we generate stub data.
 */

// Cache loaded city packs
const cityCache = new Map();

// Track failed fetches to avoid retry spam
const failedCities = new Set();

// City pack paths - use actual file names
const CITY_PACKS = {
  london: '/data/cities/london.json',
  tokyo: '/data/cities/tokyo.json',
  sao_paulo: '/data/cities/sao_paulo.json',
  los_angeles: '/data/cities/la.json',
  san_francisco: '/data/cities/sf.json',
  sydney: '/data/cities/sydney.json',
  berlin: '/data/cities/berlin.json',
  paris: '/data/cities/paris.json',
};

// City coordinates for globe positioning
const CITY_COORDS = {
  london: { lat: 51.5074, lng: -0.1278 },
  tokyo: { lat: 35.6762, lng: 139.6503 },
  sao_paulo: { lat: -23.5505, lng: -46.6333 },
  los_angeles: { lat: 34.0522, lng: -118.2437 },
  san_francisco: { lat: 37.7749, lng: -122.4194 },
  sydney: { lat: -33.8688, lng: 151.2093 },
  berlin: { lat: 52.5200, lng: 13.4050 },
  paris: { lat: 48.8566, lng: 2.3522 },
};

/**
 * Generate stub city data when JSON file is unavailable
 */
function generateStubCityPack(cityId, coords) {
  return {
    city: cityId,
    zones: [
      { id: `${cityId}-central`, category: 'nightlife', energy: 0.7, name: 'City Center' },
      { id: `${cityId}-east`, category: 'dining', energy: 0.5, name: 'East Side' },
      { id: `${cityId}-west`, category: 'culture', energy: 0.6, name: 'West End' },
    ],
    coords,
    isStub: true,
  };
}

/**
 * Load city pack - respects zoom rule
 * Returns stub data if JSON file unavailable (no error spam)
 */
export async function loadCityPack(cityId, currentZoom) {
  // Rule: Only load when zoom >= 3 (CITY level)
  if (currentZoom < 3) {
    return null;
  }

  const normalizedId = cityId.toLowerCase().replace(/\s+/g, '_');
  
  // Return cached if available
  if (cityCache.has(normalizedId)) {
    return cityCache.get(normalizedId);
  }

  // If we already know this city fails, return stub immediately
  if (failedCities.has(normalizedId)) {
    const stub = generateStubCityPack(normalizedId, CITY_COORDS[normalizedId]);
    cityCache.set(normalizedId, stub);
    return stub;
  }

  const packPath = CITY_PACKS[normalizedId];
  const coords = CITY_COORDS[normalizedId];
  
  if (!packPath || !coords) {
    return null;
  }

  try {
    const response = await fetch(packPath);
    
    // Check if we got HTML instead of JSON (SPA fallback)
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('application/json')) {
      failedCities.add(normalizedId);
      const stub = generateStubCityPack(normalizedId, coords);
      cityCache.set(normalizedId, stub);
      return stub;
    }
    
    const pack = await response.json();
    
    // Validate pack schema
    if (!validateCityPack(pack)) {
      failedCities.add(normalizedId);
      const stub = generateStubCityPack(normalizedId, coords);
      cityCache.set(normalizedId, stub);
      return stub;
    }

    // Enrich with coordinates
    pack.coords = coords;
    
    // Cache it
    cityCache.set(normalizedId, pack);
    
    return pack;
  } catch (err) {
    // Silently fall back to stub data - no console spam
    failedCities.add(normalizedId);
    const stub = generateStubCityPack(normalizedId, coords);
    cityCache.set(normalizedId, stub);
    return stub;
  }
}

/**
 * Get zones for current zoom level
 */
export function getVisibleZones(cityPack, currentZoom) {
  if (!cityPack?.zones) return [];

  // Zone visibility by zoom
  if (currentZoom < 8) {
    // CITY level - show all zones as dots
    return cityPack.zones.map(z => ({
      ...z,
      renderMode: 'dot',
    }));
  }
  
  if (currentZoom < 12) {
    // DISTRICT level - show zones with names
    return cityPack.zones.map(z => ({
      ...z,
      renderMode: 'zone',
      showLabel: true,
    }));
  }

  // STREET level - full detail
  return cityPack.zones.map(z => ({
    ...z,
    renderMode: 'detailed',
    showLabel: true,
    showEnergy: true,
  }));
}

/**
 * Check if we're in a peak window for a zone
 */
export function isInPeakWindow(cityPack, zoneId) {
  const behavior = cityPack?.behaviour?.peak_windows;
  if (!behavior) return false;

  const zonePeaks = behavior[zoneId];
  if (!zonePeaks) return false;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  for (const window of zonePeaks) {
    // Handle special day keys
    if (window.startsWith(dayOfWeek) || window.startsWith('all') || window.startsWith('weekend')) {
      const timeRange = window.includes(':') ? window.split(' ').pop() : window;
      const [start, end] = timeRange.split('–');
      
      if (isTimeInRange(currentTime, start, end)) {
        return true;
      }
    } else if (window.includes('–')) {
      // Direct time range
      const [start, end] = window.split('–');
      if (isTimeInRange(currentTime, start, end)) {
        return true;
      }
    }
  }

  return false;
}

function isTimeInRange(current, start, end) {
  // Handle overnight ranges (e.g., 22:00–05:00)
  if (end < start) {
    return current >= start || current <= end;
  }
  return current >= start && current <= end;
}

/**
 * Validate city pack schema
 */
function validateCityPack(pack) {
  if (!pack.city) return false;
  if (!Array.isArray(pack.zones)) return false;
  
  // Each zone must have id, category, energy
  for (const zone of pack.zones) {
    if (!zone.id || !zone.category || !zone.energy) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get nearby cities for world view
 */
export function getCitiesInView(bounds) {
  const visible = [];
  
  for (const [cityId, coords] of Object.entries(CITY_COORDS)) {
    if (isInBounds(coords, bounds)) {
      visible.push({
        id: cityId,
        ...coords,
        packPath: CITY_PACKS[cityId],
      });
    }
  }
  
  return visible;
}

function isInBounds(coords, bounds) {
  if (!bounds) return true;
  return (
    coords.lat >= bounds.south &&
    coords.lat <= bounds.north &&
    coords.lng >= bounds.west &&
    coords.lng <= bounds.east
  );
}

/**
 * Clear cache (for dev/testing)
 */
export function clearCityCache() {
  cityCache.clear();
}
