/**
 * Scoring utilities for match probability calculation
 * Each scorer returns a value between 0 and its max points
 */

/**
 * Calculate travel time score (0-20 points)
 * Rewards closer proximity with decay for longer travel times
 */
export const calculateTravelTimeScore = (durationMinutes) => {
  if (durationMinutes === null || durationMinutes === undefined) return 10; // Unknown, neutral score
  if (!Number.isFinite(durationMinutes)) return 10;
  
  if (durationMinutes <= 5) return 20;     // Walking distance
  if (durationMinutes <= 15) return 18;    // Quick trip
  if (durationMinutes <= 30) return 15;    // Reasonable
  if (durationMinutes <= 60) return 10;    // Committed trip
  if (durationMinutes <= 120) return 5;    // Long journey
  return 2;                                // Very far
};

/**
 * Role compatibility matrix (0-15 points)
 * Based on position field from user_private_profile
 */
const ROLE_COMPATIBILITY = {
  'top': { 'bottom': 15, 'vers': 12, 'vers_top': 8, 'vers_bottom': 10, 'top': 5 },
  'bottom': { 'top': 15, 'vers': 12, 'vers_bottom': 8, 'vers_top': 10, 'bottom': 5 },
  'vers': { 'vers': 15, 'top': 12, 'bottom': 12, 'vers_top': 10, 'vers_bottom': 10 },
  'vers_top': { 'bottom': 12, 'vers_bottom': 15, 'vers': 10, 'top': 5, 'vers_top': 8 },
  'vers_bottom': { 'top': 12, 'vers_top': 15, 'vers': 10, 'bottom': 5, 'vers_bottom': 8 },
};

export const calculateRoleCompatScore = (userPosition, matchPosition) => {
  if (!userPosition || !matchPosition) return 8; // Default neutral score
  
  const userPos = String(userPosition).toLowerCase().trim();
  const matchPos = String(matchPosition).toLowerCase().trim();
  
  const matrix = ROLE_COMPATIBILITY[userPos];
  if (!matrix) return 8;
  
  const score = matrix[matchPos];
  return score !== undefined ? score : 8;
};

/**
 * Kink overlap score (0-15 points)
 * Considers shared kinks and penalizes hard limit conflicts
 */
export const calculateKinkScore = (userKinks, matchKinks, userHardLimits, matchHardLimits) => {
  const userKinkSet = new Set(Array.isArray(userKinks) ? userKinks : []);
  const matchKinkSet = new Set(Array.isArray(matchKinks) ? matchKinks : []);
  const userHardLimitSet = new Set(Array.isArray(userHardLimits) ? userHardLimits : []);
  const matchHardLimitSet = new Set(Array.isArray(matchHardLimits) ? matchHardLimits : []);
  
  // Hard limit conflicts = immediate penalty
  const userMatchConflicts = [...userKinkSet].filter(k => matchHardLimitSet.has(k));
  const matchUserConflicts = [...matchKinkSet].filter(k => userHardLimitSet.has(k));
  const totalConflicts = userMatchConflicts.length + matchUserConflicts.length;
  
  if (totalConflicts > 0) {
    // Severe penalty for hard limit conflicts
    return Math.max(0, 5 - totalConflicts * 3);
  }
  
  // Calculate overlap ratio
  const overlap = [...userKinkSet].filter(k => matchKinkSet.has(k)).length;
  const maxPossible = Math.max(userKinkSet.size, matchKinkSet.size, 1);
  
  if (userKinkSet.size === 0 && matchKinkSet.size === 0) {
    return 8; // Both neutral/not specified
  }
  
  return Math.round((overlap / maxPossible) * 15);
};

/**
 * Intent alignment score (0-12 points)
 * Uses looking_for, relationship_status, time_horizon
 */
export const calculateIntentScore = (user, match) => {
  let score = 0;
  
  // Looking for overlap (max 6 points)
  const userLooking = new Set(Array.isArray(user.looking_for) ? user.looking_for : []);
  const matchLooking = new Set(Array.isArray(match.looking_for) ? match.looking_for : []);
  const intentOverlap = [...userLooking].filter(l => matchLooking.has(l)).length;
  score += Math.min(intentOverlap * 3, 6);
  
  // Relationship status compatibility (3 points)
  if (user.relationship_status && match.relationship_status) {
    if (user.relationship_status === match.relationship_status) {
      score += 3;
    } else {
      // Partial points for compatible statuses
      const compatible = [
        ['single', 'open'],
        ['open', 'partnered_open'],
        ['partnered_open', 'open']
      ];
      const pair = [user.relationship_status, match.relationship_status];
      const reversePair = [match.relationship_status, user.relationship_status];
      if (compatible.some(c => c[0] === pair[0] && c[1] === pair[1]) ||
          compatible.some(c => c[0] === reversePair[0] && c[1] === reversePair[1])) {
        score += 1.5;
      }
    }
  }
  
  // Time horizon match (3 points)
  if (user.time_horizon && match.time_horizon && user.time_horizon === match.time_horizon) {
    score += 3;
  }
  
  return Math.min(score, 12);
};

/**
 * Cosine similarity helper for embeddings
 */
export const cosineSimilarity = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b)) return null;
  if (a.length !== b.length) return null;
  if (a.length === 0) return null;
  
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  
  if (magA === 0 || magB === 0) return null;
  
  return dot / (magA * magB);
};

/**
 * Semantic text score (0-12 points)
 * Uses combined embeddings from profile_embeddings table
 */
export const calculateSemanticScore = (userEmbedding, matchEmbedding) => {
  if (!userEmbedding || !matchEmbedding) return 6; // Default neutral score
  
  const similarity = cosineSimilarity(userEmbedding, matchEmbedding);
  if (similarity === null) return 6;
  
  // Cosine similarity ranges from -1 to 1, normalize to 0-12
  // We treat negative similarity as 0 and positive as scaled to 12
  const normalized = Math.max(0, similarity);
  return Math.round(normalized * 12);
};

/**
 * Lifestyle match score (0-10 points)
 * Uses smoking, drinking, fitness, diet, scene_affinity
 */
export const calculateLifestyleScore = (user, match) => {
  let score = 0;
  const fields = ['smoking', 'drinking', 'fitness', 'diet'];
  
  for (const field of fields) {
    if (user[field] && match[field]) {
      if (user[field] === match[field]) {
        score += 2;
      } else {
        // Partial credit for compatible choices
        const compatible = {
          smoking: [['never', 'socially'], ['socially', 'regularly']],
          drinking: [['never', 'socially'], ['socially', 'regularly']],
          fitness: [['moderate', 'active'], ['active', 'very_active']],
        };
        if (compatible[field]) {
          const pair = [user[field], match[field]];
          const reversePair = [match[field], user[field]];
          if (compatible[field].some(c => c[0] === pair[0] && c[1] === pair[1]) ||
              compatible[field].some(c => c[0] === reversePair[0] && c[1] === reversePair[1])) {
            score += 1;
          }
        }
      }
    }
  }
  
  // Scene affinity overlap (max 2 points)
  const userScenes = new Set(Array.isArray(user.scene_affinity) ? user.scene_affinity : []);
  const matchScenes = new Set(Array.isArray(match.scene_affinity) ? match.scene_affinity : []);
  const sceneOverlap = [...userScenes].filter(s => matchScenes.has(s)).length;
  score += Math.min(sceneOverlap, 2);
  
  return Math.min(score, 10);
};

/**
 * Activity recency score (0-8 points)
 * Rewards recently active users
 */
export const calculateActivityScore = (lastSeen) => {
  if (!lastSeen) return 4; // Default neutral
  
  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const hoursSince = (now - lastSeenDate) / (1000 * 60 * 60);
  
  if (hoursSince < 1) return 8;      // Active in last hour
  if (hoursSince < 24) return 7;     // Active today
  if (hoursSince < 72) return 5;     // Active in last 3 days
  if (hoursSince < 168) return 3;    // Active in last week
  if (hoursSince < 720) return 1;    // Active in last month
  return 0;                          // Inactive
};

/**
 * Profile completeness score (0-8 points)
 * Rewards profiles with key fields filled
 */
export const calculateCompletenessScore = (profile) => {
  let score = 0;
  const keyFields = [
    'bio',
    'position',
    'looking_for',
    'kinks',
    'turn_ons',
    'relationship_status',
    'photos',
    'age'
  ];
  
  for (const field of keyFields) {
    const value = profile[field];
    if (value) {
      if (Array.isArray(value) && value.length > 0) score += 1;
      else if (typeof value === 'string' && value.trim().length > 0) score += 1;
      else if (typeof value === 'number' && Number.isFinite(value)) score += 1;
    }
  }
  
  return Math.min(score, 8);
};

/**
 * Aggregate all scores into final match probability
 */
export const aggregateMatchScore = (breakdown) => {
  const total = Object.values(breakdown).reduce((sum, val) => sum + (val || 0), 0);
  // Total possible points = 100
  return Math.min(100, Math.max(0, Math.round(total * 10) / 10));
};
