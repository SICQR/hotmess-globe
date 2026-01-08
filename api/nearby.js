import {
  clampInt,
  getAuthedUser,
  getBearerToken,
  getRequestIp,
  getSupabaseServerClients,
  json,
  normalizeMode,
  parseNumber,
  requireGoogleApiKey,
  bucketLatLng,
  cacheKeyFor,
} from './routing/_utils.js';
import { fetchDistanceMatrix } from './routing/_google.js';

const USER_TABLES = ['User', 'users'];

const isMissingColumnError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('column') && message.includes('does not exist');
};

const isMissingTableError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.status === 404 ||
    message.includes('schema cache') ||
    message.includes('could not find the table') ||
    message.includes('does not exist')
  );
};

const fetchProfilesForCandidateIds = async ({ serviceClient, candidateUserIds }) => {
  const ids = Array.from(
    new Set((Array.isArray(candidateUserIds) ? candidateUserIds : []).filter(Boolean).map((v) => String(v)))
  );
  if (!ids.length) return { table: null, map: new Map() };

  for (const table of USER_TABLES) {
    const idColumn = table === 'users' ? 'id' : 'auth_user_id';

    // Use select('*') for schema-tolerance; only a safe subset is returned to the client.
    const { data, error } = await serviceClient.from(table).select('*').in(idColumn, ids);
    if (error) {
      if (isMissingTableError(error)) continue;
      if (isMissingColumnError(error) && idColumn !== 'id') {
        // Some legacy schemas might key by id.
        const retry = await serviceClient.from(table).select('*').in('id', ids);
        if (!retry.error) {
          const map = new Map(
            (Array.isArray(retry.data) ? retry.data : []).map((row) => [String(row?.auth_user_id || row?.id), row])
          );
          return { table, map };
        }
      }
      continue;
    }

    const map = new Map(
      (Array.isArray(data) ? data : []).map((row) => [String(row?.auth_user_id || row?.id), row])
    );
    return { table, map };
  }

  return { table: null, map: new Map() };
};

const toPublicProfile = (row) => {
  if (!row || typeof row !== 'object') return null;
  return {
    email: row.email ?? null,
    full_name: row.full_name ?? null,
    avatar_url: row.avatar_url ?? null,
    bio: row.bio ?? null,
    preferred_vibes: row.preferred_vibes ?? null,
    xp: row.xp ?? null,
    availability_status: row.availability_status ?? null,
    updated_date: row.updated_date ?? null,
    updated_at: row.updated_at ?? null,
    city: row.city ?? null,
  };
};

const getViewerProfile = async ({ serviceClient, authUserId, email }) => {
  for (const table of USER_TABLES) {
    const { data, error } = await serviceClient
      .from(table)
      .select('id, email, auth_user_id, subscription_tier, default_travel_mode, privacy_hide_proximity')
      .or(`auth_user_id.eq.${authUserId},email.eq.${email}`)
      .maybeSingle();
    if (!error && data) return { table, profile: data };
  }
  return { table: 'User', profile: null };
};

const upsertViewerPresenceLocation = async ({ serviceClient, authUser, coords, privacyHideProximity }) => {
  const row = {
    auth_user_id: authUser.id,
    lat: privacyHideProximity ? null : coords?.lat ?? null,
    lng: privacyHideProximity ? null : coords?.lng ?? null,
    accuracy_m: coords?.accuracy_m ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await serviceClient
    .from('user_presence_locations')
    .upsert(row, { onConflict: 'auth_user_id' });

  return { ok: !error, error };
};

const upsertViewerLocation = async ({ serviceClient, authUser, coords, privacyHideProximity }) => {
  const nowIso = new Date().toISOString();
  const row = {
    email: authUser.email,
    auth_user_id: authUser.id,
    is_online: !privacyHideProximity,
    last_loc_ts: nowIso,
    loc_accuracy_m: coords?.accuracy_m ?? null,
    // keep legacy columns for any existing code paths
    updated_date: nowIso,
  };

  if (privacyHideProximity) {
    row.last_lat = null;
    row.last_lng = null;
    row.lat = null;
    row.lng = null;
  } else {
    row.last_lat = coords?.lat ?? null;
    row.last_lng = coords?.lng ?? null;
    row.lat = coords?.lat ?? null;
    row.lng = coords?.lng ?? null;
  }

  for (const table of USER_TABLES) {
    const { error } = await serviceClient.from(table).upsert(row, { onConflict: 'email' });
    if (!error) return { ok: true, table };
  }

  return { ok: false, table: 'User' };
};

const computeTimeSlice = ({ nowMs, ttlSeconds }) => {
  const ttlMs = ttlSeconds * 1000;
  return Math.floor(nowMs / ttlMs);
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const { error: supaErr, anonClient, serviceClient } = getSupabaseServerClients();
  if (supaErr) return json(res, 500, { error: supaErr });

  const accessToken = getBearerToken(req);
  if (!accessToken) return json(res, 401, { error: 'Missing Authorization bearer token' });

  const { user: authUser, error: authErr } = await getAuthedUser({ anonClient, accessToken });
  if (authErr || !authUser?.id || !authUser?.email) return json(res, 401, { error: 'Invalid auth token' });

  const lat = parseNumber(req.query?.lat);
  const lng = parseNumber(req.query?.lng);
  const accuracy_m = clampInt(req.query?.accuracy_m, 0, 5000, null);
  const approximate = String(req.query?.approximate || '').toLowerCase() === 'true';

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return json(res, 400, { error: 'Missing lat/lng query params' });
  }

  const storedLatLng = approximate
    ? (() => {
        const bucket = bucketLatLng(lat, lng, 2);
        const [bLat, bLng] = bucket.split(',').map(Number);
        return { lat: bLat, lng: bLng };
      })()
    : { lat, lng };

  const { profile } = await getViewerProfile({ serviceClient, authUserId: authUser.id, email: authUser.email });
  const privacyHideProximity = !!profile?.privacy_hide_proximity;

  // Store precise-ish coords in the private presence table (not exposed via broad User SELECT).
  // Keep the legacy public."User" columns updated with the bucketed version for compatibility.
  await upsertViewerPresenceLocation({
    serviceClient,
    authUser,
    coords: { lat, lng, accuracy_m },
    privacyHideProximity,
  });

  await upsertViewerLocation({
    serviceClient,
    authUser,
    coords: { ...storedLatLng, accuracy_m },
    privacyHideProximity,
  });

  if (privacyHideProximity) {
    // Viewer opted out: act offline.
    return json(res, 200, { candidates: [] });
  }

  const tier = String(profile?.subscription_tier || authUser.user_metadata?.subscription_tier || 'FREE').toUpperCase();
  const isPaid = tier === 'PAID';

  const mode = normalizeMode(profile?.default_travel_mode || authUser.user_metadata?.default_travel_mode || 'WALK') || 'WALK';

  const radius_m = clampInt(req.query?.radius_m, 500, 50000, 10000);
  const limit = clampInt(req.query?.limit, 1, 100, 40);

  let rows = null;
  let nearbyErr = null;

  // Prefer the secure PostGIS RPC (uses private presence table + bucketed output).
  {
    const result = await serviceClient.rpc('nearby_candidates_secure', {
      p_viewer_lat: storedLatLng.lat,
      p_viewer_lng: storedLatLng.lng,
      p_radius_m: radius_m,
      p_limit: limit,
      p_exclude_user_id: authUser.id,
      p_max_age_seconds: 900,
    });
    rows = result?.data ?? null;
    nearbyErr = result?.error ?? null;
  }

  // Back-compat fallback if the secure function isn't deployed yet.
  if (nearbyErr) {
    const msg = String(nearbyErr?.message || '').toLowerCase();
    const looksLikeMissingFn = msg.includes('function') && (msg.includes('nearby_candidates_secure') || msg.includes('does not exist'));

    if (looksLikeMissingFn) {
      const fallback = await serviceClient.rpc('nearby_candidates', {
        p_viewer_lat: storedLatLng.lat,
        p_viewer_lng: storedLatLng.lng,
        p_radius_m: radius_m,
        p_limit: limit,
        p_exclude_user_id: authUser.id,
      });
      rows = fallback?.data ?? null;
      nearbyErr = fallback?.error ?? null;
    }
  }

  if (nearbyErr) {
    return json(res, 500, { error: 'Failed to fetch nearby candidates', details: nearbyErr.message });
  }

  const candidates = Array.isArray(rows) ? rows : [];

  const { map: profileMap } = await fetchProfilesForCandidateIds({
    serviceClient,
    candidateUserIds: candidates.map((c) => c.user_id),
  });

  // FREE users: return distance only.
  if (!isPaid) {
    return json(res, 200, {
      candidates: candidates.map((c) => ({
        user_id: c.user_id,
        profile: toPublicProfile(profileMap.get(String(c.user_id))),
        last_lat: c.last_lat,
        last_lng: c.last_lng,
        distance_meters: c.distance_meters,
        eta_seconds: null,
        eta_mode: null,
      })),
    });
  }

  const { key: googleKey, error: googleErr } = requireGoogleApiKey();
  if (googleErr) {
    // Paid user: fall back to distance.
    return json(res, 200, {
      candidates: candidates.map((c) => ({
        user_id: c.user_id,
        profile: toPublicProfile(profileMap.get(String(c.user_id))),
        last_lat: c.last_lat,
        last_lng: c.last_lng,
        distance_meters: c.distance_meters,
        eta_seconds: null,
        eta_mode: mode,
      })),
      warnings: ['GOOGLE_MAPS_API_KEY missing; returning distance only'],
    });
  }

  // Paid grid: compute ETAs for top-N only.
  const topN = clampInt(req.query?.eta_top_n, 5, 60, 25);
  const etaTtlSeconds = clampInt(req.query?.eta_ttl_seconds, 120, 600, 300);

  const nowMs = Date.now();
  const timeSlice = computeTimeSlice({ nowMs, ttlSeconds: etaTtlSeconds });
  const originBucket = bucketLatLng(storedLatLng.lat, storedLatLng.lng, 2);

  const limited = candidates.slice(0, topN);

  const cachePairs = limited.map((c) => {
    const destBucket = bucketLatLng(c.last_lat, c.last_lng, 2);
    const cache_key = cacheKeyFor({ originBucket, destBucket, mode, timeSlice });
    return { c, destBucket, cache_key };
  });

  const cacheKeys = cachePairs.map((p) => p.cache_key);
  const { data: cachedRows } = await serviceClient
    .from('routing_cache')
    .select('cache_key, duration_seconds, distance_meters, expires_at')
    .in('cache_key', cacheKeys)
    .gt('expires_at', new Date().toISOString());

  const cacheMap = new Map();
  (Array.isArray(cachedRows) ? cachedRows : []).forEach((r) => {
    cacheMap.set(r.cache_key, r);
  });

  const missing = cachePairs.filter((p) => !cacheMap.has(p.cache_key));

  if (missing.length) {
    // Rate limit per user+IP (best-effort)
    const ip = getRequestIp(req);
    const bucketKey = `nearby:${authUser.id}:${ip || 'noip'}:${Math.floor(nowMs / 60000)}`;
    const { data: rl } = await serviceClient.rpc('check_routing_rate_limit', {
      p_bucket_key: bucketKey,
      p_user_id: authUser.id,
      p_ip: ip,
      p_window_seconds: 60,
      p_max_requests: 30,
    });

    const allowed = Array.isArray(rl) ? rl[0]?.allowed : rl?.allowed;
    if (allowed === false) {
      // Fall back to distance only.
      return json(res, 200, {
        candidates: candidates.map((c) => ({
          user_id: c.user_id,
          profile: toPublicProfile(profileMap.get(String(c.user_id))),
          last_lat: c.last_lat,
          last_lng: c.last_lng,
          distance_meters: c.distance_meters,
          eta_seconds: null,
          eta_mode: mode,
        })),
      });
    }

    const dm = await fetchDistanceMatrix({
      apiKey: googleKey,
      origin: storedLatLng,
      destinations: missing.map((m) => ({ lat: m.c.last_lat, lng: m.c.last_lng })),
      mode,
    });

    if (dm.ok) {
      const expiresAt = new Date(nowMs + etaTtlSeconds * 1000).toISOString();
      const upserts = [];

      dm.results.forEach((r, idx) => {
        const item = missing[idx];
        if (!item || !r?.ok) return;

        const cacheRow = {
          cache_key: item.cache_key,
          origin_bucket: originBucket,
          dest_bucket: item.destBucket,
          mode,
          duration_seconds: r.duration_seconds,
          distance_meters: r.distance_meters,
          computed_at: new Date().toISOString(),
          expires_at: expiresAt,
          provider: dm.provider,
        };

        cacheMap.set(item.cache_key, cacheRow);
        upserts.push(cacheRow);
      });

      if (upserts.length) {
        await serviceClient.from('routing_cache').upsert(upserts, { onConflict: 'cache_key' });
      }
    }
  }

  const withEta = candidates.map((c) => {
    const destBucket = bucketLatLng(c.last_lat, c.last_lng, 2);
    const cache_key = cacheKeyFor({ originBucket, destBucket, mode, timeSlice });
    const cached = cacheMap.get(cache_key);

    return {
      user_id: c.user_id,
      profile: toPublicProfile(profileMap.get(String(c.user_id))),
      last_lat: c.last_lat,
      last_lng: c.last_lng,
      distance_meters: c.distance_meters,
      eta_seconds: cached?.duration_seconds ?? null,
      eta_mode: cached?.duration_seconds ? mode : null,
    };
  });

  // Paid sorting: ETA when available, else distance.
  withEta.sort((a, b) => {
    const aEta = Number.isFinite(a.eta_seconds) ? a.eta_seconds : Number.POSITIVE_INFINITY;
    const bEta = Number.isFinite(b.eta_seconds) ? b.eta_seconds : Number.POSITIVE_INFINITY;
    if (aEta !== bEta) return aEta - bEta;
    return a.distance_meters - b.distance_meters;
  });

  return json(res, 200, { candidates: withEta });
}
