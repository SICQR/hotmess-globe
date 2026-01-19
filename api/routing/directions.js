import {
  clampInt,
  getAuthedUser,
  getBearerToken,
  getRequestIp,
  getSupabaseServerClients,
  json,
  normalizeMode,
  parseNumber,
  readJsonBody,
  requireGoogleApiKey,
} from './_utils.js';
import { bestEffortRateLimit, minuteBucket } from '../_rateLimit.js';

const importGoogle = async () => {
  // In local dev, Vite's middleware cache-busts the handler module but not its
  // transitive imports. Cache-bust _google.js here so edits apply without restart.
  const isDev =
    String(process.env.NODE_ENV || '').toLowerCase() === 'development' ||
    String(process.env.VITE_USER_NODE_ENV || '').toLowerCase() === 'development';

  if (isDev) {
    const url = new URL('./_google.js', import.meta.url);
    const mod = await import(`${url.href}?t=${Date.now()}`);
    return mod;
  }

  return import('./_google.js');
};

const validatePoint = (point, name) => {
  const lat = parseNumber(point?.lat);
  const lng = parseNumber(point?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { ok: false, error: `Invalid ${name} lat/lng` };
  return { ok: true, lat, lng };
};

const haversineMeters = (a, b) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Math.round(R * c);
};

const approximateDurationSeconds = ({ origin, destination, mode }) => {
  const distanceMeters = haversineMeters(origin, destination);
  const km = distanceMeters / 1000;

  if (mode === 'DRIVE') {
    const speedKmh = 22;
    return { distanceMeters, seconds: Math.max(60, Math.round((km / speedKmh) * 3600)) };
  }

  if (mode === 'BICYCLE') {
    const speedKmh = 16;
    return { distanceMeters, seconds: Math.max(60, Math.round((km / speedKmh) * 3600)) };
  }

  if (mode === 'WALK') {
    const speedKmh = 4.8;
    return { distanceMeters, seconds: Math.max(60, Math.round((km / speedKmh) * 3600)) };
  }

  return { distanceMeters, seconds: null };
};

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return json(res, 405, { error: 'Method not allowed' });
    }

    const { error: supaErr, anonClient, serviceClient } = getSupabaseServerClients();
    if (supaErr || !anonClient) return json(res, 500, { error: supaErr || 'Supabase anon client unavailable' });

    const accessToken = getBearerToken(req);
    if (!accessToken) return json(res, 401, { error: 'Missing Authorization bearer token' });

    const { user: authUser, error: authErr } = await getAuthedUser({ anonClient, accessToken });
    if (authErr || !authUser?.id) return json(res, 401, { error: 'Invalid auth token' });

    const body = (await readJsonBody(req)) || {};

    // By default, keep users in-app by returning an approximate route when Google fails.
    // Opt into strict failures for debugging.
    const strict =
      body?.strict === true ||
      String(process.env.ROUTING_DIRECTIONS_STRICT || '').toLowerCase() === 'true';

    const originV = validatePoint(body.origin, 'origin');
    const destV = validatePoint(body.destination, 'destination');
    if (!originV.ok) return json(res, 400, { error: originV.error });
    if (!destV.ok) return json(res, 400, { error: destV.error });

    const origin = { lat: originV.lat, lng: originV.lng };
    const destination = { lat: destV.lat, lng: destV.lng };

    // Keep this quite strict; directions are heavier than ETAs.
    const ttlSeconds = clampInt(body.ttl_seconds, 30, 180, 90);

    const rawMode = normalizeMode(body.mode);
    const mode = rawMode === 'TWO_WHEELER' ? 'DRIVE' : rawMode; // in-app we treat 2-wheeler as drive for now
    if (!mode || !['WALK', 'BICYCLE', 'DRIVE', 'TRANSIT'].includes(mode)) {
      return json(res, 400, { error: 'Invalid mode' });
    }

    // Rate limits: per-user + per-IP (best-effort).
    // If service role isn't configured (common in local dev), skip DB-backed rate limiting.
    {
      const ip = getRequestIp(req);
      const bucketKey = `directions:${authUser.id}:${ip || 'noip'}:${minuteBucket()}`;
      const rl = await bestEffortRateLimit({
        serviceClient,
        bucketKey,
        userId: authUser.id,
        ip,
        windowSeconds: 60,
        maxRequests: 10,
      });

      if (rl.allowed === false) {
        return json(res, 429, { error: 'Rate limit exceeded', remaining: rl.remaining ?? 0 });
      }
    }

    const { key: googleKey, error: googleErr } = requireGoogleApiKey();
    const trafficAware = String(process.env.GOOGLE_ROUTES_DRIVE_TRAFFIC_AWARE || '').toLowerCase() === 'true';

    // If Google isn't configured, return a straight-line fallback route so we can still keep users in-app.
    if (googleErr || !googleKey) {
      const approx = approximateDurationSeconds({ origin, destination, mode });
      const seconds = approx.seconds;
      return json(res, 200, {
        mode,
        origin,
        destination,
        duration_seconds: seconds,
        distance_meters: approx.distanceMeters,
        provider: 'approx',
        polyline: {
          encoded: null,
          points: [origin, destination],
        },
        steps: [],
        ttl_seconds: ttlSeconds,
      });
    }

    const { fetchRoutesV2Directions } = await importGoogle();

    const route = await fetchRoutesV2Directions({
      apiKey: googleKey,
      origin,
      destination,
      mode,
      trafficAware,
    });

    if (!route.ok) {
      if (strict) {
        return json(res, 502, { error: route.error || 'Directions request failed', details: route.details || null });
      }

      const approx = approximateDurationSeconds({ origin, destination, mode });
      return json(res, 200, {
        mode,
        origin,
        destination,
        duration_seconds: approx.seconds,
        distance_meters: approx.distanceMeters,
        provider: 'approx',
        polyline: {
          encoded: null,
          points: [origin, destination],
        },
        steps: [],
        ttl_seconds: ttlSeconds,
        warning: {
          code: 'google_directions_unavailable',
          message: route.error || 'Directions request failed',
          details: route.details || null,
        },
      });
    }

    return json(res, 200, {
      mode,
      origin,
      destination,
      duration_seconds: route.duration_seconds,
      distance_meters: route.distance_meters,
      provider: route.provider,
      polyline: {
        encoded: route.encoded_polyline || null,
        points: null,
      },
      steps: route.steps || [],
      ttl_seconds: ttlSeconds,
    });
  } catch (error) {
    return json(res, 500, { error: error?.message || 'Directions handler failed' });
  }
}
