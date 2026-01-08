import { json } from './shopify/_utils.js';

const parseNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

// Minimal stub endpoint for the Profiles Grid feature.
// In production, this would come from the viewer's persisted location / device / session.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  // Optional testing override: /api/viewer-location?lat=...&lng=...
  try {
    const url = new URL(req.url || '', 'http://localhost');
    const lat = parseNumber(url.searchParams.get('lat'));
    const lng = parseNumber(url.searchParams.get('lng'));
    if (lat !== null && lng !== null) return json(res, 200, { geoLat: lat, geoLng: lng });
  } catch {
    // ignore
  }

  // Koh Samui-ish default (matches the feature prompt context).
  return json(res, 200, { geoLat: 9.52, geoLng: 100.05 });
}
