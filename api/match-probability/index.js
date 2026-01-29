import {
  getBearerToken,
  getAuthedUser,
  getSupabaseServerClients,
  json,
  parseNumber,
  clampInt,
} from '../routing/_utils.js';
import {
  calculateTravelTimeScore,
  calculateRoleCompatScore,
  calculateKinkScore,
  calculateIntentScore,
  calculateSemanticScore,
  calculateLifestyleScore,
  calculateActivityScore,
  calculateCompletenessScore,
  aggregateMatchScore,
} from './_scoring.js';

/**
 * Match Probability API
 * 
 * Computes match scores for profiles based on multiple dimensions:
 * - Travel time (0-20 points)
 * - Role compatibility (0-15 points)
 * - Kink overlap (0-15 points)
 * - Intent alignment (0-12 points)
 * - Semantic text similarity (0-12 points)
 * - Lifestyle match (0-10 points)
 * - Activity recency (0-8 points)
 * - Profile completeness (0-8 points)
 * 
 * Total: 0-100 points
 */

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return json(res, 405, { error: 'Method not allowed' });
    }

    // Auth
    const { error: supaErr, anonClient, serviceClient } = getSupabaseServerClients();
    if (supaErr || !anonClient) {
      return json(res, 500, { error: supaErr || 'Supabase client unavailable' });
    }

    const accessToken = getBearerToken(req);
    if (!accessToken) {
      return json(res, 401, { error: 'Missing Authorization bearer token' });
    }

    const { user: authUser, error: authErr } = await getAuthedUser({ anonClient, accessToken });
    if (authErr || !authUser?.id) {
      return json(res, 401, { error: 'Invalid auth token' });
    }

    // Parse query parameters
    const lat = parseNumber(req.query?.lat);
    const lng = parseNumber(req.query?.lng);
    const limit = clampInt(req.query?.limit, 1, 100, 40);
    const offset = clampInt(req.query?.cursor, 0, 10000, 0);
    const sort = String(req.query?.sort || 'match').toLowerCase();
    const minMatch = clampInt(req.query?.minMatch, 0, 100, 0); // Minimum match % filter

    // Note: Sorting is applied per-page after fetching. For true global sorting
    // across all pages, clients should either fetch all results at once or
    // implement server-side scoring with a cache. Current implementation prioritizes
    // performance by computing scores only for the requested page.

    // Viewer location is optional but needed for travel time scoring
    const viewerLocation = (Number.isFinite(lat) && Number.isFinite(lng)) ? { lat, lng } : null;

    // Fetch current user's profile and private data
    const { data: userProfile, error: userProfileErr } = await (serviceClient || anonClient)
      .from('User')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .single();

    if (userProfileErr || !userProfile) {
      return json(res, 404, { error: 'User profile not found' });
    }

    const { data: userPrivate } = await (serviceClient || anonClient)
      .from('user_private_profile')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    const { data: userEmbedding } = await (serviceClient || anonClient)
      .from('profile_embeddings')
      .select('combined_embedding')
      .eq('user_id', userProfile.id)
      .maybeSingle();

    // Fetch candidate profiles (exclude self)
    // Note: For production, add additional filters like age range, distance, etc.
    let query = (serviceClient || anonClient)
      .from('User')
      .select('*')
      .neq('id', userProfile.id)
      .eq('account_status', 'active')
      .limit(limit);

    // Apply offset if provided
    if (offset > 0) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: candidates, error: candidatesErr } = await query;

    if (candidatesErr) {
      return json(res, 500, { error: 'Failed to fetch candidates', details: candidatesErr.message });
    }

    if (!candidates || candidates.length === 0) {
      return json(res, 200, { items: [], nextCursor: null, scoringVersion: '1.0' });
    }

    // Fetch private profiles for candidates (batch)
    const candidateIds = candidates.map(c => c.id);
    const { data: candidatePrivates } = await (serviceClient || anonClient)
      .from('user_private_profile')
      .select('*')
      .in('user_id', candidateIds);

    const privateMap = new Map();
    (candidatePrivates || []).forEach(p => privateMap.set(p.user_id, p));

    // Fetch embeddings for candidates (batch)
    const { data: candidateEmbeddings } = await (serviceClient || anonClient)
      .from('profile_embeddings')
      .select('user_id, combined_embedding')
      .in('user_id', candidateIds);

    const embeddingMap = new Map();
    (candidateEmbeddings || []).forEach(e => embeddingMap.set(e.user_id, e.combined_embedding));

    // Fetch travel times if viewer location provided
    const travelTimeMap = new Map();
    if (viewerLocation && serviceClient) {
      // Batch fetch travel times from routing_cache
      // For simplicity, we'll use walking mode and approximate if not cached
      const destinations = candidates.map(c => ({
        lat: c.geo_lat || c.geoLat,
        lng: c.geo_lng || c.geoLng,
        id: c.id,
      })).filter(d => Number.isFinite(d.lat) && Number.isFinite(d.lng));

      // For each destination, compute or fetch cached travel time
      // This is a simplified version; in production, use batch ETA endpoint
      for (const dest of destinations) {
        const distanceKm = haversineKm(viewerLocation, { lat: dest.lat, lng: dest.lng });
        const estimatedMinutes = Math.round((distanceKm / 5) * 60); // ~5 km/h walking speed
        travelTimeMap.set(dest.id, estimatedMinutes);
      }
    }

    // Score each candidate
    const scoredProfiles = candidates.map(candidate => {
      const candidatePrivate = privateMap.get(candidate.id) || {};
      const candidateEmbedding = embeddingMap.get(candidate.id);
      const travelTimeMinutes = travelTimeMap.get(candidate.id);

      // Compute sub-scores
      const travelTime = calculateTravelTimeScore(travelTimeMinutes);
      const roleCompat = calculateRoleCompatScore(
        userPrivate?.position,
        candidatePrivate?.position
      );
      const kinkOverlap = calculateKinkScore(
        userPrivate?.kinks,
        candidatePrivate?.kinks,
        userPrivate?.hard_limits,
        candidatePrivate?.hard_limits
      );
      const intent = calculateIntentScore(
        {
          looking_for: userPrivate?.looking_for,
          relationship_status: userPrivate?.relationship_status,
          time_horizon: userPrivate?.time_horizon,
        },
        {
          looking_for: candidatePrivate?.looking_for,
          relationship_status: candidatePrivate?.relationship_status,
          time_horizon: candidatePrivate?.time_horizon,
        }
      );
      const semantic = calculateSemanticScore(
        userEmbedding?.combined_embedding,
        candidateEmbedding
      );
      const lifestyle = calculateLifestyleScore(
        {
          smoking: userPrivate?.smoking,
          drinking: userPrivate?.drinking,
          fitness: userPrivate?.fitness,
          diet: userPrivate?.diet,
          scene_affinity: userPrivate?.scene_affinity,
        },
        {
          smoking: candidatePrivate?.smoking,
          drinking: candidatePrivate?.drinking,
          fitness: candidatePrivate?.fitness,
          diet: candidatePrivate?.diet,
          scene_affinity: candidatePrivate?.scene_affinity,
        }
      );
      const activity = calculateActivityScore(candidate.last_seen);
      const completeness = calculateCompletenessScore({
        bio: candidate.bio,
        position: candidatePrivate?.position,
        looking_for: candidatePrivate?.looking_for,
        kinks: candidatePrivate?.kinks,
        turn_ons: candidatePrivate?.turn_ons,
        relationship_status: candidatePrivate?.relationship_status,
        photos: candidate.photos || candidate.photo_urls,
        age: candidate.age,
      });

      const matchBreakdown = {
        travelTime,
        roleCompat,
        kinkOverlap,
        intent,
        semantic,
        lifestyle,
        activity,
        completeness,
      };

      const matchProbability = aggregateMatchScore(matchBreakdown);

      // Format profile for response
      return {
        id: candidate.id,
        profileName: candidate.username || candidate.display_name || candidate.full_name || 'Anonymous',
        title: candidate.bio || '',
        locationLabel: candidate.city || '',
        geoLat: candidate.geo_lat || candidate.geoLat,
        geoLng: candidate.geo_lng || candidate.geoLng,
        photos: candidate.photos || [],
        matchProbability,
        matchBreakdown,
        travelTimeMinutes,
        // Include other public fields as needed
        city: candidate.city,
        bio: candidate.bio,
        profileType: candidate.profile_type || 'standard',
        age: candidate.age,
      };
    });

    // Apply minimum match filter
    let filteredProfiles = scoredProfiles;
    if (minMatch > 0) {
      filteredProfiles = scoredProfiles.filter(p => p.matchProbability >= minMatch);
    }

    // Sort by match probability if requested
    if (sort === 'match') {
      filteredProfiles.sort((a, b) => b.matchProbability - a.matchProbability);
    } else if (sort === 'distance' && viewerLocation) {
      filteredProfiles.sort((a, b) => (a.travelTimeMinutes || 999999) - (b.travelTimeMinutes || 999999));
    } else if (sort === 'lastActive') {
      filteredProfiles.sort((a, b) => b.matchBreakdown.activity - a.matchBreakdown.activity);
    } else if (sort === 'newest') {
      // Sort by profile creation date if available, otherwise by ID
      filteredProfiles.sort((a, b) => {
        const aTime = new Date(a.created_at || a.id).getTime();
        const bTime = new Date(b.created_at || b.id).getTime();
        return bTime - aTime; // Newest first
      });
    }

    // Pagination cursor (simple offset-based)
    const hasMore = scoredProfiles.length === limit; // Check original count for pagination
    const nextCursor = hasMore ? String(offset + limit) : null;

    return json(res, 200, {
      items: filteredProfiles,
      nextCursor,
      scoringVersion: '1.0',
      filters: {
        minMatch,
        appliedCount: filteredProfiles.length,
        totalCount: scoredProfiles.length,
      },
    });

  } catch (error) {
    console.error('Match probability error:', error);
    return json(res, 500, { error: error?.message || 'Internal server error' });
  }
}

/**
 * Haversine distance in kilometers
 */
function haversineKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}
