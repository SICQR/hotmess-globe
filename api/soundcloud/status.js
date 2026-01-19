import { createClient } from '@supabase/supabase-js';
import { getBearerToken, getEnv, json } from '../shopify/_utils.js';
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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', ['VITE_SUPABASE_ANON_KEY']);
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

  const { data, error } = await serviceClient
    .from('soundcloud_oauth_tokens')
    .select('expires_at')
    .eq('account_key', 'default')
    .maybeSingle();

  if (error) {
    return json(res, 500, { error: 'Failed to read SoundCloud token', details: error.message });
  }

  const expiresAt = data?.expires_at ? new Date(data.expires_at).getTime() : null;
  const connected = !!data;
  const expired = expiresAt ? expiresAt <= Date.now() : false;

  return json(res, 200, {
    connected,
    expired,
    expires_at: data?.expires_at || null,
  });
}
