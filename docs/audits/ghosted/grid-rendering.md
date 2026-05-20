# Ghosted audit — Grid rendering

**Status:** working
**Last verified in production:** 2026-05-20 — code review (`GhostedMode.tsx`, `GhostedCard.tsx`, `useGhostedGrid.ts`).
**Evidence:** Single `GhostedCard` component renders every card (no per-profile branching — confirmed by grep; "Alex card" and all others use the same memo'd component). Three data modes: nearby (RPC `get_nearby_ghosted`), live (`right_now_status` + movement presence), recent (`profiles` by `last_seen`).

## Behaviour
- Cards: photo or obscured silhouette fallback (never initials), online dot (6px desaturated), intent ring (top stripe), mutual/boo Ghost glyph, verified tick, merged distance+context line.
- Sort: online first, then ascending distance.
- Loading: skeleton states via `PageLoadingSkeleton type="profiles"`.
- Empty: grid handles zero-result without crash.

## Never Silent compliance: **Y**
- Loading state: skeleton (explicit).
- Error: `useGhostedGrid` surfaces `error` per active tab; mode components show it.
- Empty: honest empty grid (not a spinner-forever).
- Per-card image load uses `loading="lazy"` with a silhouette fallback so a failed image is never a blank box.

## Note
Minor polish from the card audit (Task #60): tap debounce on `onTap`, `aria-label` should announce mutual/boo state, intent stripe is 2px vs the 0.5px spec. Cosmetic — not launch-blocking.
