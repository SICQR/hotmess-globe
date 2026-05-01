/**
 * HOTMESS v6 — Chunk 03: AA System Tests
 *
 * Spec: HOTMESS-AA-System.docx
 *
 * Tests:
 *  1.  computeAAState returns PASSIVE when RPC returns PASSIVE
 *  2.  computeAAState returns ACTIVE for live_event reason
 *  3.  computeAAState returns ACTIVE for density reason
 *  4.  computeAAState returns ESCALATED for active_escalation
 *  5.  computeAAState defaults to PASSIVE on RPC error (fail-safe)
 *  6.  computeAAState defaults to PASSIVE on invalid location
 *  7.  computeAAState defaults to PASSIVE on unknown state in response
 *  8.  isAAStateStale returns true when fetchedAt > 5min ago
 *  9.  isAAStateStale returns false when fetchedAt < 5min ago
 * 10.  isAAStateStale returns true when fetchedAt is null
 * 11.  getAAGlowStyle returns PASSIVE style for PASSIVE state
 * 12.  getAAGlowStyle returns ACTIVE style with pulse animation
 * 13.  getAAGlowStyle returns ESCALATED style with no pulse (steady glow)
 * 14.  getAAGlowStyle returns PASSIVE when stale=true regardless of state
 * 15.  PRIVACY: computeAAState response contains no user identifiers
 * 16.  aaStateIsHigher: ESCALATED > ACTIVE > PASSIVE
 * 17.  AA_GLOW_STYLE ESCALATED has no pulse animation (spec: steady implies presence)
 * 18.  ESCALATED intensity is 0.9, ACTIVE is 0.5, PASSIVE is 0.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Supabase ──────────────────────────────────────────────────────────────
let _rpcImpl = () => ({ data: null, error: null });

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: (...args) => _rpcImpl(...args),
  })),
}));

import {
  computeAAState,
  isAAStateStale,
  getAAGlowStyle,
  aaStateIsHigher,
  AA_STATES,
  AA_INTENSITY,
  AA_GLOW_STYLE,
  AA_STALE_THRESHOLD_MS,
} from '../lib/v6/aaSystem.js';

const LAT = 51.5074;
const LNG = -0.1278;

// ─────────────────────────────────────────────────────────────────────────────

describe('computeAAState', () => {
  it('test_returns_passive_when_rpc_returns_passive', async () => {
    _rpcImpl = () => Promise.resolve({
      data: { state: 'PASSIVE', intensity: 0.2, reason: 'ambient', stale: false },
      error: null,
    });

    const result = await computeAAState(LAT, LNG);
    expect(result.state).toBe('PASSIVE');
    expect(result.intensity).toBe(0.2);
    expect(result.error).toBeNull();
  });

  it('test_returns_active_for_live_event', async () => {
    _rpcImpl = () => Promise.resolve({
      data: { state: 'ACTIVE', intensity: 0.5, reason: 'live_event', stale: false },
      error: null,
    });

    const result = await computeAAState(LAT, LNG);
    expect(result.state).toBe('ACTIVE');
    expect(result.intensity).toBe(0.5);
    expect(result.reason).toBe('live_event');
  });

  it('test_returns_active_for_density', async () => {
    _rpcImpl = () => Promise.resolve({
      data: { state: 'ACTIVE', intensity: 0.5, reason: 'density', stale: false },
      error: null,
    });

    const result = await computeAAState(LAT, LNG);
    expect(result.state).toBe('ACTIVE');
    expect(result.reason).toBe('density');
  });

  it('test_returns_escalated_for_active_escalation', async () => {
    _rpcImpl = () => Promise.resolve({
      data: { state: 'ESCALATED', intensity: 0.9, reason: 'active_escalation', stale: false },
      error: null,
    });

    const result = await computeAAState(LAT, LNG);
    expect(result.state).toBe('ESCALATED');
    expect(result.intensity).toBe(0.9);
  });

  it('test_defaults_to_passive_on_rpc_error', async () => {
    _rpcImpl = () => Promise.resolve({ data: null, error: new Error('DB error') });

    const result = await computeAAState(LAT, LNG);
    expect(result.state).toBe('PASSIVE');
    expect(result.error).toBe('rpc_error');
  });

  it('test_defaults_to_passive_on_invalid_location', async () => {
    const r1 = await computeAAState(null, LNG);
    const r2 = await computeAAState(LAT, null);
    const r3 = await computeAAState(NaN, LNG);

    expect(r1.state).toBe('PASSIVE');
    expect(r2.state).toBe('PASSIVE');
    expect(r3.state).toBe('PASSIVE');
    // Should not have called the RPC
  });

  it('test_defaults_to_passive_on_unknown_state', async () => {
    _rpcImpl = () => Promise.resolve({
      data: { state: 'SUPER_DANGER', intensity: 1.0, reason: 'hack', stale: false },
      error: null,
    });

    const result = await computeAAState(LAT, LNG);
    expect(result.state).toBe('PASSIVE');
    expect(result.error).toBe('unknown_state');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('isAAStateStale', () => {
  it('test_stale_when_older_than_threshold', () => {
    const oldTimestamp = Date.now() - AA_STALE_THRESHOLD_MS - 1000;
    expect(isAAStateStale(oldTimestamp)).toBe(true);
  });

  it('test_not_stale_when_recent', () => {
    const recentTimestamp = Date.now() - 60_000; // 1 minute ago
    expect(isAAStateStale(recentTimestamp)).toBe(false);
  });

  it('test_stale_when_null', () => {
    expect(isAAStateStale(null)).toBe(true);
    expect(isAAStateStale(undefined)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('getAAGlowStyle', () => {
  it('test_passive_style_correct', () => {
    const style = getAAGlowStyle('PASSIVE');
    expect(style.background).toBe('#B8860B');
    expect(style.opacity).toBe(0.06);
    expect(style.animation).toBe('none');
  });

  it('test_active_style_has_pulse_animation', () => {
    const style = getAAGlowStyle('ACTIVE');
    expect(style.background).toBe('#B8860B');
    expect(style.opacity).toBe(0.15);
    expect(style.animation).toContain('aa-pulse');
    expect(style.animation).toContain('45s');
  });

  it('test_escalated_style_steady_no_pulse', () => {
    // Spec: "pulse implies urgency, steady implies presence"
    const style = getAAGlowStyle('ESCALATED');
    expect(style.background).toBe('#C8962C'); // bright gold
    expect(style.opacity).toBe(0.30);
    expect(style.animation).toBe('none'); // STEADY — no pulse
  });

  it('test_returns_passive_when_stale', () => {
    const escalatedStyle = getAAGlowStyle('ESCALATED', false);
    const staleStyle     = getAAGlowStyle('ESCALATED', true);  // stale=true

    // Stale ESCALATED → rendered as PASSIVE
    expect(escalatedStyle.opacity).toBe(0.30);
    expect(staleStyle.opacity).toBe(0.06);
  });

  it('test_returns_passive_for_unknown_state', () => {
    const style = getAAGlowStyle('UNKNOWN');
    expect(style.opacity).toBe(0.06); // PASSIVE
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('aaStateIsHigher', () => {
  it('test_state_ranking_escalated_wins', () => {
    expect(aaStateIsHigher('ESCALATED', 'ACTIVE')).toBe(true);
    expect(aaStateIsHigher('ESCALATED', 'PASSIVE')).toBe(true);
    expect(aaStateIsHigher('ACTIVE', 'PASSIVE')).toBe(true);
  });

  it('test_state_ranking_lower_loses', () => {
    expect(aaStateIsHigher('PASSIVE', 'ACTIVE')).toBe(false);
    expect(aaStateIsHigher('PASSIVE', 'ESCALATED')).toBe(false);
    expect(aaStateIsHigher('ACTIVE', 'ESCALATED')).toBe(false);
  });

  it('test_state_equal_is_not_higher', () => {
    expect(aaStateIsHigher('ACTIVE', 'ACTIVE')).toBe(false);
    expect(aaStateIsHigher('PASSIVE', 'PASSIVE')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('AA intensity constants', () => {
  it('test_intensities_match_spec', () => {
    expect(AA_INTENSITY.PASSIVE).toBe(0.2);
    expect(AA_INTENSITY.ACTIVE).toBe(0.5);
    expect(AA_INTENSITY.ESCALATED).toBe(0.9);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PRIVACY — AA response contains no user identifiers', () => {
  it('test_rpc_response_has_no_user_fields', async () => {
    _rpcImpl = () => Promise.resolve({
      data: { state: 'ACTIVE', intensity: 0.5, reason: 'density', stale: false },
      error: null,
    });

    const result = await computeAAState(LAT, LNG);

    // Result must not contain any user-identifying fields
    const FORBIDDEN_FIELDS = [
      'user_id', 'profile_id', 'auth_user_id', 'email', 'username',
      'lat', 'lng', 'location', 'coordinates', 'user_list', 'users',
    ];
    for (const field of FORBIDDEN_FIELDS) {
      expect(result).not.toHaveProperty(field);
    }
  });

  it('test_escalated_response_does_not_reveal_sos_identity', async () => {
    // ESCALATED state must not expose who triggered the SOS
    _rpcImpl = () => Promise.resolve({
      data: { state: 'ESCALATED', intensity: 0.9, reason: 'active_escalation', stale: false },
      error: null,
    });

    const result = await computeAAState(LAT, LNG);
    expect(result.state).toBe('ESCALATED');
    // Reason describes trigger type, not identity
    expect(result.reason).not.toMatch(/user|profile|uid|id:/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('AA_GLOW_STYLE spec compliance', () => {
  it('test_escalated_uses_bright_gold_not_red', () => {
    // Spec §9: "Gold, not red. Present, not urgent"
    expect(AA_GLOW_STYLE.ESCALATED.background).toMatch(/^#[C-F8]/i); // gold range
    expect(AA_GLOW_STYLE.ESCALATED.background).not.toMatch(/^#[Ff][0-3]/); // not red
  });

  it('test_all_states_use_pointer_events_none_via_parent', () => {
    // Glow layers are aria-hidden overlays — pointerEvents handled in component
    // Styles should not override this accidentally
    for (const style of Object.values(AA_GLOW_STYLE)) {
      expect(style.pointerEvents).toBeUndefined(); // handled in component, not here
    }
  });
});
