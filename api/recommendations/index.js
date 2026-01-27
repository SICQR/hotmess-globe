import { createClient } from '@supabase/supabase-js';
import { calculateMLScore } from './learn.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Haversine distance calculation in km
const haversineDistanceKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Distance-weighted score (0-30 points)
const calculateDistanceScore = (distanceKm) => {
  if (distanceKm === null || distanceKm === undefined) return 10; // Default for unknown distance
  if (distanceKm < 1) return 30;      // Very close - walking distance
  if (distanceKm < 3) return 27;      // Close - short walk/ride
  if (distanceKm < 5) return 25;      // Nearby - easy to meet
  if (distanceKm < 10) return 22;     // Same area
  if (distanceKm < 25) return 18;     // Same city/region
  if (distanceKm < 50) return 14;     // Neighboring area
  if (distanceKm < 100) return 10;    // Regional
  return 5;                            // Long distance
};

// Interest overlap score (0-25 points)
const calculateInterestScore = (userInterests, matchInterests) => {
  if (!userInterests?.length || !matchInterests?.length) return 12; // Default
  
  const userSet = new Set(userInterests.map(i => String(i).toLowerCase()));
  const matchSet = new Set(matchInterests.map(i => String(i).toLowerCase()));
  
  let overlap = 0;
  for (const interest of userSet) {
    if (matchSet.has(interest)) overlap++;
  }
  
  const overlapRatio = overlap / Math.max(userSet.size, 1);
  return Math.round(overlapRatio * 25);
};

// Activity recency score (0-15 points)
const calculateActivityScore = (lastSeen) => {
  if (!lastSeen) return 5;
  
  const now = Date.now();
  const lastSeenTime = new Date(lastSeen).getTime();
  const minutesAgo = (now - lastSeenTime) / (1000 * 60);
  
  if (minutesAgo < 5) return 15;      // Active right now
  if (minutesAgo < 15) return 14;     // Just active
  if (minutesAgo < 60) return 12;     // Active in last hour
  if (minutesAgo < 360) return 10;    // Active today
  if (minutesAgo < 1440) return 7;    // Active in 24h
  if (minutesAgo < 10080) return 4;   // Active in last week
  return 2;                           // Inactive
};

// Profile completeness score (0-10 points)
const calculateCompletenessScore = (profile) => {
  let score = 0;
  
  if (profile.photos?.length > 0) score += 3;
  if (profile.photos?.length > 2) score += 1;
  if (profile.bio?.length > 20) score += 2;
  if (profile.tags?.length > 0) score += 1;
  if (profile.looking_for?.length > 0) score += 1;
  if (profile.city) score += 1;
  if (profile.verified || profile.verified_seller || profile.verified_organizer) score += 1;
  
  return Math.min(score, 10);
};

// Compatibility from essentials/dealbreakers (0-20 points)
const calculateCompatibilityScore = (user, match) => {
  let score = 10; // Base score
  
  const userEssentials = user.essentials || [];
  const matchTags = match.tags || [];
  const matchLookingFor = match.looking_for || [];
  
  // Bonus for matching essentials
  for (const essential of userEssentials) {
    if (matchTags.includes(essential) || matchLookingFor.includes(essential)) {
      score += 3;
    }
  }
  
  // Check dealbreakers
  const userDealbreakers = user.dealbreakers || [];
  for (const dealbreaker of userDealbreakers) {
    if (matchTags.includes(dealbreaker)) {
      score -= 10;
    }
  }
  
  return Math.max(0, Math.min(score, 20));
};

// Calculate overall recommendation score
const calculateRecommendationScore = (user, match, viewerLat, viewerLng) => {
  let distanceKm = null;
  
  if (Number.isFinite(viewerLat) && Number.isFinite(viewerLng) &&
      Number.isFinite(match.last_lat) && Number.isFinite(match.last_lng)) {
    distanceKm = haversineDistanceKm(viewerLat, viewerLng, match.last_lat, match.last_lng);
  }
  
  const distanceScore = calculateDistanceScore(distanceKm);
  const interestScore = calculateInterestScore(user.tags || user.interests, match.tags || match.interests);
  const activityScore = calculateActivityScore(match.last_seen || match.updated_at);
  const completenessScore = calculateCompletenessScore(match);
  const compatibilityScore = calculateCompatibilityScore(user, match);
  
  const overallScore = distanceScore + interestScore + activityScore + completenessScore + compatibilityScore;
  
  return {
    overall: overallScore,
    distance: distanceScore,
    interest: interestScore,
    activity: activityScore,
    completeness: completenessScore,
    compatibility: compatibilityScore,
    distanceKm,
  };
};

// Record user interaction for ML learning
const recordInteraction = async (userEmail, targetEmail, interactionType, metadata = {}) => {
  if (!supabase) return null;
  
  try {
    const { data, error } = await supabase
      .from('user_interactions')
      .insert({
        user_email: userEmail,
        target_email: targetEmail,
        interaction_type: interactionType,
        distance_km: metadata.distanceKm || null,
        lat: metadata.lat || null,
        lng: metadata.lng || null,
        duration_seconds: metadata.durationSeconds || null,
        metadata: metadata,
      })
      .select()
      .single();
    
    if (error) {
      console.error('[recommendations] Failed to record interaction:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('[recommendations] Error recording interaction:', err);
    return null;
  }
};

export default async function handler(req, res) {
  if (req.method === 'POST' && req.url?.includes('/interaction')) {
    // Record interaction endpoint
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { target_email, interaction_type, metadata } = req.body;
    
    if (!target_email || !interaction_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const interaction = await recordInteraction(user.email, target_email, interaction_type, metadata);
    
    return res.status(200).json({ success: true, interaction });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  // Get authenticated user
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !authUser) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    // Get current user's profile
    const { data: currentUser, error: userError } = await supabase
      .from('User')
      .select('*')
      .eq('email', authUser.email)
      .single();

    if (userError || !currentUser) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Parse query params
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;
    const viewerLat = parseFloat(req.query.lat) || currentUser.last_lat;
    const viewerLng = parseFloat(req.query.lng) || currentUser.last_lng;
    const minScore = parseInt(req.query.min_score) || 0;
    const excludeBlocked = req.query.exclude_blocked !== 'false';

    // Get blocked users if needed
    let blockedEmails = new Set();
    if (excludeBlocked) {
      const { data: blocked } = await supabase
        .from('user_blocks')
        .select('blocked_email')
        .eq('user_email', authUser.email);
      
      if (blocked) {
        blockedEmails = new Set(blocked.map(b => b.blocked_email));
      }
    }

    // Fetch potential matches
    let query = supabase
      .from('User')
      .select('*')
      .neq('email', authUser.email)
      .eq('onboarding_complete', true)
      .not('photos', 'is', null);

    const { data: profiles, error: profilesError } = await query;

    if (profilesError) {
      console.error('[recommendations] Profiles fetch error:', profilesError);
      return res.status(500).json({ error: 'Failed to fetch profiles' });
    }

    // Filter and score profiles
    const scoredProfiles = (profiles || [])
      .filter(p => !blockedEmails.has(p.email))
      .map(profile => {
        const scores = calculateRecommendationScore(currentUser, profile, viewerLat, viewerLng);
        
        // Add ML score if learned preferences available
        if (learnedPrefs) {
          scores.ml = calculateMLScore(profile, learnedPrefs);
          scores.overall += scores.ml;
        }
        
        return {
          ...profile,
          _scores: scores,
          _overallScore: scores.overall,
        };
      })
      .filter(p => p._overallScore >= minScore)
      .sort((a, b) => b._overallScore - a._overallScore);

    // Paginate
    const paginatedProfiles = scoredProfiles.slice(offset, offset + limit);

    // Clean up internal fields and prepare response
    const recommendations = paginatedProfiles.map(p => ({
      email: p.email,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      photos: p.photos,
      bio: p.bio,
      city: p.city,
      profile_type: p.profile_type || 'standard',
      tags: p.tags,
      looking_for: p.looking_for,
      last_seen: p.last_seen,
      verified: p.verified || p.verified_seller || p.verified_organizer,
      scores: p._scores,
      match_percentage: Math.round((p._overallScore / 100) * 100),
    }));

    return res.status(200).json({
      recommendations,
      total: scoredProfiles.length,
      offset,
      limit,
      has_more: offset + limit < scoredProfiles.length,
      ml_enabled: !!learnedPrefs,
      preference_count: learnedPrefs?.preferred_interests?.length || 0,
    });
  } catch (error) {
    console.error('[recommendations] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
