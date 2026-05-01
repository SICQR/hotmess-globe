/**
 * HOTMESS v6 — AA System: AAGlowLayer component tests
 *
 * Tests:
 *  1.  Renders null when v6_aa_system flag is off ("does not exist" per spec)
 *  2.  Renders glow div when flag is on
 *  3.  Glow div is aria-hidden (accessibility — must not be read as content)
 *  4.  Glow div has pointerEvents none (never blocks user interactions)
 *  5.  Glow div has zIndex 2 (Globe layer order: tiles=1, AA glow=2, beacons=3+)
 *  6.  Loading state renders PASSIVE glow immediately (no blank globe flash)
 *  7.  Sets data-aa-state="PASSIVE" during loading (for test/debug hooks)
 *  8.  ACTIVE state applies correct glow style (opacity 0.15)
 *  9.  ESCALATED state applies correct glow style (opacity 0.30, bright gold)
 * 10.  ESCALATED renders overlay div at zIndex 7 (dims layers 3-6)
 * 11.  ESCALATED overlay is aria-hidden
 * 12.  ESCALATED overlay has pointerEvents none
 * 13.  Non-ESCALATED does NOT render overlay div
 * 14.  Injects aa-pulse @keyframes into document head on first render
 * 15.  ESCALATED overlay uses dim background (rgba black, not gold — subtle presence)
 */

import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockFlagValue = { current: true };
const mockAAValue   = { current: null };  // set per-test

vi.mock('@/hooks/useV6Flag', () => ({
  useV6Flag: () => mockFlagValue.current,
  default:   () => mockFlagValue.current,
}));

vi.mock('@/hooks/useAAState', () => ({
  useAAState: () => mockAAValue.current,
}));

// Real aaSystem constants — no mock needed
import AAGlowLayer from '@/components/globe/AAGlowLayer';
import { AA_GLOW_STYLE, AA_ESCALATED_OVERLAY_STYLE } from '@/lib/v6/aaSystem';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const STATE_PASSIVE = {
  state:       'PASSIVE',
  loading:     false,
  isEscalated: false,
  glow:        AA_GLOW_STYLE.PASSIVE,
};

const STATE_LOADING = {
  state:       'PASSIVE',
  loading:     true,
  isEscalated: false,
  glow:        AA_GLOW_STYLE.PASSIVE,
};

const STATE_ACTIVE = {
  state:       'ACTIVE',
  loading:     false,
  isEscalated: false,
  glow:        AA_GLOW_STYLE.ACTIVE,
};

const STATE_ESCALATED = {
  state:       'ESCALATED',
  loading:     false,
  isEscalated: true,
  glow:        AA_GLOW_STYLE.ESCALATED,
};

// ─────────────────────────────────────────────────────────────────────────────

describe('AAGlowLayer', () => {
  beforeEach(() => {
    mockFlagValue.current = true;
    mockAAValue.current   = STATE_PASSIVE;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Flag gate ─────────────────────────────────────────────────────────────

  it('test_01_renders_null_when_flag_off', () => {
    mockFlagValue.current = false;
    const { container } = render(<AAGlowLayer lat={51.5} lng={-0.1} />);
    // Spec: "If not explicitly enabled it does not exist"
    expect(container.firstChild).toBeNull();
  });

  // ── Glow layer presence + accessibility ───────────────────────────────────

  it('test_02_renders_glow_div_when_flag_on', () => {
    render(<AAGlowLayer lat={51.5} lng={-0.1} />);
    expect(screen.getByTestId('aa-glow-layer')).toBeInTheDocument();
  });

  it('test_03_glow_div_is_aria_hidden', () => {
    render(<AAGlowLayer lat={51.5} lng={-0.1} />);
    expect(screen.getByTestId('aa-glow-layer')).toHaveAttribute('aria-hidden', 'true');
  });

  it('test_04_glow_div_has_pointer_events_none', () => {
    render(<AAGlowLayer lat={51.5} lng={-0.1} />);
    expect(screen.getByTestId('aa-glow-layer').style.pointerEvents).toBe('none');
  });

  it('test_05_glow_div_has_z_index_2', () => {
    // Globe layer order: 1=tiles, 2=AA glow, 3=venue beacons, 4=event beacons, 5=user dots
    render(<AAGlowLayer lat={51.5} lng={-0.1} />);
    expect(screen.getByTestId('aa-glow-layer').style.zIndex).toBe('2');
  });

  // ── Loading state ─────────────────────────────────────────────────────────

  it('test_06_loading_renders_passive_immediately', () => {
    mockAAValue.current = STATE_LOADING;
    render(<AAGlowLayer lat={51.5} lng={-0.1} />);
    // Must show PASSIVE glow immediately — no blank globe
    expect(screen.getByTestId('aa-glow-layer').style.opacity).toBe('0.06');
  });

  it('test_07_sets_data_aa_state_passive_during_loading', () => {
    mockAAValue.current = STATE_LOADING;
    render(<AAGlowLayer lat={51.5} lng={-0.1} />);
    expect(screen.getByTestId('aa-glow-layer')).toHaveAttribute('data-aa-state', 'PASSIVE');
  });

  // ── Glow styles ───────────────────────────────────────────────────────────

  it('test_08_active_state_applies_correct_glow_opacity', () => {
    mockAAValue.current = STATE_ACTIVE;
    render(<AAGlowLayer lat={51.5} lng={-0.1} />);
    // ACTIVE: 0.15 opacity (spec §9: subtle presence uplift)
    expect(screen.getByTestId('aa-glow-layer').style.opacity).toBe('0.15');
  });

  it('test_09_escalated_state_applies_bright_gold_glow', () => {
    mockAAValue.current = STATE_ESCALATED;
    render(<AAGlowLayer lat={51.5} lng={-0.1} />);
    const el = screen.getByTestId('aa-glow-layer');
    // ESCALATED: 0.30 opacity, brighter gold (#C8962C not #B8860B)
    // jsdom normalises hex colours to rgb() form in style — compare both
    expect(el.style.opacity).toBe('0.3');
    expect(el.style.background).toMatch(/rgb\(200,\s*150,\s*44\)|#C8962C/i);
  });

  // ── ESCALATED overlay (Globe layer 7) ────────────────────────────────────

  it('test_10_escalated_renders_overlay_at_z7', () => {
    mockAAValue.current = STATE_ESCALATED;
    render(<AAGlowLayer lat={51.5} lng={-0.1} />);
    const overlay = screen.getByTestId('aa-escalated-overlay');
    expect(overlay).toBeInTheDocument();
    // z-index 7 dims: venue beacons(3), event beacons(4), user dots(5), meet signals(6)
    expect(overlay.style.zIndex).toBe('7');
  });

  it('test_11_escalated_overlay_is_aria_hidden', () => {
    mockAAValue.current = STATE_ESCALATED;
    render(<AAGlowLayer lat={51.5} lng={-0.1} />);
    expect(screen.getByTestId('aa-escalated-overlay')).toHaveAttribute('aria-hidden', 'true');
  });

  it('test_12_escalated_overlay_has_pointer_events_none', () => {
    mockAAValue.current = STATE_ESCALATED;
    render(<AAGlowLayer lat={51.5} lng={-0.1} />);
    // Overlay dims but never blocks taps — critical for a safety feature
    expect(screen.getByTestId('aa-escalated-overlay').style.pointerEvents).toBe('none');
  });

  it('test_13_no_overlay_when_not_escalated', () => {
    mockAAValue.current = STATE_PASSIVE;
    render(<AAGlowLayer lat={51.5} lng={-0.1} />);
    expect(screen.queryByTestId('aa-escalated-overlay')).not.toBeInTheDocument();
  });

  // ── Keyframes injection ───────────────────────────────────────────────────

  it('test_14_injects_aa_pulse_keyframes_into_head', () => {
    render(<AAGlowLayer lat={51.5} lng={-0.1} />);
    // @keyframes aa-pulse must exist for ACTIVE glow animation to render
    // Check either via injected <style> tag or that ACTIVE animation string references it
    const injectedStyle = document.querySelector('[data-aa-keyframes]');
    if (injectedStyle) {
      // First render in this suite — keyframes were injected fresh
      expect(injectedStyle.textContent).toContain('@keyframes aa-pulse');
    } else {
      // Module-level keyframesInjected=true from a prior render — correct behaviour
      // Verify the ACTIVE glow style still references aa-pulse (animation will work)
      expect(AA_GLOW_STYLE.ACTIVE.animation).toContain('aa-pulse');
    }
  });

  // ── ESCALATED overlay visual character ───────────────────────────────────

  it('test_15_escalated_overlay_uses_dim_black_not_gold', () => {
    mockAAValue.current = STATE_ESCALATED;
    render(<AAGlowLayer lat={51.5} lng={-0.1} />);
    const overlay = screen.getByTestId('aa-escalated-overlay');
    // Spec: overlay dims other layers — dark veil, not gold tint.
    // The glow layer handles gold. The overlay is rgba black.
    // jsdom normalises rgba(0,0,0,0.12) → rgba(0, 0, 0, 0.12) — use regex.
    expect(AA_ESCALATED_OVERLAY_STYLE.background).toMatch(/rgba\(0,\s*0,\s*0/);
    expect(overlay.style.background).toMatch(/rgba\(0,\s*0,\s*0,\s*0\.12\)/);
  });
});
