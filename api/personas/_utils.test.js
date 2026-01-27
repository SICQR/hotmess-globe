/**
 * Tests for Personas utility functions
 * Run with: node --test api/personas/_utils.test.js
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

// Import the utilities to test
import {
  isProfileExpired,
  isProfileActive,
  validateProfileData,
  getMaxSecondaryProfilesForTier,
  MAX_SECONDARY_PROFILES,
  SYSTEM_PROFILE_TYPES,
} from './_utils.js';

describe('Profile Expiry Utilities', () => {
  describe('isProfileExpired', () => {
    it('should return false if expires_at is null', () => {
      const profile = { expires_at: null };
      assert.strictEqual(isProfileExpired(profile), false);
    });

    it('should return false if expires_at is undefined', () => {
      const profile = {};
      assert.strictEqual(isProfileExpired(profile), false);
    });

    it('should return true if expires_at is in the past', () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
      const profile = { expires_at: pastDate };
      assert.strictEqual(isProfileExpired(profile), true);
    });

    it('should return false if expires_at is in the future', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour from now
      const profile = { expires_at: futureDate };
      assert.strictEqual(isProfileExpired(profile), false);
    });
  });

  describe('isProfileActive', () => {
    it('should return false if profile is null', () => {
      assert.strictEqual(isProfileActive(null), false);
    });

    it('should return false if profile is deleted', () => {
      const profile = { active: true, deleted_at: new Date().toISOString() };
      assert.strictEqual(isProfileActive(profile), false);
    });

    it('should return false if profile is not active', () => {
      const profile = { active: false };
      assert.strictEqual(isProfileActive(profile), false);
    });

    it('should return false if profile is expired', () => {
      const pastDate = new Date(Date.now() - 1000 * 60).toISOString();
      const profile = { active: true, expires_at: pastDate };
      assert.strictEqual(isProfileActive(profile), false);
    });

    it('should return true if profile is active and not expired', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60).toISOString();
      const profile = { active: true, expires_at: futureDate };
      assert.strictEqual(isProfileActive(profile), true);
    });

    it('should return true if profile is active with no expiry', () => {
      const profile = { active: true, expires_at: null };
      assert.strictEqual(isProfileActive(profile), true);
    });
  });
});

describe('Profile Validation', () => {
  describe('validateProfileData', () => {
    it('should validate a correct profile', () => {
      const data = {
        type_key: 'TRAVEL',
        type_label: 'My Travel Profile',
        inherit_mode: 'FULL_INHERIT',
      };
      const result = validateProfileData(data, false);
      assert.strictEqual(result.valid, true);
      assert.deepStrictEqual(result.errors, []);
    });

    it('should fail if type_label is too long', () => {
      const data = {
        type_label: 'A'.repeat(51),
      };
      const result = validateProfileData(data, false);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('50 characters')));
    });

    it('should fail if expires_at is in the past', () => {
      const pastDate = new Date(Date.now() - 1000 * 60).toISOString();
      const data = {
        expires_at: pastDate,
      };
      const result = validateProfileData(data, false);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('in the future')));
    });

    it('should fail if inherit_mode is invalid', () => {
      const data = {
        inherit_mode: 'INVALID_MODE',
      };
      const result = validateProfileData(data, false);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('inherit_mode')));
    });

    it('should fail if location override enabled without coordinates', () => {
      const data = {
        override_location_enabled: true,
      };
      const result = validateProfileData(data, false);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('override_location_lat')));
    });

    it('should pass with valid location override', () => {
      const data = {
        override_location_enabled: true,
        override_location_lat: 51.5074,
        override_location_lng: -0.1278,
      };
      const result = validateProfileData(data, false);
      assert.strictEqual(result.valid, true);
    });

    it('should require type_key for secondary profile creation', () => {
      const data = {
        kind: 'SECONDARY',
      };
      const result = validateProfileData(data, true);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('type_key')));
    });
  });
});

describe('Tier Limits', () => {
  describe('getMaxSecondaryProfilesForTier', () => {
    it('should return 5 for basic tier', () => {
      assert.strictEqual(getMaxSecondaryProfilesForTier('basic'), 5);
    });

    it('should return 10 for premium tier', () => {
      assert.strictEqual(getMaxSecondaryProfilesForTier('premium'), 10);
    });

    it('should return 20 for enterprise tier', () => {
      assert.strictEqual(getMaxSecondaryProfilesForTier('enterprise'), 20);
    });

    it('should return basic limit for unknown tier', () => {
      assert.strictEqual(getMaxSecondaryProfilesForTier('unknown'), 5);
    });

    it('should return basic limit for null tier', () => {
      assert.strictEqual(getMaxSecondaryProfilesForTier(null), 5);
    });

    it('should handle case-insensitive tier names', () => {
      assert.strictEqual(getMaxSecondaryProfilesForTier('PREMIUM'), 10);
      assert.strictEqual(getMaxSecondaryProfilesForTier('Premium'), 10);
    });
  });

  describe('MAX_SECONDARY_PROFILES', () => {
    it('should have correct values', () => {
      assert.strictEqual(MAX_SECONDARY_PROFILES.basic, 5);
      assert.strictEqual(MAX_SECONDARY_PROFILES.premium, 10);
      assert.strictEqual(MAX_SECONDARY_PROFILES.enterprise, 20);
    });
  });
});

describe('System Profile Types', () => {
  it('should include expected types', () => {
    assert.ok(SYSTEM_PROFILE_TYPES.includes('MAIN'));
    assert.ok(SYSTEM_PROFILE_TYPES.includes('TRAVEL'));
    assert.ok(SYSTEM_PROFILE_TYPES.includes('WEEKEND'));
  });
});

// Mock tests for visibility evaluation would require mocking Supabase
// These are documented here for future implementation with a proper test framework

describe('Visibility Evaluation (Integration)', () => {
  it.todo('should deny if profile is inactive');
  it.todo('should deny if profile is expired');
  it.todo('should allow owner preview');
  it.todo('should deny if viewer is on blocklist');
  it.todo('should allow if viewer is on allowlist');
  it.todo('should deny if allowlist exists but viewer not on it');
  it.todo('should evaluate attribute filters');
  it.todo('should require PUBLIC rule for non-owner access');
});

describe('Effective Profile Resolution (Integration)', () => {
  it.todo('should return main profile data for MAIN profiles');
  it.todo('should merge overrides for OVERRIDE_FIELDS mode');
  it.todo('should apply location override when enabled');
  it.todo('should handle photo inheritance modes');
});

console.log('Tests loaded. Run with: node --test api/personas/_utils.test.js');
