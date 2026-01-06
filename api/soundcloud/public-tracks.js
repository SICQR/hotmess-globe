import { createClient } from '@supabase/supabase-js';
import { getEnv, json } from '../shopify/_utils.js';
import { refreshAccessToken } from './_soundcloud.js';

const SOUNDCLOUD_API_BASE = 'https://api.soundcloud.com';

const getValidAccessToken = async ({ serviceClient }) => {
  const { data, error } = await serviceClient
    .from('soundcloud_oauth_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('account_key', 'default')
    .maybeSingle();

  if (error) {
    const err = new Error('Failed to read SoundCloud token');
    err.status = 500;
    err.details = error.message;
    throw err;
  }

  if (!data?.access_token) {
    const err = new Error('SoundCloud not connected');
    err.status = 409;
    throw err;
  }

  const expiresAtMs = data.expires_at ? new Date(data.expires_at).getTime() : null;
  const needsRefresh = expiresAtMs ? expiresAtMs - Date.now() < 60 * 1000 : false;

  if (!needsRefresh) return data.access_token;

  if (!data.refresh_token) {
    const err = new Error('SoundCloud token expired and no refresh_token available');
    err.status = 409;
    throw err;
  }

  const refreshed = await refreshAccessToken({ refreshToken: data.refresh_token });

  const expiresIn = Number(refreshed?.expires_in);
  const expiresAt = Number.isFinite(expiresIn) && expiresIn > 0
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  await serviceClient.from('soundcloud_oauth_tokens').upsert(
    {
      account_key: 'default',
      access_token: refreshed?.access_token || null,
      refresh_token: refreshed?.refresh_token || data.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'account_key' }
  );

  return refreshed?.access_token || data.access_token;
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
  const supabaseServiceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return json(res, 500, {
      error: 'Supabase server env not configured',
      details: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server env.',
    });
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let accessToken;
  try {
    accessToken = await getValidAccessToken({ serviceClient });
  } catch (e) {
    return json(res, e?.status || 500, { error: e?.message || 'SoundCloud token error', details: e?.details });
  }

  const url = new URL(`${SOUNDCLOUD_API_BASE}/me/tracks`);
  url.searchParams.set('linked_partitioning', '1');
  url.searchParams.set('limit', '24');

  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const text = await resp.text().catch(() => '');
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!resp.ok) {
    return json(res, 502, { error: `SoundCloud tracks fetch failed (${resp.status})`, details: payload || text });
  }

  const collection = Array.isArray(payload?.collection) ? payload.collection : Array.isArray(payload) ? payload : [];

  const tracks = collection
    .filter((t) => {
      const sharing = String(t?.sharing || '').toLowerCase();
      return sharing === 'public' && !!t?.permalink_url;
    })
    .map((t) => ({
      id: t?.id || null,
      title: t?.title || null,
      permalink_url: t?.permalink_url || null,
      artwork_url: t?.artwork_url || null,
      created_at: t?.created_at || null,
      duration: t?.duration ?? null,
      playback_count: t?.playback_count ?? null,
      favoritings_count: t?.favoritings_count ?? null,
      comment_count: t?.comment_count ?? null,
      genre: t?.genre || null,
      description: t?.description || null,
    }))
    .filter((t) => t.id && t.permalink_url);

  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
  return json(res, 200, { tracks });
}
