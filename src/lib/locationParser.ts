/**
 * Location parser — detects postcodes, venue names, and coordinates in text.
 * Used by chat to auto-convert location text into travel cards.
 */

export interface ParsedLocation {
  type: 'postcode' | 'venue' | 'coordinates';
  raw: string;
  label: string;
  lat?: number;
  lng?: number;
  confidence: number; // 0-1
}

// UK postcode regex (full + partial)
const UK_POSTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i;
const UK_PARTIAL = /\b([A-Z]{1,2}\d[A-Z\d]?)\b/i;

// Coordinate pattern: "51.5074, -0.1278" or "51.5074/-0.1278"
const COORDS = /(-?\d{1,3}\.\d{3,})[,\s/]+(-?\d{1,3}\.\d{3,})/;

// Known venue slugs (from pulse_places). Expand as needed.
const KNOWN_VENUES: Record<string, { lat: number; lng: number; label: string }> = {
  'eagle london': { lat: 51.5342, lng: -0.0800, label: 'Eagle London' },
  'eagle': { lat: 51.5342, lng: -0.0800, label: 'Eagle London' },
  'the cock': { lat: 40.7295, lng: -73.9903, label: 'The Cock' },
  'union': { lat: 51.4712, lng: -0.1208, label: 'Union' },
  'fire': { lat: 51.4712, lng: -0.1208, label: 'Fire' },
  'heaven': { lat: 51.5076, lng: -0.1238, label: 'Heaven' },
  'ku bar': { lat: 51.5129, lng: -0.1318, label: 'Ku Bar' },
  'the glory': { lat: 51.5400, lng: -0.0764, label: 'The Glory' },
  'dalston superstore': { lat: 51.5462, lng: -0.0754, label: 'Dalston Superstore' },
  'xxl': { lat: 51.5026, lng: -0.1101, label: 'XXL' },
  'the yard': { lat: 51.5135, lng: -0.1310, label: 'The Yard' },
  'lab.oratory': { lat: 52.4987, lng: 13.4400, label: 'Lab.Oratory' },
  'kitkat': { lat: 52.4987, lng: 13.4400, label: 'KitKat Club' },
  'berghain': { lat: 52.5110, lng: 13.4433, label: 'Berghain' },
  'club church': { lat: 52.3600, lng: 4.8970, label: 'Club Church' },
  'strong': { lat: 40.4173, lng: -3.7050, label: 'Strong Madrid' },
  'arq': { lat: -33.8800, lng: 151.2150, label: 'ARQ Sydney' },
  'soho': { lat: 51.5137, lng: -0.1340, label: 'Soho' },
  'vauxhall': { lat: 51.4861, lng: -0.1228, label: 'Vauxhall' },
  'shoreditch': { lat: 51.5263, lng: -0.0773, label: 'Shoreditch' },
};

// London area postcodes → approximate coords
const POSTCODE_AREAS: Record<string, { lat: number; lng: number }> = {
  'EC1': { lat: 51.5225, lng: -0.1008 },
  'EC2': { lat: 51.5175, lng: -0.0838 },
  'EC3': { lat: 51.5120, lng: -0.0790 },
  'EC4': { lat: 51.5133, lng: -0.1035 },
  'WC1': { lat: 51.5230, lng: -0.1200 },
  'WC2': { lat: 51.5115, lng: -0.1230 },
  'W1': { lat: 51.5145, lng: -0.1470 },
  'W2': { lat: 51.5160, lng: -0.1780 },
  'SW1': { lat: 51.4985, lng: -0.1335 },
  'SE1': { lat: 51.5020, lng: -0.0880 },
  'SE11': { lat: 51.4870, lng: -0.1100 },
  'SE17': { lat: 51.4880, lng: -0.0930 },
  'E1': { lat: 51.5155, lng: -0.0560 },
  'E2': { lat: 51.5290, lng: -0.0550 },
  'E8': { lat: 51.5430, lng: -0.0610 },
  'N1': { lat: 51.5400, lng: -0.1000 },
  'N16': { lat: 51.5600, lng: -0.0750 },
  'NW1': { lat: 51.5340, lng: -0.1440 },
  'SW4': { lat: 51.4610, lng: -0.1400 },
  'SW8': { lat: 51.4750, lng: -0.1330 },
  'SW9': { lat: 51.4630, lng: -0.1150 },
};

/**
 * Parse a text message for location content.
 * Returns null if no location detected.
 */
export function parseLocation(text: string): ParsedLocation | null {
  if (!text || text.length < 2 || text.length > 500) return null;

  const lower = text.toLowerCase().trim();

  // 1. Coordinates
  const coordMatch = text.match(COORDS);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return {
        type: 'coordinates',
        raw: coordMatch[0],
        label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        lat,
        lng,
        confidence: 0.95,
      };
    }
  }

  // 2. Full UK postcode
  const fullMatch = text.match(UK_POSTCODE);
  if (fullMatch) {
    const pc = fullMatch[1].toUpperCase().replace(/\s+/g, ' ');
    const area = pc.replace(/\s*\d[A-Z]{2}$/, '');
    const coords = POSTCODE_AREAS[area];
    return {
      type: 'postcode',
      raw: fullMatch[0],
      label: pc,
      lat: coords?.lat,
      lng: coords?.lng,
      confidence: coords ? 0.7 : 0.5,
    };
  }

  // 3. Known venue name match (only if message is short — likely a destination)
  if (lower.length < 40) {
    for (const [key, venue] of Object.entries(KNOWN_VENUES)) {
      if (lower.includes(key)) {
        return {
          type: 'venue',
          raw: key,
          label: venue.label,
          lat: venue.lat,
          lng: venue.lng,
          confidence: 0.8,
        };
      }
    }
  }

  // 4. Partial postcode (only in short messages)
  if (lower.length < 15) {
    const partialMatch = text.match(UK_PARTIAL);
    if (partialMatch) {
      const area = partialMatch[1].toUpperCase();
      const coords = POSTCODE_AREAS[area];
      if (coords) {
        return {
          type: 'postcode',
          raw: partialMatch[0],
          label: area,
          lat: coords.lat,
          lng: coords.lng,
          confidence: 0.5,
        };
      }
    }
  }

  return null;
}

/**
 * Estimate travel times for walk/bike/ride from distance in km.
 */
export function estimateTravel(distanceKm: number) {
  return {
    walk: distanceKm <= 5 ? { minutes: Math.round(distanceKm / 0.083), costMin: 0, costMax: 0 } : null,
    bike: distanceKm <= 15 ? { minutes: Math.round(distanceKm / 0.25), costMin: 1, costMax: 2.5 } : null,
    ride: { minutes: Math.max(3, Math.round(distanceKm / 0.5)), costMin: Math.round(5 + distanceKm * 1.5), costMax: Math.round(8 + distanceKm * 2.5) },
  };
}

/**
 * Calculate haversine distance in km between two points.
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
