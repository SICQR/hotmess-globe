/**
 * signalStrength — map raw distance metres to a sensed-not-measured label.
 *
 * Doctrine (Phil 2026-05-26): the Ghosted grid is a proximity radar, not a
 * spreadsheet. Raw distance labels like "<200m · Very close" read as debug
 * copy. Replace with signal-strength language.
 *
 * Consent-gating preserved (sacred invariant: never reveal sub-200m proximity
 * to a stranger). Mutual = full granularity; non-mutual = coarsened bands
 * that still feel atmospheric.
 *
 * Mutual bands:
 *   0–100m   → LOCKED
 *   100–300m → STRONG SIGNAL
 *   300–800m → PINGING
 *   800m–3km → FAINT SIGNAL
 *   >3km     → LAST SEEN IN THE FOG
 *
 * Non-mutual (stranger) bands:
 *   <200m    → STRONG SIGNAL  (never "LOCKED" to a stranger)
 *   <1km     → PINGING
 *   <5km     → FAINT SIGNAL
 *   else     → LAST SEEN IN THE FOG
 */

export type SignalTier = 'locked' | 'strong' | 'pinging' | 'faint' | 'fog';

export interface SignalStrength {
  label: string;
  tier: SignalTier;
}

const LABEL: Record<SignalTier, string> = {
  locked: 'LOCKED',
  strong: 'STRONG SIGNAL',
  pinging: 'PINGING',
  faint: 'FAINT SIGNAL',
  fog: 'LAST SEEN IN THE FOG',
};

export function signalStrengthFromMeters(
  m: number | null | undefined,
  opts?: { isMutual?: boolean },
): SignalStrength {
  if (m == null || !Number.isFinite(m)) {
    return { label: LABEL.fog, tier: 'fog' };
  }
  const isMutual = !!opts?.isMutual;
  if (isMutual) {
    if (m < 100) return { label: LABEL.locked, tier: 'locked' };
    if (m < 300) return { label: LABEL.strong, tier: 'strong' };
    if (m < 800) return { label: LABEL.pinging, tier: 'pinging' };
    if (m < 3000) return { label: LABEL.faint, tier: 'faint' };
    return { label: LABEL.fog, tier: 'fog' };
  }
  // Non-mutual: never LOCKED (consent invariant). Coarsen.
  if (m < 200) return { label: LABEL.strong, tier: 'strong' };
  if (m < 1000) return { label: LABEL.pinging, tier: 'pinging' };
  if (m < 5000) return { label: LABEL.faint, tier: 'faint' };
  return { label: LABEL.fog, tier: 'fog' };
}

export default signalStrengthFromMeters;
