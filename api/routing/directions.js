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
  requireMapboxToken,
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

const importMapbox = () => import('./_mapbox.js');

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

    // TRANSIT: served by TfL Journey Planner (free, London tube/bus/overground/
    // DLR/Elizabeth line/night-bus). transit_mode picks the preset: 'night'
    // biases to night buses for the late-night product framing; default day
    // routing otherwise. No client key — TfL works keyless at low volume, and
    // TFL_APP_KEY (if set) only lifts the anonymous rate limit.
    if (mode === 'TRANSIT') {
      const transitMode = String(body.transit_mode || '').toLowerCase() === 'night' ? 'night' : 'transit';
      const { fetchTflJourney } = await import('./_tfl.js');
      const tfl = await fetchTflJourney({
        origin,
        destination,
        mode: transitMode,
        appKey: process.env.TFL_APP_KEY || null,
      });

      if (!tfl?.ok) {
        // Keep the user in-app: surface a structured unavailability response so
        // the UI can still offer the Citymapper / TfL external fallback.
        return json(res, 200, {
          mode,
          origin,
          destination,
          duration_seconds: null,
          distance_meters: null,
          provider: 'TRANSIT_UNAVAILABLE',
          polyline: { encoded: null, points: null },
          steps: [],
          ttl_seconds: ttlSeconds,
          warning: {
            code: 'transit_unavailable',
            message: tfl?.error || 'Live transit directions are not available right now. Use Citymapper or TfL.',
            details: tfl?.details || null,
          },
        });
      }

      return json(res, 200, {
        mode,
        transit_mode: transitMode,
        origin,
        destination,
        duration_seconds: tfl.duration_seconds,
        distance_meters: tfl.distance_meters,
        provider: tfl.provider,
        polyline: { encoded: null, points: null },
        steps: tfl.steps || [],
        ttl_seconds: ttlSeconds,
      });
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

    const { key: googleKey } = requireGoogleApiKey();
    const { key: mapboxToken } = requireMapboxToken();
    const trafficAware = String(process.env.GOOGLE_ROUTES_DRIVE_TRAFFIC_AWARE || '').toLowerCase() === 'true';

    let route = null;

    // Try Google first (if key is configured)
    if (googleKey) {
      const { fetchRoutesV2Directions } = await importGoogle();
      route = await fetchRoutesV2Directions({ apiKey: googleKey, origin, destination, mode, trafficAware });
    }

    // Fall back to Mapbox if Google not configured or failed
    if ((!route || !route.ok) && mapboxToken) {
      const { fetchMapboxDirections } = await importMapbox();
      route = await fetchMapboxDirections({ token: mapboxToken, origin, destination, mode });
    }

    // Both providers unavailable or failed — return approximate fallback to keep user in-app
    if (!route?.ok) {
      if (strict && (googleKey || mapboxToken)) {
        return json(res, 502, {
          error: route?.error || 'Directions request failed',
          details: route?.details || null,
        });
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
          code: 'directions_unavailable',
          message: route?.error || 'Directions unavailable',
          details: route?.details || null,
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
