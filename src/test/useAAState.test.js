/**
 * HOTMESS v6 — AA System: useAAState hook tests
 *
 * Tests:
 *  1.  Starts in loading=true with PASSIVE defaults
 *  2.  Resolves to PASSIVE after initial RPC fetch
 *  3.  Resolves to ACTIVE state and sets convenience flags
 *  4.  Resolves to ESCALATED state and sets isEscalated
 *  5.  Calls computeAAState with correct lat/lng/radiusKm args
 *  6.  Stays PASSIVE and skips RPC when flag is off
 *  7.  Stays PASSIVE and skips RPC when lat is null
 *  8.  Stays PASSIVE and skips RPC when lng is null
 *  9.  Polls again after 60s interval
 * 10.  Marks stale and falls back to PASSIVE after AA_STALE_THRESHOLD_MS
 * 11.  Cleans up both timers on unmount (no memory leaks)
 * 12.  glow style is PASSIVE when state is PASSIVE
 * 13.  glow style has pulse animation when state is ACTIVE
 * 14.  glow style is steady gold when state is ESCALATED
 */

import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockComputeAAState = vi.fn();
const mockFlagValue      = { current: true };

vi.mock('@/lib/v6/aaSystem', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,                         // keep AA_STATES, AA_INTENSITY, AA_GLOW_STYLE etc.
    computeAAState: (...args) => mockComputeAAState(...args),
  };
});

vi.mock('@/hooks/useV6Flag', () => ({
  useV6Flag: () => mockFlagValue.current,
  default:   () => mockFlagValue.current,
}));

import { useAAState }                         from '@/hooks/useAAState';
import { AA_STATES, AA_INTENSITY, AA_STALE_THRESHOLD_MS } from '@/lib/v6/aaSystem';

// ── Fixtures ─────────────────────────────────────────────────────────────────
const LAT = 51.5074;
const LNG = -0.1278;

const RPC_PASSIVE   = { state: 'PASSIVE',   intensity: 0.2, reason: 'ambient',           stale: false, error: null };
const RPC_ACTIVE    = { state: 'ACTIVE',    intensity: 0.5, reason: 'live_event',         stale: false, error: null };
const RPC_ESCALATED = { state: 'ESCALATED', intensity: 0.9, reason: 'active_escalation',  stale: false, error: null };

// ─────────────────────────────────────────────────────────────────────────────

describe('useAAState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFlagValue.current = true;
    mockComputeAAState.mockResolvedValue(RPC_PASSIVE);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('test_01_starts_loading_with_passive_defaults', () => {
    const { result } = renderHook(() => useAAState({ lat: LAT, lng: LNG }));
    expect(result.current.loading).toBe(true);
    expect(result.current.state).toBe(AA_STATES.PASSIVE);
    expect(result.current.intensity).toBe(AA_INTENSITY.PASSIVE);
  });

  it('test_02_resolves_to_passive_after_fetch', async () => {
    const { result } = renderHook(() => useAAState({ lat: LAT, lng: LNG }));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.state).toBe('PASSIVE');
    expect(result.current.loading).toBe(false);
    expect(result.current.stale).toBe(false);
  });

  // ── State transitions ──────────────────────────────────────────────────────

  it('test_03_resolves_active_and_sets_convenience_flags', async () => {
    mockComputeAAState.mockResolvedValue(RPC_ACTIVE);
    const { result } = renderHook(() => useAAState({ lat: LAT, lng: LNG }));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.state).toBe('ACTIVE');
    expect(result.current.isActive).toBe(true);
    expect(result.current.isPassive).toBe(false);
    expect(result.current.isEscalated).toBe(false);
  });

  it('test_04_resolves_escalated_and_sets_isEscalated', async () => {
    mockComputeAAState.mockResolvedValue(RPC_ESCALATED);
    const { result } = renderHook(() => useAAState({ lat: LAT, lng: LNG }));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.state).toBe('ESCALATED');
    expect(result.current.isEscalated).toBe(true);
    expect(result.current.intensity).toBe(0.9);
  });

  // ── RPC args ───────────────────────────────────────────────────────────────

  it('test_05_calls_computeAAState_with_correct_args', async () => {
    const { result } = renderHook(() => useAAState({ lat: LAT, lng: LNG, radiusKm: 3.0 }));
    await act(async () => { await Promise.resolve(); });
    expect(mockComputeAAState).toHaveBeenCalledWith(LAT, LNG, 3.0);
  });

  // ── Flag off / missing coords ──────────────────────────────────────────────

  it('test_06_stays_passive_skips_rpc_when_flag_off', async () => {
    mockFlagValue.current = false;
    const { result } = renderHook(() => useAAState({ lat: LAT, lng: LNG }));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.state).toBe('PASSIVE');
    expect(result.current.loading).toBe(false);
    expect(mockComputeAAState).not.toHaveBeenCalled();
  });

  it('test_07_stays_passive_skips_rpc_when_lat_null', async () => {
    const { result } = renderHook(() => useAAState({ lat: null, lng: LNG }));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.state).toBe('PASSIVE');
    expect(mockComputeAAState).not.toHaveBeenCalled();
  });

  it('test_08_stays_passive_skips_rpc_when_lng_null', async () => {
    const { result } = renderHook(() => useAAState({ lat: LAT, lng: null }));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.state).toBe('PASSIVE');
    expect(mockComputeAAState).not.toHaveBeenCalled();
  });

  // ── Polling ────────────────────────────────────────────────────────────────

  it('test_09_polls_again_after_60s', async () => {
    const { result } = renderHook(() => useAAState({ lat: LAT, lng: LNG }));
    await act(async () => { await Promise.resolve(); });
    expect(mockComputeAAState).toHaveBeenCalledTimes(1);

    // Advance exactly one poll interval
    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
    });
    expect(mockComputeAAState).toHaveBeenCalledTimes(2);
  });

  // ── Staleness ─────────────────────────────────────────────────────────────

  it('test_10_marks_stale_and_falls_back_to_passive_after_threshold', async () => {
    mockComputeAAState.mockResolvedValue(RPC_ACTIVE);
    const { result } = renderHook(() => useAAState({ lat: LAT, lng: LNG }));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.state).toBe('ACTIVE');

    // Explicitly jump system time past the stale threshold, then trigger
    // one stale-check interval tick. vi.setSystemTime makes Date.now()
    // return the new time without needing advanceTimersByTime to advance Date.
    const fetchTime = Date.now();
    vi.setSystemTime(fetchTime + AA_STALE_THRESHOLD_MS + 1_000);
    await act(async () => {
      vi.advanceTimersByTime(30_000); // trigger the 30s stale check callback
      await Promise.resolve();
    });
    expect(result.current.stale).toBe(true);
    expect(result.current.state).toBe('PASSIVE');
    expect(result.current.intensity).toBe(AA_INTENSITY.PASSIVE);
  });

  // ── Cleanup ───────────────────────────────────────────────────────────────

  it('test_11_cleans_up_timers_on_unmount', async () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = renderHook(() => useAAState({ lat: LAT, lng: LNG }));
    await act(async () => { await Promise.resolve(); });

    unmount();

    // The stale useEffect depends on `fetchedAt` — it re-runs after the initial
    // fetch, cleaning up its previous (empty) interval. On unmount, both poll
    // and stale intervals are cleared. Total: >= 2 clearInterval calls.
    expect(clearSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    clearSpy.mockRestore();
  });

  // ── Glow style passthrough ────────────────────────────────────────────────

  it('test_12_glow_style_passive_when_state_passive', async () => {
    const { result } = renderHook(() => useAAState({ lat: LAT, lng: LNG }));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.glow.opacity).toBe(0.06);
    expect(result.current.glow.animation).toBe('none');
    expect(result.current.glow.background).toBe('#B8860B');
  });

  it('test_13_glow_style_has_pulse_when_active', async () => {
    mockComputeAAState.mockResolvedValue(RPC_ACTIVE);
    const { result } = renderHook(() => useAAState({ lat: LAT, lng: LNG }));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.glow.opacity).toBe(0.15);
    expect(result.current.glow.animation).toContain('aa-pulse');
  });

  it('test_14_glow_style_steady_gold_when_escalated', async () => {
    mockComputeAAState.mockResolvedValue(RPC_ESCALATED);
    const { result } = renderHook(() => useAAState({ lat: LAT, lng: LNG }));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.glow.opacity).toBe(0.30);
    expect(result.current.glow.animation).toBe('none');   // steady — spec §9
    expect(result.current.glow.background).toBe('#C8962C'); // bright gold
  });
});
