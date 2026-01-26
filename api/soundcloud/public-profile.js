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
    // Public endpoint: degrade gracefully in dev if server env isn't set.
    return json(res, 200, {
      connected: false,
      profile: null,
      error: 'SoundCloud not configured',
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
    // SoundCloud not connected is a normal state for most envs.
    if ((e?.status || 0) === 409) {
      return json(res, 200, { connected: false, profile: null });
    }

    return json(res, 200, {
      connected: false,
      profile: null,
      error: e?.message || 'SoundCloud token error',
      details: e?.details,
    });
  }

  const resp = await fetch(`${SOUNDCLOUD_API_BASE}/me`, {
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
    // Public endpoint: don't hard-fail; treat as disconnected/temporarily unavailable.
    return json(res, 200, {
      connected: false,
      profile: null,
      error: `SoundCloud profile fetch failed (${resp.status})`,
      details: payload || text,
    });
  }

  const safe = {
    id: payload?.id || null,
    username: payload?.username || null,
    permalink_url: payload?.permalink_url || null,
    avatar_url: payload?.avatar_url || null,
    followers_count: payload?.followers_count ?? null,
    followings_count: payload?.followings_count ?? null,
    track_count: payload?.track_count ?? null,
    playlist_count: payload?.playlist_count ?? null,
  };

  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
  return json(res, 200, { connected: true, profile: safe });
}
