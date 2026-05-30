import { createClient } from '@supabase/supabase-js';
import { getEnv, getQueryParam, json } from '../shopify/_utils.js';
import { exchangeAuthorizationCode } from './_soundcloud.js';

const toExpiresAt = ({ expires_in, expires_at }) => {
  if (typeof expires_at === 'string' && expires_at.trim()) return expires_at;
  const seconds = Number(expires_in);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(Date.now() + seconds * 1000).toISOString();
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const code = getQueryParam(req, 'code');
  const state = getQueryParam(req, 'state');

  const redirectWith = (path, params) => {
    const safePath = typeof path === 'string' && path.startsWith('/') ? path : '/music/releases';
    const url = new URL(safePath, 'http://local');
    for (const [k, v] of Object.entries(params || {})) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
    res.statusCode = 302;
    res.setHeader('Location', `${url.pathname}${url.search}`);
    res.end();
  };

  if (!code || !state) {
    return redirectWith('/music/releases', {
      soundcloud: 'error',
      reason: 'missing_code_or_state',
    });
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

  const { data: stateRow, error: stateErr } = await serviceClient
    .from('soundcloud_oauth_states')
    .select('state, code_verifier, redirect_to, expires_at')
    .eq('state', state)
    .maybeSingle();

  if (stateErr) {
    return redirectWith('/music/releases', {
      soundcloud: 'error',
      reason: 'state_read_failed',
    });
  }

  if (!stateRow) {
    return redirectWith('/music/releases', {
      soundcloud: 'error',
      reason: 'invalid_state',
    });
  }

  const redirectTo = typeof stateRow.redirect_to === 'string' && stateRow.redirect_to.startsWith('/')
    ? stateRow.redirect_to
    : '/music/releases';

  if (stateRow.expires_at && new Date(stateRow.expires_at).getTime() < Date.now()) {
    return redirectWith(redirectTo, {
      soundcloud: 'error',
      reason: 'state_expired',
    });
  }

  let tokenPayload;
  try {
    tokenPayload = await exchangeAuthorizationCode({ code, codeVerifier: stateRow.code_verifier });
  } catch (e) {
    return redirectWith(redirectTo, {
      soundcloud: 'error',
      reason: 'token_exchange_failed',
    });
  }

  const expiresAt = toExpiresAt(tokenPayload) || null;

  const upsertRow = {
    account_key: 'default',
    access_token: tokenPayload?.access_token || null,
    refresh_token: tokenPayload?.refresh_token || null,
    token_type: tokenPayload?.token_type || null,
    scope: tokenPayload?.scope || null,
    expires_at: expiresAt,
    obtained_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error: upsertErr } = await serviceClient
    .from('soundcloud_oauth_tokens')
    .upsert(upsertRow, { onConflict: 'account_key' });

  if (upsertErr) {
    return json(res, 500, { error: 'Failed to store SoundCloud token', details: upsertErr.message });
  }

  // One-time state: best-effort cleanup
  await serviceClient.from('soundcloud_oauth_states').delete().eq('state', state);

  return redirectWith(redirectTo, {
    soundcloud: 'connected',
  });
}
