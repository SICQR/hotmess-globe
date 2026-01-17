import { createClient } from '@supabase/supabase-js';
import { getBearerToken, getEnv, getQueryParam, json } from './shopify/_utils.js';
import { getSupabaseServerClients } from './routing/_utils.js';

const clampInt = (value, min, max, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), min), max);
};

const buildFallbackProfiles = () => {
  return [
    {
      id: 'profile_123',
      authUserId: 'fallback_auth_123',
      email: 'alex@example.com',
      profileName: 'Alex',
      title: 'Gym rat, beach lover',
      locationLabel: 'London',
      city: 'London',
      profileType: 'creator',
      bio: 'Gym rat, beach lover',
      geoLat: 51.5074,
      geoLng: -0.1278,
      photos: [
        {
          url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80',
          isPrimary: true,
        },
      ],
    },
    {
      id: 'profile_124',
      authUserId: 'fallback_auth_124',
      email: 'jay@example.com',
      profileName: 'Jay',
      title: 'Late-night walks, loud music, no drama',
      locationLabel: 'London',
      city: 'London',
      profileType: 'seller',
      sellerTagline: 'Clubwear drops + limited runs',
      bio: 'Late-night walks, loud music, no drama',
      geoLat: 51.5099,
      geoLng: -0.1181,
      photos: [
        {
          url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80',
          isPrimary: true,
        },
      ],
    },
  ];
};

const dedupeItems = (items) => {
  const list = Array.isArray(items) ? items : [];
  const seen = new Set();
  const out = [];

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const rawId = item.id;
    const key = rawId ? String(rawId).trim().toLowerCase() : '';
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
};

const toShortHeadline = (bio, fallback) => {
  const text = String(bio || '').trim();
  if (!text) return fallback;
  const oneLine = text.replace(/\s+/g, ' ');
  return oneLine.length > 80 ? `${oneLine.slice(0, 77)}…` : oneLine;
};

const buildTagMap = (rows) => {
  const map = new Map();
  (Array.isArray(rows) ? rows : []).forEach((r) => {
    const email = String(r?.user_email || '').trim().toLowerCase();
    const tag = String(r?.tag_id || '').trim();
    if (!email || !tag) return;
    if (!map.has(email)) map.set(email, []);
    const arr = map.get(email);
    if (Array.isArray(arr) && !arr.includes(tag)) arr.push(tag);
  });
  return map;
};

const normalizePhotos = (rawPhotos, avatarUrl) => {
  const out = [];

  const avatar = String(avatarUrl || '').trim();
  if (avatar) out.push({ url: avatar, isPrimary: true });

  const list = Array.isArray(rawPhotos) ? rawPhotos : [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const url = String(item.url || item.file_url || '').trim();
    if (!url) continue;

    const isPrimary = !!(item.isPrimary ?? item.is_primary ?? item.primary);
    // Skip duplicates.
    if (out.some((p) => p.url === url)) continue;
    out.push({ url, isPrimary: isPrimary || out.length === 0 });
  }

  // Ensure exactly one primary photo.
  const primaryIndex = out.findIndex((p) => p.isPrimary);
  const normalized = out.map((p, idx) => ({ ...p, isPrimary: primaryIndex === -1 ? idx === 0 : idx === primaryIndex }));
  return normalized.slice(0, 5);
};

const getAuthMetaMapById = async ({ serviceClient, authUserIds }) => {
  if (!serviceClient?.auth?.admin?.getUserById) return new Map();
  const ids = (Array.isArray(authUserIds) ? authUserIds : []).filter(Boolean);
  if (!ids.length) return new Map();

  const map = new Map();

  // Limit concurrency to avoid hammering auth admin API.
  const concurrency = 6;
  let idx = 0;
  const workers = Array.from({ length: Math.min(concurrency, ids.length) }).map(async () => {
    while (idx < ids.length) {
      const current = ids[idx];
      idx += 1;
      try {
        const { data, error } = await serviceClient.auth.admin.getUserById(current);
        if (error || !data?.user) continue;
        map.set(String(current), data.user.user_metadata || {});
      } catch {
        // ignore
      }
    }
  });

  await Promise.all(workers);
  return map;
};

const queryUsersWithFallbackOrder = async ({ serviceClient, offset, limit }) => {
  // Some environments don't have last_loc_ts; fall back to updated_at ordering.
  const base = serviceClient.from('User').select('*');

  const tryOrder = async (column) => {
    return base
      .order(column, { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);
  };

  const first = await tryOrder('last_loc_ts');
  if (!first?.error) return first;

  const msg = String(first?.error?.message || '').toLowerCase();
  if (msg.includes('column') && msg.includes('last_loc_ts')) {
    return tryOrder('updated_at');
  }

  return first;
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const cursorRaw = getQueryParam(req, 'cursor');
  const offset = clampInt(cursorRaw ?? 0, 0, 100000, 0);
  const limit = clampInt(getQueryParam(req, 'limit') ?? 40, 1, 60, 40);

  const { error: supaErr, serviceClient } = getSupabaseServerClients();

  // Prefer service role query when configured (works for public/demo contexts too).
  if (!supaErr && serviceClient) {
    // Simple cursor pagination: cursor is an integer offset (opaque enough for demo).
    // Using service role allows this endpoint to remain unauthenticated for the grid demo.
    const { data, error } = await queryUsersWithFallbackOrder({ serviceClient, offset, limit });

    if (error) {
      const items = offset === 0 ? buildFallbackProfiles() : [];
      const unique = dedupeItems(items);
      return json(res, 200, { items: unique, nextCursor: offset === 0 ? String(items.length) : null });
    }

    const rows = Array.isArray(data) ? data : [];

    // Attach auth user metadata (best-effort) so the grid can show multi-photo profiles,
    // even when those fields are stored in auth metadata (Base44-style).
    const authMetaById = await getAuthMetaMapById({
      serviceClient,
      authUserIds: rows.map((r) => (r?.auth_user_id ? String(r.auth_user_id) : null)).filter(Boolean),
    });

    // Attach tags (best-effort; ignore errors / missing table).
    let tagMap = new Map();
    try {
      const emails = rows
        .map((r) => (r?.email ? String(r.email).trim().toLowerCase() : null))
        .filter(Boolean);

      if (emails.length) {
        const { data: tagRows } = await serviceClient
          .from('user_tags')
          .select('user_email, tag_id')
          .in('user_email', emails);
        tagMap = buildTagMap(tagRows);
      }
    } catch {
      // ignore
    }

    const mapped = rows
      .map((row) => {
        const lat = Number(row?.last_lat ?? row?.lat);
        const lng = Number(row?.last_lng ?? row?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        const fullName = String(row?.full_name || row?.email || 'Unknown').trim();
        const dedupeKey = String(row?.auth_user_id || row?.email || fullName).trim();
        const avatar = String(row?.avatar_url || '').trim();
        const email = row?.email ? String(row.email).trim() : null;
        const authUserId = row?.auth_user_id ? String(row.auth_user_id).trim() : null;

        const meta = authUserId ? authMetaById.get(authUserId) : null;

        const rawPhotos = (row && typeof row === 'object' ? row.photos : null) ?? meta?.photos;
        const photos = normalizePhotos(rawPhotos, avatar);

        const sellerTagline = String(meta?.seller_tagline || '').trim() || undefined;
        const sellerBio = String(meta?.seller_bio || '').trim() || undefined;
        const shopBannerUrl = String(meta?.shop_banner_url || '').trim() || undefined;

        const tier = String(row?.subscription_tier || '').toUpperCase();
        const tierLabel = tier === 'PAID' ? 'Member (PAID)' : 'Member';

        const city = row?.city ? String(row.city).trim() : null;
        const profileType = row?.profile_type ? String(row.profile_type).trim() : null;
        const bio = row?.bio ? String(row.bio).trim() : (typeof meta?.bio === 'string' ? String(meta.bio).trim() : null);
        const title = toShortHeadline(bio, tierLabel);

        const tags = email ? tagMap.get(String(email).toLowerCase()) : null;
        const safeTags = Array.isArray(tags) ? tags.slice(0, 5) : [];

        return {
          id: `profile_${dedupeKey}`,
          email: email || undefined,
          authUserId: authUserId || undefined,
          profileName: fullName,
          title,
          locationLabel: city || 'Nearby',
          city: city || undefined,
          profileType: profileType || undefined,
          bio: bio || undefined,
          tag_ids: safeTags,
          sellerTagline,
          sellerBio,
          shopBannerUrl,
          tags: safeTags,
          geoLat: lat,
          geoLng: lng,
          photos,
        };
      })
      .filter(Boolean);

    const items = dedupeItems(mapped);
    const nextCursor = rows.length === limit ? String(offset + limit) : null;
    return json(res, 200, { items, nextCursor });
  }

  // Fallback: if service role key isn't configured (common in local dev),
  // use an authenticated Supabase RPC that does not require the service role key.
  const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', ['VITE_SUPABASE_ANON_KEY']);
  const accessToken = getBearerToken(req);

  if (!supabaseUrl || !supabaseAnonKey || !accessToken) {
    const items = offset === 0 ? buildFallbackProfiles() : [];
    const unique = dedupeItems(items);
    return json(res, 200, { items: unique, nextCursor: offset === 0 ? String(items.length) : null });
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const { data, error } = await anonClient.rpc('list_profiles_secure', {
    p_offset: offset,
    p_limit: limit,
  });

  if (error) {
    const items = offset === 0 ? buildFallbackProfiles() : [];
    const unique = dedupeItems(items);
    return json(res, 200, { items: unique, nextCursor: offset === 0 ? String(items.length) : null });
  }

  const rows = Array.isArray(data) ? data : [];

  let tagMap = new Map();
  try {
    const emails = rows
      .map((r) => (r?.email ? String(r.email).trim().toLowerCase() : null))
      .filter(Boolean);
    if (emails.length) {
      const { data: tagRows } = await anonClient
        .from('user_tags')
        .select('user_email, tag_id')
        .in('user_email', emails);
      tagMap = buildTagMap(tagRows);
    }
  } catch {
    // ignore
  }

  const mapped = rows
    .map((row) => {
      const lat = Number(row?.last_lat);
      const lng = Number(row?.last_lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const fullName = String(row?.full_name || row?.email || 'Unknown').trim();
      const dedupeKey = String(row?.auth_user_id || row?.email || fullName).trim();
      const avatar = String(row?.avatar_url || '').trim();
      const email = row?.email ? String(row.email).trim() : null;
      const authUserId = row?.auth_user_id ? String(row.auth_user_id).trim() : null;

      const photos = normalizePhotos(row?.photos, avatar);

      const sellerTagline = row?.seller_tagline ? String(row.seller_tagline).trim() : undefined;
      const sellerBio = row?.seller_bio ? String(row.seller_bio).trim() : undefined;
      const shopBannerUrl = row?.shop_banner_url ? String(row.shop_banner_url).trim() : undefined;

      const tier = String(row?.subscription_tier || '').toUpperCase();
      const tierLabel = tier === 'PAID' ? 'Member (PAID)' : 'Member';

      const city = row?.city ? String(row.city).trim() : null;
      const profileType = row?.profile_type ? String(row.profile_type).trim() : null;
      const bio = row?.bio ? String(row.bio).trim() : (typeof meta?.bio === 'string' ? String(meta.bio).trim() : null);
      const title = toShortHeadline(bio, tierLabel);

      const tags = email ? tagMap.get(String(email).toLowerCase()) : null;
      const safeTags = Array.isArray(tags) ? tags.slice(0, 3) : [];

      return {
        id: `profile_${dedupeKey}`,
        email: email || undefined,
        authUserId: authUserId || undefined,
        profileName: fullName,
        title,
        locationLabel: city || 'Nearby',
        city: city || undefined,
        profileType: profileType || undefined,
        bio: bio || undefined,
        sellerTagline,
        sellerBio,
        shopBannerUrl,
        tags: safeTags,
        geoLat: lat,
        geoLng: lng,
        photos,
      };
    })
    .filter(Boolean);

  const items = dedupeItems(mapped);
  const nextCursor = rows.length === limit ? String(offset + limit) : null;
  return json(res, 200, { items, nextCursor });
}
