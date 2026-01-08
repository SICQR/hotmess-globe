import { getQueryParam, json } from './shopify/_utils.js';
import { getSupabaseServerClients } from './routing/_utils.js';

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
      seller_tagline: 'Clubwear drops + limited runs',
      last_lng: -0.1278,
      lat: 51.5074,
      lng: -0.1278,
      seller_tagline: null,
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

const fetchMaybeSingle = async (client, table, where) => {
  const query = client
    .from(table)
    .select('id,auth_user_id,email,full_name,avatar_url,subscription_tier,last_lat,last_lng,lat,lng,city,bio,profile_type,seller_tagline,seller_bio,shop_banner_url,instagram,twitter')
    .match(where)
    .maybeSingle();

  const { data, error } = await query;
  if (error) return { data: null, error };
  return { data: data || null, error: null };
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

const isFemaleIdentity = (value) => {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return false;
  return v.includes('female') || v.includes('woman') || v === 'f';
};
  const emailRaw = getQueryParam(req, 'email');
  const uidRaw = getQueryParam(req, 'uid') || getQueryParam(req, 'auth_user_id');

  const email = emailRaw ? normalizeEmail(emailRaw) : null;
  const uid = uidRaw ? normalizeId(uidRaw) : null;

  if (!email && !uid) {
    return json(res, 400, { error: 'Missing required query param: email or uid' });
  }

  const { error: supaErr, serviceClient } = getSupabaseServerClients();
  if (supaErr || !serviceClient) {
    const fallbacks = buildFallbackProfiles();
    const match = email
      ? fallbacks.find((p) => normalizeEmail(p?.email) === email)
      : fallbacks.find((p) => normalizeId(p?.auth_user_id) === uid || normalizeId(p?.id) === uid);

    if (!match) return json(res, 404, { error: 'Profile not found' });
    return json(res, 200, { user: match });
  }

  const tables = ['User', 'users'];
  const whereEmail = email ? { email } : null;

  let sawMissingTable = false;

  for (const table of tables) {
    if (whereEmail) {
      const { data, error } = await fetchMaybeSingle(serviceClient, table, whereEmail);
      if (error && isMissingTableError(error)) sawMissingTable = true;
      if (data) return json(res, 200, { user: data });
    }

    if (uid) {
      // Try auth_user_id first, then id.
      const { data: byAuth, error: byAuthError } = await fetchMaybeSingle(serviceClient, table, { auth_user_id: uid });
      if (byAuthError && isMissingTableError(byAuthError)) sawMissingTable = true;
      if (byAuth) return json(res, 200, { user: byAuth });

      const { data: byId, error: byIdError } = await fetchMaybeSingle(serviceClient, table, { id: uid });
      if (byIdError && isMissingTableError(byIdError)) sawMissingTable = true;
      if (byId) return json(res, 200, { user: byId });
    }
  }

  if (sawMissingTable) {
    const fallbacks = buildFallbackProfiles();
    const match = email
      ? fallbacks.find((p) => normalizeEmail(p?.email) === email)
      : fallbacks.find((p) => normalizeId(p?.auth_user_id) === uid || normalizeId(p?.id) === uid);

    if (match) return json(res, 200, { user: match });
  }

  return json(res, 404, { error: 'Profile not found' });
}
