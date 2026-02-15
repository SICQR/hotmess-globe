import { createClient } from '@supabase/supabase-js';
import { getBearerToken, getEnv, getQueryParam, json } from './shopify/_utils.js';
import { getSupabaseServerClients } from './routing/_utils.js';

const isRunningOnVercel = () => {
  const flag = process.env.VERCEL || process.env.VERCEL_ENV;
  return !!flag;
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizeId = (value) => String(value || '').trim();

const buildFallbackProfiles = () => {
  return [
    {
      id: 'profile_123',
      auth_user_id: 'fallback_auth_123',
      email: 'jay@example.com',
      full_name: 'Jay',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80',
      city: 'London',
      profile_type: 'creator',
      bio: 'Late-night walks, loud music, no drama',
      last_lng: -0.1278,
      lat: 51.5074,
      lng: -0.1278,
      seller_bio: null,
      shop_banner_url: null,
    },
    {
      id: 'profile_124',
      auth_user_id: 'fallback_auth_124',
      email: 'sam@example.com',
      full_name: 'Sam',
      avatar_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=1200&q=80',
      city: 'London',
      profile_type: 'seller',
      bio: 'Sunsets, scooters, and smoothies',
      seller_tagline: 'Handmade beachwear + scooter charms',
      last_lat: 51.5099,
      last_lng: -0.1181,
      lat: 51.5099,
      lng: -0.1181,
      seller_bio: null,
      shop_banner_url: null,
    },
  ];
};

const isMissingTableError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  return (
    code === '42p01' ||
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    message.includes('could not find the table')
  );
};

const isMissingColumnError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toUpperCase();

  // PostgREST missing column often shows as PGRST204.
  if (code === 'PGRST204') return true;
  // Postgres missing column.
  if (code === '42703') return true;

  return (
    message.includes('could not find') && message.includes('column')
  ) || (
    message.includes('column') && message.includes('does not exist')
  );
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const pickDefined = (primary, fallback) => (primary === undefined ? fallback : primary);

const mergeAuthMeta = ({ row, meta }) => {
  const out = { ...(row || {}) };
  const userMeta = meta && typeof meta === 'object' ? meta : {};

  // Only merge fields that are safe to render publicly in the Profile UI.
  // Keep the rest gated on the client (and/or stored only locally).
  const allowedKeys = [
    'photos',
    'bio',
    'interests',
    'looking_for',
    'preferred_vibes',
    'skills',
    'music_taste',
    'profile_theme',
    'accent_color',
    'availability_status',
  ];

  for (const key of allowedKeys) {
    if (out[key] === undefined) {
      out[key] = userMeta[key];
    }
  }

  // Normalize photos shape lightly (keep the stored object structure).
  if (out.photos !== undefined) {
    out.photos = safeArray(out.photos).slice(0, 5);
  }

  out.interests = safeArray(out.interests);
  out.looking_for = safeArray(out.looking_for);
  out.preferred_vibes = safeArray(out.preferred_vibes);
  out.skills = safeArray(out.skills);
  out.music_taste = safeArray(out.music_taste);

  return out;
};

const fetchMaybeSingle = async (client, table, where) => {
  const baseSelect = 'id,auth_user_id,email,full_name,avatar_url,subscription_tier,last_lat,last_lng,lat,lng,city,bio,profile_type,seller_tagline,seller_bio,shop_banner_url,instagram,twitter';
  const extendedSelect = `${baseSelect},photos,preferred_vibes,skills,interests,looking_for,music_taste,availability_status,profile_theme,accent_color`;
  // Some Supabase projects backing this repo have a slimmer public.User schema.
  // If both extended + base selects fail, fall back to a minimal, widely-compatible select.
  const minimalSelect = 'id,auth_user_id,email,full_name,avatar_url,last_lat,last_lng,lat,lng,city,bio,profile_type';

  const run = async (select) => {
    return client
      .from(table)
      .select(select)
      .match(where)
      .maybeSingle();
  };

  const candidates = [extendedSelect, baseSelect, minimalSelect];
  for (let i = 0; i < candidates.length; i += 1) {
    const select = candidates[i];
    const { data, error } = await run(select);
    if (!error) return { data: data || null, error: null };
    if (isMissingColumnError(error) && i < candidates.length - 1) continue;
    return { data: null, error };
  }

  return { data: null, error: null };
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  // Allow public profile viewing - auth is optional for GET requests
  const accessToken = getBearerToken(req);
  // Auth is NOT required for viewing profiles - RLS handles visibility

  const emailRaw = getQueryParam(req, 'email');
  const uidRaw = getQueryParam(req, 'uid') || getQueryParam(req, 'auth_user_id');

  const email = emailRaw ? normalizeEmail(emailRaw) : null;
  const uid = uidRaw ? normalizeId(uidRaw) : null;

  if (!email && !uid) {
    return json(res, 400, { error: 'Missing required query param: email or uid' });
  }

  const { error: supaErr, serviceClient, anonClient } = getSupabaseServerClients();

  if (accessToken && anonClient) {
    const { data, error } = await anonClient.auth.getUser(accessToken);
    // Token validation is optional - profile viewing works without auth via RLS
  }

  // If service role isn't configured (common in local dev), try an authenticated anon-client query
  // using the viewer's bearer token. This relies on RLS allowing authenticated reads.
  if (supaErr || !serviceClient) {
    const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
    const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', ['VITE_SUPABASE_ANON_KEY']);

    if (accessToken && supabaseUrl && supabaseAnonKey) {
      const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      });

      const tables = ['User', 'users'];
      for (const table of tables) {
        if (email) {
          const { data } = await fetchMaybeSingle(authedClient, table, { email });
          if (data) return json(res, 200, { user: data });
        }

        if (uid) {
          const { data: byAuth } = await fetchMaybeSingle(authedClient, table, { auth_user_id: uid });
          if (byAuth) return json(res, 200, { user: byAuth });

          const { data: byId } = await fetchMaybeSingle(authedClient, table, { id: uid });
          if (byId) return json(res, 200, { user: byId });
        }
      }
    }

    const fallbacks = buildFallbackProfiles();
    const match = email
      ? fallbacks.find((p) => normalizeEmail(p?.email) === email)
      : fallbacks.find((p) => normalizeId(p?.auth_user_id) === uid || normalizeId(p?.id) === uid);

    if (!match) {
      return json(res, 200, {
        ok: false,
        notFound: true,
        user: null,
        error: 'Profile not found',
      });
    }
    return json(res, 200, { user: match });
  }

  const tables = ['User', 'users'];
  const whereEmail = email ? { email } : null;

  let sawMissingTable = false;

  const respondWithUser = async (row) => {
    const authUserId = row?.auth_user_id ? String(row.auth_user_id).trim() : null;
    if (!authUserId || !serviceClient?.auth?.admin?.getUserById) {
      return json(res, 200, { user: row });
    }

    try {
      const { data, error } = await serviceClient.auth.admin.getUserById(authUserId);
      const meta = error ? null : (data?.user?.user_metadata || null);
      const merged = mergeAuthMeta({ row, meta });
      return json(res, 200, { user: merged });
    } catch {
      return json(res, 200, { user: row });
    }
  };

  for (const table of tables) {
    if (whereEmail) {
      const { data, error } = await fetchMaybeSingle(serviceClient, table, whereEmail);
      if (error && isMissingTableError(error)) sawMissingTable = true;
      if (data) return respondWithUser(data);
    }

    if (uid) {
      // Try auth_user_id first, then id.
      const { data: byAuth, error: byAuthError } = await fetchMaybeSingle(serviceClient, table, { auth_user_id: uid });
      if (byAuthError && isMissingTableError(byAuthError)) sawMissingTable = true;
      if (byAuth) return respondWithUser(byAuth);

      const { data: byId, error: byIdError } = await fetchMaybeSingle(serviceClient, table, { id: uid });
      if (byIdError && isMissingTableError(byIdError)) sawMissingTable = true;
      if (byId) return respondWithUser(byId);
    }
  }

  // If we were asked for a UID, it may exist in Supabase Auth even if the
  // public profile row hasn't been created yet. Best-effort: resolve auth user
  // -> email, then retry by email.
  if (uid && serviceClient?.auth?.admin?.getUserById) {
    try {
      const { data: authData, error: authError } = await serviceClient.auth.admin.getUserById(uid);
      const resolvedEmail = authError ? null : normalizeEmail(authData?.user?.email);
      if (resolvedEmail) {
        for (const table of tables) {
          const { data, error } = await fetchMaybeSingle(serviceClient, table, { email: resolvedEmail });
          if (error && isMissingTableError(error)) sawMissingTable = true;
          if (data) return respondWithUser(data);
        }
      }
    } catch {
      // Non-fatal: fall through to existing fallback/404 behavior.
    }
  }

  // Back-compat: sometimes the request uses a Supabase auth UID, but the profile row
  // has not yet been linked via `auth_user_id`. Try to resolve the auth user email
  // and then look up by email.
  if (uid && serviceClient?.auth?.admin?.getUserById) {
    try {
      const { data } = await serviceClient.auth.admin.getUserById(uid);
      const resolvedEmail = data?.user?.email ? normalizeEmail(data.user.email) : null;
      if (resolvedEmail) {
        for (const table of tables) {
          const { data: byEmail } = await fetchMaybeSingle(serviceClient, table, { email: resolvedEmail });
          if (byEmail) return respondWithUser(byEmail);
        }
      }
    } catch {
      // ignore
    }
  }

  if (sawMissingTable) {
    const fallbacks = buildFallbackProfiles();
    const match = email
      ? fallbacks.find((p) => normalizeEmail(p?.email) === email)
      : fallbacks.find((p) => normalizeId(p?.auth_user_id) === uid || normalizeId(p?.id) === uid);

    if (match) return json(res, 200, { user: match });
  }

  return json(res, 200, {
    ok: false,
    notFound: true,
    user: null,
    error: 'Profile not found',
  });
}
