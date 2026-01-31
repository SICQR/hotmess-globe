import { describe, it, expect } from 'vitest';
import {
  calculateTravelTimeScore,
  calculateRoleCompatScore,
  calculateKinkScore,
  calculateIntentScore,
  calculateSemanticScore,
  calculateLifestyleScore,
  calculateActivityScore,
  calculateCompletenessScore,
  aggregateMatchScore,
  cosineSimilarity,
} from './_scoring.js';

describe('Match Probability Scoring', () => {
  describe('calculateTravelTimeScore', () => {
    it('should give max points for very close distances', () => {
      expect(calculateTravelTimeScore(3)).toBe(20);
      expect(calculateTravelTimeScore(5)).toBe(20);
    });

    it('should decay score with increasing distance', () => {
      expect(calculateTravelTimeScore(10)).toBe(18);
      expect(calculateTravelTimeScore(20)).toBe(15);
      expect(calculateTravelTimeScore(45)).toBe(10);
      expect(calculateTravelTimeScore(90)).toBe(5);
      expect(calculateTravelTimeScore(150)).toBe(2);
    });

    it('should return neutral score for unknown distance', () => {
      expect(calculateTravelTimeScore(null)).toBe(10);
      expect(calculateTravelTimeScore(undefined)).toBe(10);
    });
  });

  describe('calculateRoleCompatScore', () => {
    it('should give high score for complementary roles', () => {
      expect(calculateRoleCompatScore('top', 'bottom')).toBe(15);
      expect(calculateRoleCompatScore('bottom', 'top')).toBe(15);
    });

    it('should give moderate score for vers matches', () => {
      expect(calculateRoleCompatScore('top', 'vers')).toBe(12);
      expect(calculateRoleCompatScore('vers', 'vers')).toBe(15);
    });

    it('should give low score for same non-vers roles', () => {
      expect(calculateRoleCompatScore('top', 'top')).toBe(5);
      expect(calculateRoleCompatScore('bottom', 'bottom')).toBe(5);
    });

    it('should return neutral score for missing data', () => {
      expect(calculateRoleCompatScore(null, 'top')).toBe(8);
      expect(calculateRoleCompatScore('top', null)).toBe(8);
    });
  });

  describe('calculateKinkScore', () => {
    it('should reward shared kinks', () => {
      const userKinks = ['bondage', 'roleplay'];
      const matchKinks = ['bondage', 'roleplay'];
      const score = calculateKinkScore(userKinks, matchKinks, [], []);
      expect(score).toBe(15); // 100% overlap
    });

    it('should penalize hard limit conflicts', () => {
      const userKinks = ['bondage'];
      const matchKinks = ['roleplay'];
      const userHardLimits = [];
      const matchHardLimits = ['bondage']; // Conflict!
      const score = calculateKinkScore(userKinks, matchKinks, userHardLimits, matchHardLimits);
      expect(score).toBeLessThan(5);
    });

    it('should handle partial overlap', () => {
      const userKinks = ['bondage', 'roleplay', 'sensory'];
      const matchKinks = ['bondage'];
      const score = calculateKinkScore(userKinks, matchKinks, [], []);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(15);
    });

    it('should return neutral score when both have no kinks', () => {
      const score = calculateKinkScore([], [], [], []);
      expect(score).toBe(8);
    });
  });

  describe('calculateIntentScore', () => {
    it('should reward matching relationship goals', () => {
      const user = {
        looking_for: ['relationship', 'dating'],
        relationship_status: 'single',
        time_horizon: 'long-term',
      };
      const match = {
        looking_for: ['relationship', 'dating'],
        relationship_status: 'single',
        time_horizon: 'long-term',
      };
      const score = calculateIntentScore(user, match);
      expect(score).toBe(12); // Max score
    });

    it('should handle partial matches', () => {
      const user = {
        looking_for: ['casual', 'friendship'],
        relationship_status: 'single',
      };
      const match = {
        looking_for: ['casual'],
        relationship_status: 'open',
      };
      const score = calculateIntentScore(user, match);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(12);
    });
  });

  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vec = [1, 2, 3, 4];
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vec1 = [1, 0];
      const vec2 = [0, 1];
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0, 5);
    });

    it('should handle negative correlation', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [-1, -2, -3];
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(-1, 5);
    });

    it('should return null for invalid inputs', () => {
      expect(cosineSimilarity(null, [1, 2])).toBe(null);
      expect(cosineSimilarity([1, 2], null)).toBe(null);
      expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(null);
    });
  });

  describe('calculateSemanticScore', () => {
    it('should give neutral score for missing embeddings', () => {
      expect(calculateSemanticScore(null, null)).toBe(6);
      expect(calculateSemanticScore([1, 2], null)).toBe(6);
    });

    it('should scale similarity to 0-12 range', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [1, 0, 0]; // Identical
      const score = calculateSemanticScore(vec1, vec2);
      expect(score).toBe(12);
    });

    it('should handle negative similarity', () => {
      const vec1 = [1, 0];
      const vec2 = [-1, 0]; // Opposite
      const score = calculateSemanticScore(vec1, vec2);
      expect(score).toBe(0); // Negative normalized to 0
    });
  });

  describe('calculateLifestyleScore', () => {
    it('should reward matching lifestyle choices', () => {
      const user = {
        smoking: 'never',
        drinking: 'socially',
        fitness: 'active',
        diet: 'vegetarian',
        scene_affinity: ['leather', 'bear'],
      };
      const match = {
        smoking: 'never',
        drinking: 'socially',
        fitness: 'active',
        diet: 'vegetarian',
        scene_affinity: ['leather', 'bear'],
      };
      const score = calculateLifestyleScore(user, match);
      expect(score).toBe(10); // 4 fields × 2 + 2 scenes = 10
    });

    it('should give partial credit for compatible choices', () => {
      const user = {
        smoking: 'never',
        drinking: 'socially',
      };
      const match = {
        smoking: 'socially', // Compatible
        drinking: 'socially', // Match
      };
      const score = calculateLifestyleScore(user, match);
      expect(score).toBeGreaterThanOrEqual(2); // At least drinking match
    });
  });

  describe('calculateActivityScore', () => {
    it('should give max points for very recent activity', () => {
      const now = new Date();
      const halfHourAgo = new Date(now - 30 * 60 * 1000);
      expect(calculateActivityScore(halfHourAgo)).toBe(8);
    });

    it('should decay with time since last seen', () => {
      const now = new Date();
      const yesterday = new Date(now - 20 * 60 * 60 * 1000); // 20 hours ago (< 24)
      const twoDaysAgo = new Date(now - 50 * 60 * 60 * 1000); // ~2 days (< 72)
      const weekAgo = new Date(now - 150 * 60 * 60 * 1000); // ~6.25 days (< 168)
      
      // 8 * 0.875 = 7, 8 * 0.75 = 6, 8 * 0.5 = 4
      expect(calculateActivityScore(yesterday)).toBe(7);
      expect(calculateActivityScore(twoDaysAgo)).toBe(6);
      expect(calculateActivityScore(weekAgo)).toBe(4);
    });

    it('should return neutral score for missing data', () => {
      // 8 * 0.25 = 2
      expect(calculateActivityScore(null)).toBe(2);
    });
  });

  describe('calculateCompletenessScore', () => {
    it('should count filled fields', () => {
      const profile = {
        bio: 'Test bio',
        avatar_url: 'photo1.jpg',
        city: 'London',
      };
      const privateProfile = {
        position: 'vers',
        looking_for: ['dating'],
        kinks: ['bondage'],
        turn_ons: 'Intelligence',
        height_cm: 180,
      };
      const score = calculateCompletenessScore(profile, privateProfile);
      expect(score).toBe(8); // All 8 fields filled
    });

    it('should ignore empty fields', () => {
      const profile = {
        bio: 'Test bio',
        avatar_url: '',
        city: null,
      };
      const privateProfile = {
        position: '',
        looking_for: [],
      };
      const score = calculateCompletenessScore(profile, privateProfile);
      expect(score).toBe(1); // Only bio counts
    });
  });

  describe('aggregateMatchScore', () => {
    it('should sum all scores', () => {
      const breakdown = {
        travelTime: 20,
        roleCompat: 15,
        kinkOverlap: 15,
        intent: 12,
        semantic: 12,
        lifestyle: 10,
        activity: 8,
        completeness: 8,
      };
      expect(aggregateMatchScore(breakdown)).toBe(100);
    });

    it('should handle partial scores', () => {
      const breakdown = {
        travelTime: 10,
        roleCompat: 8,
        kinkOverlap: 5,
        intent: 6,
        semantic: 6,
        lifestyle: 5,
        activity: 4,
        completeness: 4,
      };
      expect(aggregateMatchScore(breakdown)).toBe(48);
    });

    it('should cap at 100', () => {
      const breakdown = {
        travelTime: 50,
        roleCompat: 50,
        kinkOverlap: 50,
        intent: 50,
        semantic: 50,
        lifestyle: 50,
        activity: 50,
        completeness: 50,
      };
      expect(aggregateMatchScore(breakdown)).toBe(100);
    });
  });
});
