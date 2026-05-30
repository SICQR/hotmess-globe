/**
 * HOTMESS v6 — Runtime Isolation: Enforcement Tests
 *
 * All 9 isolation tests from HOTMESS-RuntimeEnforcement.docx §7.
 * Every test must pass on every deploy. Any failure blocks the pipeline.
 *
 * These tests are pure unit tests — no DB, no network.
 * The logIsolationViolation() call inside enforceFieldAccess / sanitiseForAI
 * is a best-effort fire-and-forget; its failure never masks the thrown error
 * we're testing for.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── mock Supabase so tests never hit the network ──────────────────────────
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({ insert: vi.fn().mockResolvedValue({ error: null }) }),
  }),
}));

import {
  enforceFieldAccess,
  sanitiseForAI,
  IsolationViolationError,
  ForbiddenError,
} from '@/lib/v6/isolationEnforcement';

import {
  REALTIME_BLOCKED_TABLES,
  ALLOWED_REALTIME_CHANNELS,
  AI_BLOCKED_FIELDS,
} from '@/lib/v6/fieldManifest';

// ---------------------------------------------------------------------------
// Test 1 — AI cannot read support_preferences
// ---------------------------------------------------------------------------
describe('test_ai_cannot_read_support_prefs', () => {
  it('throws IsolationViolationError when support_preferences is in AI context', async () => {
    const context = {
      chat_text: 'hello',
      support_preferences: { sober: true },
    };
    await expect(sanitiseForAI(context)).rejects.toThrow(IsolationViolationError);
    await expect(sanitiseForAI(context)).rejects.toThrow(
      /Blocked field "support_preferences" detected in AI context/
    );
  });
});

// ---------------------------------------------------------------------------
// Test 2 — AI cannot read lifestyle_preferences
// ---------------------------------------------------------------------------
describe('test_ai_cannot_read_lifestyle_flags', () => {
  it('throws IsolationViolationError when lifestyle_preferences is in AI context', async () => {
    const context = {
      venue_context: 'Eagle Bar',
      lifestyle_preferences: { role: 'top' },
    };
    await expect(sanitiseForAI(context)).rejects.toThrow(IsolationViolationError);
    await expect(sanitiseForAI(context)).rejects.toThrow(
      /Blocked field "lifestyle_preferences" detected in AI context/
    );
  });
});

// ---------------------------------------------------------------------------
// Test 3 — Operator panel cannot read individual user_location
// ---------------------------------------------------------------------------
describe('test_operator_cannot_read_user_location', () => {
  it('throws ForbiddenError when OPERATOR_PANEL requests user_location', async () => {
    await expect(
      enforceFieldAccess('OPERATOR_PANEL', ['user_location'])
    ).rejects.toThrow(ForbiddenError);
    await expect(
      enforceFieldAccess('OPERATOR_PANEL', ['user_location'])
    ).rejects.toThrow(/OPERATOR_PANEL cannot access field "user_location"/);
  });
});

// ---------------------------------------------------------------------------
// Test 4 — Operator panel cannot read care data (support_preferences)
// ---------------------------------------------------------------------------
describe('test_operator_cannot_read_care_data', () => {
  it('throws ForbiddenError when OPERATOR_PANEL requests support_preferences', async () => {
    await expect(
      enforceFieldAccess('OPERATOR_PANEL', ['support_preferences'])
    ).rejects.toThrow(ForbiddenError);
  });

  it('throws ForbiddenError when OPERATOR_PANEL requests care_settings', async () => {
    await expect(
      enforceFieldAccess('OPERATOR_PANEL', ['care_settings'])
    ).rejects.toThrow(ForbiddenError);
  });

  it('throws ForbiddenError when OPERATOR_PANEL requests backup_contacts', async () => {
    await expect(
      enforceFieldAccess('OPERATOR_PANEL', ['backup_contacts'])
    ).rejects.toThrow(ForbiddenError);
  });
});

// ---------------------------------------------------------------------------
// Test 5 — Care events must not appear in Realtime broadcast channels
// ---------------------------------------------------------------------------
describe('test_care_event_not_in_realtime', () => {
  it('care tables are all present in REALTIME_BLOCKED_TABLES', () => {
    const careTables = [
      'support_preferences',
      'lifestyle_preferences',
      'backup_contacts',
      'safety_alerts',
      'care_settings',
    ];
    for (const table of careTables) {
      expect(REALTIME_BLOCKED_TABLES).toContain(table);
    }
  });

  it('care tables are not listed in ALLOWED_REALTIME_CHANNELS', () => {
    const careTables = [
      'support_preferences',
      'lifestyle_preferences',
      'backup_contacts',
      'safety_alerts',
      'care_settings',
    ];
    for (const table of careTables) {
      expect(ALLOWED_REALTIME_CHANNELS).not.toContain(table);
    }
  });
});

// ---------------------------------------------------------------------------
// Test 6 — Notifications service cannot read lifestyle_preferences
// ---------------------------------------------------------------------------
describe('test_notifications_blocks_lifestyle', () => {
  it('throws ForbiddenError when NOTIFICATIONS requests lifestyle_preferences', async () => {
    await expect(
      enforceFieldAccess('NOTIFICATIONS', ['lifestyle_preferences'])
    ).rejects.toThrow(ForbiddenError);
    await expect(
      enforceFieldAccess('NOTIFICATIONS', ['lifestyle_preferences'])
    ).rejects.toThrow(/NOTIFICATIONS cannot access field "lifestyle_preferences"/);
  });
});

// ---------------------------------------------------------------------------
// Test 7 — Meet system cannot read backup_contacts (care field)
// ---------------------------------------------------------------------------
describe('test_meet_system_blocks_care_fields', () => {
  it('throws ForbiddenError when MEET_SYSTEM requests backup_contacts', async () => {
    await expect(
      enforceFieldAccess('MEET_SYSTEM', ['backup_contacts'])
    ).rejects.toThrow(ForbiddenError);
  });

  it('throws ForbiddenError when MEET_SYSTEM requests care_settings', async () => {
    await expect(
      enforceFieldAccess('MEET_SYSTEM', ['care_settings'])
    ).rejects.toThrow(ForbiddenError);
  });
});

// ---------------------------------------------------------------------------
// Test 8 — Cross-venue operator blocked (field-manifest level)
// Complement to the RLS test: OPERATOR_PANEL blocked from individual user data.
// ---------------------------------------------------------------------------
describe('test_cross_venue_operator_blocked', () => {
  it('throws ForbiddenError when OPERATOR_PANEL requests chat_content', async () => {
    await expect(
      enforceFieldAccess('OPERATOR_PANEL', ['chat_content'])
    ).rejects.toThrow(ForbiddenError);
  });

  it('throws ForbiddenError when OPERATOR_PANEL requests meet_sessions', async () => {
    await expect(
      enforceFieldAccess('OPERATOR_PANEL', ['meet_sessions'])
    ).rejects.toThrow(ForbiddenError);
  });

  it('unknown service throws ForbiddenError (fail-closed)', async () => {
    await expect(
      enforceFieldAccess('UNKNOWN_SERVICE', ['user_location'])
    ).rejects.toThrow(ForbiddenError);
    await expect(
      enforceFieldAccess('UNKNOWN_SERVICE', ['user_location'])
    ).rejects.toThrow(/Unknown service/);
  });
});

// ---------------------------------------------------------------------------
// Test 9 — Malicious dev accidentally wires care context to AI
// ---------------------------------------------------------------------------
describe('test_malicious_dev_wires_care_to_ai', () => {
  it('sanitiseForAI throws before the AI call when care_settings is present', async () => {
    // Simulate a developer accidentally passing a full profile context to AI
    const fullProfileContext = {
      chat_text: 'where are you?',
      meet_stage: 'finding',
      care_settings: { get_out_enabled: true, land_time: '2026-05-01T03:00:00Z' },
    };
    await expect(sanitiseForAI(fullProfileContext)).rejects.toThrow(IsolationViolationError);
    await expect(sanitiseForAI(fullProfileContext)).rejects.toThrow(
      /Blocked field "care_settings" detected in AI context/
    );
  });

  it('sanitiseForAI passes clean context through unmodified', async () => {
    const cleanContext = {
      chat_text:     'where are you?',
      meet_stage:    'finding',
      venue_context: 'Eagle Bar',
    };
    const result = await sanitiseForAI(cleanContext);
    expect(result).toEqual(cleanContext);
  });

  it('all AI_BLOCKED_FIELDS trigger IsolationViolationError individually', async () => {
    for (const field of AI_BLOCKED_FIELDS) {
      const ctx = { [field]: 'test_value' };
      await expect(sanitiseForAI(ctx)).rejects.toThrow(IsolationViolationError);
    }
  });
});
