import {
  bucketLatLng,
  cacheKeyFor,
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
import { fetchRoutesV2 } from './_google.js';

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

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return json(res, 405, { error: 'Method not allowed' });
    }

    const { error: supaErr, anonClient, serviceClient } = getSupabaseServerClients();
    if (supaErr) return json(res, 500, { error: supaErr });

    const accessToken = getBearerToken(req);
    if (!accessToken) return json(res, 401, { error: 'Missing Authorization bearer token' });

    const { user: authUser, error: authErr } = await getAuthedUser({ anonClient, accessToken });
    if (authErr || !authUser?.id) return json(res, 401, { error: 'Invalid auth token' });

    const { key: googleKey, error: googleErr } = requireGoogleApiKey();
    if (googleErr) return json(res, 500, { error: googleErr });

    const body = (await readJsonBody(req)) || {};

  const originV = validatePoint(body.origin, 'origin');
  const destV = validatePoint(body.destination, 'destination');
  if (!originV.ok) return json(res, 400, { error: originV.error });
  if (!destV.ok) return json(res, 400, { error: destV.error });

  const origin = { lat: originV.lat, lng: originV.lng };
  const destination = { lat: destV.lat, lng: destV.lng };

  const ttlSeconds = clampInt(body.ttl_seconds, 60, 300, 120);
  const nowMs = Date.now();
  const timeSlice = computeTimeSlice({ nowMs, ttlSeconds });

  const originBucket = bucketLatLng(origin.lat, origin.lng, 2);
  const destBucket = bucketLatLng(destination.lat, destination.lng, 2);

  // Rate limits: per-user + per-IP
  const ip = getRequestIp(req);
  const bucketKey = `etas:${authUser.id}:${ip || 'noip'}:${Math.floor(nowMs / 60000)}`;
  const { data: rl } = await serviceClient.rpc('check_routing_rate_limit', {
    p_bucket_key: bucketKey,
    p_user_id: authUser.id,
    p_ip: ip,
    p_window_seconds: 60,
    p_max_requests: 20,
  });

  const allowed = Array.isArray(rl) ? rl[0]?.allowed : rl?.allowed;
  if (allowed === false) {
    return json(res, 429, { error: 'Rate limit exceeded' });
  }

    const trafficAware = String(process.env.GOOGLE_ROUTES_DRIVE_TRAFFIC_AWARE || '').toLowerCase() === 'true';

    const requestedModes = Array.isArray(body.modes) ? body.modes : null;
    const normalized = (requestedModes || ['WALK', 'TRANSIT', 'DRIVE'])
      .map((m) => normalizeMode(m))
      .filter(Boolean);

    const modes = Array.from(new Set(normalized)).slice(0, 5);
  const cacheKeys = modes.map((mode) => ({
    mode,
    cache_key: cacheKeyFor({ originBucket, destBucket, mode, timeSlice }),
  }));

  const { data: cachedRows } = await serviceClient
    .from('routing_cache')
    .select('cache_key, mode, duration_seconds, distance_meters, expires_at, provider')
    .in('cache_key', cacheKeys.map((k) => k.cache_key))
    .gt('expires_at', new Date().toISOString());

  const cacheMap = new Map();
  (Array.isArray(cachedRows) ? cachedRows : []).forEach((r) => {
    cacheMap.set(r.cache_key, r);
  });

  const expiresAt = new Date(nowMs + ttlSeconds * 1000).toISOString();
  const computedAt = new Date().toISOString();

  const results = {};
  const upserts = [];

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
      ...(route.duration_in_traffic_seconds
        ? { duration_in_traffic_seconds: route.duration_in_traffic_seconds }
        : {}),
      provider: route.provider,
    };

    if (keyRow) {
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

  if (upserts.length) {
    await serviceClient.from('routing_cache').upsert(upserts, { onConflict: 'cache_key' });
  }

    const response = {
      walk: results.WALK ? { ...results.WALK } : null,
      transit: results.TRANSIT ? { ...results.TRANSIT } : null,
      drive: results.DRIVE ? { ...results.DRIVE } : null,
      ...(results.BICYCLE ? { bicycle: { ...results.BICYCLE } } : {}),
      ...(results.TWO_WHEELER ? { two_wheeler: { ...results.TWO_WHEELER } } : {}),
    };

    return json(res, 200, response);
  } catch (error) {
    return json(res, 500, { error: error?.message || 'ETA handler failed' });
  }
}
