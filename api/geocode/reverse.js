/**
 * POST /api/geocode/reverse
 *
 * Server-side proxy for Google Maps Geocoding (reverse direction).
 * Body: { lat: number, lng: number }
 *
 * Why this exists:
 *   The frontend used to call maps.googleapis.com directly. After CSP #260
 *   unblocked the request, Google rejected it with "API keys with referer
 *   restrictions cannot be used with this API" — the Geocoding REST API
 *   doesn't accept referer-restricted keys from browser-context calls.
 *   So we move the call server-side, where the key is never exposed and
 *   no Referer is required.
 *
 * Env required:
 *   GOOGLE_MAPS_API_KEY        (server-side key — preferred; no referer
 *                               restriction, or IP-restricted to Vercel
 *                               egress IPs)
 *   VITE_GOOGLE_MAPS_API_KEY   (legacy fallback; will work as long as the
 *                               key isn't referer-restricted)
 *
 * Returns:
 *   200 { city, neighborhood, full_address, area }
 *   400 { error: 'invalid_coordinates' }
 *   503 { error: 'GOOGLE_MAPS_API_KEY not configured' }
 *   502 { error: 'google_unreachable' | 'google_rejected' }
 */

function pickComponent(addressComponents, types) {
  for (const t of types) {
    const match = addressComponents.find((c) => c.types.includes(t));
    if (match) return match.long_name;
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === 'your_google_maps_key') {
    return res.status(503).json({ error: 'GOOGLE_MAPS_API_KEY not configured' });
  }

  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ error: 'invalid_coordinates' });
  }

  // result_type filter narrows the response and reduces quota burn.
  // Same set of types the original useGPS.ts call used.
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json` +
    `?latlng=${lat},${lng}` +
    `&result_type=neighborhood|sublocality|locality` +
    `&key=${encodeURIComponent(apiKey)}`;

  let data;
  try {
    const r = await fetch(url);
    data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(502).json({
        error: 'google_unreachable',
        status: r.status,
        google_status: data?.status,
      });
    }
  } catch (e) {
    return res.status(502).json({ error: 'google_unreachable', detail: e.message });
  }

  if (data?.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
    return res.status(200).json({
      city: null,
      neighborhood: null,
      full_address: null,
      area: null,
      google_status: data?.status,
    });
  }

  // Pick the most descriptive result for "area"
  const result =
    data.results.find((r) => r.types.includes('neighborhood')) ||
    data.results.find((r) => r.types.includes('sublocality')) ||
    data.results.find((r) => r.types.includes('locality')) ||
    data.results[0];

  const components = result.address_components || [];
  const neighborhood = pickComponent(components, ['neighborhood', 'sublocality_level_1', 'sublocality']);
  const city = pickComponent(components, ['locality', 'postal_town', 'administrative_area_level_2']);
  const area =
    neighborhood ||
    city ||
    (result.formatted_address ? result.formatted_address.split(',')[0] : null);

  return res.status(200).json({
    city,
    neighborhood,
    full_address: result.formatted_address || null,
    area,
  });
}
