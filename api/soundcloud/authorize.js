import { createClient } from '@supabase/supabase-js';
import { getBearerToken, getEnv, getQueryParam, json } from '../shopify/_utils.js';
import { createCodeChallenge, createCodeVerifier, createState } from './_pkce.js';
import { buildAuthorizeUrl, getSoundCloudConfig } from './_soundcloud.js';

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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
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
  const adminOk = await isAdminUser({ anonClient, serviceClient, accessToken, email });
  if (!adminOk) {
    return json(res, 403, { error: 'Admin required' });
  }

  const { clientId, redirectUri, scope } = getSoundCloudConfig();
  if (!clientId || !redirectUri) {
    return json(res, 500, {
      error: 'SoundCloud env not configured',
      details: 'Set SOUNDCLOUD_CLIENT_ID and SOUNDCLOUD_REDIRECT_URI (and SOUNDCLOUD_CLIENT_SECRET for callback).',
    });
  }

  const redirectTo = getQueryParam(req, 'redirect_to');
  const safeRedirectTo = typeof redirectTo === 'string' && redirectTo.startsWith('/') ? redirectTo : null;

  const state = createState();
  const codeVerifier = createCodeVerifier();
  const codeChallenge = createCodeChallenge(codeVerifier);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: insertErr } = await serviceClient.from('soundcloud_oauth_states').insert({
    state,
    code_verifier: codeVerifier,
    redirect_to: safeRedirectTo,
    expires_at: expiresAt,
  });

  if (insertErr) {
    return json(res, 500, { error: 'Failed to create OAuth state', details: insertErr.message });
  }

  const authorizeUrl = buildAuthorizeUrl({
    clientId,
    redirectUri,
    state,
    codeChallenge,
    scope,
  });

  return json(res, 200, { authorize_url: authorizeUrl, redirect_uri: redirectUri });
}
