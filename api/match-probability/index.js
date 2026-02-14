/**
 * Match Probability API Endpoint
 * 
 * GET /api/match-probability
 * 
 * Query params:
 *   - lat: Viewer latitude (required for travel time scoring)
 *   - lng: Viewer longitude (required for travel time scoring)
 *   - limit: Max profiles to return (default: 40, max: 60)
 *   - offset/cursor: Pagination offset
 *   - sort: 'match' | 'distance' | 'lastActive' | 'newest' (default: 'match')
 * 
 * Response:
 *   {
 *     items: [{ ...profileFields, matchProbability, matchBreakdown, travelTimeMinutes }],
 *     nextCursor: string | null,
 *     scoringVersion: string
 *   }
 */

import { getBearerToken, json } from '../shopify/_utils.js';
import { getSupabaseServerClients, getAuthedUser, parseNumber, clampInt, bucketLatLng } from '../routing/_utils.js';
import { computeMatchScore, DEFAULT_WEIGHTS } from './_scoring.js';

const SCORING_VERSION = '1.0';

const isRunningOnVercel = () => {
  const flag = process.env.VERCEL || process.env.VERCEL_ENV;
  return !!flag;
};

const haversineMeters = (a, b) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Math.round(R * c);
};

/**
 * Approximate travel time in minutes based on haversine distance
 * Used as fallback when Google Routes API is unavailable
 */
const approximateTravelMinutes = (distanceMeters, mode = 'DRIVE') => {
  const km = distanceMeters / 1000;
  
  // Speed estimates (km/h) for urban areas
  const speeds = {
    WALK: 4.8,
    DRIVE: 22,
    TRANSIT: 18,
    BICYCLE: 16,
  };
  
  const speedKmh = speeds[mode] || speeds.DRIVE;
  return Math.max(1, Math.round((km / speedKmh) * 60));
};

/**
 * Get cached travel times from routing_cache
 */
const getCachedTravelTimes = async ({ serviceClient, viewerBucket, targetBuckets }) => {
  if (!serviceClient || !viewerBucket || targetBuckets.length === 0) {
    return new Map();
  }

  try {
    // Build cache keys for DRIVE mode (primary for travel time scoring)
    const cacheKeys = targetBuckets.map((destBucket) => {
      const timeSlice = Math.floor(Date.now() / (120 * 1000)); // 2-minute buckets
      return {
        destBucket,
        cacheKey: `${viewerBucket}|${destBucket}|DRIVE|${timeSlice}`,
      };
    });

    const { data, error } = await serviceClient
      .from('routing_cache')
      .select('cache_key, duration_seconds')
      .in('cache_key', cacheKeys.map((k) => k.cacheKey))
      .gt('expires_at', new Date().toISOString());

    if (error || !data) return new Map();

    const resultMap = new Map();
    for (const row of data) {
      const keyObj = cacheKeys.find((k) => k.cacheKey === row.cache_key);
      if (keyObj) {
        resultMap.set(keyObj.destBucket, Math.round(row.duration_seconds / 60));
      }
    }
    return resultMap;
  } catch {
    return new Map();
  }
};

/**
 * Fetch scoring configuration from database
 */
const getScoringConfig = async (serviceClient) => {
  if (!serviceClient) return { weights: DEFAULT_WEIGHTS, version: SCORING_VERSION };

  try {
    const { data, error } = await serviceClient
      .from('scoring_config')
      .select('weights, version')
      .eq('id', 'default')
      .eq('enabled', true)
      .single();

    if (error || !data) {
      return { weights: DEFAULT_WEIGHTS, version: SCORING_VERSION };
    }

    return {
      weights: { ...DEFAULT_WEIGHTS, ...(data.weights || {}) },
      version: data.version || SCORING_VERSION,
    };
  } catch {
    return { weights: DEFAULT_WEIGHTS, version: SCORING_VERSION };
  }
};

/**
 * Normalize gender filter to exclude certain profiles
 */
const normalizeGender = (value) => String(value || '').trim().toLowerCase();

const isFemaleGender = (value) => {
  const g = normalizeGender(value);
  return g === 'f' || g.includes('female') || g.includes('woman');
};

/**
 * Normalize photos array from various formats
 */
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
      if (!url || out.some((p) => p.url === url)) continue;
      out.push({ url, isPrimary: out.length === 0 });
      continue;
    }

    if (!item || typeof item !== 'object') continue;
    const url = String(item.url || item.file_url || item.href || '').trim();
    if (!url || out.some((p) => p.url === url)) continue;

    const isPrimary = !!(item.isPrimary ?? item.is_primary ?? item.primary);
    out.push({ url, isPrimary: isPrimary || out.length === 0 });
  }

  return out.slice(0, 5);
};

/**
 * Build short headline from bio
 */
const toShortHeadline = (bio, fallback) => {
  const text = String(bio || '').trim();
  if (!text) return fallback;
  const oneLine = text.replace(/\s+/g, ' ');
  return oneLine.length > 80 ? `${oneLine.slice(0, 77)}…` : oneLine;
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

  const { error: supaErr, serviceClient, anonClient } = getSupabaseServerClients();

  if (supaErr || !anonClient) {
    return json(res, 500, { error: supaErr || 'Supabase not configured' });
  }

  // Authenticate user
  let authUser = null;
  if (accessToken) {
    const { user, error: authErr } = await getAuthedUser({ anonClient, accessToken });
    if (authErr && requireAuth) {
      return json(res, 401, { error: 'Invalid auth token' });
    }
    authUser = user;
  }

  // Parse query params
  const url = new URL(req.url, `http://${req.headers.host}`);
  const lat = parseNumber(url.searchParams.get('lat'));
  const lng = parseNumber(url.searchParams.get('lng'));
  const cursorRaw = url.searchParams.get('cursor') || url.searchParams.get('offset');
  const offset = clampInt(cursorRaw ?? 0, 0, 100000, 0);
  const limit = clampInt(url.searchParams.get('limit') ?? 40, 1, 60, 40);
  const sort = url.searchParams.get('sort') || 'match';

  const viewerLocation = (lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng))
    ? { lat, lng }
    : null;

  // If no service client, return basic response
  if (!serviceClient) {
    return json(res, 200, {
      items: [],
      nextCursor: null,
      scoringVersion: SCORING_VERSION,
      message: 'Service client not configured',
    });
  }

  try {
    // Get scoring configuration
    const { weights, version } = await getScoringConfig(serviceClient);

    // Fetch viewer's profile data
    let viewerProfile = null;
    let viewerPrivateProfile = null;
    let viewerEmbedding = null;

    if (authUser?.id) {
      // Get viewer's public profile
      const { data: viewerData } = await serviceClient
        .from('User')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .single();
      viewerProfile = viewerData;

      // Get viewer's private profile
      const { data: privateData } = await serviceClient
        .from('user_private_profile')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .single();
      viewerPrivateProfile = privateData;

      // Get viewer's embedding
      if (viewerProfile?.id) {
        const { data: embeddingData } = await serviceClient
          .from('profile_embeddings')
          .select('combined_embedding')
          .eq('user_id', viewerProfile.id)
          .single();
        viewerEmbedding = embeddingData?.combined_embedding;
      }
    }

    // Fetch candidate profiles
    let orderBy = 'last_loc_ts';
    let ascending = false;

    if (sort === 'newest') {
      orderBy = 'created_at';
      ascending = false;
    } else if (sort === 'lastActive') {
      orderBy = 'last_seen';
      ascending = false;
    }

    const { data: profiles, error: profilesErr } = await serviceClient
      .from('User')
      .select('*')
      .order(orderBy, { ascending, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (profilesErr) {
      return json(res, 500, { error: 'Failed to fetch profiles' });
    }

    const rows = Array.isArray(profiles) ? profiles : [];
    
    // Filter out viewer's own profile and invalid profiles
    const validProfiles = rows.filter((row) => {
      if (!row) return false;
      if (authUser?.id && row.auth_user_id === authUser.id) return false;
      
      const lat = Number(row?.last_lat ?? row?.lat);
      const lng = Number(row?.last_lng ?? row?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
      
      const gender = row?.gender ?? row?.sex;
      if (isFemaleGender(gender)) return false;
      
      return true;
    });

    // Batch fetch private profiles for candidates
    const authUserIds = validProfiles
      .map((p) => p.auth_user_id)
      .filter(Boolean);

    let privateProfilesMap = new Map();
    if (authUserIds.length > 0) {
      const { data: privateProfiles } = await serviceClient
        .from('user_private_profile')
        .select('*')
        .in('auth_user_id', authUserIds);

      if (privateProfiles) {
        for (const pp of privateProfiles) {
          if (pp.auth_user_id) {
            privateProfilesMap.set(pp.auth_user_id, pp);
          }
        }
      }
    }

    // Batch fetch embeddings
    const profileIds = validProfiles.map((p) => p.id).filter(Boolean);
    let embeddingsMap = new Map();
    
    if (profileIds.length > 0) {
      const { data: embeddings } = await serviceClient
        .from('profile_embeddings')
        .select('user_id, combined_embedding')
        .in('user_id', profileIds);

      if (embeddings) {
        for (const emb of embeddings) {
          if (emb.user_id) {
            embeddingsMap.set(emb.user_id, emb.combined_embedding);
          }
        }
      }
    }

    // Get cached travel times if viewer location is available
    let travelTimesMap = new Map();
    if (viewerLocation) {
      const viewerBucket = bucketLatLng(viewerLocation.lat, viewerLocation.lng, 2);
      const targetBuckets = validProfiles.map((p) => {
        const lat = Number(p.last_lat ?? p.lat);
        const lng = Number(p.last_lng ?? p.lng);
        return bucketLatLng(lat, lng, 2);
      });
      
      travelTimesMap = await getCachedTravelTimes({
        serviceClient,
        viewerBucket,
        targetBuckets: [...new Set(targetBuckets)],
      });
    }

    // Compute match scores for each profile
    const scoredProfiles = validProfiles.map((row) => {
      const lat = Number(row.last_lat ?? row.lat);
      const lng = Number(row.last_lng ?? row.lng);
      const matchPrivateProfile = privateProfilesMap.get(row.auth_user_id) || null;
      const matchEmbedding = embeddingsMap.get(row.id) || null;

      // Calculate travel time
      let travelTimeMinutes = null;
      if (viewerLocation) {
        const destBucket = bucketLatLng(lat, lng, 2);
        const cached = travelTimesMap.get(destBucket);
        
        if (cached !== undefined) {
          travelTimeMinutes = cached;
        } else {
          // Fallback to approximate
          const distance = haversineMeters(viewerLocation, { lat, lng });
          travelTimeMinutes = approximateTravelMinutes(distance);
        }
      }

      // Compute match score
      const { matchProbability, breakdown } = computeMatchScore({
        userProfile: viewerProfile,
        userPrivateProfile: viewerPrivateProfile,
        userEmbedding: viewerEmbedding,
        matchProfile: row,
        matchPrivateProfile,
        matchEmbedding,
        travelTimeMinutes,
        weights,
      });

      // Build response profile object
      const fullName = String(row.full_name || row.email || 'Unknown').trim();
      const avatar = String(row.avatar_url || '').trim();
      const city = row.city ? String(row.city).trim() : null;
      const bio = row.bio ? String(row.bio).trim() : null;
      const profileType = row.profile_type ? String(row.profile_type).trim() : null;

      return {
        id: `profile_${row.auth_user_id || row.email || fullName}`,
        email: row.email || undefined,
        authUserId: row.auth_user_id || undefined,
        profileName: fullName,
        title: toShortHeadline(bio, 'Member'),
        locationLabel: city || 'Nearby',
        city: city || undefined,
        profileType: profileType || undefined,
        bio: bio || undefined,
        geoLat: lat,
        geoLng: lng,
        photos: normalizePhotos(row.photos, avatar),
        // Match probability fields
        matchProbability,
        matchBreakdown: breakdown,
        travelTimeMinutes,
        // Sorting metadata
        lastSeen: row.last_seen,
        createdAt: row.created_at,
        distanceMeters: viewerLocation ? haversineMeters(viewerLocation, { lat, lng }) : null,
      };
    });

    // Sort by requested field
    let sortedProfiles = [...scoredProfiles];
    
    if (sort === 'match') {
      sortedProfiles.sort((a, b) => (b.matchProbability || 0) - (a.matchProbability || 0));
    } else if (sort === 'distance' && viewerLocation) {
      sortedProfiles.sort((a, b) => (a.distanceMeters || Infinity) - (b.distanceMeters || Infinity));
    } else if (sort === 'lastActive') {
      sortedProfiles.sort((a, b) => {
        const aTime = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
        const bTime = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
        return bTime - aTime;
      });
    } else if (sort === 'newest') {
      sortedProfiles.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
    }

    // Remove internal sorting metadata from response
    const items = sortedProfiles.map((p) => {
      const { lastSeen, createdAt, distanceMeters, ...rest } = p;
      return rest;
    });

    const nextCursor = rows.length === limit ? String(offset + limit) : null;

    return json(res, 200, {
      items,
      nextCursor,
      scoringVersion: version,
    });
  } catch (error) {
    return json(res, 500, { error: error?.message || 'Match probability calculation failed' });
  }
}
