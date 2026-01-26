import Busboy from 'busboy';
import { createClient } from '@supabase/supabase-js';
import { getBearerToken, getEnv, json } from '../shopify/_utils.js';
import { bestEffortRateLimit, minuteBucket } from '../_rateLimit.js';
import { getRequestIp } from '../routing/_utils.js';
import { refreshAccessToken, uploadTrack } from './_soundcloud.js';
import { isMusicUploadAllowlisted } from './_auth.js';

const isAdminUser = async ({ anonClient, serviceClient, accessToken, email }) => {
  const { data: userData, error: userErr } = await anonClient.auth.getUser(accessToken);
  if (userErr || !userData?.user) return false;
  const roleFromMetadata = userData.user.user_metadata?.role;
  if (roleFromMetadata === 'admin') return true;

  const tryTables = ['User', 'users'];
  for (const table of tryTables) {
    const { data, error } = await serviceClient.from(table).select('role').eq('email', email).maybeSingle();
    if (error) continue;
    if (data?.role === 'admin') return true;
  }

  return false;
};

const readMultipart = async (req) => {
  const contentType = req.headers['content-type'] || req.headers['Content-Type'];
  if (!contentType || !String(contentType).toLowerCase().includes('multipart/form-data')) {
    const err = new Error('Expected multipart/form-data');
    err.status = 400;
    throw err;
  }

  const busboy = Busboy({
    headers: req.headers,
    limits: {
      files: 2,
      fileSize: 200 * 1024 * 1024,
      fields: 50,
    },
  });

  const fields = {};
  let fileBuffer = null;
  let fileInfo = null;

  const finished = new Promise((resolve, reject) => {
    busboy.on('field', (name, value) => {
      fields[name] = value;
    });

    busboy.on('file', (name, file, info) => {
      if (name !== 'track[asset_data]') {
        // drain
        file.resume();
        return;
      }

      fileInfo = info;
      const chunks = [];
      file.on('data', (d) => chunks.push(d));
      file.on('limit', () => {
        const err = new Error('File too large');
        err.status = 413;
        reject(err);
      });
      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on('error', reject);
    busboy.on('finish', () => resolve());
  });

  req.pipe(busboy);
  await finished;

  return { fields, fileBuffer, fileInfo };
};

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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', ['SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY']);
  const supabaseServiceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return json(res, 500, {
      error: 'Supabase server env not configured',
      details: 'Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in server env.',
    });
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return json(res, 401, { error: 'Missing Authorization bearer token' });
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await anonClient.auth.getUser(accessToken);
  if (userErr || !userData?.user?.email) {
    return json(res, 401, { error: 'Invalid auth token' });
  }

  const email = userData.user.email;
  const allowlisted = isMusicUploadAllowlisted(email);
  if (allowlisted === false) {
    return json(res, 403, { error: 'Not authorized' });
  }

  // Back-compat: if allowlist isn't configured, keep the previous admin-only behavior.
  if (allowlisted === null) {
    const adminOk = await isAdminUser({ anonClient, serviceClient, accessToken, email });
    if (!adminOk) {
      return json(res, 403, { error: 'Admin required' });
    }
  }

  // Rate limits: per-user + per-IP (best-effort).
  // Upload is expensive; keep this relatively strict.
  {
    const ip = getRequestIp(req);
    const userId = userData.user.id;
    const bucketKey = `soundcloud:upload:${userId}:${ip || 'noip'}:${minuteBucket()}`;
    const rl = await bestEffortRateLimit({
      serviceClient,
      bucketKey,
      userId,
      ip,
      windowSeconds: 60,
      maxRequests: 2,
    });

    if (rl.allowed === false) {
      return json(res, 429, { error: 'Rate limit exceeded', remaining: rl.remaining ?? 0 });
    }
  }

  let parsed;
  try {
    parsed = await readMultipart(req);
  } catch (e) {
    return json(res, e?.status || 400, { error: e?.message || 'Invalid multipart body' });
  }

  const title = parsed.fields['track[title]'];
  if (!title || !String(title).trim()) {
    return json(res, 400, { error: 'Missing track[title]' });
  }

  if (!parsed.fileBuffer || !parsed.fileBuffer.length) {
    return json(res, 400, { error: 'Missing track[asset_data] file' });
  }

  let scAccessToken;
  try {
    scAccessToken = await getValidAccessToken({ serviceClient });
  } catch (e) {
    return json(res, e?.status || 500, { error: e?.message || 'SoundCloud token error', details: e?.details });
  }

  const formData = new FormData();
  for (const [k, v] of Object.entries(parsed.fields)) {
    if (v === undefined || v === null) continue;
    formData.set(k, String(v));
  }

  const filename = parsed.fileInfo?.filename || 'track.wav';
  const mimeType = parsed.fileInfo?.mimeType || 'audio/wav';
  const blob = new Blob([parsed.fileBuffer], { type: mimeType });
  formData.set('track[asset_data]', blob, filename);

  let uploaded;
  try {
    uploaded = await uploadTrack({ accessToken: scAccessToken, formData });
  } catch (e) {
    return json(res, 502, { error: 'SoundCloud upload failed', details: e?.details || e?.message || String(e) });
  }

  const id = uploaded?.id;
  const urn = id ? `soundcloud:tracks:${id}` : null;

  return json(res, 200, {
    ok: true,
    id: id || null,
    urn,
    permalink_url: uploaded?.permalink_url || null,
    uri: uploaded?.uri || null,
    raw: uploaded,
  });
}
