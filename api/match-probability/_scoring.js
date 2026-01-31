/**
 * Match Probability Scoring Engine
 * 
 * Computes match probability scores across multiple dimensions:
 * - Travel Time (0-20 points)
 * - Role Compatibility (0-15 points)
 * - Kink Overlap (0-15 points)
 * - Intent Alignment (0-12 points)
 * - Semantic Text Similarity (0-12 points)
 * - Lifestyle Match (0-10 points)
 * - Activity Recency (0-8 points)
 * - Profile Completeness (0-8 points)
 * 
 * Total: 100 points max
 */

// Default scoring weights (can be overridden via scoring_config table)
export const DEFAULT_WEIGHTS = {
  travelTime: 20,
  roleCompat: 15,
  kinkOverlap: 15,
  intent: 12,
  semantic: 12,
  lifestyle: 10,
  activity: 8,
  completeness: 8,
};

/**
 * Travel Time Score (0-20 points)
 * Uses decay function based on travel duration in minutes
 */
export const calculateTravelTimeScore = (durationMinutes, maxPoints = 20) => {
  if (durationMinutes === null || durationMinutes === undefined) {
    return Math.round(maxPoints * 0.5); // Unknown = 50% of max
  }
  
  const mins = Number(durationMinutes);
  if (!Number.isFinite(mins) || mins < 0) {
    return Math.round(maxPoints * 0.5);
  }
  
  if (mins <= 5) return maxPoints;           // Walking distance
  if (mins <= 15) return Math.round(maxPoints * 0.9);   // Quick trip
  if (mins <= 30) return Math.round(maxPoints * 0.75);  // Reasonable
  if (mins <= 60) return Math.round(maxPoints * 0.5);   // Committed trip
  if (mins <= 120) return Math.round(maxPoints * 0.25); // Long journey
  return Math.round(maxPoints * 0.1);                    // Very far
};

/**
 * Role Compatibility Matrix
 * Maps position preferences to compatibility scores
 */
const ROLE_COMPATIBILITY = {
  'top': { 'bottom': 15, 'vers': 12, 'vers_top': 8, 'vers_bottom': 10, 'top': 5 },
  'bottom': { 'top': 15, 'vers': 12, 'vers_bottom': 8, 'vers_top': 10, 'bottom': 5 },
  'vers': { 'vers': 15, 'top': 12, 'bottom': 12, 'vers_top': 10, 'vers_bottom': 10 },
  'vers_top': { 'bottom': 12, 'vers_bottom': 15, 'vers': 10, 'top': 5, 'vers_top': 8 },
  'vers_bottom': { 'top': 12, 'vers_top': 15, 'vers': 10, 'bottom': 5, 'vers_bottom': 8 },
};

/**
 * Role Compatibility Score (0-15 points)
 * Based on position preference alignment
 */
export const calculateRoleCompatScore = (userPosition, matchPosition, maxPoints = 15) => {
  const userPos = String(userPosition || '').toLowerCase().trim();
  const matchPos = String(matchPosition || '').toLowerCase().trim();
  
  // If either position is unknown, return neutral score
  if (!userPos || !matchPos) {
    return Math.round(maxPoints * 0.5);
  }
  
  const compatMap = ROLE_COMPATIBILITY[userPos];
  if (!compatMap) {
    return Math.round(maxPoints * 0.5);
  }
  
  const score = compatMap[matchPos];
  if (typeof score !== 'number') {
    return Math.round(maxPoints * 0.5);
  }
  
  // Scale to maxPoints if different from default 15
  return Math.round((score / 15) * maxPoints);
};

/**
 * Kink Overlap Score (0-15 points)
 * Computes overlap between kinks, accounting for hard limits
 */
export const calculateKinkScore = (
  userKinks,
  matchKinks,
  userHardLimits,
  matchHardLimits,
  maxPoints = 15
) => {
  const userKinkSet = new Set(
    (Array.isArray(userKinks) ? userKinks : [])
      .map((k) => String(k || '').toLowerCase().trim())
      .filter(Boolean)
  );
  
  const matchKinkSet = new Set(
    (Array.isArray(matchKinks) ? matchKinks : [])
      .map((k) => String(k || '').toLowerCase().trim())
      .filter(Boolean)
  );
  
  const matchHardLimitSet = new Set(
    (Array.isArray(matchHardLimits) ? matchHardLimits : [])
      .map((k) => String(k || '').toLowerCase().trim())
      .filter(Boolean)
  );
  
  const userHardLimitSet = new Set(
    (Array.isArray(userHardLimits) ? userHardLimits : [])
      .map((k) => String(k || '').toLowerCase().trim())
      .filter(Boolean)
  );
  
  // If neither has kinks, neutral score
  if (userKinkSet.size === 0 && matchKinkSet.size === 0) {
    return Math.round(maxPoints * 0.5);
  }
  
  // Check for hard limit conflicts (user's kinks vs match's hard limits)
  const userConflicts = [...userKinkSet].filter((k) => matchHardLimitSet.has(k));
  const matchConflicts = [...matchKinkSet].filter((k) => userHardLimitSet.has(k));
  const totalConflicts = userConflicts.length + matchConflicts.length;
  
  if (totalConflicts > 0) {
    // Significant penalty for conflicts
    return Math.max(0, Math.round(maxPoints * 0.33) - totalConflicts * 2);
  }
  
  // Calculate overlap ratio
  const overlap = [...userKinkSet].filter((k) => matchKinkSet.has(k)).length;
  const maxPossible = Math.max(userKinkSet.size, matchKinkSet.size, 1);
  const overlapRatio = overlap / maxPossible;
  
  return Math.round(overlapRatio * maxPoints);
};

/**
 * Intent Alignment Score (0-12 points)
 * Based on looking_for, relationship_status, time_horizon
 */
export const calculateIntentScore = (user, match, maxPoints = 12) => {
  let score = 0;
  const pointsPerCategory = maxPoints / 4;
  
  // Looking for overlap (up to 6 points by default)
  const userLooking = new Set(
    (Array.isArray(user?.looking_for) ? user.looking_for : [])
      .map((l) => String(l || '').toLowerCase().trim())
      .filter(Boolean)
  );
  
  const matchLooking = new Set(
    (Array.isArray(match?.looking_for) ? match.looking_for : [])
      .map((l) => String(l || '').toLowerCase().trim())
      .filter(Boolean)
  );
  
  if (userLooking.size > 0 && matchLooking.size > 0) {
    const intentOverlap = [...userLooking].filter((l) => matchLooking.has(l)).length;
    const maxOverlap = Math.max(userLooking.size, matchLooking.size, 1);
    score += Math.round((intentOverlap / maxOverlap) * pointsPerCategory * 2);
  } else {
    // Neutral if unknown
    score += pointsPerCategory;
  }
  
  // Relationship status compatibility (up to 3 points)
  const userStatus = String(user?.relationship_status || '').toLowerCase().trim();
  const matchStatus = String(match?.relationship_status || '').toLowerCase().trim();
  
  if (userStatus && matchStatus) {
    if (userStatus === matchStatus) {
      score += pointsPerCategory;
    } else if (
      (userStatus === 'open' || matchStatus === 'open') ||
      (userStatus === 'flexible' || matchStatus === 'flexible')
    ) {
      score += pointsPerCategory * 0.5;
    }
  } else {
    score += pointsPerCategory * 0.5;
  }
  
  // Time horizon match (up to 3 points)
  const userHorizon = String(user?.time_horizon || '').toLowerCase().trim();
  const matchHorizon = String(match?.time_horizon || '').toLowerCase().trim();
  
  if (userHorizon && matchHorizon) {
    if (userHorizon === matchHorizon) {
      score += pointsPerCategory;
    } else {
      // Partial credit for adjacent time horizons
      const horizonOrder = ['now', 'today', 'this_week', 'flexible', 'planning'];
      const userIdx = horizonOrder.indexOf(userHorizon);
      const matchIdx = horizonOrder.indexOf(matchHorizon);
      if (userIdx >= 0 && matchIdx >= 0 && Math.abs(userIdx - matchIdx) <= 1) {
        score += pointsPerCategory * 0.5;
      }
    }
  } else {
    score += pointsPerCategory * 0.5;
  }
  
  return Math.min(Math.round(score), maxPoints);
};

/**
 * Cosine Similarity for vector embeddings
 */
export const cosineSimilarity = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return null;
  }
  
  let dot = 0;
  let magA = 0;
  let magB = 0;
  
  for (let i = 0; i < a.length; i++) {
    const aVal = Number(a[i]) || 0;
    const bVal = Number(b[i]) || 0;
    dot += aVal * bVal;
    magA += aVal * aVal;
    magB += bVal * bVal;
  }
  
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  
  if (magA === 0 || magB === 0) return 0;
  
  return dot / (magA * magB);
};

/**
 * Semantic Text Score (0-12 points)
 * Uses pre-computed embeddings for bio, turn-ons, turn-offs similarity
 */
export const calculateSemanticScore = (userEmbedding, matchEmbedding, maxPoints = 12) => {
  if (!userEmbedding || !matchEmbedding) {
    return Math.round(maxPoints * 0.5); // Default to neutral
  }
  
  const similarity = cosineSimilarity(userEmbedding, matchEmbedding);
  
  if (similarity === null) {
    return Math.round(maxPoints * 0.5);
  }
  
  // Cosine similarity ranges from -1 to 1, but text embeddings are usually 0-1
  // Normalize to 0-1 range and scale to maxPoints
  const normalizedSimilarity = Math.max(0, Math.min(1, (similarity + 1) / 2));
  
  return Math.round(normalizedSimilarity * maxPoints);
};

/**
 * Lifestyle Match Score (0-10 points)
 * Compares smoking, drinking, fitness, diet, scene_affinity
 */
export const calculateLifestyleScore = (user, match, maxPoints = 10) => {
  let matches = 0;
  const fields = ['smoking', 'drinking', 'fitness', 'diet'];
  const pointsPerField = maxPoints / 6; // 4 fields + scene (2 points worth)
  
  for (const field of fields) {
    const userVal = String(user?.[field] || '').toLowerCase().trim();
    const matchVal = String(match?.[field] || '').toLowerCase().trim();
    
    if (!userVal || !matchVal) {
      matches += pointsPerField * 0.5; // Neutral for unknown
    } else if (userVal === matchVal) {
      matches += pointsPerField;
    } else if (
      (userVal === 'flexible' || matchVal === 'flexible') ||
      (userVal === 'sometimes' || matchVal === 'sometimes')
    ) {
      matches += pointsPerField * 0.5;
    }
  }
  
  // Scene affinity overlap (worth 2 points)
  const userScenes = new Set(
    (Array.isArray(user?.scene_affinity) ? user.scene_affinity : [])
      .map((s) => String(s || '').toLowerCase().trim())
      .filter(Boolean)
  );
  
  const matchScenes = new Set(
    (Array.isArray(match?.scene_affinity) ? match.scene_affinity : [])
      .map((s) => String(s || '').toLowerCase().trim())
      .filter(Boolean)
  );
  
  if (userScenes.size > 0 && matchScenes.size > 0) {
    const sceneOverlap = [...userScenes].filter((s) => matchScenes.has(s)).length;
    const maxScenes = Math.max(userScenes.size, matchScenes.size, 1);
    matches += (sceneOverlap / maxScenes) * pointsPerField * 2;
  } else {
    matches += pointsPerField; // Neutral
  }
  
  return Math.min(Math.round(matches), maxPoints);
};

/**
 * Activity Recency Score (0-8 points)
 * Based on last_seen timestamp
 */
export const calculateActivityScore = (lastSeen, maxPoints = 8) => {
  if (!lastSeen) {
    return Math.round(maxPoints * 0.25); // Unknown = low score
  }
  
  const lastSeenDate = new Date(lastSeen);
  if (isNaN(lastSeenDate.getTime())) {
    return Math.round(maxPoints * 0.25);
  }
  
  const now = Date.now();
  const diffMs = now - lastSeenDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  if (diffHours <= 1) return maxPoints;          // Online now / very recent
  if (diffHours <= 24) return Math.round(maxPoints * 0.875);   // Today
  if (diffHours <= 72) return Math.round(maxPoints * 0.75);    // This week
  if (diffHours <= 168) return Math.round(maxPoints * 0.5);    // Within a week
  if (diffHours <= 720) return Math.round(maxPoints * 0.25);   // Within a month
  return Math.round(maxPoints * 0.125);                         // Older
};

/**
 * Profile Completeness Score (0-8 points)
 * Based on presence of key profile fields
 */
export const calculateCompletenessScore = (profile, privateProfile, maxPoints = 8) => {
  const requiredFields = [
    // Public profile fields
    { source: 'public', field: 'bio' },
    { source: 'public', field: 'avatar_url' },
    { source: 'public', field: 'city' },
    // Private profile fields
    { source: 'private', field: 'position' },
    { source: 'private', field: 'looking_for' },
    { source: 'private', field: 'kinks' },
    { source: 'private', field: 'turn_ons' },
    { source: 'private', field: 'height_cm' },
  ];
  
  let filledCount = 0;
  
  for (const { source, field } of requiredFields) {
    const sourceObj = source === 'public' ? profile : privateProfile;
    const value = sourceObj?.[field];
    
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        if (value.length > 0) filledCount++;
      } else if (typeof value === 'string') {
        if (value.trim()) filledCount++;
      } else {
        filledCount++;
      }
    }
  }
  
  const ratio = filledCount / requiredFields.length;
  return Math.round(ratio * maxPoints);
};

/**
 * Chem-Friendly Score (0-3 bonus points, opt-in only)
 * Only calculated if BOTH users have opted in to chem visibility
 */
export const calculateChemScore = (user, match) => {
  // Only process if BOTH users have opted in
  if (!user?.chem_visibility_enabled || !match?.chem_visibility_enabled) {
    return null; // Exclude from scoring
  }
  
  const userChem = String(user?.chem_friendly || '').toLowerCase().trim();
  const matchChem = String(match?.chem_friendly || '').toLowerCase().trim();
  
  if (!userChem || !matchChem) return null;
  
  if (userChem === matchChem) return 3;
  if (userChem === 'flexible' || matchChem === 'flexible') return 2;
  return 0;
};

/**
 * Aggregate all sub-scores into final match probability
 */
export const aggregateScores = (scores, weights = DEFAULT_WEIGHTS) => {
  const breakdown = {
    travelTime: scores.travelTime ?? 0,
    roleCompat: scores.roleCompat ?? 0,
    kinkOverlap: scores.kinkOverlap ?? 0,
    intent: scores.intent ?? 0,
    semantic: scores.semantic ?? 0,
    lifestyle: scores.lifestyle ?? 0,
    activity: scores.activity ?? 0,
    completeness: scores.completeness ?? 0,
  };
  
  // Calculate weighted sum
  let totalScore = 0;
  let totalWeight = 0;
  
  for (const [key, weight] of Object.entries(weights)) {
    const score = breakdown[key] || 0;
    totalScore += score;
    totalWeight += weight;
  }
  
  // Add chem score as bonus if present
  if (typeof scores.chem === 'number') {
    breakdown.chem = scores.chem;
    totalScore += scores.chem;
    totalWeight += 3; // Chem max is 3
  }
  
  // Normalize to 0-100 scale
  const matchProbability = totalWeight > 0
    ? Math.round((totalScore / totalWeight) * 100 * 10) / 10
    : 0;
  
  return {
    matchProbability: Math.min(100, Math.max(0, matchProbability)),
    breakdown,
  };
};

/**
 * Compute full match score for a user-match pair
 */
export const computeMatchScore = ({
  userProfile,
  userPrivateProfile,
  userEmbedding,
  matchProfile,
  matchPrivateProfile,
  matchEmbedding,
  travelTimeMinutes,
  weights = DEFAULT_WEIGHTS,
}) => {
  const scores = {
    travelTime: calculateTravelTimeScore(travelTimeMinutes, weights.travelTime),
    roleCompat: calculateRoleCompatScore(
      userPrivateProfile?.position,
      matchPrivateProfile?.position,
      weights.roleCompat
    ),
    kinkOverlap: calculateKinkScore(
      userPrivateProfile?.kinks,
      matchPrivateProfile?.kinks,
      userPrivateProfile?.hard_limits,
      matchPrivateProfile?.hard_limits,
      weights.kinkOverlap
    ),
    intent: calculateIntentScore(userPrivateProfile, matchPrivateProfile, weights.intent),
    semantic: calculateSemanticScore(userEmbedding, matchEmbedding, weights.semantic),
    lifestyle: calculateLifestyleScore(userPrivateProfile, matchPrivateProfile, weights.lifestyle),
    activity: calculateActivityScore(matchProfile?.last_seen, weights.activity),
    completeness: calculateCompletenessScore(matchProfile, matchPrivateProfile, weights.completeness),
    chem: calculateChemScore(userPrivateProfile, matchPrivateProfile),
  };
  
  return aggregateScores(scores, weights);
};

// Alias for backward compatibility with tests
export const aggregateMatchScore = (breakdown) => {
  const total = Object.values(breakdown).reduce((sum, val) => sum + (val || 0), 0);
  return Math.min(100, Math.max(0, total));
};
