# Doctrine 13 — Spatial Continuity

**Locked 2026-05-29 — Phil Gizzie.**
Status: load-bearing. Read before touching `/pulse`, any L2 sheet, or InAppDirections.

---

## The single rule

> The user's emotional thread through the city is never broken.

Every interaction inside HOTMESS preserves continuity. The globe is not a UI surface. It is a place. Sheets are not popups. They are layers in a continuous spatial experience. The user moves through preview → commit → route → movement → arrival without ever leaving the system, the mood, or the signal.

This is what turns a collection of screens into an operating system.

## Why this exists

Before:

- Tap beacon → UI pops → disappears → blank state → external app risk → lost atmosphere

After (#660 + #662 + #664 + #667):

- Tap beacon → preview → commit → route → movement → arrival

Same user, same gesture, same emotional state, the whole way through.

## The four primitives

Every spatial interaction is one of these four moves. If a feature can't be reduced to one of them, it's not spatial — it belongs on a flat page.

1. **Preview** — the user sees the signal before committing. Hover chip, long-press chip, cluster "N signals here" — all preview. Never blind tap, never random.
2. **Commit** — the user opens a sheet at peek (50dvh). Half the city remains visible behind the card. The signal becomes the thing they're reading, but the city is still there.
3. **Route** — the user routes through the city. In-app. Atmospheric. The route is a continuation of the read, not a new mode.
4. **Movement** — the user moves, the map breathes with them. Signal density updates, weather/time atmosphere shifts, care surfaces stay reachable.

A tap can collapse multiple primitives (tap a beacon → commit, no separate preview), but no primitive may be skipped if its absence would break continuity.

## Forbidden moves

The following are violations of the doctrine and must not ship:

- **Routes that leave the app.** No Google Maps deep link as the primary "Directions" target. The Mapbox URL is acceptable only as a share-with-friend payload.
- **Sheets that fully cover the city.** No 100dvh modal that hides the globe. The peek state — bottom 50dvh — is the canonical open state. Expand is opt-in via drag.
- **Hard route navigations between spatial pages.** `/pulse → /profile?beacon=…` is a violation (PR #662 retired this). Sheets only.
- **Flash-then-disappear transitions.** If a sheet replaces another sheet, the close transition must complete before the open transition starts (the 80ms defer in #667). Perceived continuity > raw transition speed.
- **Blind cluster taps.** Tapping a cluster must show a preview sheet listing the signals it contains. Auto-zoom-only is forbidden. Auto-zoom remains available as a secondary action inside the cluster sheet.
- **Action buttons below the fold at peek.** Primary action — Directions, Boo, Message, "I'm going" — must be visible in the bottom 50dvh of the sheet. Pinning them to the bottom of an expanded sheet via `mt-auto` is a violation (#667 retired this).
- **External-app ejections for any "where" question.** Maps, address lookup, transit, walking time — all in-app. If the user must ask "where is this," HOTMESS answers without an app switch.

## The InAppDirections constraint

InAppDirections is nightlife routing. It is not enterprise navigation.

- Clean
- Fast
- Atmospheric
- Contextual
- Emotionally lightweight

Forbidden in InAppDirections:

- Route options panels (fastest vs scenic vs avoid-tolls)
- ETA optimisation UI
- Turn-by-turn voice prompts
- Lane guidance, multi-stop planners, search-along-route
- Any pattern lifted from enterprise nav software

The user is asking "how do I get there." That is the only question InAppDirections answers.

## Spatial state continuity

When a sheet is open, the underlying map remains alive. It does not freeze, dim past atmosphere level, or pause its breathing. New beacons that arrive via realtime keep rendering behind the sheet. The user's read is continuous — looking at a beacon doesn't pause the city.

The peek state (#664) makes this structurally possible. The bottom 50dvh of the viewport shows the sheet. The top ~50dvh shows the globe. Both stay live.

## Cluster behaviour

Clusters are a special case of preview (#667). A cluster bubble is itself a low-resolution signal: "N signals here, strongest is X." Tapping a cluster opens a cluster preview sheet at peek showing the constituent signals. From the cluster sheet the user can:

- Tap any signal → opens that signal's L2 sheet (the cluster sheet closes cleanly first, 80ms defer)
- "Zoom closer" → camera scatters the cluster, sheet closes
- Drag-down to dismiss → cluster sheet closes, no commit

No cluster ever opens directly into a single beacon's sheet. The list step is mandatory because it answers the user's actual question: "what's all this?"

## Routing as signal (future, D14)

When in-app routing matures (D14), the route itself becomes a signal layer. Forecasts to overlay on routes:

- "3 members moving toward Vauxhall"
- "Signal density increasing ahead"
- "Quiet route available"
- "Aftercare nearby on route"
- "Route crosses active nightlife corridor"
- "Late-night transport warning"

Each is a thin atmospheric overlay on the route line — not a turn-by-turn directive, not a notification. The route stays the centre of attention; the signal layer adds context.

D14 is parked. Do not ship routing-as-signal before D14 is written.

## Cross-references

- `docs/doctrine/07-visual-hierarchy.md` — monetisation never overrides relational truth; spatial continuity is the underlying chassis the visual hierarchy rests on.
- `docs/doctrine/11-arrival-state-doctrine.md` — Pulse Doctrine. The globe should breathe. Probability + momentum, not occupancy. Spatial continuity is how breathing translates to gesture.
- `docs/doctrine/12-drop-beacon-doctrine.md` — Drop Beacon entity separation. The intent picker is itself a spatial gesture: signal-before-commit at the create step.
- `docs/doctrine/15-care-language-doctrine.md` — primitives carry the voice through the thread. Spatial continuity without voice continuity reads as broken — care language is part of how the user knows they haven't been ejected from the night.
- Sacred Invariant #6 — system never pretends activity. Continuity must not be faked. If the user crosses a true discontinuity (logout, hard error, deep-link cold-start) the system tells them honestly. False seamlessness is a violation.
- Sacred Invariant #7 — no exact tracking, ≤200m fuzz. Spatial continuity preserves the privacy snap throughout the route, the preview, and the commit.

## How to check yourself before merging a /pulse PR

1. Does the change preserve the four primitives (preview → commit → route → movement)?
2. Can the user complete the new flow without leaving the app?
3. Is the primary action visible at peek (50dvh)?
4. Does any sheet replace another sheet cleanly (close-then-defer-open)?
5. Does the globe stay alive behind the sheet?
6. Does anything route to an external app for a "where" question?

If any answer is wrong, the PR is not ready.

— end doctrine —
