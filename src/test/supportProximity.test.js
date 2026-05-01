/**
 * HOTMESS v6 — Chunk 02: Support Proximity Tests
 *
 * Spec: DEV_BRIEF_support-proximity.docx
 *
 * Tests:
 *  1. getSupportPreferences returns correct shape
 *  2. getSupportPreferences returns null on DB error
 *  3. setSupportEnabled calls RPC with correct args
 *  4. setSupportDetailLevel rejects invalid level
 *  5. setLifestylePreferences writes tag only — does NOT call proximity RPC
 *  6. checkSupportProximity bails immediately if support_notifications_enabled = false
 *  7. checkSupportProximity suppresses when already notified in window
 *  8. checkSupportProximity returns nearby=true within 2km + 2hr window
 *  9. checkSupportProximity returns nearby=false outside 2km radius
 * 10. stripSupportFields removes both private fields
 * 11. stripSupportFields leaves everything else intact
 * 12. DECOUPLING: lifestyle_preferences change does NOT trigger checkSupportProximity
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Supabase ──────────────────────────────────────────────────────────────
const mockSelect  = vi.fn();
const mockEq      = vi.fn();
const mockUpdate  = vi.fn();
const mockInsert  = vi.fn();
const mockRpc     = vi.fn();
const mockSingle  = vi.fn();
const mockMaybeSingle = vi.fn();

const mockFrom = vi.fn(() => ({
  select:      mockSelect,
  update:      mockUpdate,
  insert:      mockInsert,
  eq:          mockEq,
  maybeSingle: mockMaybeSingle,
  single:      mockSingle,
}));

// Chain helpers — each returns the chain object so calls compose
const chainObj = {
  select:      (...a) => { mockSelect(...a);      return chainObj; },
  eq:          (...a) => { mockEq(...a);           return chainObj; },
  update:      (...a) => { mockUpdate(...a);        return chainObj; },
  insert:      (...a) => { mockInsert(...a);        return chainObj; },
  maybeSingle: (...a) => { mockMaybeSingle(...a);  return chainObj; },
  single:      (...a) => { mockSingle(...a);        return chainObj; },
};

let _fromImpl = () => chainObj;
let _rpcImpl  = () => ({ data: null, error: null });

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: (...a) => _fromImpl(...a),
    rpc:  (...a) => _rpcImpl(...a),
  })),
}));

// ── Import module under test ──────────────────────────────────────────────────
import {
  getSupportPreferences,
  setSupportEnabled,
  setSupportDetailLevel,
  setLifestylePreferences,
  checkSupportProximity,
  stripSupportFields,
  SUPPORT_NOTIFICATION_COPY,
} from '../lib/v6/supportProximity.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const USER_ID = '302040e5-c2ac-4fb3-a192-70598aa7b962';
const ENABLED_PREFS = {
  support_notifications_enabled: true,
  support_detail_level: 'generic',
};
const DISABLED_PREFS = {
  support_notifications_enabled: false,
  support_detail_level: 'generic',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function mockProfileRow(supportPrefs = ENABLED_PREFS, lifestylePrefs = null) {
  return {
    support_preferences:  supportPrefs,
    lifestyle_preferences: lifestylePrefs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('getSupportPreferences', () => {
  it('test_get_prefs_returns_correct_shape', async () => {
    _fromImpl = () => ({
      select:      () => ({
        eq:          () => ({
          single:      () => Promise.resolve({ data: mockProfileRow(), error: null }),
          maybeSingle: () => Promise.resolve({ data: mockProfileRow(), error: null }),
        }),
      }),
    });

    const result = await getSupportPreferences(USER_ID);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('support');
    expect(result.support).toHaveProperty('support_notifications_enabled');
    expect(result.support).toHaveProperty('support_detail_level');
  });

  it('test_get_prefs_returns_null_on_error', async () => {
    _fromImpl = () => ({
      select: () => ({
        eq: () => ({
          single:      () => Promise.resolve({ data: null, error: new Error('DB down') }),
          maybeSingle: () => Promise.resolve({ data: null, error: new Error('DB down') }),
        }),
      }),
    });

    const result = await getSupportPreferences(USER_ID);
    expect(result).toBeNull();
  });

  it('test_get_prefs_returns_null_for_missing_userId', async () => {
    const result = await getSupportPreferences(null);
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('setSupportEnabled', () => {
  it('test_set_enabled_calls_rpc_with_correct_args', async () => {
    const rpcCalls = [];
    _rpcImpl = (name, args) => {
      rpcCalls.push({ name, args });
      return Promise.resolve({ data: null, error: null });
    };

    await setSupportEnabled(USER_ID, true);

    const rpcCall = rpcCalls.find(c => c.name === 'update_support_preferences');
    expect(rpcCall).toBeDefined();
    expect(rpcCall.args.p_user_id).toBe(USER_ID);
    expect(rpcCall.args.p_enabled).toBe(true);
    expect(rpcCall.args.p_detail_level).toBeNull(); // null = don't change
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('setSupportDetailLevel', () => {
  it('test_set_detail_level_valid_values', async () => {
    const rpcCalls = [];
    _rpcImpl = (name, args) => {
      rpcCalls.push({ name, args });
      return Promise.resolve({ data: null, error: null });
    };

    await setSupportDetailLevel(USER_ID, 'detailed');
    await setSupportDetailLevel(USER_ID, 'generic');

    expect(rpcCalls.length).toBe(2);
    expect(rpcCalls[0].args.p_detail_level).toBe('detailed');
    expect(rpcCalls[1].args.p_detail_level).toBe('generic');
  });

  it('test_set_detail_level_rejects_invalid_level', async () => {
    const rpcCalls = [];
    _rpcImpl = (name, args) => { rpcCalls.push({ name, args }); return Promise.resolve({}); };

    // Should return early — invalid level
    await setSupportDetailLevel(USER_ID, 'aa_specific');
    await setSupportDetailLevel(USER_ID, '');
    await setSupportDetailLevel(USER_ID, null);

    expect(rpcCalls.length).toBe(0); // no RPC called
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('setLifestylePreferences — DECOUPLING RULE', () => {
  it('test_lifestyle_write_does_not_call_support_rpc', async () => {
    const rpcCalls = [];
    _rpcImpl = (name, args) => {
      rpcCalls.push({ name, args });
      return Promise.resolve({ data: null, error: null });
    };

    const updateCalls = [];
    _fromImpl = () => ({
      update: (data) => {
        updateCalls.push(data);
        return { eq: () => Promise.resolve({ error: null }) };
      },
    });

    // Set lifestyle prefs (sober flag, etc.)
    await setLifestylePreferences(USER_ID, { sober: true, recovery: true });

    // CRITICAL: must NOT have called update_support_preferences or checkSupportProximity
    const supportRpc = rpcCalls.find(c => c.name === 'update_support_preferences');
    expect(supportRpc).toBeUndefined();

    // Must have written lifestyle_preferences
    const lifestyleUpdate = updateCalls.find(d => 'lifestyle_preferences' in d);
    expect(lifestyleUpdate).toBeDefined();
    expect(lifestyleUpdate.lifestyle_preferences).toMatchObject({ sober: true, recovery: true });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('checkSupportProximity', () => {
  it('test_bails_immediately_if_notifications_disabled', async () => {
    _fromImpl = () => ({
      select: () => ({
        eq: () => ({
          single:      () => Promise.resolve({ data: { support_preferences: DISABLED_PREFS, lifestyle_preferences: null }, error: null }),
          maybeSingle: () => Promise.resolve({ data: { support_preferences: DISABLED_PREFS, lifestyle_preferences: null }, error: null }),
        }),
      }),
    });

    const result = await checkSupportProximity(USER_ID, 51.5074, -0.1278);
    expect(result.nearby).toBe(false);
    expect(result.meeting).toBeNull();
  });

  it('test_suppresses_if_already_notified_in_window', async () => {
    let callCount = 0;
    _fromImpl = (table) => {
      callCount++;
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single:      () => Promise.resolve({ data: { support_preferences: ENABLED_PREFS, lifestyle_preferences: null }, error: null }),
              maybeSingle: () => Promise.resolve({ data: { support_preferences: ENABLED_PREFS, lifestyle_preferences: null }, error: null }),
            }),
          }),
        };
      }
      if (table === 'support_notification_log') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: 'existing-log' }, error: null }),
              }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) };
    };

    const result = await checkSupportProximity(USER_ID, 51.5074, -0.1278);
    expect(result.nearby).toBe(false);
    expect(result.suppressed).toBe(true);
  });

  it('test_returns_nearby_true_within_2km', async () => {
    const now = new Date();
    const futureHour = (now.getHours() + 1) % 24;
    const meetingTime = `${String(futureHour).padStart(2,'0')}:00:00`;

    _fromImpl = (table) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single:      () => Promise.resolve({ data: { support_preferences: ENABLED_PREFS }, error: null }),
              maybeSingle: () => Promise.resolve({ data: { support_preferences: ENABLED_PREFS }, error: null }),
            }),
          }),
        };
      }
      if (table === 'support_notification_log') {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }),
        };
      }
      if (table === 'support_meetings') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({
                data: [{
                  id: 'meeting-1',
                  meeting_type: 'aa',
                  name: 'Test Meeting',
                  lat: '51.5080', // ~0.7km from 51.5074,-0.1278
                  lng: '-0.1285',
                  start_time: meetingTime,
                }],
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) };
    };

    const result = await checkSupportProximity(USER_ID, 51.5074, -0.1278);
    expect(result.nearby).toBe(true);
    expect(result.meeting).not.toBeNull();
  });

  it('test_returns_nearby_false_outside_2km', async () => {
    const now = new Date();
    const futureHour = (now.getHours() + 1) % 24;
    const meetingTime = `${String(futureHour).padStart(2,'0')}:00:00`;

    _fromImpl = (table) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single:      () => Promise.resolve({ data: { support_preferences: ENABLED_PREFS }, error: null }),
              maybeSingle: () => Promise.resolve({ data: { support_preferences: ENABLED_PREFS }, error: null }),
            }),
          }),
        };
      }
      if (table === 'support_notification_log') {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }),
        };
      }
      if (table === 'support_meetings') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({
                data: [{
                  id: 'meeting-far',
                  meeting_type: 'na',
                  lat: '51.5500', // ~5km away
                  lng: '-0.1278',
                  start_time: meetingTime,
                }],
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) };
    };

    const result = await checkSupportProximity(USER_ID, 51.5074, -0.1278);
    expect(result.nearby).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('stripSupportFields', () => {
  it('test_strips_both_private_fields', () => {
    const row = {
      id: 'abc',
      display_name: 'Jay',
      lifestyle_preferences: { sober: true },
      support_preferences: { support_notifications_enabled: true, support_detail_level: 'generic' },
      city: 'London',
    };

    const safe = stripSupportFields(row);
    expect(safe).not.toHaveProperty('lifestyle_preferences');
    expect(safe).not.toHaveProperty('support_preferences');
  });

  it('test_strips_leaves_other_fields_intact', () => {
    const row = {
      id: 'abc',
      display_name: 'Jay',
      lifestyle_preferences: { sober: true },
      support_preferences: { support_notifications_enabled: false },
      city: 'London',
      avatar_url: 'https://example.com/img.jpg',
    };

    const safe = stripSupportFields(row);
    expect(safe.id).toBe('abc');
    expect(safe.display_name).toBe('Jay');
    expect(safe.city).toBe('London');
    expect(safe.avatar_url).toBe('https://example.com/img.jpg');
  });

  it('test_strips_handles_null_row', () => {
    expect(stripSupportFields(null)).toBeNull();
    expect(stripSupportFields(undefined)).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SUPPORT_NOTIFICATION_COPY', () => {
  it('test_notification_copy_exact_spec_values', () => {
    // Exact copy per spec — must not vary
    expect(SUPPORT_NOTIFICATION_COPY.generic).toBe('Support nearby tonight · 10 min away');
    expect(SUPPORT_NOTIFICATION_COPY.detailed).toBe('AA / NA meeting nearby · 10 min away');
  });

  it('test_notification_copy_detailed_does_not_reveal_user_preference', () => {
    // 'detailed' shows meeting TYPE (AA/NA), not the user's specific preference tag
    // i.e. it NEVER says "your AA meeting" or references lifestyle_preferences
    expect(SUPPORT_NOTIFICATION_COPY.detailed).not.toMatch(/your/i);
    expect(SUPPORT_NOTIFICATION_COPY.detailed).not.toMatch(/sober|recovery/i);
  });
});
