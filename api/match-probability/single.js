/**
 * Single User Match Probability API
 * 
 * Computes match probability score between the current user and a specific target user.
 * Used by the Profile page to display compatibility on individual profile views.
 * 
 * GET /api/match-probability/single?target_id=<uuid>
 *   Query params:
 *   - target_id: UUID of the target user (required)
 *   - lat, lng: Viewer location for travel time calculation (optional)
 */

import { createClient } from '@supabase/supabase-js';
import { calculateMatchProbability, DEFAULT_WEIGHTS } from './_scorers.js';

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

const approximateWalkingMinutes = (distanceKm) => {
  if (!distanceKm || !Number.isFinite(distanceKm)) return null;
  const walkingSpeedKmh = 4.8;
  return Math.round((distanceKm / walkingSpeedKmh) * 60);
};

const getTravelTimeMinutes = async (serviceClient, viewerLat, viewerLng, targetLat, targetLng) => {
  if (!Number.isFinite(viewerLat) || !Number.isFinite(viewerLng) ||
      !Number.isFinite(targetLat) || !Number.isFinite(targetLng)) {
    return null;
  }

  const distanceKm = haversineDistanceKm(viewerLat, viewerLng, targetLat, targetLng);

  if (distanceKm < 5) {
    return approximateWalkingMinutes(distanceKm);
  }

  const drivingSpeedKmh = 30;
  return Math.round((distanceKm / drivingSpeedKmh) * 60);
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
    return json(res, 500, { error: 'Service role not configured' });
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
  const { target_id, target_email, lat, lng } = req.query;

  if (!target_id && !target_email) {
    return json(res, 400, { error: 'target_id or target_email required' });
  }

  const viewerLat = parseNumber(lat);
  const viewerLng = parseNumber(lng);

  try {
    // Fetch current user
    const { data: currentUser, error: currentUserError } = await serviceClient
      .from('User')
      .select('*')
      .or(`auth_user_id.eq.${authUser.id},email.eq.${authUser.email}`)
      .single();

    if (currentUserError || !currentUser) {
      return json(res, 404, { error: 'User profile not found' });
    }

    // Fetch target user
    let targetQuery = serviceClient.from('User').select('*');
    
    if (target_id) {
      targetQuery = targetQuery.eq('id', target_id);
    } else if (target_email) {
      targetQuery = targetQuery.eq('email', target_email.toLowerCase());
    }

    const { data: targetUser, error: targetUserError } = await targetQuery.single();

    if (targetUserError || !targetUser) {
      return json(res, 404, { error: 'Target user not found' });
    }

    // Don't compute for self
    if (currentUser.id === targetUser.id) {
      return json(res, 200, {
        matchProbability: null,
        matchBreakdown: null,
        message: 'Cannot compute match probability for self',
      });
    }

    // Fetch private profiles
    const [currentPrivate, targetPrivate] = await Promise.all([
      serviceClient
        .from('user_private_profile')
        .select('*')
        .eq('user_id', currentUser.id)
        .single()
        .then(r => r.data || {}),
      serviceClient
        .from('user_private_profile')
        .select('*')
        .eq('user_id', targetUser.id)
        .single()
        .then(r => r.data || {}),
    ]);

    // Fetch embeddings
    const [currentEmbedding, targetEmbedding] = await Promise.all([
      serviceClient
        .from('profile_embeddings')
        .select('combined_embedding')
        .eq('user_id', currentUser.id)
        .single()
        .then(r => r.data?.combined_embedding || null),
      serviceClient
        .from('profile_embeddings')
        .select('combined_embedding')
        .eq('user_id', targetUser.id)
        .single()
        .then(r => r.data?.combined_embedding || null),
    ]);

    // Calculate travel time
    const effectiveViewerLat = viewerLat ?? currentUser.last_lat;
    const effectiveViewerLng = viewerLng ?? currentUser.last_lng;

    const travelTimeMinutes = await getTravelTimeMinutes(
      serviceClient,
      effectiveViewerLat,
      effectiveViewerLng,
      targetUser.last_lat,
      targetUser.last_lng
    );

    // Calculate distance
    let distanceKm = null;
    if (Number.isFinite(effectiveViewerLat) && Number.isFinite(effectiveViewerLng) &&
        Number.isFinite(targetUser.last_lat) && Number.isFinite(targetUser.last_lng)) {
      distanceKm = haversineDistanceKm(effectiveViewerLat, effectiveViewerLng, targetUser.last_lat, targetUser.last_lng);
    }

    // Calculate match probability
    const { matchProbability, breakdown } = calculateMatchProbability({
      travelTimeMinutes,
      userProfile: currentUser,
      matchProfile: targetUser,
      userPrivateProfile: currentPrivate,
      matchPrivateProfile: targetPrivate,
      userEmbedding: currentEmbedding,
      matchEmbedding: targetEmbedding,
      weights: DEFAULT_WEIGHTS,
    });

    return json(res, 200, {
      matchProbability,
      matchBreakdown: breakdown,
      travelTimeMinutes,
      distanceKm: distanceKm ? Math.round(distanceKm * 10) / 10 : null,
      scoringVersion: '1.0',
    });
  } catch (error) {
    console.error('[match-probability/single] Error:', error);
    return json(res, 500, { error: 'Internal server error' });
  }
}
