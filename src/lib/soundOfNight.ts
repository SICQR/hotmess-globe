/**
 * src/lib/soundOfNight.ts — Chunk 15
 *
 * Sound of the Night: City Phase computation, Signal Priority constants,
 * and freshness guards for all five cross-system signals.
 *
 * Spec: HOTMESS-SoundOfTheNight-LOCKED.docx §9B / §9C / §10
 * Flag: v6_sound_of_the_night
 *
 * No writes. Pure read + derivation utilities.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/** Matches night_pulse_realtime materialized view */
export interface NightPulseData {
  city:               string;
  scans_24h:          number;
  beacons_active:     number;
  radio_active:       number;
  radio_intensity_max: number;
  live_count:         number;
  event_spike_count:  number;
  event_intensity_avg: number;
  drop_active:        boolean;
  heat_score:         number;   // 0–100 composite
  refreshed_at:       string;
}

/** Derived city phase (client-side) */
export type CityPhase =
  | 'QUIET'        // heat 0–20
  | 'WARMING'      // heat 21–45
  | 'RISING'       // heat 46–65
  | 'PEAK'         // heat 66–85
  | 'OVERDRIVE';   // heat 86–100

/** Sound of the Night signal categories */
export type SotnSignalType =
  | 'SAFETY'
  | 'MEET_TRIGGER'
  | 'EVENT_PRESENCE'
  | 'SHARED_LISTENING'
  | 'RADIO_ATMOSPHERE'
  | 'MARKET_DROP';

/** A renderable HomeMode / PulseMode signal */
export interface SotnSignal {
  type:     SotnSignalType;
  priority: number;          // 1 = highest (from spec §9C)
  copy:     string;
  subCopy?: string;
}

// ── City Phase ────────────────────────────────────────────────────────────────

/**
 * Derive city phase from heat_score.
 * heat_score is a 0-100 composite from night_pulse_realtime.
 */
export function derivePhase(heatScore: number): CityPhase {
  if (heatScore <= 20) return 'QUIET';
  if (heatScore <= 45) return 'WARMING';
  if (heatScore <= 65) return 'RISING';
  if (heatScore <= 85) return 'PEAK';
  return 'OVERDRIVE';
}

/** Human-readable phase label */
export const PHASE_LABEL: Record<CityPhase, string> = {
  QUIET:     'Quiet',
  WARMING:   'Warming up',
  RISING:    'Rising',
  PEAK:      'Peak',
  OVERDRIVE: 'On fire',
};

// ── Signal Priority (spec §9C) ────────────────────────────────────────────────

/** Priority order — lower number = higher priority */
export const SIGNAL_PRIORITY: Record<SotnSignalType, number> = {
  SAFETY:            1,
  MEET_TRIGGER:      2,
  EVENT_PRESENCE:    3,
  SHARED_LISTENING:  4,
  RADIO_ATMOSPHERE:  5,
  MARKET_DROP:       6,
};

/** Max visible signals in HomeMode signal line (spec §7) */
export const HOMEMODE_MAX_SIGNALS = 2;

/**
 * Sort and cap signals by priority for HomeMode signal line.
 * Returns at most HOMEMODE_MAX_SIGNALS items, highest priority first.
 */
export function rankSignals(signals: SotnSignal[]): SotnSignal[] {
  return [...signals]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, HOMEMODE_MAX_SIGNALS);
}

// ── Signal Freshness (spec §9B) ───────────────────────────────────────────────

/** Radio signal is fresh if its expires_at is in the future */
export function isRadioSignalFresh(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() > Date.now();
}

/** Beacon is fresh if active AND ends_at is in the future */
export function isBeaconFresh(active: boolean, endsAt: string): boolean {
  return active && new Date(endsAt).getTime() > Date.now();
}

/** right_now_status is fresh if expires_at is in the future */
export function isRightNowFresh(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() > Date.now();
}

/**
 * night_pulse_realtime heat is considered stale if refreshed_at is
 * more than 10 minutes ago. Stale → render SPARKLE fallback, not HEAT.
 * Spec §9B: "globe_heat_tiles window_end within last 10 minutes".
 */
export function isNightPulseFresh(refreshedAt: string): boolean {
  return Date.now() - new Date(refreshedAt).getTime() < 10 * 60 * 1000;
}

/**
 * Shared Listening Moment is fresh if:
 * - track started within last 10 minutes
 * - both users are online (checked by caller)
 */
export function isSharedListeningFresh(trackStartedAt: string): boolean {
  return Date.now() - new Date(trackStartedAt).getTime() < 10 * 60 * 1000;
}

// ── Density → Radio Amplification (spec §5) ──────────────────────────────────

/**
 * Compute radio signal intensity based on city live count.
 * Used by RadioContext.emitRadioSignal() before inserting into radio_signals.
 */
export function radioIntensityFromDensity(rightNowCount: number): number {
  if (rightNowCount > 50) return 1.5;
  if (rightNowCount > 20) return 1.2;
  return 1.0;
}

// ── HomeMode Signal Builders ──────────────────────────────────────────────────

export function buildRadioEventSignal(showTitle: string, venueName: string): SotnSignal {
  return {
    type:     'RADIO_ATMOSPHERE',
    priority: SIGNAL_PRIORITY.RADIO_ATMOSPHERE,
    copy:     `On air · playing tonight at ${venueName}`,
    subCopy:  showTitle,
  };
}

export function buildSharedListeningSignal(): SotnSignal {
  return {
    type:     'SHARED_LISTENING',
    priority: SIGNAL_PRIORITY.SHARED_LISTENING,
    copy:     'Someone nearby is listening to this too',
  };
}

export function buildDensityNudgeSignal(liveCount: number): SotnSignal {
  return {
    type:     'EVENT_PRESENCE',
    priority: SIGNAL_PRIORITY.EVENT_PRESENCE,
    copy:     `${liveCount} men live nearby right now`,
  };
}

export function buildDropSignal(): SotnSignal {
  return {
    type:     'MARKET_DROP',
    priority: SIGNAL_PRIORITY.MARKET_DROP,
    copy:     'Need lube?',
    subCopy:  'Drop live now',
  };
}
