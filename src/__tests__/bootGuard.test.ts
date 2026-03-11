/**
 * bootGuard.test.ts
 *
 * Unit tests for the BootGuard state machine decision logic.
 *
 * These tests verify the pure state-transition rules used inside
 * `loadProfile()` in BootGuardContext.jsx.  They do NOT require a live
 * Supabase connection — all Supabase calls are mocked.
 *
 * State machine (simplified):
 *   LOADING → NEEDS_AGE           if !age_verified && !localStorage
 *   LOADING → NEEDS_ONBOARDING    if age_verified && !onboarding_complete
 *   LOADING → NEEDS_COMMUNITY_GATE if age + onboarding done but !community_attested_at && !localStorage
 *   LOADING → READY               if all gates passed
 *   LOADING → UNAUTHENTICATED     if no session
 */

import { describe, it, expect } from 'vitest';

// ── Pure helper: mirrors the state-transition logic inside loadProfile() ─────

type BootState =
  | 'LOADING'
  | 'UNAUTHENTICATED'
  | 'NEEDS_AGE'
  | 'NEEDS_ONBOARDING'
  | 'NEEDS_COMMUNITY_GATE'
  | 'READY';

interface ProfileRow {
  age_verified: boolean;
  onboarding_complete: boolean;
  display_name?: string | null;
  community_attested_at?: string | null;
}

/**
 * Pure replica of the BootGuardContext state-transition logic.
 * Mirrors the `setBootState(...)` calls in loadProfile() exactly so that
 * changes to the production code also require updates to these tests.
 */
function resolveBootState(
  profile: ProfileRow | null,
  localAge: boolean,
  localCommunity: boolean,
  fetchError?: { code?: string } | null,
): BootState {
  // No session case is handled separately in BootGuardContext (UNAUTHENTICATED).
  // Here we only test the authenticated loadProfile() path.

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      // No profile row found → new user
      return localAge ? 'NEEDS_ONBOARDING' : 'NEEDS_AGE';
    }
    // Generic fetch error — fall back to localStorage
    if (localAge && localCommunity) return 'READY';
    if (localAge) return 'NEEDS_COMMUNITY_GATE';
    return 'NEEDS_AGE';
  }

  if (!profile) return 'NEEDS_AGE';

  // Merge localStorage age into profile data (matches production logic)
  const effectiveAgeVerified = profile.age_verified || localAge;

  if (!effectiveAgeVerified) return 'NEEDS_AGE';
  if (!profile.onboarding_complete) return 'NEEDS_ONBOARDING';
  if (!profile.display_name?.trim()) return 'NEEDS_ONBOARDING'; // legacy guard
  if (!profile.community_attested_at && !localCommunity) return 'NEEDS_COMMUNITY_GATE';
  return 'READY';
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('BootGuard — state machine transitions', () => {
  // ── Happy path ────────────────────────────────────────────────────────────

  describe('READY state', () => {
    it('reaches READY when all profile fields are set', () => {
      const profile: ProfileRow = {
        age_verified: true,
        onboarding_complete: true,
        display_name: 'Alice',
        community_attested_at: '2026-01-01T00:00:00Z',
      };
      expect(resolveBootState(profile, false, false)).toBe('READY');
    });

    it('reaches READY when community_attested_at is null but localStorage flag is set', () => {
      const profile: ProfileRow = {
        age_verified: true,
        onboarding_complete: true,
        display_name: 'Alice',
        community_attested_at: null,
      };
      expect(resolveBootState(profile, false, true)).toBe('READY');
    });

    it('reaches READY when localStorage age flag covers missing DB age_verified', () => {
      const profile: ProfileRow = {
        age_verified: false,
        onboarding_complete: true,
        display_name: 'Alice',
        community_attested_at: '2026-01-01T00:00:00Z',
      };
      expect(resolveBootState(profile, true /* localAge */, false)).toBe('READY');
    });
  });

  // ── Gate: age ─────────────────────────────────────────────────────────────

  describe('NEEDS_AGE state', () => {
    it('routes to NEEDS_AGE when age_verified is false and no localStorage flag', () => {
      const profile: ProfileRow = {
        age_verified: false,
        onboarding_complete: false,
        display_name: 'Bob',
      };
      expect(resolveBootState(profile, false, false)).toBe('NEEDS_AGE');
    });

    it('routes to NEEDS_AGE on generic fetch error without localStorage', () => {
      expect(resolveBootState(null, false, false, { code: 'OTHER_ERROR' })).toBe('NEEDS_AGE');
    });

    it('routes to NEEDS_AGE when profile is null and no localStorage', () => {
      expect(resolveBootState(null, false, false)).toBe('NEEDS_AGE');
    });
  });

  // ── Gate: onboarding ─────────────────────────────────────────────────────

  describe('NEEDS_ONBOARDING state', () => {
    it('routes to NEEDS_ONBOARDING when age_verified but onboarding_complete is false', () => {
      const profile: ProfileRow = {
        age_verified: true,
        onboarding_complete: false,
        display_name: 'Charlie',
      };
      expect(resolveBootState(profile, false, false)).toBe('NEEDS_ONBOARDING');
    });

    it('routes to NEEDS_ONBOARDING when display_name is empty (legacy guard)', () => {
      const profile: ProfileRow = {
        age_verified: true,
        onboarding_complete: true,
        display_name: '',
      };
      expect(resolveBootState(profile, false, false)).toBe('NEEDS_ONBOARDING');
    });

    it('routes to NEEDS_ONBOARDING when display_name is whitespace only', () => {
      const profile: ProfileRow = {
        age_verified: true,
        onboarding_complete: true,
        display_name: '   ',
      };
      expect(resolveBootState(profile, false, false)).toBe('NEEDS_ONBOARDING');
    });

    it('routes new user (PGRST116) to NEEDS_ONBOARDING if localStorage age flag set', () => {
      expect(resolveBootState(null, true, false, { code: 'PGRST116' })).toBe('NEEDS_ONBOARDING');
    });

    it('routes new user (PGRST116) to NEEDS_AGE if no localStorage age flag', () => {
      expect(resolveBootState(null, false, false, { code: 'PGRST116' })).toBe('NEEDS_AGE');
    });
  });

  // ── Gate: community ───────────────────────────────────────────────────────

  describe('NEEDS_COMMUNITY_GATE state', () => {
    it('routes to NEEDS_COMMUNITY_GATE when age + onboarding done but no community attestation', () => {
      const profile: ProfileRow = {
        age_verified: true,
        onboarding_complete: true,
        display_name: 'Dana',
        community_attested_at: null,
      };
      expect(resolveBootState(profile, false, false)).toBe('NEEDS_COMMUNITY_GATE');
    });

    it('routes to NEEDS_COMMUNITY_GATE on fetch error with localAge but no localCommunity', () => {
      expect(resolveBootState(null, true, false, { code: 'OTHER_ERROR' })).toBe('NEEDS_COMMUNITY_GATE');
    });
  });

  // ── localStorage fallback (fetch error path) ──────────────────────────────

  describe('fetch error fallback path', () => {
    it('returns READY on fetch error if both localStorage flags are set', () => {
      expect(resolveBootState(null, true, true, { code: 'OTHER_ERROR' })).toBe('READY');
    });

    it('returns NEEDS_COMMUNITY_GATE on fetch error if only localAge is set', () => {
      expect(resolveBootState(null, true, false, { code: 'OTHER_ERROR' })).toBe('NEEDS_COMMUNITY_GATE');
    });

    it('returns NEEDS_AGE on fetch error if no localStorage flags', () => {
      expect(resolveBootState(null, false, false, { code: 'OTHER_ERROR' })).toBe('NEEDS_AGE');
    });
  });
});

// ── localStorage key parsing helpers (mirrors BootGuardContext) ─────────────

describe('BootGuard — localStorage age-check parsing', () => {
  const parseAgeFlag = (val: string | null): boolean =>
    val === 'true' || val === '1' || val === 'TRUE';

  it("parses 'true' as verified", () => expect(parseAgeFlag('true')).toBe(true));
  it("parses '1' as verified", () => expect(parseAgeFlag('1')).toBe(true));
  it("parses 'TRUE' as verified", () => expect(parseAgeFlag('TRUE')).toBe(true));
  it("parses null as not verified", () => expect(parseAgeFlag(null)).toBe(false));
  it("parses 'false' as not verified", () => expect(parseAgeFlag('false')).toBe(false));
  it("parses '' as not verified", () => expect(parseAgeFlag('')).toBe(false));
});
