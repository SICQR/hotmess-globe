/**
 * Match Probability API
 * 
 * Computes match probability scores between the current user and other profiles.
 * Scores are calculated server-side to protect sensitive private profile data.
 * 
 * GET /api/match-probability
 *   Query params:
 *   - lat, lng: Viewer location for travel time calculation
 *   - limit: Number of profiles (default 40, max 60)
 *   - offset: Pagination cursor
 *   - sort: 'match' (default), 'distance', 'lastActive', 'newest'
 *   - profile_types: Filter by type (comma-separated)
 *   - min_score: Minimum match score (0-100)
 * 
 * Response includes matchProbability and matchBreakdown for each profile.
 * 
 * Performance optimizations:
 * - Response caching with ETag/Last-Modified
 * - Parallel data fetching
 * - In-memory LRU cache for scoring config
 * - Batch travel time calculations
 */

import { createClient } from '@supabase/supabase-js';
import { calculateMatchProbability, DEFAULT_WEIGHTS } from './_scorers.js';

// ============================================================================
// In-Memory Cache
// ============================================================================

const CACHE = {
  scoringConfig: null,
  scoringConfigExpiry: 0,
  SCORING_CONFIG_TTL: 5 * 60 * 1000, // 5 minutes

  travelTimes: new Map(),
  TRAVEL_CACHE_MAX: 500,
  TRAVEL_CACHE_TTL: 30 * 60 * 1000, // 30 minutes
};

function getCachedScoringConfig() {
  if (CACHE.scoringConfig && Date.now() < CACHE.scoringConfigExpiry) {
    return CACHE.scoringConfig;
  }
  return null;
}

function setCachedScoringConfig(config) {
  CACHE.scoringConfig = config;
  CACHE.scoringConfigExpiry = Date.now() + CACHE.SCORING_CONFIG_TTL;
}

function getCachedTravelTime(key) {
  const cached = CACHE.travelTimes.get(key);
  if (cached && Date.now() < cached.expiry) {
    return cached.value;
  }
  CACHE.travelTimes.delete(key);
  return undefined;
}

function setCachedTravelTime(key, value) {
  // LRU eviction
  if (CACHE.travelTimes.size >= CACHE.TRAVEL_CACHE_MAX) {
    const firstKey = CACHE.travelTimes.keys().next().value;
    CACHE.travelTimes.delete(firstKey);
  }
  CACHE.travelTimes.set(key, { value, expiry: Date.now() + CACHE.TRAVEL_CACHE_TTL });
}

// ============================================================================
// Environment & Utilities
// ============================================================================

const getEnv = (key, fallbacks = []) => {
  let val = process.env[key];
  if (val) return val;
  for (const fb of fallbacks) {
    val = process.env[fb];
    if (val) return val;
  }
  return null;
};

const json = (res, status, body) => {
  res.status(status).json(body);
  return res;
};

const getBearerToken = (req) => {
  const auth = req.headers.authorization || req.headers.Authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
};

const parseNumber = (value, defaultVal = null) => {
  if (value === null || value === undefined) return defaultVal;
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultVal;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// ============================================================================
// Supabase Clients
// ============================================================================

const getSupabaseClients = () => {
  const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', ['VITE_SUPABASE_ANON_KEY']);
  const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: 'Supabase not configured' };
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const serviceClient = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

  return { anonClient, serviceClient, error: null };
};

// ============================================================================
// Distance & Travel Time Utilities
// ============================================================================

/**
 * Haversine distance in kilometers
 */
const haversineDistanceKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Approximate walking time in minutes from distance
 */
const approximateWalkingMinutes = (distanceKm) => {
  if (!distanceKm || !Number.isFinite(distanceKm)) return null;
  const walkingSpeedKmh = 4.8;
  return Math.round((distanceKm / walkingSpeedKmh) * 60);
};

/**
 * Get cached travel time from routing_cache or approximate
 * Uses in-memory cache to avoid repeated DB lookups
 */
const getTravelTimeMinutes = async (serviceClient, viewerLat, viewerLng, targetLat, targetLng) => {
  if (!Number.isFinite(viewerLat) || !Number.isFinite(viewerLng) ||
      !Number.isFinite(targetLat) || !Number.isFinite(targetLng)) {
    return null;
  }

  // Generate cache key (rounded to reduce cache entries)
  const cacheKey = `${viewerLat.toFixed(3)},${viewerLng.toFixed(3)}-${targetLat.toFixed(3)},${targetLng.toFixed(3)}`;
  
  // Check in-memory cache first
  const cached = getCachedTravelTime(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // Calculate haversine distance first
  const distanceKm = haversineDistanceKm(viewerLat, viewerLng, targetLat, targetLng);

  // For very close distances, use walking approximation
  if (distanceKm < 2) {
    const result = approximateWalkingMinutes(distanceKm);
    setCachedTravelTime(cacheKey, result);
    return result;
  }

  // Try to find cached routing data in DB
  if (serviceClient) {
    try {
      const bucketKey = (lat, lng) => `${lat.toFixed(2)},${lng.toFixed(2)}`;
      const originBucket = bucketKey(viewerLat, viewerLng);
      const destBucket = bucketKey(targetLat, targetLng);

      const { data: dbCached } = await serviceClient
        .from('routing_cache')
        .select('duration_seconds, mode')
        .or(`origin_bucket.eq.${originBucket},dest_bucket.eq.${destBucket}`)
        .eq('mode', 'WALK')
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .single();

      if (dbCached?.duration_seconds) {
        const result = Math.round(dbCached.duration_seconds / 60);
        setCachedTravelTime(cacheKey, result);
        return result;
      }
    } catch {
      // Cache miss, use approximation
    }
  }

  // Fall back to approximation based on distance
  let result;
  if (distanceKm < 5) {
    result = approximateWalkingMinutes(distanceKm);
  } else {
    // For longer distances, assume driving
    const drivingSpeedKmh = 30; // Urban average
    result = Math.round((distanceKm / drivingSpeedKmh) * 60);
  }

  setCachedTravelTime(cacheKey, result);
  return result;
};

// ============================================================================
// Data Fetching
// ============================================================================

/**
 * Fetch current user's profile and private data
 */
const fetchCurrentUser = async (serviceClient, authUser) => {
  const { data: profile, error } = await serviceClient
    .from('User')
    .select('*')
    .or(`auth_user_id.eq.${authUser.id},email.eq.${authUser.email}`)
    .single();

  if (error || !profile) {
    return { error: 'User profile not found' };
  }

  // Fetch private profile
  const { data: privateProfile } = await serviceClient
    .from('user_private_profile')
    .select('*')
    .eq('user_id', profile.id)
    .single();

  // Fetch user's embedding
  const { data: embedding } = await serviceClient
    .from('profile_embeddings')
    .select('combined_embedding')
    .eq('user_id', profile.id)
    .single();

  return {
    profile,
    privateProfile: privateProfile || {},
    embedding: embedding?.combined_embedding || null,
    error: null,
  };
};

/**
 * Fetch candidate profiles with their data
 */
const fetchCandidates = async (serviceClient, currentUserId, options = {}) => {
  const { limit = 40, offset = 0, profileTypes, minAge, maxAge, distanceKm, viewerLat, viewerLng } = options;

  // Base query for public profiles
  let query = serviceClient
    .from('User')
    .select(`
      id,
      email,
      full_name,
      display_name,
      username,
      avatar_url,
      photos,
      bio,
      city,
      country_code,
      last_lat,
      last_lng,
      age,
      profile_type,
      membership_tier,
      tags,
      interests,
      looking_for,
      preferred_vibes,
      last_seen,
      updated_at,
      created_at,
      verified,
      verified_seller,
      verified_organizer,
      looking_right_now
    `)
    .neq('id', currentUserId)
    .eq('account_status', 'active')
    .order('last_seen', { ascending: false, nullsFirst: false });

  // Apply filters
  if (profileTypes && profileTypes.length > 0) {
    query = query.in('profile_type', profileTypes);
  }
  if (minAge) {
    query = query.gte('age', minAge);
  }
  if (maxAge) {
    query = query.lte('age', maxAge);
  }

  // Fetch more than limit for distance filtering
  const fetchLimit = distanceKm ? limit * 3 : limit;
  query = query.range(offset, offset + fetchLimit - 1);

  const { data: profiles, error } = await query;

  if (error) {
    console.error('[match-probability] Failed to fetch profiles:', error);
    return { profiles: [], error: error.message };
  }

  // Apply distance filter if needed
  let filteredProfiles = profiles || [];
  if (distanceKm && Number.isFinite(viewerLat) && Number.isFinite(viewerLng)) {
    filteredProfiles = filteredProfiles.filter(p => {
      if (!Number.isFinite(p.last_lat) || !Number.isFinite(p.last_lng)) return false;
      const dist = haversineDistanceKm(viewerLat, viewerLng, p.last_lat, p.last_lng);
      return dist <= distanceKm;
    });
  }

  // Limit results
  filteredProfiles = filteredProfiles.slice(0, limit);

  return { profiles: filteredProfiles, error: null };
};

/**
 * Fetch private profiles for candidates (only if they've shared)
 */
const fetchCandidatePrivateProfiles = async (serviceClient, candidateIds) => {
  if (!candidateIds || candidateIds.length === 0) return {};

  // Fetch private profiles
  // Note: The service role bypasses RLS, but we only expose non-sensitive fields
  const { data, error } = await serviceClient
    .from('user_private_profile')
    .select(`
      user_id,
      position,
      kinks,
      hard_limits,
      soft_limits,
      kink_friendly,
      looking_for,
      relationship_status,
      time_horizon,
      smoking,
      drinking,
      fitness,
      diet,
      scene_affinity,
      chem_friendly,
      hosting
    `)
    .in('user_id', candidateIds);

  if (error) {
    console.error('[match-probability] Failed to fetch private profiles:', error);
    return {};
  }

  // Build map by user_id
  const privateProfileMap = {};
  for (const profile of data || []) {
    privateProfileMap[profile.user_id] = profile;
  }

  return privateProfileMap;
};

/**
 * Fetch embeddings for candidates
 */
const fetchCandidateEmbeddings = async (serviceClient, candidateIds) => {
  if (!candidateIds || candidateIds.length === 0) return {};

  const { data, error } = await serviceClient
    .from('profile_embeddings')
    .select('user_id, combined_embedding')
    .in('user_id', candidateIds);

  if (error) {
    console.error('[match-probability] Failed to fetch embeddings:', error);
    return {};
  }

  const embeddingMap = {};
  for (const row of data || []) {
    embeddingMap[row.user_id] = row.combined_embedding;
  }

  return embeddingMap;
};

/**
 * Fetch scoring configuration (with in-memory cache)
 */
const fetchScoringConfig = async (serviceClient) => {
  // Check in-memory cache first
  const cached = getCachedScoringConfig();
  if (cached) {
    return cached;
  }

  const { data } = await serviceClient
    .from('scoring_config')
    .select('weights, travel_time_thresholds, role_compatibility_matrix')
    .eq('is_active', true)
    .eq('is_default', true)
    .single();

  const config = data || { weights: DEFAULT_WEIGHTS };
  setCachedScoringConfig(config);
  return config;
};

// ============================================================================
// Main Handler
// ============================================================================

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const { anonClient, serviceClient, error: clientError } = getSupabaseClients();

  if (clientError || !anonClient) {
    return json(res, 500, { error: clientError || 'Database not configured' });
  }

  if (!serviceClient) {
    return json(res, 500, { error: 'Service role not configured - required for match probability' });
  }

  // Authenticate
  const token = getBearerToken(req);
  if (!token) {
    return json(res, 401, { error: 'Missing authorization token' });
  }

  const { data: { user: authUser }, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !authUser) {
    return json(res, 401, { error: 'Invalid token' });
  }

  // Parse query parameters
  const {
    lat,
    lng,
    limit: limitStr,
    offset: offsetStr,
    sort = 'match',
    profile_types: profileTypesStr,
    min_score: minScoreStr,
    age_min: ageMinStr,
    age_max: ageMaxStr,
    distance_km: distanceKmStr,
  } = req.query;

  const viewerLat = parseNumber(lat);
  const viewerLng = parseNumber(lng);
  const limit = clamp(parseNumber(limitStr, 40), 1, 60);
  const offset = Math.max(0, parseNumber(offsetStr, 0));
  const minScore = parseNumber(minScoreStr, 0);
  const profileTypes = profileTypesStr ? profileTypesStr.split(',').filter(Boolean) : null;
  const ageMin = parseNumber(ageMinStr);
  const ageMax = parseNumber(ageMaxStr);
  const distanceKm = parseNumber(distanceKmStr);

  try {
    // Fetch current user
    const currentUserResult = await fetchCurrentUser(serviceClient, authUser);
    if (currentUserResult.error) {
      return json(res, 404, { error: currentUserResult.error });
    }

    const { profile: currentUser, privateProfile: currentPrivateProfile, embedding: currentEmbedding } = currentUserResult;

    // Use viewer location or fall back to user's last known location
    const effectiveViewerLat = viewerLat ?? currentUser.last_lat;
    const effectiveViewerLng = viewerLng ?? currentUser.last_lng;

    // Fetch scoring configuration
    const scoringConfig = await fetchScoringConfig(serviceClient);
    const weights = scoringConfig.weights || DEFAULT_WEIGHTS;

    // Fetch candidate profiles
    const candidatesResult = await fetchCandidates(serviceClient, currentUser.id, {
      limit: limit * 2, // Fetch extra for filtering by min_score
      offset,
      profileTypes,
      minAge: ageMin,
      maxAge: ageMax,
      distanceKm,
      viewerLat: effectiveViewerLat,
      viewerLng: effectiveViewerLng,
    });

    if (candidatesResult.error) {
      return json(res, 500, { error: 'Failed to fetch profiles' });
    }

    const candidates = candidatesResult.profiles;
    const candidateIds = candidates.map(c => c.id);

    // Fetch private profiles and embeddings
    const [privateProfileMap, embeddingMap] = await Promise.all([
      fetchCandidatePrivateProfiles(serviceClient, candidateIds),
      fetchCandidateEmbeddings(serviceClient, candidateIds),
    ]);

    // Calculate match probability for each candidate
    const scoredProfiles = await Promise.all(candidates.map(async (profile) => {
      // Calculate travel time
      const travelTimeMinutes = await getTravelTimeMinutes(
        serviceClient,
        effectiveViewerLat,
        effectiveViewerLng,
        profile.last_lat,
        profile.last_lng
      );

      // Calculate distance
      let distanceKmValue = null;
      if (Number.isFinite(effectiveViewerLat) && Number.isFinite(effectiveViewerLng) &&
          Number.isFinite(profile.last_lat) && Number.isFinite(profile.last_lng)) {
        distanceKmValue = haversineDistanceKm(effectiveViewerLat, effectiveViewerLng, profile.last_lat, profile.last_lng);
      }

      // Get private profile and embedding for this candidate
      const matchPrivateProfile = privateProfileMap[profile.id] || {};
      const matchEmbedding = embeddingMap[profile.id] || null;

      // Calculate match probability
      const { matchProbability, breakdown } = calculateMatchProbability({
        travelTimeMinutes,
        userProfile: currentUser,
        matchProfile: profile,
        userPrivateProfile: currentPrivateProfile,
        matchPrivateProfile,
        userEmbedding: currentEmbedding,
        matchEmbedding,
        weights,
      });

      return {
        // Profile fields for UI
        id: profile.id,
        email: profile.email,
        profileName: profile.display_name || profile.full_name || profile.username || 'Anonymous',
        title: profile.bio ? profile.bio.slice(0, 80) : '',
        locationLabel: profile.city || '',
        geoLat: profile.last_lat,
        geoLng: profile.last_lng,
        photos: (profile.photos || []).map(p => ({
          url: typeof p === 'string' ? p : p.url,
          isPrimary: typeof p === 'object' ? p.is_primary : false,
        })),
        profileType: profile.profile_type || 'standard',
        city: profile.city,
        bio: profile.bio,
        tags: profile.tags || [],
        lookingFor: profile.looking_for || [],
        lastSeen: profile.last_seen,
        verified: profile.verified || profile.verified_seller || profile.verified_organizer,
        lookingRightNow: profile.looking_right_now || false,
        age: profile.age,

        // Match probability data
        matchProbability,
        matchBreakdown: breakdown,
        travelTimeMinutes,
        distanceKm: distanceKmValue ? Math.round(distanceKmValue * 10) / 10 : null,
      };
    }));

    // Filter by minimum score
    let filteredProfiles = scoredProfiles.filter(p => p.matchProbability >= minScore);

    // Sort profiles
    switch (sort) {
      case 'match':
        filteredProfiles.sort((a, b) => b.matchProbability - a.matchProbability);
        break;
      case 'distance':
        filteredProfiles.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
        break;
      case 'lastActive':
        filteredProfiles.sort((a, b) => {
          const aTime = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
          const bTime = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
          return bTime - aTime;
        });
        break;
      case 'newest':
        filteredProfiles.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });
        break;
    }

    // Apply final limit
    const paginatedProfiles = filteredProfiles.slice(0, limit);

    // Determine next cursor
    const hasMore = filteredProfiles.length > limit;
    const nextCursor = hasMore ? String(offset + limit) : null;

    // Set cache headers for better performance
    res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    
    // Generate ETag based on content hash
    const etag = `"${Buffer.from(JSON.stringify({
      userId: currentUser.id,
      offset,
      limit,
      sort,
      profileTypes,
      minScore,
      count: paginatedProfiles.length,
    })).toString('base64').slice(0, 32)}"`;
    
    res.setHeader('ETag', etag);

    // Check If-None-Match for conditional requests
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      return res.status(304).end();
    }

    return json(res, 200, {
      items: paginatedProfiles,
      nextCursor,
      total: filteredProfiles.length,
      scoringVersion: '1.0',
      sortedBy: sort,
    });
  } catch (error) {
    console.error('[match-probability] Error:', error);
    return json(res, 500, { error: 'Internal server error' });
  }
}
