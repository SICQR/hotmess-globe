import { bucketLatLng, getAuthedUser, getBearerToken, getSupabaseServerClients, json, readJsonBody } from '../routing/_utils.js';
import { bestEffortRateLimit, minuteBucket } from '../_rateLimit.js';
import { getRequestIp } from '../routing/_utils.js';

const USER_TABLES = ['User', 'users'];

const getViewerProfile = async ({ serviceClient, authUserId, email }) => {
  for (const table of USER_TABLES) {
    const { data, error } = await serviceClient
      .from(table)
      .select('id, email, auth_user_id, privacy_hide_proximity')
      .or(`auth_user_id.eq.${authUserId},email.eq.${email}`)
      .maybeSingle();
    if (!error && data) return { table, profile: data };
  }
  return { table: 'User', profile: null };
};

const upsertViewerPresence = async ({ serviceClient, authUser, coords, privacyHideProximity }) => {
  const nowIso = new Date().toISOString();

  const row = {
    email: authUser.email,
    auth_user_id: authUser.id,
    is_online: !privacyHideProximity,
    last_loc_ts: nowIso,
    loc_accuracy_m: coords.accuracy_m,
    // keep legacy columns for any existing code paths
    updated_date: nowIso,
  };

  if (privacyHideProximity) {
    row.last_lat = null;
    row.last_lng = null;
    row.lat = null;
    row.lng = null;
  } else {
    row.last_lat = coords.lat;
    row.last_lng = coords.lng;
    row.lat = coords.lat;
    row.lng = coords.lng;
  }

  for (const table of USER_TABLES) {
    const { error } = await serviceClient.from(table).upsert(row, { onConflict: 'email' });
    if (!error) return { ok: true, table };
  }

  return { ok: false, table: 'User' };
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
  const bucketed = bucketLatLng(lat, lng, 3);
  const bucketedCoords = {
    lat: bucketed.lat,
    lng: bucketed.lng,
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
