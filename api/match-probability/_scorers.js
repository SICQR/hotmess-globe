/**
 * Match Probability Scoring Engine
 * 
 * Contains all sub-scorers for computing match probability between users.
 * Each scorer is deterministic and returns a score within its defined range.
 */

// ============================================================================
// Constants and Configuration
// ============================================================================

export const DEFAULT_WEIGHTS = {
  travel_time: 20,
  role_compatibility: 15,
  kink_overlap: 15,
  intent_alignment: 12,
  semantic_text: 12,
  lifestyle_match: 10,
  activity_recency: 8,
  profile_completeness: 8,
};

export const TRAVEL_TIME_THRESHOLDS = {
  walking: { max: 5, score: 20 },
  quick: { max: 15, score: 18 },
  reasonable: { max: 30, score: 15 },
  committed: { max: 60, score: 10 },
  long: { max: 120, score: 5 },
  very_far: { score: 2 },
  unknown: { score: 10 },
};

export const ROLE_COMPATIBILITY_MATRIX = {
  'top': { 'bottom': 15, 'vers': 12, 'vers_top': 8, 'vers_bottom': 10, 'top': 5, 'side': 7, 'oral': 10 },
  'bottom': { 'top': 15, 'vers': 12, 'vers_bottom': 8, 'vers_top': 10, 'bottom': 5, 'side': 7, 'oral': 10 },
  'vers': { 'vers': 15, 'top': 12, 'bottom': 12, 'vers_top': 10, 'vers_bottom': 10, 'side': 8, 'oral': 10 },
  'vers_top': { 'bottom': 12, 'vers_bottom': 15, 'vers': 10, 'top': 5, 'vers_top': 8, 'side': 7, 'oral': 9 },
  'vers_bottom': { 'top': 12, 'vers_top': 15, 'vers': 10, 'bottom': 5, 'vers_bottom': 8, 'side': 7, 'oral': 9 },
  'side': { 'side': 15, 'vers': 8, 'top': 7, 'bottom': 7, 'vers_top': 7, 'vers_bottom': 7, 'oral': 10 },
  'oral': { 'oral': 15, 'vers': 10, 'top': 10, 'bottom': 10, 'vers_top': 9, 'vers_bottom': 9, 'side': 10 },
};

// Default score when role is unknown or flexible
const DEFAULT_ROLE_SCORE = 10;

// ============================================================================
// Travel Time Scorer (0-20 points)
// ============================================================================

/**
 * Calculate travel time score based on travel duration in minutes
 * @param {number|null} durationMinutes - Travel time in minutes (walking preferred)
 * @param {object} thresholds - Optional custom thresholds
 * @returns {number} Score between 0-20
 */
export const calculateTravelTimeScore = (durationMinutes, thresholds = TRAVEL_TIME_THRESHOLDS) => {
  if (durationMinutes === null || durationMinutes === undefined) {
    return thresholds.unknown.score;
  }

  if (durationMinutes <= thresholds.walking.max) return thresholds.walking.score;
  if (durationMinutes <= thresholds.quick.max) return thresholds.quick.score;
  if (durationMinutes <= thresholds.reasonable.max) return thresholds.reasonable.score;
  if (durationMinutes <= thresholds.committed.max) return thresholds.committed.score;
  if (durationMinutes <= thresholds.long.max) return thresholds.long.score;
  return thresholds.very_far.score;
};

// ============================================================================
// Role Compatibility Scorer (0-15 points)
// ============================================================================

/**
 * Calculate role compatibility score
 * @param {string} userRole - Current user's position/role
 * @param {string} matchRole - Match's position/role
 * @param {object} matrix - Optional custom compatibility matrix
 * @returns {number} Score between 0-15
 */
export const calculateRoleCompatibilityScore = (userRole, matchRole, matrix = ROLE_COMPATIBILITY_MATRIX) => {
  if (!userRole || !matchRole) {
    return DEFAULT_ROLE_SCORE;
  }

  const normalizedUserRole = String(userRole).toLowerCase().trim();
  const normalizedMatchRole = String(matchRole).toLowerCase().trim();

  // Handle flexible/open preferences
  if (normalizedUserRole === 'flexible' || normalizedUserRole === 'open' ||
      normalizedMatchRole === 'flexible' || normalizedMatchRole === 'open') {
    return 12; // Good compatibility for flexible users
  }

  const userScores = matrix[normalizedUserRole];
  if (!userScores) return DEFAULT_ROLE_SCORE;

  return userScores[normalizedMatchRole] ?? DEFAULT_ROLE_SCORE;
};

// ============================================================================
// Kink Overlap Scorer (0-15 points)
// ============================================================================

/**
 * Calculate kink overlap score with conflict detection
 * @param {string[]} userKinks - Current user's kinks
 * @param {string[]} matchKinks - Match's kinks
 * @param {string[]} userHardLimits - Current user's hard limits
 * @param {string[]} matchHardLimits - Match's hard limits
 * @param {string[]} userSoftLimits - Current user's soft limits
 * @param {string[]} matchSoftLimits - Match's soft limits
 * @param {object} penalties - Penalty configuration
 * @returns {{score: number, conflicts: string[], overlaps: string[]}}
 */
export const calculateKinkOverlapScore = (
  userKinks = [],
  matchKinks = [],
  userHardLimits = [],
  matchHardLimits = [],
  userSoftLimits = [],
  matchSoftLimits = [],
  penalties = { hardLimit: 10, softLimit: 3 }
) => {
  const normalize = arr => (arr || []).map(k => String(k).toLowerCase().trim()).filter(Boolean);

  const userKinkSet = new Set(normalize(userKinks));
  const matchKinkSet = new Set(normalize(matchKinks));
  const userHardLimitSet = new Set(normalize(userHardLimits));
  const matchHardLimitSet = new Set(normalize(matchHardLimits));
  const userSoftLimitSet = new Set(normalize(userSoftLimits));
  const matchSoftLimitSet = new Set(normalize(matchSoftLimits));

  // Check for hard limit conflicts (user's kink is match's hard limit or vice versa)
  const hardConflicts = [];
  for (const kink of userKinkSet) {
    if (matchHardLimitSet.has(kink)) hardConflicts.push(kink);
  }
  for (const kink of matchKinkSet) {
    if (userHardLimitSet.has(kink)) hardConflicts.push(kink);
  }

  // Hard limit conflicts = severe penalty
  if (hardConflicts.length > 0) {
    const penalty = Math.min(hardConflicts.length * penalties.hardLimit, 15);
    return {
      score: Math.max(0, 5 - penalty),
      conflicts: [...new Set(hardConflicts)],
      overlaps: [],
      hasHardConflict: true,
    };
  }

  // Check for soft limit conflicts
  const softConflicts = [];
  for (const kink of userKinkSet) {
    if (matchSoftLimitSet.has(kink)) softConflicts.push(kink);
  }
  for (const kink of matchKinkSet) {
    if (userSoftLimitSet.has(kink)) softConflicts.push(kink);
  }

  // Calculate overlap
  const overlaps = [...userKinkSet].filter(k => matchKinkSet.has(k));
  const maxPossible = Math.max(userKinkSet.size, matchKinkSet.size, 1);
  const overlapRatio = overlaps.length / maxPossible;

  // Base score from overlap
  let score = Math.round(overlapRatio * 15);

  // Apply soft limit penalty
  if (softConflicts.length > 0) {
    score = Math.max(0, score - softConflicts.length * penalties.softLimit);
  }

  return {
    score: Math.min(15, score),
    conflicts: [...new Set(softConflicts)],
    overlaps,
    hasHardConflict: false,
  };
};

// ============================================================================
// Intent Alignment Scorer (0-12 points)
// ============================================================================

/**
 * Calculate intent alignment score
 * @param {object} user - Current user's profile
 * @param {object} match - Match's profile
 * @returns {{score: number, matchedIntents: string[]}}
 */
export const calculateIntentAlignmentScore = (user, match) => {
  let score = 0;
  const matchedIntents = [];

  // Looking for overlap (0-6 points)
  const userLooking = new Set((user.looking_for || []).map(l => String(l).toLowerCase().trim()));
  const matchLooking = new Set((match.looking_for || []).map(l => String(l).toLowerCase().trim()));

  for (const intent of userLooking) {
    if (matchLooking.has(intent)) {
      matchedIntents.push(intent);
    }
  }
  score += Math.min(matchedIntents.length * 2, 6);

  // Relationship status compatibility (0-3 points)
  if (user.relationship_status && match.relationship_status) {
    const userStatus = String(user.relationship_status).toLowerCase();
    const matchStatus = String(match.relationship_status).toLowerCase();

    if (userStatus === matchStatus) {
      score += 3;
    } else if (
      (userStatus.includes('open') && matchStatus.includes('open')) ||
      (userStatus === 'single' && matchStatus === 'single')
    ) {
      score += 2;
    }
  }

  // Time horizon match (0-3 points)
  if (user.time_horizon && match.time_horizon) {
    const userHorizon = String(user.time_horizon).toLowerCase();
    const matchHorizon = String(match.time_horizon).toLowerCase();

    if (userHorizon === matchHorizon) {
      score += 3;
    } else if (
      (userHorizon.includes('now') && matchHorizon.includes('now')) ||
      (userHorizon.includes('today') && matchHorizon.includes('today'))
    ) {
      score += 2;
    }
  }

  return {
    score: Math.min(12, score),
    matchedIntents,
  };
};

// ============================================================================
// Semantic Text Scorer (0-12 points)
// ============================================================================

/**
 * Calculate cosine similarity between two vectors
 */
const cosineSimilarity = (a, b) => {
  if (!a || !b || a.length !== b.length) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
};

/**
 * Calculate semantic text similarity score
 * @param {number[]|null} userEmbedding - User's combined embedding
 * @param {number[]|null} matchEmbedding - Match's combined embedding
 * @returns {number} Score between 0-12
 */
export const calculateSemanticTextScore = (userEmbedding, matchEmbedding) => {
  if (!userEmbedding || !matchEmbedding) {
    return 6; // Default for missing embeddings
  }

  const similarity = cosineSimilarity(userEmbedding, matchEmbedding);

  // Map similarity (-1 to 1) to score (0 to 12)
  // Typical similarity scores are 0.6-0.9 for related content
  // Use a threshold to differentiate good matches
  const normalizedSimilarity = Math.max(0, similarity);
  return Math.round(normalizedSimilarity * 12);
};

// ============================================================================
// Lifestyle Match Scorer (0-10 points)
// ============================================================================

/**
 * Calculate lifestyle compatibility score
 * @param {object} user - Current user's profile
 * @param {object} match - Match's profile
 * @returns {{score: number, matchedFactors: string[]}}
 */
export const calculateLifestyleMatchScore = (user, match) => {
  let score = 0;
  const matchedFactors = [];

  // Direct field matches (2 points each, max 8)
  const directFields = ['smoking', 'drinking', 'fitness', 'diet'];

  for (const field of directFields) {
    if (user[field] && match[field]) {
      const userVal = String(user[field]).toLowerCase();
      const matchVal = String(match[field]).toLowerCase();

      if (userVal === matchVal) {
        score += 2;
        matchedFactors.push(field);
      } else if (
        // Partial compatibility
        (field === 'smoking' && userVal === 'social' && matchVal === 'social') ||
        (field === 'drinking' && userVal.includes('occasional') && matchVal.includes('occasional'))
      ) {
        score += 1;
      }
    }
  }

  // Scene affinity overlap (0-2 points)
  const userScenes = new Set((user.scene_affinity || []).map(s => String(s).toLowerCase()));
  const matchScenes = new Set((match.scene_affinity || []).map(s => String(s).toLowerCase()));

  let sceneOverlap = 0;
  for (const scene of userScenes) {
    if (matchScenes.has(scene)) sceneOverlap++;
  }

  if (sceneOverlap >= 2) {
    score += 2;
    matchedFactors.push('scene_affinity');
  } else if (sceneOverlap === 1) {
    score += 1;
  }

  return {
    score: Math.min(10, score),
    matchedFactors,
  };
};

// ============================================================================
// Chem-Friendly Scorer (Optional, 0-3 bonus points)
// ============================================================================

/**
 * Calculate chem-friendly compatibility (only if both opted in)
 * @param {object} user - Current user's profile
 * @param {object} match - Match's profile
 * @returns {{score: number|null, applicable: boolean}}
 */
export const calculateChemScore = (user, match) => {
  // Only score if both users have opted into disclosure
  const userOptedIn = user.chem_visibility_enabled === true;
  const matchOptedIn = match.chem_visibility_enabled === true;

  if (!userOptedIn || !matchOptedIn) {
    return { score: null, applicable: false };
  }

  const userChem = String(user.chem_friendly || '').toLowerCase();
  const matchChem = String(match.chem_friendly || '').toLowerCase();

  if (!userChem || !matchChem) {
    return { score: null, applicable: false };
  }

  // Direct match
  if (userChem === matchChem) {
    return { score: 3, applicable: true };
  }

  // Flexible compatibility
  if (userChem === 'flexible' || matchChem === 'flexible') {
    return { score: 2, applicable: true };
  }

  // Incompatible (one is 'no' or 'never', other is 'yes' or 'often')
  const userYes = userChem.includes('yes') || userChem.includes('often') || userChem === 'friendly';
  const matchYes = matchChem.includes('yes') || matchChem.includes('often') || matchChem === 'friendly';
  const userNo = userChem.includes('no') || userChem.includes('never') || userChem === 'sober';
  const matchNo = matchChem.includes('no') || matchChem.includes('never') || matchChem === 'sober';

  if ((userYes && matchNo) || (userNo && matchYes)) {
    return { score: 0, applicable: true };
  }

  return { score: 1, applicable: true };
};

// ============================================================================
// Activity Recency Scorer (0-8 points)
// ============================================================================

/**
 * Calculate activity recency score
 * @param {string|Date} lastSeen - Match's last seen timestamp
 * @returns {number} Score between 0-8
 */
export const calculateActivityRecencyScore = (lastSeen) => {
  if (!lastSeen) return 4; // Default for unknown

  const now = Date.now();
  const lastSeenTime = new Date(lastSeen).getTime();
  const minutesAgo = (now - lastSeenTime) / (1000 * 60);

  if (minutesAgo < 5) return 8;      // Active right now
  if (minutesAgo < 15) return 7;     // Just active
  if (minutesAgo < 60) return 6;     // Active in last hour
  if (minutesAgo < 360) return 5;    // Active in last 6 hours
  if (minutesAgo < 1440) return 4;   // Active in last 24 hours
  if (minutesAgo < 10080) return 2;  // Active in last week
  return 1;                           // Inactive
};

// ============================================================================
// Profile Completeness Scorer (0-8 points)
// ============================================================================

/**
 * Calculate profile completeness score
 * @param {object} profile - Match's profile
 * @returns {{score: number, completedFields: string[]}}
 */
export const calculateProfileCompletenessScore = (profile) => {
  let score = 0;
  const completedFields = [];

  // Photos (0-2 points)
  if (profile.photos?.length > 0) {
    score += 1;
    completedFields.push('photos');
    if (profile.photos.length >= 3) {
      score += 1;
      completedFields.push('multiple_photos');
    }
  }

  // Bio (0-1.5 points)
  if (profile.bio && profile.bio.length >= 20) {
    score += 1;
    completedFields.push('bio');
    if (profile.bio.length >= 100) {
      score += 0.5;
    }
  }

  // Location (0-1 point)
  if (profile.city || (profile.last_lat && profile.last_lng)) {
    score += 1;
    completedFields.push('location');
  }

  // Tags/interests (0-1 point)
  if (profile.tags?.length > 0 || profile.interests?.length > 0) {
    score += 1;
    completedFields.push('tags');
  }

  // Looking for (0-1 point)
  if (profile.looking_for?.length > 0) {
    score += 1;
    completedFields.push('looking_for');
  }

  // Verified status (0-1 point)
  if (profile.verified || profile.verified_seller || profile.verified_organizer) {
    score += 1;
    completedFields.push('verified');
  }

  // Kinks/preferences filled (0-0.5 point)
  if (profile.kinks?.length > 0 || profile.position) {
    score += 0.5;
    completedFields.push('preferences');
  }

  return {
    score: Math.min(8, Math.round(score * 10) / 10),
    completedFields,
  };
};

// ============================================================================
// Hosting Compatibility Scorer (Bonus, 0-3 points)
// ============================================================================

/**
 * Calculate hosting/travel compatibility
 * @param {object} user - Current user's profile
 * @param {object} match - Match's profile
 * @returns {{score: number, compatible: boolean}}
 */
export const calculateHostingCompatibilityScore = (user, match) => {
  const userHosting = String(user.hosting || '').toLowerCase();
  const matchHosting = String(match.hosting || '').toLowerCase();

  if (!userHosting || !matchHosting) {
    return { score: 0, compatible: true };
  }

  // Can host + Can't host = perfect compatibility
  if (
    (userHosting.includes('can host') && matchHosting.includes('cannot') && matchHosting.includes('travel')) ||
    (matchHosting.includes('can host') && userHosting.includes('cannot') && userHosting.includes('travel'))
  ) {
    return { score: 3, compatible: true };
  }

  // Both can host
  if (userHosting.includes('can host') && matchHosting.includes('can host')) {
    return { score: 2, compatible: true };
  }

  // One can host, other flexible
  if (
    (userHosting.includes('can host') || matchHosting.includes('can host')) &&
    (userHosting.includes('flexible') || matchHosting.includes('flexible') ||
     userHosting.includes('either') || matchHosting.includes('either'))
  ) {
    return { score: 2, compatible: true };
  }

  // Both flexible
  if (
    (userHosting.includes('flexible') || userHosting.includes('either')) &&
    (matchHosting.includes('flexible') || matchHosting.includes('either'))
  ) {
    return { score: 1, compatible: true };
  }

  // Neither can host
  if (userHosting.includes('cannot') && matchHosting.includes('cannot')) {
    return { score: 0, compatible: false };
  }

  return { score: 0, compatible: true };
};

// ============================================================================
// Main Score Aggregator
// ============================================================================

/**
 * Calculate overall match probability score
 * @param {object} params - All scoring inputs
 * @returns {{matchProbability: number, breakdown: object}}
 */
export const calculateMatchProbability = ({
  travelTimeMinutes,
  userProfile,
  matchProfile,
  userPrivateProfile,
  matchPrivateProfile,
  userEmbedding,
  matchEmbedding,
  weights = DEFAULT_WEIGHTS,
}) => {
  const breakdown = {};

  // 1. Travel Time Score
  breakdown.travelTime = calculateTravelTimeScore(travelTimeMinutes);

  // 2. Role Compatibility Score
  breakdown.roleCompat = calculateRoleCompatibilityScore(
    userPrivateProfile?.position,
    matchPrivateProfile?.position
  );

  // 3. Kink Overlap Score
  const kinkResult = calculateKinkOverlapScore(
    userPrivateProfile?.kinks,
    matchPrivateProfile?.kinks,
    userPrivateProfile?.hard_limits,
    matchPrivateProfile?.hard_limits,
    userPrivateProfile?.soft_limits,
    matchPrivateProfile?.soft_limits
  );
  breakdown.kinkOverlap = kinkResult.score;
  breakdown._kinkConflicts = kinkResult.conflicts;
  breakdown._hasHardConflict = kinkResult.hasHardConflict;

  // 4. Intent Alignment Score
  const intentResult = calculateIntentAlignmentScore(
    { ...userProfile, ...userPrivateProfile },
    { ...matchProfile, ...matchPrivateProfile }
  );
  breakdown.intent = intentResult.score;
  breakdown._matchedIntents = intentResult.matchedIntents;

  // 5. Semantic Text Score
  breakdown.semantic = calculateSemanticTextScore(userEmbedding, matchEmbedding);

  // 6. Lifestyle Match Score
  const lifestyleResult = calculateLifestyleMatchScore(
    { ...userProfile, ...userPrivateProfile },
    { ...matchProfile, ...matchPrivateProfile }
  );
  breakdown.lifestyle = lifestyleResult.score;
  breakdown._matchedLifestyle = lifestyleResult.matchedFactors;

  // 7. Activity Recency Score
  breakdown.activity = calculateActivityRecencyScore(matchProfile?.last_seen || matchProfile?.updated_at);

  // 8. Profile Completeness Score
  const completenessResult = calculateProfileCompletenessScore(matchProfile);
  breakdown.completeness = completenessResult.score;

  // Bonus: Chem Score (if applicable)
  const chemResult = calculateChemScore(userPrivateProfile || {}, matchPrivateProfile || {});
  if (chemResult.applicable) {
    breakdown.chem = chemResult.score;
  }

  // Bonus: Hosting Compatibility
  const hostingResult = calculateHostingCompatibilityScore(
    userPrivateProfile || {},
    matchPrivateProfile || {}
  );
  if (!hostingResult.compatible) {
    // Apply penalty for incompatible hosting
    breakdown._hostingIncompatible = true;
  }

  // Calculate weighted total
  let total = 0;
  total += breakdown.travelTime * (weights.travel_time / 20);
  total += breakdown.roleCompat * (weights.role_compatibility / 15);
  total += breakdown.kinkOverlap * (weights.kink_overlap / 15);
  total += breakdown.intent * (weights.intent_alignment / 12);
  total += breakdown.semantic * (weights.semantic_text / 12);
  total += breakdown.lifestyle * (weights.lifestyle_match / 10);
  total += breakdown.activity * (weights.activity_recency / 8);
  total += breakdown.completeness * (weights.profile_completeness / 8);

  // Apply bonuses
  if (chemResult.applicable && chemResult.score) {
    total += chemResult.score; // Bonus points
  }
  if (hostingResult.score) {
    total += hostingResult.score; // Bonus points
  }

  // Apply penalties
  if (breakdown._hasHardConflict) {
    total = Math.max(0, total - 20); // Significant penalty for hard conflicts
  }
  if (breakdown._hostingIncompatible) {
    total = Math.max(0, total - 5); // Minor penalty
  }

  // Normalize to 0-100 range
  const matchProbability = Math.max(0, Math.min(100, Math.round(total * 10) / 10));

  // Clean internal fields from breakdown for API response
  const cleanBreakdown = {
    travelTime: breakdown.travelTime,
    roleCompat: breakdown.roleCompat,
    kinkOverlap: breakdown.kinkOverlap,
    intent: breakdown.intent,
    semantic: breakdown.semantic,
    lifestyle: breakdown.lifestyle,
    activity: breakdown.activity,
    completeness: breakdown.completeness,
  };

  if (chemResult.applicable) {
    cleanBreakdown.chem = breakdown.chem;
  }

  return {
    matchProbability,
    breakdown: cleanBreakdown,
    _details: {
      kinkConflicts: breakdown._kinkConflicts,
      hasHardConflict: breakdown._hasHardConflict,
      matchedIntents: breakdown._matchedIntents,
      matchedLifestyle: breakdown._matchedLifestyle,
      hostingIncompatible: breakdown._hostingIncompatible,
    },
  };
};
