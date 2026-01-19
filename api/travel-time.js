import {
  bucketLatLng,
  cacheKeyFor,
  getBearerToken,
  getRequestIp,
  getSupabaseServerClients,
  json,
  parseNumber,
  readJsonBody,
  requireGoogleApiKey,
} from './routing/_utils.js';
import { fetchRoutesV2 } from './routing/_google.js';

const isRunningOnVercel = () => {
  const flag = process.env.VERCEL || process.env.VERCEL_ENV;
  return !!flag;
};

const computeTimeSlice = ({ nowMs, ttlSeconds }) => {
  const ttlMs = ttlSeconds * 1000;
  return Math.floor(nowMs / ttlMs);
};

const validatePoint = (point, name) => {
  const lat = parseNumber(point?.lat);
  const lng = parseNumber(point?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { ok: false, error: `Invalid ${name} lat/lng` };
  return { ok: true, lat, lng };
};

const minutesLabel = (seconds, suffix) => {
  const mins = Math.max(1, Math.round(Number(seconds) / 60));
  return `${mins} min ${suffix}`;
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

const approximateRoute = ({ origin, destination, mode }) => {
  const distanceMeters = haversineMeters(origin, destination);
  const km = distanceMeters / 1000;

  // Simple, privacy-safe fallback when Google Routes is not configured.
  // Tuned for city travel (London-ish) rather than motorways.
  if (mode === 'DRIVE') {
    const speedKmh = 22;
    const seconds = Math.max(60, Math.round((km / speedKmh) * 3600));
    return { ok: true, duration_seconds: seconds, distance_meters: distanceMeters, provider: 'approx' };
  }

  if (mode === 'BICYCLE') {
    const speedKmh = 16;
    const seconds = Math.max(60, Math.round((km / speedKmh) * 3600));
    return { ok: true, duration_seconds: seconds, distance_meters: distanceMeters, provider: 'approx' };
  }

  if (mode === 'WALK') {
    const speedKmh = 4.8;
    const seconds = Math.max(60, Math.round((km / speedKmh) * 3600));
    return { ok: true, duration_seconds: seconds, distance_meters: distanceMeters, provider: 'approx' };
  }

  return { ok: false };
};

// Server-side proxy for travel time.
// Uses the existing Google Routes integration and Supabase-backed caching when configured.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const requireAuth = isRunningOnVercel() || process.env.NODE_ENV === 'production';
  const accessToken = getBearerToken(req);
  if (requireAuth && !accessToken) {
    return json(res, 401, { error: 'Unauthorized' });
  }

  const body = (await readJsonBody(req)) || {};
  const originV = validatePoint(body.origin, 'origin');
  const destV = validatePoint(body.destination, 'destination');
  if (!originV.ok) return json(res, 400, { error: originV.error });
  if (!destV.ok) return json(res, 400, { error: destV.error });

  const origin = { lat: originV.lat, lng: originV.lng };
  const destination = { lat: destV.lat, lng: destV.lng };

  const { key: googleKey, error: googleErr } = requireGoogleApiKey();
  const useApproximate = !!googleErr;

  // Keep these fairly fresh for "real-time" cab/bike/foot display.
  const ttlSeconds = 120;
  const nowMs = Date.now();
  const timeSlice = computeTimeSlice({ nowMs, ttlSeconds });
  const expiresAt = new Date(nowMs + ttlSeconds * 1000).toISOString();
  const computedAt = new Date().toISOString();

  const originBucket = bucketLatLng(origin.lat, origin.lng, 2);
  const destBucket = bucketLatLng(destination.lat, destination.lng, 2);

  const modes = ['WALK', 'DRIVE', 'BICYCLE'];
  const cacheKeys = modes.map((mode) => ({
    mode,
    cache_key: cacheKeyFor({ originBucket, destBucket, mode, timeSlice }),
  }));

  const supa = getSupabaseServerClients();
  const serviceClient = supa?.serviceClient || null;
  const anonClient = supa?.anonClient || null;

  let authedUserId = null;
  if (accessToken && anonClient) {
    const { data, error } = await anonClient.auth.getUser(accessToken);
    if (error || !data?.user) {
      if (requireAuth) return json(res, 401, { error: 'Unauthorized' });
    } else {
      authedUserId = data.user.id;
    }
  } else if (requireAuth && !anonClient) {
    return json(res, 500, { error: 'Supabase server env not configured' });
  }

  // Optional: DB-backed IP rate limiting + caching.
  let cacheMap = new Map();
  if (serviceClient) {
    const ip = getRequestIp(req);
    try {
      const bucketKey = `travel_time:${ip || 'noip'}:${Math.floor(nowMs / 60000)}`;
      const { data: rl } = await serviceClient.rpc('check_routing_rate_limit', {
        p_bucket_key: bucketKey,
        p_user_id: authedUserId,
        p_ip: ip,
        p_window_seconds: 60,
        p_max_requests: 60,
      });

      const allowed = Array.isArray(rl) ? rl[0]?.allowed : rl?.allowed;
      if (allowed === false) {
        return json(res, 429, { error: 'Rate limit exceeded' });
      }
    } catch {
      // If the RPC isn't migrated yet, proceed without DB-backed rate limiting.
    }

    try {
      const { data: cachedRows } = await serviceClient
        .from('routing_cache')
        .select('cache_key, mode, duration_seconds, distance_meters, expires_at, provider')
        .in('cache_key', cacheKeys.map((k) => k.cache_key))
        .gt('expires_at', new Date().toISOString());

      cacheMap = new Map();
      (Array.isArray(cachedRows) ? cachedRows : []).forEach((r) => {
        cacheMap.set(r.cache_key, r);
      });
    } catch {
      // If the table isn't migrated yet, proceed without DB-backed caching.
    }
  }

  const results = {};
  const upserts = [];
  const trafficAware = String(process.env.GOOGLE_ROUTES_DRIVE_TRAFFIC_AWARE || '').toLowerCase() === 'true';

  for (const mode of modes) {
    const keyRow = cacheKeys.find((k) => k.mode === mode);
    const cached = keyRow ? cacheMap.get(keyRow.cache_key) : null;

    if (cached) {
      results[mode] = {
        duration_seconds: cached.duration_seconds,
        distance_meters: cached.distance_meters,
        provider: cached.provider,
      };
      continue;
    }

    if (useApproximate) {
      const approx = approximateRoute({ origin, destination, mode });
      if (!approx.ok) {
        results[mode] = null;
        continue;
      }

      results[mode] = {
        duration_seconds: approx.duration_seconds,
        distance_meters: approx.distance_meters,
        provider: approx.provider,
      };

      if (serviceClient && keyRow) {
        upserts.push({
          cache_key: keyRow.cache_key,
          origin_bucket: originBucket,
          dest_bucket: destBucket,
          mode,
          duration_seconds: approx.duration_seconds,
          distance_meters: approx.distance_meters,
          computed_at: computedAt,
          expires_at: expiresAt,
          provider: approx.provider,
        });
      }

      continue;
    }

    const route = await fetchRoutesV2({
      apiKey: googleKey,
      origin,
      destination,
      mode,
      trafficAware,
    });

    if (!route.ok) {
      results[mode] = null;
      continue;
    }

    results[mode] = {
      duration_seconds: route.duration_seconds,
      distance_meters: route.distance_meters,
      provider: route.provider,
    };

    if (serviceClient && keyRow) {
      upserts.push({
        cache_key: keyRow.cache_key,
        origin_bucket: originBucket,
        dest_bucket: destBucket,
        mode,
        duration_seconds: route.duration_seconds,
        distance_meters: route.distance_meters,
        computed_at: computedAt,
        expires_at: expiresAt,
        provider: route.provider,
      });
    }
  }

  if (serviceClient && upserts.length) {
    try {
      await serviceClient.from('routing_cache').upsert(upserts, { onConflict: 'cache_key' });
    } catch {
      // Ignore cache persistence failures.
    }
  }

  const walking = results.WALK
    ? {
        durationSeconds: results.WALK.duration_seconds,
        label: minutesLabel(results.WALK.duration_seconds, 'on foot'),
      }
    : null;

  const driving = results.DRIVE
    ? {
        durationSeconds: results.DRIVE.duration_seconds,
        label: minutesLabel(results.DRIVE.duration_seconds, 'by cab'),
      }
    : null;

  // We don't call Uber APIs; we use DRIVE as the best-available proxy ETA.
  const uber = driving
    ? {
        durationSeconds: driving.durationSeconds,
        label: minutesLabel(driving.durationSeconds, 'uber'),
      }
    : null;

  const bicycling = results.BICYCLE
    ? {
        durationSeconds: results.BICYCLE.duration_seconds,
        label: minutesLabel(results.BICYCLE.duration_seconds, 'by bike'),
      }
    : null;

  const candidates = [walking, driving, bicycling, uber].filter(Boolean);
  const fastest = candidates.length
    ? candidates.reduce((best, cur) => (cur.durationSeconds < best.durationSeconds ? cur : best))
    : null;

  return json(res, 200, {
    walking,
    driving,
    bicycling,
    uber,
    fastest,
    meta: useApproximate ? { provider: 'approx', reason: 'missing_google_maps_api_key' } : { provider: 'google' },
  });
}
