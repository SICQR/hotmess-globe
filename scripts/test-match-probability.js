/**
 * Test Script for Match Probability Scoring System
 * 
 * Run with: node scripts/test-match-probability.js
 */

import {
  calculateTravelTimeScore,
  calculateRoleCompatibilityScore,
  calculateKinkOverlapScore,
  calculateIntentAlignmentScore,
  calculateSemanticTextScore,
  calculateLifestyleMatchScore,
  calculateChemScore,
  calculateActivityRecencyScore,
  calculateProfileCompletenessScore,
  calculateHostingCompatibilityScore,
  calculateMatchProbability,
  DEFAULT_WEIGHTS,
  TRAVEL_TIME_THRESHOLDS,
  ROLE_COMPATIBILITY_MATRIX,
} from '../api/match-probability/_scorers.js';

// ============================================================================
// Test Helpers
// ============================================================================

let passed = 0;
let failed = 0;

function assertEqual(actual, expected, testName) {
  if (actual === expected) {
    console.log(`✅ ${testName}: ${actual}`);
    passed++;
  } else {
    console.log(`❌ ${testName}: expected ${expected}, got ${actual}`);
    failed++;
  }
}

function assertRange(actual, min, max, testName) {
  if (actual >= min && actual <= max) {
    console.log(`✅ ${testName}: ${actual} (in range ${min}-${max})`);
    passed++;
  } else {
    console.log(`❌ ${testName}: ${actual} (expected ${min}-${max})`);
    failed++;
  }
}

function assertTrue(condition, testName) {
  if (condition) {
    console.log(`✅ ${testName}`);
    passed++;
  } else {
    console.log(`❌ ${testName}`);
    failed++;
  }
}

// ============================================================================
// Travel Time Score Tests
// ============================================================================

console.log('\n📍 TRAVEL TIME SCORING\n' + '='.repeat(50));

assertEqual(calculateTravelTimeScore(3), 20, 'Walking distance (3 min)');
assertEqual(calculateTravelTimeScore(10), 18, 'Quick travel (10 min)');
assertEqual(calculateTravelTimeScore(25), 15, 'Reasonable travel (25 min)');
assertEqual(calculateTravelTimeScore(45), 10, 'Committed travel (45 min)');
assertEqual(calculateTravelTimeScore(90), 5, 'Long travel (90 min)');
assertEqual(calculateTravelTimeScore(180), 2, 'Very far (180 min)');
assertEqual(calculateTravelTimeScore(null), 10, 'Unknown travel time');

// ============================================================================
// Role Compatibility Tests
// ============================================================================

console.log('\n🎭 ROLE COMPATIBILITY\n' + '='.repeat(50));

assertEqual(calculateRoleCompatibilityScore('top', 'bottom'), 15, 'Top + Bottom = Perfect');
assertEqual(calculateRoleCompatibilityScore('bottom', 'top'), 15, 'Bottom + Top = Perfect');
assertEqual(calculateRoleCompatibilityScore('vers', 'vers'), 15, 'Vers + Vers = Perfect');
assertEqual(calculateRoleCompatibilityScore('top', 'top'), 5, 'Top + Top = Low');
assertEqual(calculateRoleCompatibilityScore('bottom', 'bottom'), 5, 'Bottom + Bottom = Low');
assertEqual(calculateRoleCompatibilityScore('vers', 'top'), 12, 'Vers + Top = Good');
assertEqual(calculateRoleCompatibilityScore('flexible', 'bottom'), 12, 'Flexible = Good');
assertEqual(calculateRoleCompatibilityScore(null, 'top'), 10, 'Unknown role = Default');

// ============================================================================
// Kink Overlap Tests
// ============================================================================

console.log('\n🔥 KINK OVERLAP\n' + '='.repeat(50));

const kinkResult1 = calculateKinkOverlapScore(
  ['bondage', 'leather', 'puppy'],
  ['bondage', 'leather', 'dom'],
  [], [], [], []
);
assertRange(kinkResult1.score, 8, 15, 'Partial kink overlap');
assertTrue(kinkResult1.overlaps.includes('bondage'), 'Identifies overlapping kinks');

const kinkResult2 = calculateKinkOverlapScore(
  ['bondage'],
  ['spanking'],
  ['bondage'], // User's hard limit
  [], [], []
);
assertEqual(kinkResult2.hasHardConflict, false, 'No conflict when user limits their own kink');

const kinkResult3 = calculateKinkOverlapScore(
  ['spanking'],
  ['spanking'],
  [],
  ['spanking'], // Match has hard limit on spanking
  [], []
);
assertEqual(kinkResult3.hasHardConflict, true, 'Detects hard limit conflict');
assertRange(kinkResult3.score, 0, 5, 'Low score with hard conflict');

// ============================================================================
// Intent Alignment Tests
// ============================================================================

console.log('\n🎯 INTENT ALIGNMENT\n' + '='.repeat(50));

const intentResult1 = calculateIntentAlignmentScore(
  { looking_for: ['hookup', 'fwb'], relationship_status: 'single', time_horizon: 'right now' },
  { looking_for: ['hookup', 'dates'], relationship_status: 'single', time_horizon: 'right now' }
);
assertRange(intentResult1.score, 8, 12, 'High intent alignment');
assertTrue(intentResult1.matchedIntents.includes('hookup'), 'Identifies matched intents');

const intentResult2 = calculateIntentAlignmentScore(
  { looking_for: ['relationship'], relationship_status: 'single' },
  { looking_for: ['hookup'], relationship_status: 'open' }
);
assertRange(intentResult2.score, 0, 5, 'Low intent alignment');

// ============================================================================
// Semantic Text Score Tests
// ============================================================================

console.log('\n📝 SEMANTIC TEXT SCORING\n' + '='.repeat(50));

assertEqual(calculateSemanticTextScore(null, null), 6, 'Default for missing embeddings');

// Identical vectors = high score
const identicalVec = [0.1, 0.2, 0.3, 0.4, 0.5];
assertEqual(calculateSemanticTextScore(identicalVec, identicalVec), 12, 'Identical embeddings');

// Orthogonal vectors = low score
const vec1 = [1, 0, 0, 0, 0];
const vec2 = [0, 1, 0, 0, 0];
assertEqual(calculateSemanticTextScore(vec1, vec2), 0, 'Orthogonal embeddings');

// ============================================================================
// Lifestyle Match Tests
// ============================================================================

console.log('\n🏃 LIFESTYLE MATCHING\n' + '='.repeat(50));

const lifestyleResult1 = calculateLifestyleMatchScore(
  { smoking: 'no', drinking: 'occasional', fitness: 'gym rat', scene_affinity: ['leather', 'bears'] },
  { smoking: 'no', drinking: 'occasional', fitness: 'gym rat', scene_affinity: ['leather', 'puppy'] }
);
assertRange(lifestyleResult1.score, 7, 10, 'High lifestyle match');
assertTrue(lifestyleResult1.matchedFactors.includes('smoking'), 'Identifies smoking match');

const lifestyleResult2 = calculateLifestyleMatchScore(
  { smoking: 'yes', drinking: 'never' },
  { smoking: 'no', drinking: 'heavy' }
);
assertRange(lifestyleResult2.score, 0, 3, 'Low lifestyle match');

// ============================================================================
// Chem Score Tests
// ============================================================================

console.log('\n💊 CHEM SCORING\n' + '='.repeat(50));

const chemResult1 = calculateChemScore(
  { chem_visibility_enabled: true, chem_friendly: 'friendly' },
  { chem_visibility_enabled: true, chem_friendly: 'friendly' }
);
assertEqual(chemResult1.score, 3, 'Both chem friendly = 3');
assertEqual(chemResult1.applicable, true, 'Score is applicable');

const chemResult2 = calculateChemScore(
  { chem_visibility_enabled: true, chem_friendly: 'sober' },
  { chem_visibility_enabled: true, chem_friendly: 'friendly' }
);
assertEqual(chemResult2.score, 0, 'Sober vs Friendly = 0');

const chemResult3 = calculateChemScore(
  { chem_visibility_enabled: false },
  { chem_visibility_enabled: true, chem_friendly: 'friendly' }
);
assertEqual(chemResult3.applicable, false, 'Not applicable if not opted in');

// ============================================================================
// Activity Recency Tests
// ============================================================================

console.log('\n⏰ ACTIVITY RECENCY\n' + '='.repeat(50));

const now = new Date();
assertEqual(calculateActivityRecencyScore(new Date(now.getTime() - 2 * 60 * 1000)), 8, 'Active 2 min ago');
assertEqual(calculateActivityRecencyScore(new Date(now.getTime() - 10 * 60 * 1000)), 7, 'Active 10 min ago');
assertEqual(calculateActivityRecencyScore(new Date(now.getTime() - 30 * 60 * 1000)), 6, 'Active 30 min ago');
assertEqual(calculateActivityRecencyScore(new Date(now.getTime() - 3 * 60 * 60 * 1000)), 5, 'Active 3 hours ago');
assertEqual(calculateActivityRecencyScore(new Date(now.getTime() - 12 * 60 * 60 * 1000)), 4, 'Active 12 hours ago');
assertEqual(calculateActivityRecencyScore(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)), 2, 'Active 3 days ago');
assertEqual(calculateActivityRecencyScore(null), 4, 'Unknown = default');

// ============================================================================
// Profile Completeness Tests
// ============================================================================

console.log('\n📋 PROFILE COMPLETENESS\n' + '='.repeat(50));

const completeResult1 = calculateProfileCompletenessScore({
  photos: ['a.jpg', 'b.jpg', 'c.jpg'],
  bio: 'A detailed bio that is over 100 characters long and provides lots of information about the user.',
  city: 'London',
  tags: ['muscle', 'bear'],
  looking_for: ['hookup', 'fwb'],
  verified: true,
  kinks: ['bondage'],
  position: 'vers',
});
assertRange(completeResult1.score, 7, 8, 'Complete profile');

const incompleteResult = calculateProfileCompletenessScore({
  photos: [],
  bio: 'Hi',
});
assertRange(incompleteResult.score, 0, 2, 'Incomplete profile');

// ============================================================================
// Hosting Compatibility Tests
// ============================================================================

console.log('\n🏠 HOSTING COMPATIBILITY\n' + '='.repeat(50));

const hostingResult1 = calculateHostingCompatibilityScore(
  { hosting: 'can host' },
  { hosting: 'cannot host, can travel' }
);
assertEqual(hostingResult1.score, 3, 'Perfect hosting match');
assertEqual(hostingResult1.compatible, true, 'Hosting compatible');

const hostingResult2 = calculateHostingCompatibilityScore(
  { hosting: 'cannot host' },
  { hosting: 'cannot host' }
);
assertEqual(hostingResult2.score, 0, 'Neither can host = 0');
assertEqual(hostingResult2.compatible, false, 'Hosting incompatible');

// ============================================================================
// Full Match Probability Test
// ============================================================================

console.log('\n🎯 FULL MATCH PROBABILITY\n' + '='.repeat(50));

const fullResult = calculateMatchProbability({
  travelTimeMinutes: 15,
  userProfile: {
    city: 'London',
    looking_for: ['hookup', 'fwb'],
    photos: ['a.jpg', 'b.jpg'],
    bio: 'Detailed bio here',
    tags: ['muscle'],
    last_seen: new Date().toISOString(),
  },
  matchProfile: {
    city: 'London',
    looking_for: ['hookup', 'dates'],
    photos: ['c.jpg', 'd.jpg', 'e.jpg'],
    bio: 'Another detailed bio about this person and their interests.',
    tags: ['muscle', 'bear'],
    last_seen: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    verified: true,
  },
  userPrivateProfile: {
    position: 'top',
    kinks: ['bondage', 'leather'],
    hard_limits: [],
    soft_limits: [],
    chem_visibility_enabled: true,
    chem_friendly: 'flexible',
    hosting: 'can host',
  },
  matchPrivateProfile: {
    position: 'bottom',
    kinks: ['bondage', 'puppy'],
    hard_limits: [],
    soft_limits: [],
    chem_visibility_enabled: true,
    chem_friendly: 'flexible',
    hosting: 'can travel',
  },
  userEmbedding: null,
  matchEmbedding: null,
});

assertRange(fullResult.matchProbability, 60, 100, 'Good match probability');
assertTrue(typeof fullResult.breakdown === 'object', 'Has breakdown object');
assertTrue(fullResult.breakdown.roleCompat === 15, 'Top + Bottom = 15');

console.log('\n📊 Match Result:', JSON.stringify(fullResult, null, 2));

// ============================================================================
// Edge Cases
// ============================================================================

console.log('\n⚠️ EDGE CASES\n' + '='.repeat(50));

// Minimal data
const minimalResult = calculateMatchProbability({
  travelTimeMinutes: null,
  userProfile: {},
  matchProfile: {},
  userPrivateProfile: null,
  matchPrivateProfile: null,
  userEmbedding: null,
  matchEmbedding: null,
});

assertRange(minimalResult.matchProbability, 0, 100, 'Handles minimal data');
assertTrue(!isNaN(minimalResult.matchProbability), 'Score is a number');

// Hard conflict scenario
const conflictResult = calculateMatchProbability({
  travelTimeMinutes: 10,
  userProfile: {},
  matchProfile: {},
  userPrivateProfile: { kinks: ['bondage'] },
  matchPrivateProfile: { hard_limits: ['bondage'] },
});

assertRange(conflictResult.matchProbability, 0, 40, 'Low score with hard conflict');

// ============================================================================
// Summary
// ============================================================================

console.log('\n' + '='.repeat(50));
console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed > 0) {
  process.exit(1);
}
