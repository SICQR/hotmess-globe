/**
 * HOTMESS v6 — AA System: Core Library
 * src/lib/v6/aaSystem.js
 *
 * Spec: HOTMESS-AA-System.docx
 *
 * AA (Active Aftercare) is the ambient safety layer on the Globe.
 * This module owns: state constants, glow styles, RPC calls.
 *
 * HARD RULES:
 *   - Never expose user identity in AA signals
 *   - Default to PASSIVE on any error or staleness
 *   - State is computed, never assumed
 */

import { supabase } from '@/lib/supabase';

// ── State constants (spec §2) ─────────────────────────────────────────────────
export const AA_STATES = {
  PASSIVE:   'PASSIVE',
  ACTIVE:    'ACTIVE',
  ESCALATED: 'ESCALATED',
};

export const AA_DEFAULT_STATE = AA_STATES.PASSIVE;

// ── Intensities (spec §2 table) ───────────────────────────────────────────────
export const AA_INTENSITY = {
  PASSIVE:   0.2,
  ACTIVE:    0.5,
  ESCALATED: 0.9,
};

// ── Stale threshold: 5 minutes (spec §8) ─────────────────────────────────────
export const AA_STALE_THRESHOLD_MS = 5 * 60 * 1000;

// ── Globe glow layer CSS (spec §9) ────────────────────────────────────────────
// Applied to the z-axis layer 2 div (above map tiles, below venue beacons)
export const AA_GLOW_STYLE = {
  PASSIVE: {
    background: '#B8860B',
    opacity: 0.06,
    animation: 'none',
    transition: 'opacity 2s ease',
  },
  ACTIVE: {
    background: '#B8860B',
    opacity: 0.15,
    animation: 'aa-pulse 45s ease-in-out infinite',
    transition: 'opacity 2s ease',
  },
  ESCALATED: {
    background: '#C8962C',
    opacity: 0.30,
    animation: 'none',        // steady glow — spec: "pulse implies urgency, steady implies presence"
    transition: 'opacity 1s ease',
  },
};

// CSS keyframes string — inject once into document head
export const AA_PULSE_KEYFRAMES = `
@keyframes aa-pulse {
  0%,100% { opacity: 0.15; }
  50%      { opacity: 0.20; }
}
`;

// ── State ordering for comparison ─────────────────────────────────────────────
const STATE_RANK = { PASSIVE: 0, ACTIVE: 1, ESCALATED: 2 };
export const aaStateIsHigher = (a, b) => (STATE_RANK[a] ?? 0) > (STATE_RANK[b] ?? 0);

// ── computeAAState — calls RPC ────────────────────────────────────────────────
/**
 * Compute current AA state for a location.
 * Returns PASSIVE on any error — never assumes ESCALATED.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} [radiusKm=2.0]
 * @returns {Promise<{state, intensity, reason, stale, error}>}
 */
export async function computeAAState(lat, lng, radiusKm = 2.0) {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
    return _passive('invalid_location');
  }

  try {
    const { data, error } = await supabase.rpc('compute_aa_state', {
      p_lat:       lat,
      p_lng:       lng,
      p_radius_km: radiusKm,
    });

    if (error) return _passive('rpc_error');

    const state = data?.state;
    if (!AA_STATES[state]) return _passive('unknown_state');

    return {
      state,
      intensity: data.intensity ?? AA_INTENSITY[state],
      reason:    data.reason    ?? 'computed',
      stale:     false,
      error:     null,
    };
  } catch {
    return _passive('exception');
  }
}

// ── isAAStateStale ───────────────────────────────────────────────────��─────────
/**
 * Returns true if the AA state is older than AA_STALE_THRESHOLD_MS.
 * Stale state → reduce to PASSIVE (spec §8).
 */
export function isAAStateStale(fetchedAt) {
  if (!fetchedAt) return true;
  return Date.now() - fetchedAt > AA_STALE_THRESHOLD_MS;
}

// ── getAAGlowStyle ─────────────────────────────────────────────────────────────
/**
 * Get Globe glow CSS style for a given state.
 * Falls back to PASSIVE if state is unknown or stale.
 */
export function getAAGlowStyle(state, stale = false) {
  if (stale || !AA_GLOW_STYLE[state]) return AA_GLOW_STYLE.PASSIVE;
  return AA_GLOW_STYLE[state];
}

// ── ESCALATED overlay: dims other Globe layers slightly (spec §9) ─────────────
export const AA_ESCALATED_OVERLAY_STYLE = {
  background: 'rgba(0,0,0,0.12)',
  pointerEvents: 'none',
  transition: 'opacity 1s ease',
};

// ── Internal ─────────────────────────────────���───────────────────────────���────
function _passive(reason) {
  return {
    state:     AA_STATES.PASSIVE,
    intensity: AA_INTENSITY.PASSIVE,
    reason,
    stale:     false,
    error:     reason,
  };
}
