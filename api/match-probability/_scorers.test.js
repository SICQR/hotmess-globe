import { describe, it, expect } from 'vitest';
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
  ROLE_COMPATIBILITY_MATRIX,
} from './_scorers.js';

describe('Match Probability Scorers', () => {
  describe('calculateTravelTimeScore', () => {
    it('returns max score for walking distance', () => {
      expect(calculateTravelTimeScore(3)).toBe(20);
      expect(calculateTravelTimeScore(5)).toBe(20);
    });

    it('returns decreasing scores for longer travel times', () => {
      expect(calculateTravelTimeScore(10)).toBe(18);
      expect(calculateTravelTimeScore(25)).toBe(15);
      expect(calculateTravelTimeScore(45)).toBe(10);
      expect(calculateTravelTimeScore(90)).toBe(5);
      expect(calculateTravelTimeScore(180)).toBe(2);
    });

    it('returns default score for unknown travel time', () => {
      expect(calculateTravelTimeScore(null)).toBe(10);
      expect(calculateTravelTimeScore(undefined)).toBe(10);
    });
  });

  describe('calculateRoleCompatibilityScore', () => {
    it('returns max score for complementary roles', () => {
      expect(calculateRoleCompatibilityScore('top', 'bottom')).toBe(15);
      expect(calculateRoleCompatibilityScore('bottom', 'top')).toBe(15);
      expect(calculateRoleCompatibilityScore('vers', 'vers')).toBe(15);
    });

    it('returns lower scores for same roles', () => {
      expect(calculateRoleCompatibilityScore('top', 'top')).toBe(5);
      expect(calculateRoleCompatibilityScore('bottom', 'bottom')).toBe(5);
    });

    it('handles flexible/open roles', () => {
      expect(calculateRoleCompatibilityScore('flexible', 'bottom')).toBe(12);
      expect(calculateRoleCompatibilityScore('top', 'open')).toBe(12);
    });

    it('returns default score for unknown roles', () => {
      expect(calculateRoleCompatibilityScore(null, 'top')).toBe(10);
      expect(calculateRoleCompatibilityScore('top', null)).toBe(10);
    });
  });

  describe('calculateKinkOverlapScore', () => {
    it('returns high score for matching kinks', () => {
      const result = calculateKinkOverlapScore(
        ['bondage', 'leather'],
        ['bondage', 'leather'],
        [], [], [], []
      );
      expect(result.score).toBe(15);
      expect(result.overlaps).toContain('bondage');
    });

    it('penalizes hard limit conflicts', () => {
      const result = calculateKinkOverlapScore(
        ['bondage'],
        ['leather'],
        [],
        ['bondage'], // match has bondage as hard limit
        [], []
      );
      expect(result.hasHardConflict).toBe(true);
      expect(result.score).toBeLessThan(5);
    });

    it('returns partial score for partial overlap', () => {
      const result = calculateKinkOverlapScore(
        ['bondage', 'leather', 'puppy'],
        ['bondage', 'dom'],
        [], [], [], []
      );
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(15);
    });
  });

  describe('calculateIntentAlignmentScore', () => {
    it('returns high score for matching intents', () => {
      const result = calculateIntentAlignmentScore(
        { looking_for: ['hookup', 'fwb'], relationship_status: 'single', time_horizon: 'right now' },
        { looking_for: ['hookup', 'dates'], relationship_status: 'single', time_horizon: 'right now' }
      );
      expect(result.score).toBeGreaterThanOrEqual(8);
    });

    it('returns lower score for mismatched intents', () => {
      const result = calculateIntentAlignmentScore(
        { looking_for: ['relationship'] },
        { looking_for: ['hookup'] }
      );
      expect(result.score).toBeLessThan(6);
    });
  });

  describe('calculateSemanticTextScore', () => {
    it('returns default for missing embeddings', () => {
      expect(calculateSemanticTextScore(null, null)).toBe(6);
    });

    it('returns max score for identical embeddings', () => {
      const vec = [0.1, 0.2, 0.3, 0.4, 0.5];
      expect(calculateSemanticTextScore(vec, vec)).toBe(12);
    });

    it('returns low score for orthogonal embeddings', () => {
      const vec1 = [1, 0, 0, 0, 0];
      const vec2 = [0, 1, 0, 0, 0];
      expect(calculateSemanticTextScore(vec1, vec2)).toBe(0);
    });
  });

  describe('calculateLifestyleMatchScore', () => {
    it('returns high score for matching lifestyles', () => {
      const result = calculateLifestyleMatchScore(
        { smoking: 'no', drinking: 'occasional', fitness: 'gym', scene_affinity: ['leather'] },
        { smoking: 'no', drinking: 'occasional', fitness: 'gym', scene_affinity: ['leather'] }
      );
      expect(result.score).toBeGreaterThanOrEqual(8);
    });

    it('returns lower score for mismatched lifestyles', () => {
      const result = calculateLifestyleMatchScore(
        { smoking: 'yes', drinking: 'heavy' },
        { smoking: 'no', drinking: 'never' }
      );
      expect(result.score).toBeLessThan(5);
    });
  });

  describe('calculateChemScore', () => {
    it('only scores when both users opted in', () => {
      const result = calculateChemScore(
        { chem_visibility_enabled: false },
        { chem_visibility_enabled: true, chem_friendly: 'friendly' }
      );
      expect(result.applicable).toBe(false);
    });

    it('returns max score for matching chem preferences', () => {
      const result = calculateChemScore(
        { chem_visibility_enabled: true, chem_friendly: 'friendly' },
        { chem_visibility_enabled: true, chem_friendly: 'friendly' }
      );
      expect(result.score).toBe(3);
      expect(result.applicable).toBe(true);
    });
  });

  describe('calculateActivityRecencyScore', () => {
    it('returns high score for recently active users', () => {
      const recentDate = new Date(Date.now() - 2 * 60 * 1000); // 2 mins ago
      expect(calculateActivityRecencyScore(recentDate)).toBe(8);
    });

    it('returns lower scores for less active users', () => {
      const oldDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      expect(calculateActivityRecencyScore(oldDate)).toBe(2);
    });
  });

  describe('calculateProfileCompletenessScore', () => {
    it('returns high score for complete profiles', () => {
      const result = calculateProfileCompletenessScore({
        photos: ['a.jpg', 'b.jpg', 'c.jpg'],
        bio: 'A detailed bio that is over 100 characters long and provides lots of info.',
        city: 'London',
        tags: ['tag1'],
        looking_for: ['hookup'],
        verified: true,
        kinks: ['bondage'],
        position: 'vers',
      });
      expect(result.score).toBeGreaterThanOrEqual(7);
    });

    it('returns low score for incomplete profiles', () => {
      const result = calculateProfileCompletenessScore({
        photos: [],
        bio: 'Hi',
      });
      expect(result.score).toBeLessThan(3);
    });
  });

  describe('calculateHostingCompatibilityScore', () => {
    it('returns max score for perfect hosting match', () => {
      const result = calculateHostingCompatibilityScore(
        { hosting: 'can host' },
        { hosting: 'cannot host, can travel' }
      );
      expect(result.score).toBe(3);
      expect(result.compatible).toBe(true);
    });

    it('returns incompatible when neither can host', () => {
      const result = calculateHostingCompatibilityScore(
        { hosting: 'cannot host' },
        { hosting: 'cannot host' }
      );
      expect(result.compatible).toBe(false);
    });
  });

  describe('calculateMatchProbability', () => {
    it('produces a score between 0 and 100', () => {
      const result = calculateMatchProbability({
        travelTimeMinutes: 15,
        userProfile: { city: 'London' },
        matchProfile: { city: 'London', last_seen: new Date().toISOString() },
        userPrivateProfile: { position: 'top' },
        matchPrivateProfile: { position: 'bottom' },
        userEmbedding: null,
        matchEmbedding: null,
      });

      expect(result.matchProbability).toBeGreaterThanOrEqual(0);
      expect(result.matchProbability).toBeLessThanOrEqual(100);
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.roleCompat).toBe(15);
    });

    it('handles minimal data gracefully', () => {
      const result = calculateMatchProbability({
        travelTimeMinutes: null,
        userProfile: {},
        matchProfile: {},
        userPrivateProfile: null,
        matchPrivateProfile: null,
        userEmbedding: null,
        matchEmbedding: null,
      });

      expect(result.matchProbability).toBeGreaterThanOrEqual(0);
      expect(typeof result.matchProbability).toBe('number');
      expect(!isNaN(result.matchProbability)).toBe(true);
    });

    it('penalizes hard limit conflicts', () => {
      const resultWithConflict = calculateMatchProbability({
        travelTimeMinutes: 10,
        userProfile: {},
        matchProfile: {},
        userPrivateProfile: { kinks: ['bondage'] },
        matchPrivateProfile: { hard_limits: ['bondage'] },
      });

      const resultWithoutConflict = calculateMatchProbability({
        travelTimeMinutes: 10,
        userProfile: {},
        matchProfile: {},
        userPrivateProfile: { kinks: ['bondage'] },
        matchPrivateProfile: { kinks: ['bondage'] },
      });

      expect(resultWithConflict.matchProbability).toBeLessThan(
        resultWithoutConflict.matchProbability
      );
    });
  });
});
