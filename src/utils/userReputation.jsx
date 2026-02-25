/**
 * User Reputation System
 * Track and calculate user trust scores
 */

// Reputation factors and weights
const REPUTATION_FACTORS = {
  accountAge: { weight: 10, maxPoints: 100 },
  profileComplete: { weight: 15, maxPoints: 15 },
  verifiedEmail: { weight: 20, maxPoints: 20 },
  verifiedPhone: { weight: 15, maxPoints: 15 },
  eventsAttended: { weight: 0.5, maxPoints: 50 },
  eventsCreated: { weight: 1, maxPoints: 50 },
  positiveInteractions: { weight: 0.2, maxPoints: 100 },
  reportsMade: { weight: 0.5, maxPoints: 25 },
  reportsReceived: { weight: -5, maxPoints: -100 },
  contentRemoved: { weight: -10, maxPoints: -100 },
  appealSuccessful: { weight: 5, maxPoints: 25 },
  referrals: { weight: 2, maxPoints: 50 },
};

/**
 * Calculate account age score (0-100)
 */
function calculateAccountAgeScore(createdAt) {
  if (!createdAt) return 0;
  
  const daysSinceCreation = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  
  // Max score at 365 days
  return Math.min(100, Math.floor(daysSinceCreation / 3.65));
}

/**
 * Calculate profile completeness score (0-15)
 */
function calculateProfileScore(user) {
  let score = 0;
  
  if (user.full_name) score += 2;
  if (user.display_name) score += 1;
  if (user.bio && user.bio.length > 20) score += 3;
  if (user.avatar_url) score += 3;
  if (user.city) score += 2;
  if (user.social_links && Object.keys(user.social_links).length > 0) score += 2;
  if (user.interests && user.interests.length > 0) score += 2;
  
  return Math.min(15, score);
}

/**
 * Calculate overall reputation score
 */
export function calculateReputationScore(userData) {
  let totalScore = 0;
  const breakdown = {};
  
  // Account age
  const ageScore = calculateAccountAgeScore(userData.created_at) * 
    (REPUTATION_FACTORS.accountAge.weight / 100);
  breakdown.accountAge = Math.min(ageScore, REPUTATION_FACTORS.accountAge.maxPoints);
  totalScore += breakdown.accountAge;
  
  // Profile completeness
  breakdown.profileComplete = calculateProfileScore(userData);
  totalScore += breakdown.profileComplete;
  
  // Email verification
  if (userData.email_verified) {
    breakdown.verifiedEmail = REPUTATION_FACTORS.verifiedEmail.maxPoints;
    totalScore += breakdown.verifiedEmail;
  }
  
  // Phone verification
  if (userData.phone_verified) {
    breakdown.verifiedPhone = REPUTATION_FACTORS.verifiedPhone.maxPoints;
    totalScore += breakdown.verifiedPhone;
  }
  
  // Events attended
  const eventsAttendedScore = (userData.events_attended || 0) * REPUTATION_FACTORS.eventsAttended.weight;
  breakdown.eventsAttended = Math.min(eventsAttendedScore, REPUTATION_FACTORS.eventsAttended.maxPoints);
  totalScore += breakdown.eventsAttended;
  
  // Events created
  const eventsCreatedScore = (userData.events_created || 0) * REPUTATION_FACTORS.eventsCreated.weight;
  breakdown.eventsCreated = Math.min(eventsCreatedScore, REPUTATION_FACTORS.eventsCreated.maxPoints);
  totalScore += breakdown.eventsCreated;
  
  // Positive interactions
  const interactionsScore = (userData.positive_interactions || 0) * REPUTATION_FACTORS.positiveInteractions.weight;
  breakdown.positiveInteractions = Math.min(interactionsScore, REPUTATION_FACTORS.positiveInteractions.maxPoints);
  totalScore += breakdown.positiveInteractions;
  
  // Reports made (community contribution)
  const reportsMadeScore = (userData.reports_made || 0) * REPUTATION_FACTORS.reportsMade.weight;
  breakdown.reportsMade = Math.min(reportsMadeScore, REPUTATION_FACTORS.reportsMade.maxPoints);
  totalScore += breakdown.reportsMade;
  
  // Reports received (negative)
  const reportsReceivedScore = (userData.reports_received || 0) * REPUTATION_FACTORS.reportsReceived.weight;
  breakdown.reportsReceived = Math.max(reportsReceivedScore, REPUTATION_FACTORS.reportsReceived.maxPoints);
  totalScore += breakdown.reportsReceived;
  
  // Content removed (negative)
  const contentRemovedScore = (userData.content_removed || 0) * REPUTATION_FACTORS.contentRemoved.weight;
  breakdown.contentRemoved = Math.max(contentRemovedScore, REPUTATION_FACTORS.contentRemoved.maxPoints);
  totalScore += breakdown.contentRemoved;
  
  // Successful appeals
  const appealsScore = (userData.appeals_successful || 0) * REPUTATION_FACTORS.appealSuccessful.weight;
  breakdown.appealSuccessful = Math.min(appealsScore, REPUTATION_FACTORS.appealSuccessful.maxPoints);
  totalScore += breakdown.appealSuccessful;
  
  // Referrals
  const referralsScore = (userData.referral_count || 0) * REPUTATION_FACTORS.referrals.weight;
  breakdown.referrals = Math.min(referralsScore, REPUTATION_FACTORS.referrals.maxPoints);
  totalScore += breakdown.referrals;
  
  // Ensure score is between 0 and 500
  totalScore = Math.max(0, Math.min(500, totalScore));
  
  return {
    score: Math.round(totalScore),
    level: getReputationLevel(totalScore),
    breakdown,
  };
}

/**
 * Get reputation level from score
 */
export function getReputationLevel(score) {
  if (score >= 400) return { name: 'Legendary', color: '#FFD700', tier: 5 };
  if (score >= 300) return { name: 'Trusted', color: '#39FF14', tier: 4 };
  if (score >= 200) return { name: 'Established', color: '#00D9FF', tier: 3 };
  if (score >= 100) return { name: 'Active', color: '#B026FF', tier: 2 };
  if (score >= 50) return { name: 'New', color: '#C8962C', tier: 1 };
  return { name: 'Unverified', color: '#666', tier: 0 };
}

/**
 * Get trust badge for display
 */
export function getTrustBadge(score) {
  const level = getReputationLevel(score);
  
  return {
    ...level,
    icon: level.tier >= 3 ? '✓' : level.tier >= 1 ? '•' : '○',
    showBadge: level.tier >= 2,
  };
}

/**
 * Check if user is trustworthy for a specific action
 */
export function canPerformAction(score, action) {
  const requirements = {
    createEvent: 50,
    sellProducts: 100,
    sendMessages: 0,
    reportContent: 0,
    moderateContent: 300,
    verifyOthers: 400,
  };
  
  return score >= (requirements[action] || 0);
}

/**
 * Calculate reputation change for an action
 */
export function calculateReputationChange(action, context = {}) {
  const changes = {
    attendEvent: 1,
    createEvent: 2,
    receiveLike: 0.5,
    receiveFollow: 0.5,
    reportAccepted: 2,
    reportRejected: -1,
    contentFlagged: -5,
    contentRemoved: -10,
    appealAccepted: 5,
    appealRejected: -2,
    verificationComplete: 20,
    referralComplete: 5,
  };
  
  return changes[action] || 0;
}

export default {
  calculateReputationScore,
  getReputationLevel,
  getTrustBadge,
  canPerformAction,
  calculateReputationChange,
  REPUTATION_FACTORS,
};
