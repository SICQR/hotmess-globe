/**
 * recencyLabel — Shared time-of-last-presence vocabulary used by Ghosted
 * cards AND inbox cells so the room speaks one language.
 *
 * Phil 2026-06-03 Samui — Ghosted grid revival + inbox parity.
 *
 * Bands:
 *   < 15 min     → 'ACTIVE NOW'    (matches the online-dot threshold)
 *   < 6 hours    → 'EARLIER'
 *   < 24 hours   → 'TODAY'
 *   < 7 days     → 'THIS WEEK'
 *   older / null → null (caller renders nothing — silence beats a bad cue)
 *
 * Doctrine:
 *   D35 Language Operating System — caps for state words, no hype.
 *   D44 Privacy — bands are buckets, never exact timestamps.
 *   D17 No silent affordance — when this returns null the calling surface
 *     should fall through to another cue (distance, time-of-last-message)
 *     rather than render a placeholder.
 */

const FIFTEEN_MIN_MS = 15 * 60 * 1000;
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type RecencyBand = 'ACTIVE_NOW' | 'EARLIER' | 'TODAY' | 'THIS_WEEK' | null;

export interface RecencyLabel {
  band: RecencyBand;
  /** Display string for the UI ('ACTIVE NOW', 'EARLIER', etc.). null when band is null. */
  label: string | null;
  /** True when the recency is fresh enough to read as live (band === 'ACTIVE_NOW'). */
  isLive: boolean;
}

const EMPTY: RecencyLabel = { band: null, label: null, isLive: false };

export function recencyLabel(lastSeenISO: string | null | undefined): RecencyLabel {
  if (!lastSeenISO) return EMPTY;
  const t = new Date(lastSeenISO).getTime();
  if (!Number.isFinite(t)) return EMPTY;
  const age = Date.now() - t;
  if (age < FIFTEEN_MIN_MS) return { band: 'ACTIVE_NOW', label: 'ACTIVE NOW', isLive: true };
  if (age < SIX_HOURS_MS) return { band: 'EARLIER', label: 'EARLIER', isLive: false };
  if (age < ONE_DAY_MS) return { band: 'TODAY', label: 'TODAY', isLive: false };
  if (age < ONE_WEEK_MS) return { band: 'THIS_WEEK', label: 'THIS WEEK', isLive: false };
  return EMPTY;
}

/**
 * Returns true when `createdAtISO` is within the FRESH window.
 *
 * Phil 2026-06-03 — beta calibration: bumped default to 14d. The 7d
 * cutoff (PR #853) never fired against the current beta cohort because
 * almost all accounts predate it, so the FRESH pill was invisible. 14d
 * catches the actual onboarding wave so the pill surfaces somewhere on
 * the grid. Caller can override.
 */
const DEFAULT_FRESH_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export function isFreshProfile(
  createdAtISO: string | null | undefined,
  windowMs: number = DEFAULT_FRESH_WINDOW_MS,
): boolean {
  if (!createdAtISO) return false;
  const t = new Date(createdAtISO).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < windowMs;
}
