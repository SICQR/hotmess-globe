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
      preferred_vibes: [],
      skills: [],
      music_taste: [],
      interests: [],
      looking_for: [],
      event_preferences: [],
      meet_at: [],
      dealbreakers_text: [],
      aftercare_menu: [],
      social_links: null,
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
      preferred_vibes: [],
      skills: [],
      music_taste: [],
      interests: [],
      looking_for: [],
      event_preferences: [],
      meet_at: [],
      dealbreakers_text: [],
      aftercare_menu: [],
      social_links: null,
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

const isNil = (value) => value === undefined || value === null;

const pickDefined = (primary, fallback) => (primary === undefined ? fallback : primary);

const isTruthyString = (value) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return !!text;
};

const safeEmailMatch = (a, b) => {
  const left = normalizeEmail(a);
  const right = normalizeEmail(b);
  if (!left || !right) return false;
  return left === right;
};

const hasAnyTruthyObjectValue = (value) => {
  if (!value || typeof value !== 'object') return false;
  const vals = Object.values(value);
  return vals.some((v) => {
    if (v === true) return true;
    if (typeof v === 'string') return !!v.trim();
    if (typeof v === 'number') return Number.isFinite(v) && v !== 0;
    return false;
  });
};

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
    'event_preferences',
    'meet_at',
    'skills',
    'portfolio',
    'music_taste',
    'profile_theme',
    'accent_color',
    'availability_status',
    'activity_status',
    'preferred_communication',
    'dealbreakers_text',
    'aftercare_menu',
    'social_links',
    'video_intro_url',
    'premium_videos',
    'premium_unlock_xp',
    'has_premium_content',
    'seller_bio',
    'seller_tagline',
    'shop_banner_url',
  ];

  for (const key of allowedKeys) {
    if (isNil(out[key])) {
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
  out.event_preferences = safeArray(out.event_preferences);
  out.meet_at = safeArray(out.meet_at);
  out.skills = safeArray(out.skills);
  out.portfolio = safeArray(out.portfolio);
  out.music_taste = safeArray(out.music_taste);
  out.aftercare_menu = safeArray(out.aftercare_menu);
  out.dealbreakers_text = safeArray(out.dealbreakers_text);
  out.premium_videos = safeArray(out.premium_videos);

  return out;
};

const isMissingFollowTableError = (error) => isMissingTableError(error);

const checkMutualFollow = async ({ serviceClient, viewerEmail, targetEmail }) => {
  if (!serviceClient || !viewerEmail || !targetEmail) return false;
  if (safeEmailMatch(viewerEmail, targetEmail)) return true;

  const tables = ['user_follows', 'UserFollow', 'UserFollows'];

  const hasFollow = async (follower, following) => {
    for (let i = 0; i < tables.length; i += 1) {
      const table = tables[i];
      try {
        const { data, error } = await serviceClient
          .from(table)
          .select('id')
          .match({ follower_email: follower, following_email: following })
          .limit(1);

        if (!error) {
          return Array.isArray(data) && data.length > 0;
        }

        if (isMissingFollowTableError(error) && i < tables.length - 1) {
          continue;
        }

        return false;
      } catch (error) {
        if (isMissingFollowTableError(error) && i < tables.length - 1) {
          continue;
        }
        return false;
      }
    }

    return false;
  };

  const viewer = normalizeEmail(viewerEmail);
  const target = normalizeEmail(targetEmail);
  if (!viewer || !target) return false;

  const a = await hasFollow(viewer, target);
  if (!a) return false;
  const b = await hasFollow(target, viewer);
  return !!b;
};

const applyProfilePrivacyGates = ({ user, isConnection }) => {
  const out = { ...(user || {}) };

  // Social links are connection-only.
  if (!isConnection) {
    const hasLinks = hasAnyTruthyObjectValue(out.social_links);
    out.social_links = hasLinks ? { _locked: true } : null;
  }

  // Aftercare is connection-only.
  if (!isConnection) {
    delete out.aftercare_menu;
  }

  // Always normalize arrays (avoid UI blowing up on strings/nulls).
  out.interests = safeArray(out.interests);
  out.looking_for = safeArray(out.looking_for);
  out.preferred_vibes = safeArray(out.preferred_vibes);
  out.event_preferences = safeArray(out.event_preferences);
  out.meet_at = safeArray(out.meet_at);
  out.skills = safeArray(out.skills);
  out.music_taste = safeArray(out.music_taste);
  out.portfolio = safeArray(out.portfolio);
  out.aftercare_menu = safeArray(out.aftercare_menu);
  out.dealbreakers_text = safeArray(out.dealbreakers_text);
  out.premium_videos = safeArray(out.premium_videos);

  // Keep premium fields bounded.
  if (out.photos !== undefined) {
    out.photos = safeArray(out.photos).slice(0, 10);
  }

  // Back-compat: some tables store instagram/twitter handles as plain columns.
  if (!isTruthyString(out.instagram_handle) && isTruthyString(out.instagram)) {
    out.instagram_handle = String(out.instagram).trim();
  }
  if (!isTruthyString(out.twitter_handle) && isTruthyString(out.twitter)) {
    out.twitter_handle = String(out.twitter).trim();
  }

  return out;
};

const fetchMaybeSingle = async (client, table, where) => {
  const baseSelect = 'id,auth_user_id,email,full_name,avatar_url,subscription_tier,last_lat,last_lng,lat,lng,city,bio,profile_type,seller_tagline,seller_bio,shop_banner_url,instagram,twitter';
  const extendedSelect = `${baseSelect},photos,preferred_vibes,event_preferences,meet_at,skills,portfolio,interests,looking_for,music_taste,availability_status,activity_status,preferred_communication,profile_theme,accent_color,dealbreakers_text,aftercare_menu,social_links,video_intro_url,premium_videos,premium_unlock_xp,has_premium_content,instagram_handle,twitter_handle,spotify_url,soundcloud_url,total_sales,seller_rating`;
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

  const requireAuth = isRunningOnVercel() || process.env.NODE_ENV === 'production';
  const accessToken = getBearerToken(req);
  if (requireAuth && !accessToken) {
    return json(res, 401, { error: 'Unauthorized' });
  }

  const emailRaw = getQueryParam(req, 'email');
  const uidRaw = getQueryParam(req, 'uid') || getQueryParam(req, 'auth_user_id');

  const email = emailRaw ? normalizeEmail(emailRaw) : null;
  const uid = uidRaw ? normalizeId(uidRaw) : null;

  if (!email && !uid) {
    return json(res, 400, { error: 'Missing required query param: email or uid' });
  }

  const { error: supaErr, serviceClient, anonClient } = getSupabaseServerClients();

  let viewerEmail = null;

  if (accessToken && anonClient) {
    const { data, error } = await anonClient.auth.getUser(accessToken);
    if (error || !data?.user) {
      if (requireAuth) return json(res, 401, { error: 'Unauthorized' });
    } else {
      viewerEmail = data?.user?.email ? normalizeEmail(data.user.email) : null;
    }
  } else if (requireAuth && !anonClient) {
    return json(res, 500, { error: 'Supabase server env not configured' });
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

      let localViewerEmail = viewerEmail;
      if (!localViewerEmail) {
        try {
          const { data } = await authedClient.auth.getUser(accessToken);
          localViewerEmail = data?.user?.email ? normalizeEmail(data.user.email) : null;
        } catch {
          // ignore
        }
      }

      const tables = ['User', 'users'];
      for (const table of tables) {
        if (email) {
          const { data } = await fetchMaybeSingle(authedClient, table, { email });
          if (data) {
            const targetEmail = data?.email ? normalizeEmail(data.email) : email;
            const isConnection = localViewerEmail && targetEmail
              ? safeEmailMatch(localViewerEmail, targetEmail)
              : false;
            const merged = mergeAuthMeta({ row: data, meta: null });
            const gated = applyProfilePrivacyGates({ user: merged, isConnection });
            return json(res, 200, { user: gated });
          }
        }

        if (uid) {
          const { data: byAuth } = await fetchMaybeSingle(authedClient, table, { auth_user_id: uid });
          if (byAuth) {
            const targetEmail = byAuth?.email ? normalizeEmail(byAuth.email) : null;
            const isConnection = localViewerEmail && targetEmail
              ? safeEmailMatch(localViewerEmail, targetEmail)
              : false;
            const merged = mergeAuthMeta({ row: byAuth, meta: null });
            const gated = applyProfilePrivacyGates({ user: merged, isConnection });
            return json(res, 200, { user: gated });
          }

          const { data: byId } = await fetchMaybeSingle(authedClient, table, { id: uid });
          if (byId) {
            const targetEmail = byId?.email ? normalizeEmail(byId.email) : null;
            const isConnection = localViewerEmail && targetEmail
              ? safeEmailMatch(localViewerEmail, targetEmail)
              : false;
            const merged = mergeAuthMeta({ row: byId, meta: null });
            const gated = applyProfilePrivacyGates({ user: merged, isConnection });
            return json(res, 200, { user: gated });
          }
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
    const targetEmail = row?.email ? normalizeEmail(row.email) : null;
    const isConnection = await checkMutualFollow({
      serviceClient,
      viewerEmail,
      targetEmail,
    });

    if (!authUserId || !serviceClient?.auth?.admin?.getUserById) {
      const gated = applyProfilePrivacyGates({ user: row, isConnection });
      return json(res, 200, { user: gated });
    }

    try {
      const { data, error } = await serviceClient.auth.admin.getUserById(authUserId);
      const meta = error ? null : (data?.user?.user_metadata || null);
      const merged = mergeAuthMeta({ row, meta });
      const gated = applyProfilePrivacyGates({ user: merged, isConnection });
      return json(res, 200, { user: gated });
    } catch {
      const gated = applyProfilePrivacyGates({ user: row, isConnection });
      return json(res, 200, { user: gated });
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
