import { bucketLatLng, getAuthedUser, getBearerToken, getSupabaseServerClients, json, readJsonBody } from '../routing/_utils.js';
import { bestEffortRateLimit, minuteBucket } from '../_rateLimit.js';
import { getRequestIp } from '../routing/_utils.js';

const getViewerProfile = async ({ serviceClient, authUserId, email }) => {
  const { data, error } = await serviceClient
    .from('profiles')
    .select('id, email, auth_user_id, privacy_hide_proximity')
    .or(`id.eq.${authUserId},email.eq.${email}`)
    .maybeSingle();
  if (!error && data) return { profile: data };
  return { profile: null };
};

const upsertViewerPresence = async ({ serviceClient, authUser, coords, privacyHideProximity }) => {
  const nowIso = new Date().toISOString();
  // Expires 5 min from now — heartbeat should re-up before then
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const row = {
    user_id: authUser.id,
    status: privacyHideProximity ? 'hidden' : 'online',
    last_seen_at: nowIso,
    expires_at: expiresAt,
    metadata: { accuracy_m: coords.accuracy_m },
  };

  // Store location as PostGIS point if available and not hidden
  if (!privacyHideProximity && coords.lat != null && coords.lng != null) {
    // Use raw SQL via RPC or store in metadata — PostGIS point needs ST_MakePoint
    row.metadata = { ...row.metadata, lat: coords.lat, lng: coords.lng };
  }

  const { error } = await serviceClient
    .from('user_presence')
    .upsert(row, { onConflict: 'user_id' });

  return { ok: !error, error };
};

const upsertViewerPresenceLocation = async ({ serviceClient, authUser, coords, privacyHideProximity }) => {
  const row = {
    auth_user_id: authUser.id,
    lat: privacyHideProximity ? null : coords.lat,
    lng: privacyHideProximity ? null : coords.lng,
    accuracy_m: coords.accuracy_m,
    updated_at: new Date().toISOString(),
  };

  const { error } = await serviceClient
    .from('user_presence_locations')
    .upsert(row, { onConflict: 'auth_user_id' });

  return { ok: !error, error };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const { error: supaErr, anonClient, serviceClient } = getSupabaseServerClients();
  if (supaErr) return json(res, 500, { error: supaErr });

  const accessToken = getBearerToken(req);
  if (!accessToken) return json(res, 401, { error: 'Missing Authorization bearer token' });

  const { user: authUser, error: authErr } = await getAuthedUser({ anonClient, accessToken });
  if (authErr || !authUser?.id || !authUser?.email) return json(res, 401, { error: 'Invalid auth token' });

  // Best-effort DB-backed rate limiting to prevent hot loops.
  const ip = getRequestIp(req);
  const rl = await bestEffortRateLimit({
    serviceClient,
    bucketKey: `presence:${authUser.id}:${ip || 'noip'}:${minuteBucket()}`,
    userId: authUser.id,
    ip,
    windowSeconds: 60,
    maxRequests: 120,
  });

  if (rl.allowed === false) {
    return json(res, 429, { error: 'Rate limit exceeded', remaining: rl.remaining ?? 0 });
  }

  const body = (await readJsonBody(req)) || {};
  if (!body || typeof body !== 'object') {
    return json(res, 400, { error: 'Invalid JSON body' });
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const accuracy = body.accuracy == null ? null : Number(body.accuracy);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return json(res, 400, { error: 'lat/lng required' });
  }

  const { profile } = await getViewerProfile({ serviceClient, authUserId: authUser.id, email: authUser.email });
  const privacyHideProximity = !!profile?.privacy_hide_proximity;

  const accuracy_m = Number.isFinite(accuracy) ? Math.round(accuracy) : null;

  // Store precise coords in private table (RLS-protected) for PostGIS/RPC queries.
  // Keep bucketed coords in public."User" for compatibility and reduced leakage.
  // bucketLatLng returns a string "lat,lng" — parse it back to numbers.
  const bucketedStr = bucketLatLng(lat, lng, 3);
  const [bLat, bLng] = bucketedStr.split(',').map(Number);
  const bucketedCoords = {
    lat: bLat,
    lng: bLng,
    accuracy_m,
  };

  const preciseCoords = {
    lat,
    lng,
    accuracy_m,
  };

  await upsertViewerPresenceLocation({
    serviceClient,
    authUser,
    coords: preciseCoords,
    privacyHideProximity,
  });

  const upsert = await upsertViewerPresence({ serviceClient, authUser, coords: bucketedCoords, privacyHideProximity });
  if (!upsert.ok) return json(res, 500, { error: 'Failed to update presence' });
  return json(res, 200, { ok: true, privacy_hide_proximity: privacyHideProximity });
}
