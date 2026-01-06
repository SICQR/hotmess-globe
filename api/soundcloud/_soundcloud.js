import { getEnv } from '../shopify/_utils.js';

const SOUNDCLOUD_AUTHORIZE_URL = 'https://secure.soundcloud.com/authorize';
const SOUNDCLOUD_TOKEN_URL = 'https://secure.soundcloud.com/oauth/token';
const SOUNDCLOUD_API_BASE = 'https://api.soundcloud.com';

export const getSoundCloudConfig = () => {
  const clientId = getEnv('SOUNDCLOUD_CLIENT_ID');
  const clientSecret = getEnv('SOUNDCLOUD_CLIENT_SECRET');
  const redirectUri = getEnv('SOUNDCLOUD_REDIRECT_URI');
  const scope = getEnv('SOUNDCLOUD_SCOPE');

  return { clientId, clientSecret, redirectUri, scope };
};

export const buildAuthorizeUrl = ({ clientId, redirectUri, state, codeChallenge, scope }) => {
  const url = new URL(SOUNDCLOUD_AUTHORIZE_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);
  if (scope) url.searchParams.set('scope', scope);
  return url.toString();
};

const toFormBody = (fields) => {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    params.set(k, String(v));
  }
  return params;
};

export const exchangeAuthorizationCode = async ({ code, codeVerifier }) => {
  const { clientId, clientSecret, redirectUri } = getSoundCloudConfig();

  const missing = [];
  if (!clientId) missing.push('SOUNDCLOUD_CLIENT_ID');
  if (!clientSecret) missing.push('SOUNDCLOUD_CLIENT_SECRET');
  if (!redirectUri) missing.push('SOUNDCLOUD_REDIRECT_URI');
  if (missing.length) {
    const err = new Error(`Missing SoundCloud env: ${missing.join(', ')}`);
    err.code = 'SOUNDCLOUD_ENV_MISSING';
    throw err;
  }

  const resp = await fetch(SOUNDCLOUD_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: toFormBody({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  const text = await resp.text().catch(() => '');
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!resp.ok) {
    const err = new Error(`SoundCloud token exchange failed (${resp.status})`);
    err.status = resp.status;
    err.details = payload || text;
    throw err;
  }

  return payload;
};

export const refreshAccessToken = async ({ refreshToken }) => {
  const { clientId, clientSecret, redirectUri } = getSoundCloudConfig();

  const missing = [];
  if (!clientId) missing.push('SOUNDCLOUD_CLIENT_ID');
  if (!clientSecret) missing.push('SOUNDCLOUD_CLIENT_SECRET');
  if (!redirectUri) missing.push('SOUNDCLOUD_REDIRECT_URI');
  if (missing.length) {
    const err = new Error(`Missing SoundCloud env: ${missing.join(', ')}`);
    err.code = 'SOUNDCLOUD_ENV_MISSING';
    throw err;
  }

  const resp = await fetch(SOUNDCLOUD_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: toFormBody({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      redirect_uri: redirectUri,
    }),
  });

  const text = await resp.text().catch(() => '');
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!resp.ok) {
    const err = new Error(`SoundCloud token refresh failed (${resp.status})`);
    err.status = resp.status;
    err.details = payload || text;
    throw err;
  }

  return payload;
};

export const uploadTrack = async ({ accessToken, formData }) => {
  const resp = await fetch(`${SOUNDCLOUD_API_BASE}/tracks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const text = await resp.text().catch(() => '');
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!resp.ok) {
    const err = new Error(`SoundCloud upload failed (${resp.status})`);
    err.status = resp.status;
    err.details = payload || text;
    throw err;
  }

  return payload;
};
