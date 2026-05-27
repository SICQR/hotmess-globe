/**
 * Approximation engine — NOT AI, NOT routing.
 *
 * Straight-line haversine distance + road-network multiplier per travel
 * mode. All outputs are estimates. Never present as exact.
 *
 * Brief: Phil 2026-05-26 — Proximity Travel Cues v1 (final hybrid model).
 *
 * Cohort gating:
 *   - venueDefaultCue / venueTravelBreakdown — venue cards only. Show full
 *     three-mode breakdown on tap. Venues have fixed addresses; low privacy
 *     risk; map-style utility.
 *   - personDefaultCue / personTravelExpanded — person cards ONLY. Bucket
 *     labels only, never exact minutes. Walk only — never Lime / Uber.
 *     "location approximate" always displayed in expanded state.
 *
 * Freshness gate (isLocationFresh) MUST be checked before rendering any cue.
 * Stale = render nothing. Quiet state is valid.
 */

export type TravelMode = 'walk' | 'lime' | 'uber';

// Freshness threshold — tunable policy, not a magic number.
// 2 hours: longer than a typical session, short enough that the cue still
// maps to reality. Adjust via env / settings in future iterations.
export const LOCATION_FRESHNESS_MS = 2 * 60 * 60 * 1000;

// Speed model — straight-line km/h × road-network multiplier
// (multiplier > 1 because real routes are never straight lines).
const SPEEDS: Record<TravelMode, { kmh: number; multiplier: number }> = {
  walk: { kmh: 5, multiplier: 1.3 },
  lime: { kmh: 18, multiplier: 1.2 },
  uber: { kmh: 30, multiplier: 1.4 },
};

// Uber-specific pickup wait — average for dense urban context.
const UBER_PICKUP_MIN = 3;

/** Haversine straight-line distance in metres. */
export function distanceMetres(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLam = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateMins(distM: number, mode: TravelMode): number {
  const { kmh, multiplier } = SPEEDS[mode];
  const mins = ((distM * multiplier) / 1000 / kmh) * 60;
  return mode === 'uber' ? mins + UBER_PICKUP_MIN : mins;
}

function fmtMins(mins: number): string {
  const r = Math.max(1, Math.round(mins));
  return r >= 60 ? `~${Math.round(r / 60)}h` : `~${r} min`;
}

// ── VENUE CARDS ────────────────────────────────────────────────────────────

/** Single-line default cue for venue cards. */
export function venueDefaultCue(distM: number): string {
  return `${fmtMins(estimateMins(distM, 'walk'))} away`;
}

/** Expanded three-mode breakdown for venue cards (walk / lime / uber). */
export function venueTravelBreakdown(distM: number): Array<{
  mode: TravelMode;
  icon: string;
  label: string;
}> {
  return [
    { mode: 'walk', icon: '🚶', label: `${fmtMins(estimateMins(distM, 'walk'))} walk` },
    { mode: 'lime', icon: '🛵', label: `${fmtMins(estimateMins(distM, 'lime'))} on Lime` },
    { mode: 'uber', icon: '🚖', label: `${fmtMins(estimateMins(distM, 'uber'))} Uber` },
  ];
}

// ── PERSON CARDS ───────────────────────────────────────────────────────────

/** Bucketed person cue — NEVER exact minutes. Walk only. */
export function personDefaultCue(distM: number): string {
  const mins = estimateMins(distM, 'walk');
  if (mins < 5) return '< 5 min away';
  if (mins < 12) return '~10 min away';
  if (mins < 22) return '~20 min away';
  return '30+ min away';
}

/** Person expanded — walk only + always "location approximate". */
export function personTravelExpanded(distM: number): {
  icon: string;
  label: string;
  note: string;
} {
  return {
    icon: '🚶',
    label: personDefaultCue(distM).replace('away', 'walk'),
    note: 'location approximate',
  };
}

// ── FRESHNESS GATE ─────────────────────────────────────────────────────────

/** Use before rendering any cue. Stale = render nothing. */
export function isLocationFresh(updatedAt: string | number | null | undefined): boolean {
  if (!updatedAt) return false;
  const t = typeof updatedAt === 'number' ? updatedAt : new Date(updatedAt).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < LOCATION_FRESHNESS_MS;
}
