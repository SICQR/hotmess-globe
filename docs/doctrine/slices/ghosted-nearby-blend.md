# Slice — Ghosted nearby sparse-blend

**Status:** Scoped, not built.
**Origin:** Task #412.
**Trigger:** Phil 2026-05-31. PR #720 stopped the PTR-induced grid collapse. The deeper UX issue remains: when `nearby` returns only 1 user (TELEGRAM TEST), Ghosted reads as broken. Phil's words: "it shows many people on the grid, yes once the refrsh happens it only refreshes back to one person."

## Problem

`useGhostedGrid` flips between three modes:

- `recent` — `get_ghosted_recent_for_viewer` RPC, recency-filtered, many users.
- `nearby` — `get_nearby_ghosted` RPC, location-filtered to a radius, can be sparse.
- `live` — currently-online subset.

The active mode is chosen in `GhostedMode.tsx`:

```ts
const tab = position?.lat != null && position?.lng != null ? 'nearby' : 'recent';
```

So the instant GPS resolves, the tab flips to `nearby`. If the user is geographically isolated (Phil in Ko Samui with only 1 user in range), the grid collapses from "many" to "1". This reads as a regression — the same field that felt inhabited a second ago is now empty.

## Goal

The field always feels inhabited. A user looking at Ghosted should never see a grid with fewer than ~12 cards (enough to fill the 4-row visible viewport) when there is data available in the system.

## Acceptance criteria

1. **Geographic priority preserved.** When ≥ N nearby users exist, only nearby is shown — no leakage of distant users into the local view.
2. **Sparse fallback.** When `nearby` returns < N cards, the remaining slots are filled by `recent` users, sorted: nearby users first (with `isNearby: true` flag), then recent users (with `isNearby: false`).
3. **No visible churn.** The grid does NOT flicker from "many recent" → "1 nearby" → "many blended" during GPS resolution. Either show recent throughout the GPS-pending window, or show a skeleton.
4. **Doctrine alignment.** Distance signals stay accurate. A blended card from `recent` doesn't render a fake "0.4 km away" — it shows whatever distance signal `recent` carries (typically null).
5. **Respect visibility state.** Off-grid users from the visibility snapshot (D08) stay off the grid in both modes — the blend doesn't bypass `get_renderable_beacons_for_viewer`.

## Design

### RPC layer
- Either add a new RPC `get_ghosted_blended_for_viewer(p_lng, p_lat, p_min_count)` that internally calls nearby + recent and merges, OR keep two RPCs and blend client-side.
- Recommendation: **client-side blend** for v1. Faster to ship, easier to tune the `N` threshold without a migration. Move to server-side if perf matters at scale.

### Hook layer (`useGhostedGrid`)
- Add a `'blended'` mode (or fold into `nearby` as a behavior).
- When `position` present, fire BOTH `nearby` and `recent` queries in parallel.
- Compose `cards` as:
  ```ts
  const MIN_INHABITED = 12;
  const nearby = nearbyQuery.data ?? [];
  const recent = recentQuery.data ?? [];
  const cards = nearby.length >= MIN_INHABITED
    ? nearby
    : [
        ...nearby,
        ...recent.filter(r => !nearby.some(n => n.id === r.id)).slice(0, MIN_INHABITED - nearby.length),
      ];
  ```
- Expose `isNearby` on each card so the UI can ring nearby cards subtly different (optional, deferred to feel-pass).

### UI layer (`GhostedMode.tsx`)
- No visible mode-chip toggle (Phil 2026-05-26 removed the pointless Nearby toggle).
- The blend is invisible to the user. They just see a populated grid.
- Empty state (`cards.length === 0`) stays — but only when BOTH queries return empty.

### GPS resolution window
- Currently `tab` flips when `position` resolves. With the blend, even when nearby is empty the recent fallback fills the grid, so the flicker is eliminated.
- Loading state: show skeleton until at least one of the two queries resolves.

## Doctrine fit

- D08 visibility state — blend respects `get_renderable_beacons_for_viewer` filters. Off-grid stays off-grid.
- D11 arrival-state — first-time users get the populated field, not a "you're alone" cold start.
- D15 care language — empty state copy stays compassionate ("Field quiet · pull to refresh"), not "no one near you".

## Tuning knobs

| Knob | Default | Notes |
|---|---|---|
| `MIN_INHABITED` | 12 | Below this, blend with recent. Set to fill the visible viewport on a 3-col grid. |
| Nearby radius | RPC default | Don't change in this slice — server-side concern. |
| Recent window | RPC default | Don't change. |

## Out of scope

- Server-side merge RPC.
- Distance-aware sorting of recent users (too expensive without lat/lng on every recent user).
- Visual differentiation between nearby and recent cards.

## Risk

- Recent + nearby firing in parallel doubles the load on the Supabase read replicas. Mitigation: TanStack Query staletime + refetchInterval already cache; not worse than 2x current load.
- Edge case: a user blocked nearby but allowed recent. Blend de-dupes by id; blocked users are filtered server-side in both RPCs already.

## Implementation order

1. Add second query in `useGhostedGrid` (recent always-on when position present).
2. Client-side blend with `MIN_INHABITED = 12`.
3. Empty-state condition updated.
4. Loading state hardened.
5. Smoke test on production: Phil in Ko Samui sees ~12 cards instead of 1.
