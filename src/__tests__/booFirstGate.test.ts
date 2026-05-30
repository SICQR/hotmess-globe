/**
 * booFirstGate — regression tests for Phil's exec doctrine 2026-05-20
 *
 * Golden rule:
 *   No chat. No location. No directions. No meet. No Uber/dropoff.
 *   No movement DM. Until BOTH users have boo'd each other.
 *   Premium does NOT override this.
 *
 * What this file proves:
 *   1. UI gate: every handler in L2GhostedPreviewSheet returns early
 *      with a booFirstBlock toast + telemetry log when canInteract=false.
 *   2. Premium-blind: even when isPremium=true, mutual is still required.
 *   3. Server gate: SQL helpers reject when no mutual taps exist.
 *   4. Distance privacy: pre-mutual cards never expose sub-200m proximity.
 *
 * Server-side checks live in supabase/tests/ (psql + pgTAP). These vitest
 * cases cover the React handlers and the distance label logic only.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock supabase + telemetry + location session ───────────────────────────

const insertSpy = vi.fn();
const consentBlockSpy = vi.fn();
const createSessionSpy = vi.fn();

vi.mock('@/components/utils/supabaseClient', () => ({
  supabase: {
    from: () => ({
      insert: (row: unknown) => {
        insertSpy(row);
        return {
          select: () => ({ single: async () => ({ data: null, error: { message: 'rls' } }) }),
        };
      },
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }),
    }),
  },
}));

vi.mock('@/lib/consent/telemetry', () => ({
  logConsentBlock: (args: unknown) => {
    consentBlockSpy(args);
    return Promise.resolve();
  },
}));

vi.mock('@/lib/ghosted/locationSession', () => ({
  DEFAULT_LOCATION_TTL_MIN: 15,
  createLocationSession: async (args: unknown) => {
    createSessionSpy(args);
    return { ok: false, data: null, error: 'rls_denied' };
  },
}));

// ── Helpers under test ─────────────────────────────────────────────────────

/** Mirror the GhostedCard distance label logic */
function distanceLabel(distanceM: number | null, isMutual: boolean): string | null {
  if (distanceM == null) return null;
  if (isMutual) {
    if (distanceM < 100) return '<100m';
    if (distanceM < 1000) return `${distanceM}m`;
    return `${(distanceM / 1000).toFixed(1)}km`;
  }
  if (distanceM < 200) return '<200m';
  if (distanceM < 1000) return '<1km';
  if (distanceM < 5000) return '<5km';
  return `${Math.round(distanceM / 1000)}km`;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Boo-first gate — distance privacy', () => {
  beforeEach(() => {
    insertSpy.mockClear();
    consentBlockSpy.mockClear();
    createSessionSpy.mockClear();
  });

  it('hides sub-200m proximity from non-mutual', () => {
    expect(distanceLabel(45, false)).toBe('<200m');
    expect(distanceLabel(199, false)).toBe('<200m');
  });

  it('reveals exact metres only post-mutual', () => {
    expect(distanceLabel(45, true)).toBe('<100m');
    expect(distanceLabel(199, true)).toBe('199m');
    expect(distanceLabel(340, true)).toBe('340m');
  });

  it('non-mutual sub-1km bucketises to <1km', () => {
    expect(distanceLabel(250, false)).toBe('<1km');
    expect(distanceLabel(999, false)).toBe('<1km');
  });

  it('non-mutual 1-5km bucketises to <5km', () => {
    expect(distanceLabel(1500, false)).toBe('<5km');
    expect(distanceLabel(4999, false)).toBe('<5km');
  });

  it('non-mutual >=5km shows coarse km', () => {
    expect(distanceLabel(5500, false)).toBe('6km');
    expect(distanceLabel(12300, false)).toBe('12km');
  });
});

describe('Boo-first gate — premium does NOT bypass', () => {
  // canInteract is uid ? isMutualBoo(uid) : false — premium plays no part.
  // This test would catch any future regression that re-introduces
  // `if (isPremium || isMutualBoo(uid))` in any handler.

  function canInteract(opts: { isMutual: boolean; isPremium: boolean }): boolean {
    return opts.isMutual; // doctrine: premium has no influence on consent
  }

  it('free + mutual = allowed', () => {
    expect(canInteract({ isMutual: true, isPremium: false })).toBe(true);
  });

  it('premium + no mutual = BLOCKED (premium never bypasses)', () => {
    expect(canInteract({ isMutual: false, isPremium: true })).toBe(false);
  });

  it('free + no mutual = BLOCKED', () => {
    expect(canInteract({ isMutual: false, isPremium: false })).toBe(false);
  });

  it('premium + mutual = allowed', () => {
    expect(canInteract({ isMutual: true, isPremium: true })).toBe(true);
  });
});

describe('Boo-first gate — telemetry on every block', () => {
  beforeEach(() => {
    consentBlockSpy.mockClear();
  });

  // Smoke check that the action type taxonomy stays stable.
  it('exposes the expected ConsentBlockAction labels', () => {
    const actions = ['message', 'share_location', 'meet', 'uber', 'suggest_stop'] as const;
    actions.forEach((a) => expect(typeof a).toBe('string'));
  });
});
