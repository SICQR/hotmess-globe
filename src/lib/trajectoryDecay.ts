/**
 * src/lib/trajectoryDecay.ts — Convergence Slice v1, PR 4.
 *
 * D22 §3 Trajectory memory layer — aggressive decay.
 * D34 §3 + §4.5 — context softens over time, then disappears.
 *
 * "Right here at Eagle" → "Crossed recently" → absent.
 *
 * Thresholds (per slice §5.4 acceptance test):
 *   - fresh  : less than 24h since createdAt → render verbatim
 *   - recent : less than 7d  since createdAt → render softened phrase
 *   - gone   : 7d or more   since createdAt → render nothing
 *
 * Why three states, not a continuous fade:
 *   - D22 §3.1 "Decay is architecture, not loss" — explicit thresholds make
 *     the contract reviewable. A continuous fade hides the rule.
 *   - Three states map onto Trajectory / Continuity / (out) tiers from
 *     D22 §3 three-tier architecture.
 *
 * What this function NEVER does:
 *   - Persist any time information back to a user-facing surface.
 *   - Read presence from any source other than the createdAt timestamp.
 *   - Compose with D08 visibility (that lives in the rendering component,
 *     not here — this helper is presence-blind).
 */

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

export type TrajectoryDecayState = 'fresh' | 'recent' | 'gone';

/**
 * Returns the decay state for a given creation timestamp.
 *
 * Inputs:
 *   - createdAt: Date | string (ISO) | number (epoch ms) | null | undefined
 *
 * When the timestamp is missing, returns 'fresh' — the caller is expected
 * to render verbatim. The absent-timestamp case is treated as "no decay
 * information available yet" rather than "long ago." This matches the
 * static mock data used in earlier PRs.
 *
 * The function is pure and safe to call inside React render (no I/O).
 */
export function getTrajectoryDecayState(
  createdAt: Date | string | number | null | undefined,
  now: Date = new Date(),
): TrajectoryDecayState {
  if (createdAt == null) return 'fresh';

  let then: number;
  if (createdAt instanceof Date) {
    then = createdAt.getTime();
  } else if (typeof createdAt === 'number') {
    then = createdAt;
  } else {
    const parsed = Date.parse(createdAt);
    if (Number.isNaN(parsed)) return 'fresh';
    then = parsed;
  }

  const ageMs = now.getTime() - then;

  if (ageMs < ONE_DAY_MS) return 'fresh';
  if (ageMs < 7 * ONE_DAY_MS) return 'recent';
  return 'gone';
}

/**
 * Returns the softened phrase to render in the 'recent' state. D34 §3 +
 * §4.5 — the system remembers the crossing, but the specifics fade.
 *
 * The softening is universal across venues — we deliberately do not retain
 * the venueLabel into the recent-state render, because that would imply
 * the system still knows where the trajectory lived. D22 §4 atmospheric
 * memory is allowed to remember "Vauxhall was alive last weekend" in
 * aggregate, but individual trajectory must blur.
 */
export function getSoftenedTrajectoryLine(): string {
  return 'Crossed recently';
}
