# Ghosted audit — Distance privacy bands

**Status:** working
**Last verified in production:** 2026-05-20 — code review (`GhostedCard.tsx`) + unit test (`booFirstGate.test.ts`).
**Evidence:** `GhostedCard.tsx` distance label logic is mutual-aware. `useGhostedGrid.ts` rounds raw distance to nearest 10m before it ever reaches the card.

## Bands
- **Pre-mutual (stranger):** coarse only — `<200m` / `<1km` / `<5km` / `Xkm` (rounded). Sub-200m proximity is never revealed to a non-mutual.
- **Post-mutual:** exact — `<100m` / `{n}m` / `{n.n}km`.
- Regression-locked in `src/__tests__/booFirstGate.test.ts` (distance-bucket cases for both mutual states).

## Never Silent compliance: **Y**
- Distance is a derived display, not an action; there is no pending/failed state to surface. The privacy floor is deterministic and test-covered.

## Note
Distance only renders when both parties have GPS; otherwise the card shows the context label ("Nearby" / "At {venue}") with no distance — which is an honest absence, not a silent failure.
