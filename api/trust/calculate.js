/**
 * API: Trust Score Calculation
 * 
 * Calculates and updates a user's trust score based on multiple factors.
 * Score range: 0-100, Tiers: new, bronze, silver, gold, diamond
 * 
 * POST: Recalculate trust score for current user
 * GET: Get current trust score details
 */

import { json, getBearerToken } from '../shopify/_utils.js';
import { getSupabaseServerClients, getAuthedUser } from '../routing/_utils.js';

// Score component weights
const SCORE_WEIGHTS = {
  profile_completeness: 10,    // Max 10 points
  verification: 35,             // Max 35 points (phone: 10, selfie: 15, ID: 10)
  behavior: 30,                 // Max 30 points (response rate, no reports)
  community: 25,                // Max 25 points (positive ratings, meetups)
};

// Tier thresholds
const TIERS = {
  diamond: 91,
  gold: 76,
  silver: 51,
  bronze: 21,
  new: 0,
};

export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  
  if (!['GET', 'POST'].includes(method)) {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const { error: clientError, serviceClient, anonClient } = getSupabaseServerClients();
  if (clientError) return json(res, 500, { error: clientError });

  const accessToken = getBearerToken(req);
  if (!accessToken) return json(res, 401, { error: 'Missing bearer token' });

  const { user, error: userError } = await getAuthedUser({ anonClient, accessToken });
  if (userError || !user?.id) return json(res, 401, { error: 'Invalid auth token' });

  try {
    if (method === 'GET') {
      return await getTrustScore(res, serviceClient, user);
    } else {
      return await calculateTrustScore(res, serviceClient, user);
    }
  } catch (error) {
    console.error('[Trust Score] Error:', error);
    return json(res, 500, { error: error.message });
  }
}

async function getTrustScore(res, client, user) {
  const { data: trustScore, error } = await client
    .from('trust_scores')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return json(res, 500, { error: 'Failed to fetch trust score' });
  }

  if (!trustScore) {
    // Return default values for new user
    return json(res, 200, {
      score: 20,
      tier: 'new',
      breakdown: {
        profile_completeness: 0,
        verification: 0,
        behavior: 50,
        community: 0,
      },
      factors: {
        positive: [],
        negative: [],
        suggestions: ['Complete your profile', 'Verify your phone number'],
      },
    });
  }

  return json(res, 200, {
    score: trustScore.score,
    tier: trustScore.tier,
    breakdown: {
      profile_completeness: trustScore.profile_completeness_score,
      verification: trustScore.verification_score,
      behavior: trustScore.behavior_score,
      community: trustScore.community_score,
    },
    factors: {
      positive_ratings: trustScore.positive_ratings,
      successful_meetups: trustScore.successful_meetups,
      response_rate: trustScore.response_rate,
      reports_received: trustScore.reports_received,
    },
    last_calculated: trustScore.last_calculated_at,
  });
}

async function calculateTrustScore(res, client, user) {
  // Fetch user profile data
  const { data: profile, error: profileError } = await client
    .from('User')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return json(res, 404, { error: 'User profile not found' });
  }

  // Fetch verification status
  const { data: verification } = await client
    .from('user_verifications')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  // Fetch reports against user
  const { data: reports } = await client
    .from('reports')
    .select('id')
    .eq('reported_user_id', user.id)
    .eq('status', 'confirmed');

  // Fetch positive interactions
  const { data: ratings } = await client
    .from('user_ratings')
    .select('rating')
    .eq('rated_user_id', user.id)
    .gte('rating', 4);

  // Calculate each component score
  const profileScore = calculateProfileCompleteness(profile);
  const verificationScore = calculateVerificationScore(verification);
  const behaviorScore = calculateBehaviorScore(profile, reports?.length || 0);
  const communityScore = calculateCommunityScore(ratings?.length || 0, profile.successful_meetups || 0);

  // Calculate total score
  const totalScore = Math.min(100, Math.max(0, Math.round(
    profileScore + verificationScore + behaviorScore + communityScore
  )));

  // Determine tier
  const tier = getTier(totalScore);

  // Prepare score history entry
  const historyEntry = {
    date: new Date().toISOString(),
    score: totalScore,
    reason: 'periodic_recalculation',
  };

  // Get existing trust score or create new
  const { data: existing } = await client
    .from('trust_scores')
    .select('score_history')
    .eq('user_id', user.id)
    .maybeSingle();

  const scoreHistory = existing?.score_history || [];
  scoreHistory.push(historyEntry);
  // Keep only last 30 history entries
  const trimmedHistory = scoreHistory.slice(-30);

  // Upsert trust score
  const trustData = {
    user_id: user.id,
    score: totalScore,
    tier,
    profile_completeness_score: profileScore,
    verification_score: verificationScore,
    behavior_score: behaviorScore,
    community_score: communityScore,
    positive_ratings: ratings?.length || 0,
    successful_meetups: profile.successful_meetups || 0,
    response_rate: profile.response_rate || 0,
    reports_received: reports?.length || 0,
    account_age_days: calculateAccountAge(profile.created_at),
    score_history: trimmedHistory,
    last_calculated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await client
    .from('trust_scores')
    .upsert(trustData, { onConflict: 'user_id' });

  if (upsertError) {
    console.error('[Trust Score] Upsert error:', upsertError);
    return json(res, 500, { error: 'Failed to update trust score' });
  }

  // Generate suggestions for improvement
  const suggestions = generateSuggestions(trustData, verification);

  return json(res, 200, {
    score: totalScore,
    tier,
    previousScore: existing ? scoreHistory[scoreHistory.length - 2]?.score : null,
    breakdown: {
      profile_completeness: profileScore,
      verification: verificationScore,
      behavior: behaviorScore,
      community: communityScore,
    },
    suggestions,
    calculated_at: trustData.last_calculated_at,
  });
}

function calculateProfileCompleteness(profile) {
  const requiredFields = [
    'full_name', 'username', 'bio', 'avatar_url', 
    'age', 'looking_for', 'position'
  ];
  const optionalFields = [
    'height', 'body_type', 'tribes', 'kinks', 
    'aftercare_prefs', 'substances'
  ];

  let completedRequired = 0;
  let completedOptional = 0;

  for (const field of requiredFields) {
    if (profile[field] && profile[field] !== '') {
      completedRequired++;
    }
  }

  for (const field of optionalFields) {
    if (profile[field] && (Array.isArray(profile[field]) ? profile[field].length > 0 : profile[field] !== '')) {
      completedOptional++;
    }
  }

  const requiredScore = (completedRequired / requiredFields.length) * 6;
  const optionalScore = (completedOptional / optionalFields.length) * 4;

  return Math.round(requiredScore + optionalScore);
}

function calculateVerificationScore(verification) {
  if (!verification) return 0;

  let score = 0;
  
  if (verification.phone_verified) score += 10;
  if (verification.selfie_verified) score += 15;
  if (verification.id_verified) score += 10;

  return score;
}

function calculateBehaviorScore(profile, reportsCount) {
  let score = 30; // Start with max

  // Deduct for reports
  score -= Math.min(20, reportsCount * 5);

  // Bonus for good response rate
  const responseRate = profile.response_rate || 0;
  if (responseRate >= 80) score += 5;
  else if (responseRate >= 50) score += 2;

  // Deduct for blocks received (if tracked)
  const blocksReceived = profile.blocks_received || 0;
  score -= Math.min(10, blocksReceived * 2);

  return Math.max(0, Math.min(30, score));
}

function calculateCommunityScore(positiveRatings, successfulMeetups) {
  let score = 0;

  // Points for positive ratings
  score += Math.min(15, positiveRatings * 3);

  // Points for successful meetups
  score += Math.min(10, successfulMeetups * 2);

  return Math.min(25, score);
}

function calculateAccountAge(createdAt) {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function getTier(score) {
  if (score >= TIERS.diamond) return 'diamond';
  if (score >= TIERS.gold) return 'gold';
  if (score >= TIERS.silver) return 'silver';
  if (score >= TIERS.bronze) return 'bronze';
  return 'new';
}

function generateSuggestions(trustData, verification) {
  const suggestions = [];

  if (trustData.profile_completeness_score < 8) {
    suggestions.push('Complete your profile to improve your trust score');
  }

  if (!verification?.phone_verified) {
    suggestions.push('Verify your phone number (+10 points)');
  }

  if (!verification?.selfie_verified) {
    suggestions.push('Complete selfie verification (+15 points)');
  }

  if (trustData.positive_ratings < 3) {
    suggestions.push('Get positive ratings from successful meetups');
  }

  if (trustData.response_rate < 50) {
    suggestions.push('Respond to more messages to improve response rate');
  }

  return suggestions.slice(0, 3);
}

export const config = {
  maxDuration: 30,
};
