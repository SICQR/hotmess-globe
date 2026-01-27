import { createClient } from '@supabase/supabase-js';
import { getBearerToken, getEnv, getQueryParam, json } from './shopify/_utils.js';
import { getSupabaseServerClients } from './routing/_utils.js';
import { batchCheckVisibility, resolveEffectiveProfile, isProfileActive } from './personas/_utils.js';
import { cacheGet, cacheSet, cacheTTL, cacheKeys } from './_cache/index.js';

// Feature flag for secondary profiles in discovery
const isSecondaryProfilesEnabled = () => {
  const flag = process.env.VITE_SECONDARY_PROFILES_IN_DISCOVERY || process.env.SECONDARY_PROFILES_IN_DISCOVERY;
  return String(flag || 'false').toLowerCase() === 'true';
};

const isRunningOnVercel = () => {
  const flag = process.env.VERCEL || process.env.VERCEL_ENV;
  return !!flag;
};

const clampInt = (value, min, max, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), min), max);
};

// Haversine distance calculation in meters
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const parseFilters = (req) => {
  const filters = {};
  
  // Profile types
  const profileTypes = getQueryParam(req, 'profile_types') || getQueryParam(req, 'profileTypes');
  if (profileTypes) {
    filters.profileTypes = profileTypes.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  }
  
  // Age range
  const ageMin = getQueryParam(req, 'age_min') || getQueryParam(req, 'ageMin');
  const ageMax = getQueryParam(req, 'age_max') || getQueryParam(req, 'ageMax');
  if (ageMin) filters.ageMin = parseInt(ageMin, 10);
  if (ageMax) filters.ageMax = parseInt(ageMax, 10);
  
  // Distance (in km)
  const distanceKm = getQueryParam(req, 'distance_km') || getQueryParam(req, 'distanceKm');
  if (distanceKm && distanceKm !== '-1') filters.distanceKm = parseInt(distanceKm, 10);
  
  // Viewer location for distance filtering
  const viewerLat = getQueryParam(req, 'lat') || getQueryParam(req, 'viewer_lat');
  const viewerLng = getQueryParam(req, 'lng') || getQueryParam(req, 'viewer_lng');
  if (viewerLat && viewerLng) {
    filters.viewerLat = parseFloat(viewerLat);
    filters.viewerLng = parseFloat(viewerLng);
  }
  
  // Boolean filters
  if (getQueryParam(req, 'online_now') === 'true' || getQueryParam(req, 'onlineNow') === 'true') {
    filters.onlineNow = true;
  }
  if (getQueryParam(req, 'has_premium') === 'true' || getQueryParam(req, 'hasPremiumContent') === 'true') {
    filters.hasPremiumContent = true;
  }
  if (getQueryParam(req, 'verified') === 'true') {
    filters.verified = true;
  }
  if (getQueryParam(req, 'has_face') === 'true' || getQueryParam(req, 'hasFace') === 'true') {
    filters.hasFace = true;
  }
  
  // Tags
  const tags = getQueryParam(req, 'tags');
  if (tags) {
    filters.tags = tags.split(',').map(t => t.trim()).filter(Boolean);
  }
  
  // Looking for
  const lookingFor = getQueryParam(req, 'looking_for') || getQueryParam(req, 'lookingFor');
  if (lookingFor) {
    filters.lookingFor = lookingFor.split(',').map(l => l.trim()).filter(Boolean);
  }
  
  // Sort by
  const sortBy = getQueryParam(req, 'sort_by') || getQueryParam(req, 'sortBy');
  if (sortBy) filters.sortBy = sortBy;
  
  return filters;
};

const applyFilters = (profiles, filters) => {
  let filtered = [...profiles];
  
  // Filter by profile types
  if (filters.profileTypes && filters.profileTypes.length > 0) {
    filtered = filtered.filter(p => {
      const type = (p.profileType || 'standard').toLowerCase();
      return filters.profileTypes.includes(type);
    });
  }
  
  // Filter by distance
  if (filters.distanceKm && Number.isFinite(filters.viewerLat) && Number.isFinite(filters.viewerLng)) {
    const maxDistanceMeters = filters.distanceKm * 1000;
    filtered = filtered.filter(p => {
      if (!Number.isFinite(p.geoLat) || !Number.isFinite(p.geoLng)) return false;
      const distance = haversineDistance(filters.viewerLat, filters.viewerLng, p.geoLat, p.geoLng);
      p._distance = distance; // Attach for sorting
      return distance <= maxDistanceMeters;
    });
  } else if (Number.isFinite(filters.viewerLat) && Number.isFinite(filters.viewerLng)) {
    // Calculate distance for sorting even if no distance filter
    filtered.forEach(p => {
      if (Number.isFinite(p.geoLat) && Number.isFinite(p.geoLng)) {
        p._distance = haversineDistance(filters.viewerLat, filters.viewerLng, p.geoLat, p.geoLng);
      }
    });
  }
  
  // Filter by online status (active in last 15 minutes)
  if (filters.onlineNow) {
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
    filtered = filtered.filter(p => {
      const lastSeen = p.last_seen || p.lastSeen || p.updated_at;
      if (!lastSeen) return false;
      return new Date(lastSeen).getTime() > fifteenMinutesAgo;
    });
  }
  
  // Filter by has premium content
  if (filters.hasPremiumContent) {
    filtered = filtered.filter(p => {
      const photos = p.photos || [];
      return photos.some(photo => photo.is_premium || photo.isPremium);
    });
  }
  
  // Filter by verified
  if (filters.verified) {
    filtered = filtered.filter(p => p.verified || p.verified_organizer || p.verified_seller);
  }
  
  // Filter by has face (has at least one photo)
  if (filters.hasFace) {
    filtered = filtered.filter(p => {
      const photos = p.photos || [];
      return photos.length > 0 && photos.some(photo => photo.url);
    });
  }
  
  // Filter by tags
  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(p => {
      const profileTags = p.tags || p.tag_ids || [];
      return filters.tags.some(t => profileTags.includes(t));
    });
  }
  
  // Sort results
  const sortBy = filters.sortBy || 'distance';
  if (sortBy === 'distance' && Number.isFinite(filters.viewerLat)) {
    filtered.sort((a, b) => (a._distance || Infinity) - (b._distance || Infinity));
  } else if (sortBy === 'lastActive') {
    filtered.sort((a, b) => {
      const aTime = new Date(a.last_seen || a.updated_at || 0).getTime();
      const bTime = new Date(b.last_seen || b.updated_at || 0).getTime();
      return bTime - aTime;
    });
  } else if (sortBy === 'newest') {
    filtered.sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });
  }
  
  // Clean up internal distance field
  filtered.forEach(p => delete p._distance);
  
  return filtered;
};

const normalizeGender = (value) => String(value || '').trim().toLowerCase();

const isFemaleGender = (value) => {
  const g = normalizeGender(value);
  return g === 'f' || g.includes('female') || g.includes('woman');
};

const getPhotoPolicyAck = ({ row, meta }) => {
  const candidates = [
    row?.photo_policy_ack,
    row?.photoPolicyAck,
    meta?.photo_policy_ack,
    meta?.photoPolicyAck,
  ];
  for (const v of candidates) {
    if (v === true) return true;
    if (v === false) return false;
  }
  return null;
};

const getGenderValue = ({ row, meta }) => {
  return row?.gender ?? meta?.gender ?? row?.sex ?? meta?.sex ?? null;
};

const buildFallbackProfiles = () => {
  return [
    {
      id: 'profile_123',
      authUserId: 'fallback_auth_123',
      username: 'alex_hm',
      display_name: 'Alex',
      profileName: '@alex_hm',
      title: 'Gym rat, beach lover',
      locationLabel: 'London',
      city: 'London',
      profileType: 'creator',
      bio: 'Gym rat, beach lover',
      gender: 'male',
      photo_policy_ack: true,
      geoLat: 51.5074,
      geoLng: -0.1278,
      photos: [
        {
          url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80',
          isPrimary: true,
        },
        {
          url: 'https://images.unsplash.com/photo-1520975693411-6c5fe1e26f0a?auto=format&fit=crop&w=1200&q=80',
          isPrimary: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1520975958221-0a3f65a2b9f5?auto=format&fit=crop&w=1200&q=80',
          isPrimary: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
          isPrimary: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1200&q=80',
          isPrimary: false,
        },
      ],
    },
    {
      id: 'profile_124',
      authUserId: 'fallback_auth_124',
      username: 'jay_seller',
      display_name: 'Jay',
      profileName: '@jay_seller',
      title: 'Late-night walks, loud music, no drama',
      locationLabel: 'London',
      city: 'London',
      profileType: 'seller',
      sellerTagline: 'Clubwear drops + limited runs',
      bio: 'Late-night walks, loud music, no drama',
      gender: 'male',
      photo_policy_ack: true,
      geoLat: 51.5099,
      geoLng: -0.1181,
      photos: [
        {
          url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80',
          isPrimary: true,
        },
        {
          url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80',
          isPrimary: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1520962917960-20a70b7f212a?auto=format&fit=crop&w=1200&q=80',
          isPrimary: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1520974735194-6a9a3a559b97?auto=format&fit=crop&w=1200&q=80',
          isPrimary: false,
        },
        {
          url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
          isPrimary: false,
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

  const unwrap = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'object') {
      if (Array.isArray(value.urls)) return value.urls;
      if (Array.isArray(value.items)) return value.items;
      if (Array.isArray(value.photos)) return value.photos;
    }
    return [];
  };

  const list = unwrap(rawPhotos);
  for (const item of list) {
    if (typeof item === 'string') {
      const url = item.trim();
      if (!url) continue;
      if (out.some((p) => p.url === url)) continue;
      out.push({ url, isPrimary: out.length === 0 });
      continue;
    }

    if (!item || typeof item !== 'object') continue;
    const url = String(item.url || item.file_url || item.href || '').trim();
    if (!url) continue;

    const isPrimary = !!(item.isPrimary ?? item.is_primary ?? item.primary);
    const isPremium = !!(item.is_premium ?? item.isPremium ?? item.premium);

    if (out.some((p) => p.url === url)) continue;
    out.push({ url, isPrimary: isPrimary || out.length === 0, ...(isPremium ? { is_premium: true } : {}) });
  }

  const primaryIndex = out.findIndex((p) => p.isPrimary);
  const normalized = out.map((p, idx) => ({ ...p, isPrimary: primaryIndex === -1 ? idx === 0 : idx === primaryIndex }));
  return normalized.slice(0, 5);
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const normalizeDetails = (details) => {
  if (!details) return null;
  if (typeof details === 'object') return details;
  if (typeof details === 'string') {
    try {
      const parsed = JSON.parse(details);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
};

const getHasProductsMap = async ({ client, emails }) => {
  const list = (Array.isArray(emails) ? emails : [])
    .map((e) => normalizeEmail(e))
    .filter(Boolean);
  if (!client || list.length === 0) return new Map();

  const uniq = Array.from(new Set(list));
  const out = new Map(uniq.map((e) => [e, false]));

  try {
    const { data, error } = await client
      .from('products')
      .select('seller_email')
      .eq('status', 'active')
      .in('seller_email', uniq)
      .limit(2000);

    if (error) return out;
    const rows = Array.isArray(data) ? data : [];
    for (const row of rows) {
      const email = normalizeEmail(row?.seller_email);
      if (!email) continue;
      if (out.has(email)) out.set(email, true);
    }
  } catch {
    return out;
  }

  return out;
};

const getProductPreviewUrl = (product) => {
  const urls = Array.isArray(product?.image_urls) ? product.image_urls : [];
  for (const raw of urls) {
    const url = typeof raw === 'string' ? raw.trim() : '';
    if (url) return url;
  }

  const details = normalizeDetails(product?.details);
  const detailUrls = Array.isArray(details?.image_urls) ? details.image_urls : [];
  for (const raw of detailUrls) {
    const url = typeof raw === 'string' ? raw.trim() : '';
    if (url) return url;
  }

  return null;
};

const getProductPreviewsMap = async ({ client, emails, maxPerSeller = 3 }) => {
  const list = (Array.isArray(emails) ? emails : [])
    .map((e) => normalizeEmail(e))
    .filter(Boolean);
  if (!client || list.length === 0) return new Map();

  const uniq = Array.from(new Set(list));
  const out = new Map();

  try {
    const { data, error } = await client
      .from('products')
      .select('id,seller_email,image_urls,details,updated_at,created_at,status')
      .eq('status', 'active')
      .in('seller_email', uniq)
      .order('updated_at', { ascending: false })
      .limit(2000);

    if (error) return out;
    const rows = Array.isArray(data) ? data : [];

    for (const row of rows) {
      const email = normalizeEmail(row?.seller_email);
      if (!email) continue;

      const url = getProductPreviewUrl(row);
      if (!url) continue;

      const current = out.get(email) || [];
      if (current.length >= maxPerSeller) continue;
      if (current.some((p) => p?.imageUrl === url)) continue;

      current.push({
        id: row?.id ? String(row.id) : undefined,
        imageUrl: url,
      });

      out.set(email, current);
    }
  } catch {
    return out;
  }

  return out;
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

/**
 * Fetch secondary profiles for discovery
 * Returns active, non-expired secondary profiles with their effective data
 */
const fetchSecondaryProfilesForDiscovery = async ({ serviceClient, viewerUserId, viewerAttributes, offset, limit }) => {
  try {
    // Fetch active, non-expired secondary profiles
    const { data: secondaryProfiles, error } = await serviceClient
      .from('profiles')
      .select(`
        *,
        profile_overrides (*)
      `)
      .eq('kind', 'SECONDARY')
      .eq('active', true)
      .is('deleted_at', null)
      .or('expires_at.is.null,expires_at.gt.now()')
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[fetchSecondaryProfilesForDiscovery] Error:', error);
      return [];
    }

    if (!secondaryProfiles || secondaryProfiles.length === 0) {
      return [];
    }

    // Batch check visibility for all profiles
    const profileIds = secondaryProfiles.map((p) => p.id);
    const visibilityMap = await batchCheckVisibility({
      viewerUserId,
      viewerAttributes,
      profileIds,
      serviceClient,
    });

    // Filter to only visible profiles
    const visibleProfiles = secondaryProfiles.filter((p) => visibilityMap.get(p.id) === true);

    // Resolve effective profiles for visible ones
    const effectiveProfiles = [];
    for (const profile of visibleProfiles) {
      const effective = await resolveEffectiveProfile({
        profileId: profile.id,
        serviceClient,
      });
      if (effective) {
        effectiveProfiles.push(effective);
      }
    }

    return effectiveProfiles;
  } catch (err) {
    console.error('[fetchSecondaryProfilesForDiscovery] Unexpected error:', err);
    return [];
  }
};

/**
 * Convert secondary profile to discovery grid item format
 */
const mapSecondaryProfileToGridItem = (effectiveProfile, tagMap, hasProductsByEmail, productPreviewsByEmail) => {
  const lat = Number(effectiveProfile?.effective_lat ?? effectiveProfile?.lat);
  const lng = Number(effectiveProfile?.effective_lng ?? effectiveProfile?.lng);
  
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  // Privacy: use username, never expose email
  const username = effectiveProfile?.username ? String(effectiveProfile.username).trim() : null;
  const displayName = effectiveProfile?.display_name ? String(effectiveProfile.display_name).trim() : null;
  const publicName = displayName || (username ? `@${username}` : 'Anonymous');
  
  // Keep email for internal lookups only
  const emailInternal = effectiveProfile?.email ? String(effectiveProfile.email).trim().toLowerCase() : null;
  const avatar = String(effectiveProfile?.avatar_url || '').trim();
  
  const photos = normalizePhotos(effectiveProfile?.photos, avatar);
  const city = effectiveProfile?.city || effectiveProfile?.effective_location_label;
  const profileType = effectiveProfile?.profile_type || 'standard';
  const bio = effectiveProfile?.bio || null;

  const tier = String(effectiveProfile?.subscription_tier || '').toUpperCase();
  const tierLabel = tier === 'PAID' ? 'Member (PAID)' : 'Member';
  const title = bio ? toShortHeadline(bio, tierLabel) : tierLabel;

  const tags = emailInternal ? tagMap.get(emailInternal) : null;
  const safeTags = Array.isArray(tags) ? tags.slice(0, 5) : [];

  const isSellerProfile = String(profileType).trim().toLowerCase() === 'seller';
  const hasProducts = isSellerProfile && emailInternal ? hasProductsByEmail.get(emailInternal) === true : undefined;
  const productPreviews = isSellerProfile && emailInternal ? productPreviewsByEmail.get(emailInternal) : undefined;

  return {
    id: `profile_${effectiveProfile.profile_id}`,
    profile_id: effectiveProfile.profile_id,
    profile_kind: effectiveProfile.profile_kind,
    profile_type_key: effectiveProfile.profile_type_key,
    profile_type_label: effectiveProfile.profile_type_label,
    // Privacy: expose username instead of email
    username: username || undefined,
    display_name: displayName || undefined,
    authUserId: effectiveProfile?.auth_user_id || undefined,
    profileName: publicName,
    title,
    locationLabel: city || 'Nearby',
    city: city || undefined,
    profileType: profileType || undefined,
    hasProducts,
    productPreviews: Array.isArray(productPreviews) && productPreviews.length ? productPreviews : undefined,
    bio: bio || undefined,
    gender: effectiveProfile?.gender || undefined,
    tags: safeTags,
    geoLat: lat,
    geoLng: lng,
    photos,
    isSecondaryProfile: effectiveProfile.profile_kind === 'SECONDARY',
  };
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

  const requireAuth = isRunningOnVercel() || process.env.NODE_ENV === 'production';
  const accessToken = getBearerToken(req);
  if (requireAuth && !accessToken) {
    return json(res, 401, { error: 'Unauthorized' });
  }

  const cursorRaw = getQueryParam(req, 'cursor');
  const offset = clampInt(cursorRaw ?? 0, 0, 100000, 0);
  const limit = clampInt(getQueryParam(req, 'limit') ?? 40, 1, 60, 40);
  
  // Parse filter parameters
  const filters = parseFilters(req);

  const { error: supaErr, serviceClient, anonClient: anonClientFromEnv } = getSupabaseServerClients();

  if (accessToken && anonClientFromEnv) {
    const { data, error } = await anonClientFromEnv.auth.getUser(accessToken);
    if (error || !data?.user) {
      if (requireAuth) return json(res, 401, { error: 'Unauthorized' });
    }
  } else if (requireAuth && !anonClientFromEnv) {
    return json(res, 500, { error: 'Supabase server env not configured' });
  }

  // Prefer service role query when configured.
  if (!supaErr && serviceClient) {
    // Simple cursor pagination: cursor is an integer offset (opaque enough for demo).
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

    const sellerEmails = rows
      .filter((r) => String(r?.profile_type || '').trim().toLowerCase() === 'seller')
      .map((r) => r?.email)
      .filter(Boolean);
    const hasProductsByEmail = await getHasProductsMap({ client: serviceClient, emails: sellerEmails });
    const productPreviewsByEmail = await getProductPreviewsMap({ client: serviceClient, emails: sellerEmails, maxPerSeller: 3 });

    // Fetch active Right Now statuses for social proof
    let rightNowByEmail = new Map();
    try {
      const allEmails = rows.map((r) => r?.email).filter(Boolean);
      if (allEmails.length) {
        const { data: rightNowRows } = await serviceClient
          .from('right_now_status')
          .select('user_email, mode, expires_at')
          .eq('active', true)
          .gt('expires_at', new Date().toISOString())
          .in('user_email', allEmails);
        
        if (rightNowRows) {
          for (const row of rightNowRows) {
            const email = String(row.user_email).toLowerCase();
            rightNowByEmail.set(email, { mode: row.mode, expires_at: row.expires_at });
          }
        }
      }
    } catch {
      // ignore - right_now_status might not exist
    }

    const mapped = rows
      .map((row) => {
        const lat = Number(row?.last_lat ?? row?.lat);
        const lng = Number(row?.last_lng ?? row?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        // Privacy: prefer username over email for public display
        const username = row?.username ? String(row.username).trim() : null;
        const displayName = row?.display_name ? String(row.display_name).trim() : null;
        const fullName = String(row?.full_name || '').trim();
        
        // Use username for public-facing name, never expose full_name or email
        const publicName = displayName || (username ? `@${username}` : 'Anonymous');
        
        const dedupeKey = String(row?.auth_user_id || username || row?.id || 'unknown').trim();
        const avatar = String(row?.avatar_url || '').trim();
        // Keep email for internal lookups only, not exposed in response
        const emailInternal = row?.email ? String(row.email).trim().toLowerCase() : null;
        const authUserId = row?.auth_user_id ? String(row.auth_user_id).trim() : null;

        const meta = authUserId ? authMetaById.get(authUserId) : null;

        const gender = getGenderValue({ row, meta });
        const photoPolicyAck = getPhotoPolicyAck({ row, meta });
        if (isFemaleGender(gender)) return null;
        if (photoPolicyAck === false) return null;

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

        const tags = emailInternal ? tagMap.get(emailInternal) : null;
        const safeTags = Array.isArray(tags) ? tags.slice(0, 5) : [];

        const isSellerProfile = profileType && String(profileType).trim().toLowerCase() === 'seller';
        const hasProducts = isSellerProfile && emailInternal ? hasProductsByEmail.get(emailInternal) === true : undefined;
        const productPreviews = isSellerProfile && emailInternal ? productPreviewsByEmail.get(emailInternal) : undefined;

        // Calculate online status
        const lastSeen = row?.last_seen || row?.updated_at;
        const lastSeenDate = lastSeen ? new Date(lastSeen) : null;
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
        const onlineNow = lastSeenDate && lastSeenDate.getTime() > fifteenMinutesAgo;
        const recentlyActive = lastSeenDate && lastSeenDate.getTime() > fiveMinutesAgo;
        
        // Get Right Now status for social proof
        const rightNowStatus = emailInternal ? rightNowByEmail.get(emailInternal) : null;

        return {
          id: `profile_${dedupeKey}`,
          // Privacy: expose username instead of email
          username: username || undefined,
          display_name: displayName || undefined,
          // NEVER expose email in public API responses - use username for identification
          authUserId: authUserId || undefined,
          profileName: publicName,
          title,
          locationLabel: city || 'Nearby',
          city: city || undefined,
          profileType: profileType || undefined,
          hasProducts,
          productPreviews: Array.isArray(productPreviews) && productPreviews.length ? productPreviews : undefined,
          bio: bio || undefined,
          gender: normalizeGender(gender) || undefined,
          photo_policy_ack: photoPolicyAck === true ? true : undefined,
          tag_ids: safeTags,
          sellerTagline,
          sellerBio,
          shopBannerUrl,
          tags: safeTags,
          geoLat: lat,
          geoLng: lng,
          photos,
          // Social proof fields
          last_seen: lastSeen || undefined,
          onlineNow: onlineNow || undefined,
          recentlyActive: recentlyActive || undefined,
          rightNow: rightNowStatus ? true : undefined,
          rightNowMode: rightNowStatus?.mode || undefined,
        };
      })
      .filter(Boolean);

    const deduped = dedupeItems(mapped);
    
    // Include secondary profiles if feature is enabled
    let allItems = [...deduped];
    if (isSecondaryProfilesEnabled()) {
      try {
        // Get viewer info for visibility checks
        let viewerUserId = null;
        let viewerAttributes = {};
        
        if (accessToken && anonClientFromEnv) {
          const { data: userData } = await anonClientFromEnv.auth.getUser(accessToken);
          if (userData?.user) {
            viewerUserId = userData.user.id;
            // Get viewer's User record for attributes
            const { data: viewerRecord } = await serviceClient
              .from('User')
              .select('*')
              .eq('auth_user_id', viewerUserId)
              .maybeSingle();
            
            if (viewerRecord) {
              viewerAttributes = {
                lat: filters.viewerLat || viewerRecord.lat,
                lng: filters.viewerLng || viewerRecord.lng,
                age: viewerRecord.age,
                sexual_preferences: viewerRecord.sexual_orientation,
                tribes: viewerRecord.tribes,
              };
            }
          }
        }

        // Fetch secondary profiles
        const secondaryProfiles = await fetchSecondaryProfilesForDiscovery({
          serviceClient,
          viewerUserId,
          viewerAttributes,
          offset: 0,
          limit: 20, // Limit secondary profiles per page
        });

        // Map secondary profiles to grid items
        const secondaryItems = secondaryProfiles
          .map((p) => mapSecondaryProfileToGridItem(p, tagMap, hasProductsByEmail, productPreviewsByEmail))
          .filter(Boolean);

        // Merge with main profiles
        allItems = [...deduped, ...secondaryItems];
      } catch (err) {
        console.error('[profiles] Secondary profiles fetch error:', err);
        // Continue with just main profiles
      }
    }
    
    const items = applyFilters(allItems, filters);
    const nextCursor = rows.length === limit ? String(offset + limit) : null;
    return json(res, 200, { 
      items, 
      nextCursor, 
      appliedFilters: Object.keys(filters).length > 0 ? filters : undefined,
      personasEnabled: isSecondaryProfilesEnabled(),
    });
  }

  // Fallback: if service role key isn't configured (common in local dev),
  // use an authenticated Supabase RPC that does not require the service role key.
  const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', ['VITE_SUPABASE_ANON_KEY']);

  if (!supabaseUrl || !supabaseAnonKey || !accessToken) {
    const items = offset === 0 ? buildFallbackProfiles() : [];
    const unique = dedupeItems(items);
    return json(res, 200, { items: unique, nextCursor: offset === 0 ? String(items.length) : null });
  }

  const authedAnonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const { data, error } = await authedAnonClient.rpc('list_profiles_secure', {
    p_offset: offset,
    p_limit: limit,
  });

  if (error) {
    const items = offset === 0 ? buildFallbackProfiles() : [];
    const unique = dedupeItems(items);
    return json(res, 200, { items: unique, nextCursor: offset === 0 ? String(items.length) : null });
  }

  const rows = Array.isArray(data) ? data : [];

  const sellerEmails = rows
    .filter((r) => String(r?.profile_type || '').trim().toLowerCase() === 'seller')
    .map((r) => r?.email)
    .filter(Boolean);
  const hasProductsByEmail = await getHasProductsMap({ client: authedAnonClient, emails: sellerEmails });
  const productPreviewsByEmail = await getProductPreviewsMap({ client: authedAnonClient, emails: sellerEmails, maxPerSeller: 3 });

  let tagMap = new Map();
  try {
    const emails = rows
      .map((r) => (r?.email ? String(r.email).trim().toLowerCase() : null))
      .filter(Boolean);
    if (emails.length) {
      const { data: tagRows } = await authedAnonClient
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

      // Privacy: prefer username over email for public display
      const username = row?.username ? String(row.username).trim() : null;
      const displayName = row?.display_name ? String(row.display_name).trim() : null;
      const publicName = displayName || (username ? `@${username}` : 'Anonymous');
      
      const dedupeKey = String(row?.auth_user_id || username || row?.id || 'unknown').trim();
      const avatar = String(row?.avatar_url || '').trim();
      // Keep email for internal lookups only
      const emailInternal = row?.email ? String(row.email).trim().toLowerCase() : null;
      const authUserId = row?.auth_user_id ? String(row.auth_user_id).trim() : null;

      const gender = row?.gender ?? row?.sex ?? null;
      const photoPolicyAckRaw = row?.photo_policy_ack ?? row?.photoPolicyAck;
      const photoPolicyAck = photoPolicyAckRaw === true ? true : photoPolicyAckRaw === false ? false : null;
      if (isFemaleGender(gender)) return null;
      if (photoPolicyAck === false) return null;

      const photos = normalizePhotos(row?.photos, avatar);

      const sellerTagline = row?.seller_tagline ? String(row.seller_tagline).trim() : undefined;
      const sellerBio = row?.seller_bio ? String(row.seller_bio).trim() : undefined;
      const shopBannerUrl = row?.shop_banner_url ? String(row.shop_banner_url).trim() : undefined;

      const tier = String(row?.subscription_tier || '').toUpperCase();
      const tierLabel = tier === 'PAID' ? 'Member (PAID)' : 'Member';

      const city = row?.city ? String(row.city).trim() : null;
      const profileType = row?.profile_type ? String(row.profile_type).trim() : null;
      const isSellerProfile = profileType && String(profileType).trim().toLowerCase() === 'seller';
      const hasProducts = isSellerProfile && emailInternal ? hasProductsByEmail.get(emailInternal) === true : undefined;
      const productPreviews = isSellerProfile && emailInternal ? productPreviewsByEmail.get(emailInternal) : undefined;

      const bio = row?.bio ? String(row.bio).trim() : null;
      const title = toShortHeadline(bio, tierLabel);

      const tags = emailInternal ? tagMap.get(emailInternal) : null;
      const safeTags = Array.isArray(tags) ? tags.slice(0, 3) : [];

      return {
        id: `profile_${dedupeKey}`,
        // Privacy: expose username instead of email
        username: username || undefined,
        display_name: displayName || undefined,
        authUserId: authUserId || undefined,
        profileName: publicName,
        title,
        locationLabel: city || 'Nearby',
        city: city || undefined,
        profileType: profileType || undefined,
        hasProducts,
        productPreviews: Array.isArray(productPreviews) && productPreviews.length ? productPreviews : undefined,
        bio: bio || undefined,
        gender: normalizeGender(gender) || undefined,
        photo_policy_ack: photoPolicyAck === true ? true : undefined,
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

  const deduped = dedupeItems(mapped);
  const items = applyFilters(deduped, filters);
  const nextCursor = rows.length === limit ? String(offset + limit) : null;
  return json(res, 200, { items, nextCursor, appliedFilters: Object.keys(filters).length > 0 ? filters : undefined });
}
