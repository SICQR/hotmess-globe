import { getRequestIp, json } from './routing/_utils.js';

const parseNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * GET /api/viewer-location
 *
 * Returns the viewer's approximate lat/lng so proximity-based features
 * (Profiles Grid, Nearby, Globe auto-zoom) work without a browser GPS prompt.
 *
 * Resolution order:
 *   1. Explicit ?lat=&lng= query params (testing override, internal only)
 *   2. Vercel edge geo headers (x-vercel-ip-latitude / x-vercel-ip-longitude)
 *      — injected automatically on every Vercel deployment, zero cost.
 *   3. Cloudflare CF-IPCountry / lat-lon headers if behind CF
 *   4. Null fallback — client falls back to device GPS / default view
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  // 1. Explicit override (only useful in dev/testing)
  try {
    const url = new URL(req.url || '', 'http://localhost');
    const lat = parseNumber(url.searchParams.get('lat'));
    const lng = parseNumber(url.searchParams.get('lng'));
    if (lat !== null && lng !== null) {
      return json(res, 200, { geoLat: lat, geoLng: lng, source: 'query' });
    }
  } catch {
    // ignore malformed URL
  }

  // 2. Vercel edge geo headers — present on all Vercel deployments
  const vercelLat = parseNumber(req.headers['x-vercel-ip-latitude']);
  const vercelLng = parseNumber(req.headers['x-vercel-ip-longitude']);
  if (vercelLat !== null && vercelLng !== null) {
    return json(res, 200, { geoLat: vercelLat, geoLng: vercelLng, source: 'vercel-edge' });
  }

  // 3. Cloudflare geo headers (if traffic routes through CF)
  const cfLat = parseNumber(req.headers['cf-iplat'] ?? req.headers['cf-iplatitude']);
  const cfLng = parseNumber(req.headers['cf-iplon'] ?? req.headers['cf-iplongitude']);
  if (cfLat !== null && cfLng !== null) {
    return json(res, 200, { geoLat: cfLat, geoLng: cfLng, source: 'cloudflare' });
  }

  // 4. No geo data available — return null so the client uses its own fallback
  return json(res, 200, { geoLat: null, geoLng: null, source: 'none' });
}
