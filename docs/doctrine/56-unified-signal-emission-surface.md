# D56 — Unified Signal Emission Surface

**Ratified:** Phil Gizzie, Samui, 2026-06-03
**Status:** Canonical, locked
**Supersedes:** the implicit "two drop sheets" architecture (L2BeaconSheet's BeaconCreator + BeaconDropModal)

---

## §1 Doctrine

Every beacon-creation surface routes through one canonical component:
`<UnifiedSignalEmissionSheet>`. Same field set, same hierarchy, same sticky
CTA, same emotional meaning.

> **The intent IS the signal.**

A beacon is **presence emission**, not event publishing. The drop flow must
feel like *"choose your mood → tap once → city reacts"* — not *"configure
your beacon → complete metadata → publish your object."*

---

## §2 Field doctrine

The unified sheet renders exactly the following, in this order:

| # | Field | Status | Default |
| --- | --- | --- | --- |
| 1 | Atmospheric explainer (1 line max) | static | "Choose your mood. Tap once. The city reacts." |
| 2 | Intent grid (primary — above the fold) | required | none |
| 3 | Title | optional | intent label |
| 4 | Duration chips | required | Tonight (4hr) |
| 5 | Location | required | GPS-first, single tap |
| 6 | Sticky CTA "Go Live" | always visible | disabled until intent + coords |

### Removed per doctrine (creator-economy primitives)

- ❌ **Description** — the intent + title + map communicate enough
- ❌ **Address / venue text field** — derive from GPS + reverse geocoding when needed
- ❌ **Visibility selector** — public by default; later if friend-circles ship, they become a separate boost not a drop-time choice
- ❌ **Intensity slider** — abstraction leakage; derive atmospheric weighting behaviorally, never expose to user

### Duration set (locked)

- **Tonight** (4 hours, default)
- **2 Hours**
- **Until Morning** (until 6am next day, or 6am today if currently after midnight)

`Custom` is parked. Add only if observation proves demand.

---

## §3 CTA language

- **Externally rendered:** `Go Live`
- **Internally documented:** signal emission

`Go Live` is the user-facing label everywhere. `Drop Signal` and `Drop a Beacon`
are deprecated in user surfaces (still acceptable in code comments and
doctrine docs).

---

## §4 Layout hierarchy (non-negotiable)

The sticky CTA must remain visible regardless of scroll position. Nightlife
mobile UX requires thumb-access permanence. Burying the action below
scrollable fields (the bug Phil hit 2026-06-03) is a doctrine violation.

```
┌─────────────────────────────┐
│ atmospheric explainer       │
│ ─────────────────────────── │
│ intent grid (PRIMARY)       │
│ ─────────────────────────── │ (scrollable)
│ title (optional)            │
│ duration chips              │
│ location                    │
│                             │
├─────────────────────────────┤
│ [    Go Live    ] ← sticky  │
└─────────────────────────────┘
```

---

## §5 Post-drop continuity (inherits D13/D14/D17)

On successful save, the sheet calls `onSuccess({lat, lng})`. The parent surface:
1. Closes the sheet
2. Dispatches `pulse:flyto` with the saved coords at zoom 14
3. Navigates to `/pulse` (no-op if already there)

The user lands on Pulse with their beacon centered, atmospheric
confirmation, presence registered in the world.

---

## §6 Surface inheritance

Every current and future signal-emission entry uses `<UnifiedSignalEmissionSheet>`:

- ✅ **Pulse FAB** (gold pin, right rail) — invokes `openSheet('beacon')`
- ✅ **Ghosted YOU anchor** — invokes `openSheet('beacon')`
- ✅ **Home Drop Hero** — invokes `openSheet('beacon')`
- Future: trajectory signals, care emit, venue activation, movement state
  → all inherit the same primitive

`<L2BeaconSheet>` retains its `<BeaconViewer>` branch (read side, unchanged).
Its creator branch is delegated to `<UnifiedSignalEmissionSheet>` via the
router. The legacy `BeaconCreator` function and `BeaconDropModal` component
are deprecated and scheduled for deletion after one stable release.

---

## §7 What this lock prevents

Without this doctrine, six months from now:
- Pulse beacons would have one field set
- Ghosted beacons another
- Venue beacons a third
- Event beacons a fourth
- Care beacons a fifth

Each with slightly different rules, fields, emotional weight. That is
architectural rot. This doctrine names the primitive and locks it.

---

## §8 Schema constraints (already enforced by #889 + #891)

The insert payload must:
- Use `geo_lat` / `geo_lng` (latitude/longitude are generated columns)
- Never pass null title (default to intent label)
- Hard-code visibility=public and intensity=3 (UI doesn't expose them)
- Stamp `metadata.ui = 'unified_v1'` so observation can confirm migration

---

## §9 Cross-references

- D13 — Spatial Continuity
- D14 — Routing as Continuity
- D17 — Surface Layer Doctrine (this doctrine is its §4 lock for creator surfaces)
- D35 — Language Operating System (CTA label)
- D49 — Entity Ontology (signal vs venue distinction)
- D53 §4.1 v2 — Personal Beacon Anchor (the Ghosted-side entry)

---

## §10 Slice ladder

- **Slice 1 (this PR):** ship `<UnifiedSignalEmissionSheet>`, wire L2BeaconSheet creator + Pulse FAB to it
- **Slice 2:** delete legacy `BeaconCreator` function from L2BeaconSheet + delete `BeaconDropModal.jsx`
- **Slice 3:** observation read — confirm `metadata.ui = 'unified_v1'` on all new beacons; flag any legacy drops
- **Slice 4 (later, if signal arrives):** Custom duration picker, friend-circle visibility chip
