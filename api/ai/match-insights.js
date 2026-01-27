/**
 * API: AI Match Insights
 * 
 * Calculates and explains match compatibility between two users
 * using the 9-dimension scoring algorithm.
 * 
 * GET: Get match insights between current user and target user
 *   - target_user_id: UUID of the user to compare with
 */

import { json, getBearerToken } from '../shopify/_utils.js';
import { getSupabaseServerClients, getAuthedUser } from '../routing/_utils.js';

// Score weights for each dimension (total = 100)
const DIMENSION_WEIGHTS = {
  physical: 15,      // Height, body type, age preferences
  position: 15,      // Top/vers/bottom compatibility
  intent: 15,        // Looking for alignment
  substance: 10,     // Sober/cali sober/party preferences
  kink: 15,          // Shared kinks, no limit conflicts
  logistics: 10,     // Can host/travel, distance
  aftercare: 10,     // Post-meetup preferences
  tribe: 5,          // Same tribe bonus
  music: 5,          // Shared music taste (new dimension)
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const { error: clientError, serviceClient, anonClient } = getSupabaseServerClients();
  if (clientError) return json(res, 500, { error: clientError });

  const accessToken = getBearerToken(req);
  if (!accessToken) return json(res, 401, { error: 'Missing bearer token' });

  const { user, error: userError } = await getAuthedUser({ anonClient, accessToken });
  if (userError || !user?.id) return json(res, 401, { error: 'Invalid auth token' });

  const targetUserId = req.query.target_user_id;
  if (!targetUserId) {
    return json(res, 400, { error: 'Missing target_user_id parameter' });
  }

  try {
    // Check cache first
    const { data: cachedInsight } = await serviceClient
      .from('match_insights')
      .select('*')
      .or(`and(user_a_id.eq.${user.id},user_b_id.eq.${targetUserId}),and(user_a_id.eq.${targetUserId},user_b_id.eq.${user.id})`)
      .gte('calculated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // 24hr cache
      .maybeSingle();

    if (cachedInsight) {
      return json(res, 200, formatInsightResponse(cachedInsight, user.id));
    }

    // Fetch both users' profiles
    const { data: profiles, error: profileError } = await serviceClient
      .from('User')
      .select(`
        id, email, full_name, username,
        age, height, body_type, position, looking_for,
        tribes, kinks, aftercare_prefs, substances,
        can_host, can_travel, location_lat, location_lng,
        dealbreakers
      `)
      .in('id', [user.id, targetUserId]);

    if (profileError || !profiles || profiles.length < 2) {
      return json(res, 404, { error: 'One or both users not found' });
    }

    const userProfile = profiles.find(p => p.id === user.id);
    const targetProfile = profiles.find(p => p.id === targetUserId);

    // Fetch music preferences
    const { data: musicPrefs } = await serviceClient
      .from('user_music_preferences')
      .select('*')
      .in('user_id', [user.id, targetUserId]);

    const userMusic = musicPrefs?.find(m => m.user_id === user.id);
    const targetMusic = musicPrefs?.find(m => m.user_id === targetUserId);

    // Calculate scores for each dimension
    const scores = calculateAllScores(userProfile, targetProfile, userMusic, targetMusic);

    // Check for dealbreakers
    const dealbreaker = checkDealbreakers(userProfile, targetProfile);

    // Calculate total score
    const totalScore = dealbreaker.hasDealbreaker ? 0 : 
      Object.entries(scores).reduce((sum, [dim, score]) => {
        return sum + Math.round(score * (DIMENSION_WEIGHTS[dim] / 100));
      }, 0);

    // Generate insights
    const sharedInterests = findSharedInterests(userProfile, targetProfile, userMusic, targetMusic);
    const conversationStarters = generateConversationStarters(sharedInterests);
    const compatibilitySummary = generateSummary(scores, totalScore, dealbreaker);

    // Store insights
    const insightData = {
      user_a_id: user.id,
      user_b_id: targetUserId,
      total_score: totalScore,
      physical_score: Math.round(scores.physical),
      position_score: Math.round(scores.position),
      intent_score: Math.round(scores.intent),
      substance_score: Math.round(scores.substance),
      kink_score: Math.round(scores.kink),
      logistics_score: Math.round(scores.logistics),
      aftercare_score: Math.round(scores.aftercare),
      tribe_score: Math.round(scores.tribe),
      music_score: Math.round(scores.music),
      shared_interests: sharedInterests,
      conversation_starters: conversationStarters,
      compatibility_summary: compatibilitySummary,
      has_dealbreaker: dealbreaker.hasDealbreaker,
      dealbreaker_reason: dealbreaker.reason,
      calculated_at: new Date().toISOString(),
    };

    const { data: savedInsight, error: saveError } = await serviceClient
      .from('match_insights')
      .upsert(insightData, { 
        onConflict: 'user_a_id,user_b_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (saveError) {
      console.error('[Match Insights] Save error:', saveError);
    }

    return json(res, 200, formatInsightResponse(savedInsight || insightData, user.id));

  } catch (error) {
    console.error('[Match Insights] Error:', error);
    return json(res, 500, { error: error.message });
  }
}

function calculateAllScores(user, target, userMusic, targetMusic) {
  return {
    physical: calculatePhysicalScore(user, target),
    position: calculatePositionScore(user, target),
    intent: calculateIntentScore(user, target),
    substance: calculateSubstanceScore(user, target),
    kink: calculateKinkScore(user, target),
    logistics: calculateLogisticsScore(user, target),
    aftercare: calculateAftercareScore(user, target),
    tribe: calculateTribeScore(user, target),
    music: calculateMusicScore(userMusic, targetMusic),
  };
}

function calculatePhysicalScore(user, target) {
  // Simplified scoring - in production would use preference ranges
  let score = 50; // Base score
  
  if (user.body_type && target.body_type) {
    // Some body type preferences logic
    score += 25;
  }
  
  return Math.min(100, score);
}

function calculatePositionScore(user, target) {
  const positions = ['top', 'vers_top', 'vers', 'vers_bottom', 'bottom', 'side'];
  const userPos = user.position?.toLowerCase();
  const targetPos = target.position?.toLowerCase();
  
  if (!userPos || !targetPos) return 50;
  
  // Perfect compatibility matrix
  const compatibility = {
    'top': ['bottom', 'vers_bottom', 'vers'],
    'vers_top': ['bottom', 'vers_bottom', 'vers', 'vers_top'],
    'vers': ['top', 'vers_top', 'vers', 'vers_bottom', 'bottom'],
    'vers_bottom': ['top', 'vers_top', 'vers', 'vers_bottom'],
    'bottom': ['top', 'vers_top', 'vers'],
    'side': ['side'],
  };
  
  if (compatibility[userPos]?.includes(targetPos)) {
    return 100;
  }
  return 30;
}

function calculateIntentScore(user, target) {
  const userLooking = Array.isArray(user.looking_for) ? user.looking_for : [user.looking_for];
  const targetLooking = Array.isArray(target.looking_for) ? target.looking_for : [target.looking_for];
  
  const overlap = userLooking.filter(l => targetLooking.includes(l));
  
  if (overlap.length > 0) {
    return Math.min(100, 50 + (overlap.length * 25));
  }
  return 25;
}

function calculateSubstanceScore(user, target) {
  const userSubs = user.substances || 'not_specified';
  const targetSubs = target.substances || 'not_specified';
  
  if (userSubs === targetSubs) return 100;
  
  // Compatible combinations
  if (userSubs === 'sober' && targetSubs === 'sober') return 100;
  if (userSubs === 'cali_sober' && targetSubs === 'cali_sober') return 100;
  if (userSubs === 'sober' && targetSubs === 'party_friendly') return 20;
  
  return 50;
}

function calculateKinkScore(user, target) {
  const userKinks = user.kinks || [];
  const targetKinks = target.kinks || [];
  
  if (userKinks.length === 0 || targetKinks.length === 0) return 50;
  
  const shared = userKinks.filter(k => targetKinks.includes(k));
  const sharedPercent = (shared.length / Math.max(userKinks.length, targetKinks.length)) * 100;
  
  return Math.min(100, 30 + sharedPercent * 0.7);
}

function calculateLogisticsScore(user, target) {
  let score = 50;
  
  if (user.can_host && target.can_travel) score += 25;
  if (user.can_travel && target.can_host) score += 25;
  if (user.can_host && target.can_host) score += 15;
  
  // Distance calculation would go here
  
  return Math.min(100, score);
}

function calculateAftercareScore(user, target) {
  const userAftercare = user.aftercare_prefs || [];
  const targetAftercare = target.aftercare_prefs || [];
  
  if (userAftercare.length === 0 || targetAftercare.length === 0) return 50;
  
  const shared = userAftercare.filter(a => targetAftercare.includes(a));
  return Math.min(100, 40 + (shared.length * 15));
}

function calculateTribeScore(user, target) {
  const userTribes = user.tribes || [];
  const targetTribes = target.tribes || [];
  
  const shared = userTribes.filter(t => targetTribes.includes(t));
  
  if (shared.length > 0) return 100;
  return 50;
}

function calculateMusicScore(userMusic, targetMusic) {
  if (!userMusic || !targetMusic) return 50;
  
  let score = 50;
  
  // Shared favorite tracks
  const userTracks = userMusic.favorite_tracks || [];
  const targetTracks = targetMusic.favorite_tracks || [];
  const sharedTracks = userTracks.filter(t => 
    targetTracks.some(tt => tt.id === t.id)
  );
  score += sharedTracks.length * 10;
  
  // Shared genres
  const userGenres = userMusic.favorite_genres || [];
  const targetGenres = targetMusic.favorite_genres || [];
  const sharedGenres = userGenres.filter(g => targetGenres.includes(g));
  score += sharedGenres.length * 5;
  
  return Math.min(100, score);
}

function checkDealbreakers(user, target) {
  const userDealbreakers = user.dealbreakers || [];
  const targetDealbreakers = target.dealbreakers || [];
  
  // Check if target has any of user's dealbreakers
  for (const db of userDealbreakers) {
    // Logic to check if target matches dealbreaker
    // This would be customized based on your dealbreaker system
  }
  
  return { hasDealbreaker: false, reason: null };
}

function findSharedInterests(user, target, userMusic, targetMusic) {
  const shared = [];
  
  // Kinks
  const sharedKinks = (user.kinks || []).filter(k => (target.kinks || []).includes(k));
  if (sharedKinks.length > 0) {
    shared.push({ type: 'kink', items: sharedKinks.slice(0, 3) });
  }
  
  // Tribes
  const sharedTribes = (user.tribes || []).filter(t => (target.tribes || []).includes(t));
  if (sharedTribes.length > 0) {
    shared.push({ type: 'tribe', items: sharedTribes });
  }
  
  // Music
  if (userMusic && targetMusic) {
    const sharedGenres = (userMusic.favorite_genres || []).filter(g => 
      (targetMusic.favorite_genres || []).includes(g)
    );
    if (sharedGenres.length > 0) {
      shared.push({ type: 'music', items: sharedGenres });
    }
  }
  
  return shared;
}

function generateConversationStarters(sharedInterests) {
  const starters = [];
  
  for (const interest of sharedInterests) {
    if (interest.type === 'music') {
      starters.push(`I see you're into ${interest.items[0]} too! What's your favorite track?`);
    }
    if (interest.type === 'tribe') {
      starters.push(`Fellow ${interest.items[0]}! What's your scene like?`);
    }
  }
  
  // Add some generic good openers
  starters.push("Your profile mentions aftercare - I appreciate that attention to care!");
  
  return starters.slice(0, 3);
}

function generateSummary(scores, totalScore, dealbreaker) {
  if (dealbreaker.hasDealbreaker) {
    return `Heads up: ${dealbreaker.reason}`;
  }
  
  if (totalScore >= 80) {
    return "Excellent compatibility! You share many preferences and interests.";
  } else if (totalScore >= 60) {
    return "Good match potential with solid overlap in key areas.";
  } else if (totalScore >= 40) {
    return "Some compatibility - worth exploring if you're curious.";
  }
  return "Different preferences in several areas - review profile carefully.";
}

function formatInsightResponse(insight, currentUserId) {
  return {
    matchScore: insight.total_score,
    scores: {
      physical: insight.physical_score,
      position: insight.position_score,
      intent: insight.intent_score,
      substance: insight.substance_score,
      kink: insight.kink_score,
      logistics: insight.logistics_score,
      aftercare: insight.aftercare_score,
      tribe: insight.tribe_score,
      music: insight.music_score,
    },
    sharedInterests: insight.shared_interests,
    conversationStarters: insight.conversation_starters,
    summary: insight.compatibility_summary,
    hasDealbreaker: insight.has_dealbreaker,
    dealbreaker: insight.dealbreaker_reason,
    calculatedAt: insight.calculated_at,
  };
}

export const config = {
  maxDuration: 30,
};
