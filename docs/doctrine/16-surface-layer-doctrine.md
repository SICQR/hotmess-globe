# D16 — Surface Layer Doctrine

**Status:** Locked 2026-05-30 by Phil Gizzie.
**Owner:** Phil.
**Cross-references:** D08 (Visibility), D11 (Profile Identity), D13 (Spatial Continuity), D14 (Routing Continuity), D266 (Inbox Ontology).

---

## §0 Why this exists

Every recurring "buttons overlapping", "FAB on top of someone's face",
"sheet drag fires Safari refresh", "two SOS surfaces showing at once" bug
is the same class of problem: there is no canonical, written rule for
which surface owns which slice of the screen, what z-index it sits on, and
what hides what.

Without this doctrine every new floating element becomes a guess against
ten existing ones. We patch the collision, ship, and a week later the
same collision happens in a different combination.

D16 ends that. It is the **single source of truth** for every floating,
sticky, fixed, or overlay surface in the HOTMESS app. The companion file
`src/lib/surfaceLayers.ts` mirrors this doctrine as enforceable code
constants. Components must import from it — never hardcode `z-[70]` in
JSX.

---

## §1 Layer registry (z-index)

Every floating surface in the app belongs to exactly one of these eight
layers. Z-index values are owned here, not invented per-component.

| Layer | z-index | What lives here |
|---|---|---|
| **MAP** | 0 | The Mapbox canvas itself. Never raised. |
| **MAP_OVERLAY** | 10 | Beacon markers, district editorial, weather/care cue, route line. Render *on* the map. |
| **PAGE_CHROME** | 30 | TopHUD search bar, right-rail control stack, Pulse "you're online" pill, bottom nav. Persistent app UI. |
| **PEEK** | 50 | Hover/long-press preview cards (beacon peek, cluster peek). Dismissed by tap-away or another peek. |
| **FAB** | 70 | Floating action buttons (Drop Beacon, SOS shield, Pulse feedback). Single primary action per surface. |
| **L2_SHEET** | 80 | Sliding L2 sheets (profile, inbox, beacon, event, shop, settings). Backdrop at z=79. |
| **TOAST** | 110 | Sonner toasts, tier upgrade flashes, ephemeral state messages. Never blocks interaction. |
| **INTERRUPT** | 200 | Age gate, SOS overlay, safety check-in modal, version update banner. Modal, blocks everything below. |

**Rule:** No `z-index` value above 200 is permitted anywhere in the codebase except inside an interrupt surface, and any new INTERRUPT must be registered here before it ships.

---

## §2 Placement zones (mobile-first, 390px reference)

The viewport is divided into **six placement zones**. Each zone has rules
about what can live there. New floating elements must declare their zone
and obey the rules.

```
┌──────────────────────────────────────┐
│ TOP-LEFT     │  TOP-CENTER  │ TOP-R │   ← safe-area-inset-top respected
│              │              │       │
├──────────────┴──────────────┴───────┤
│                                      │
│           CENTER (map / page)        │
│                                      │
├──────────────┬──────────────┬───────┤
│              │              │       │
│ BOT-LEFT     │  BOT-CENTER  │ BOT-R │   ← safe-area-inset-bottom respected
└──────────────────────────────────────┘
                   ↑ bottom nav (PAGE_CHROME, fixed 56px)
```

### Zone rules

- **TOP-LEFT** — brand mark, "you're online" pill. One element max.
- **TOP-CENTER** — search bar (single input). No other element.
- **TOP-RIGHT** — notification bell, user avatar, page-aware control rail (Bell, Layers, tier buttons, Me). Stacks vertically with `gap-2`. The rail never extends past 60% of viewport height.
- **CENTER** — page content. Beacon peek (PEEK layer) appears here. Toasts (TOAST layer) appear at top-center of this zone.
- **BOTTOM-LEFT** — reserved for in-app media controls (radio mini-bar) where present. Never two elements.
- **BOTTOM-RIGHT** — primary write-action FAB (Drop Beacon, SOS, Feedback). **Only one FAB at a time.** If two surfaces both want a bottom-right FAB, they must collapse into a single contextual action menu.
- **BOTTOM-CENTER** — the bottom nav (`Home / Pulse / Ghosted / Music / Shop / More`). Nothing else, ever.

---

## §3 Hide rules (who hides what)

This is the table that ends the overlapping-button bugs.

| When this is active... | ...these surfaces hide |
|---|---|
| Any L2 sheet (`activeSheet` truthy) | SafetyFAB, Drop Beacon FAB, Pulse feedback FAB, hover/long-press peeks |
| INTERRUPT modal open | Everything except PAGE_CHROME and the INTERRUPT itself |
| TOAST visible | Nothing hides; toasts never occupy interactive space |
| `/safety` route | SafetyFAB hides (the page IS the safety surface — one mental model) |
| `/care` route | SafetyFAB stays (care is parallel, not replacement) |
| Beacon drop modal | Drop Beacon FAB hides; SafetyFAB hides (this is an L2 sheet) |
| Pulse globe in motion (camera flying) | Hover peeks suppressed for 400ms after flyTo |

**Implementation requirement:** every component listed above must read its
hide state from a hook, not from a hardcoded route check. The hook is
`useSurfaceVisibility(component)` exported from `surfaceLayers.ts`. That
hook is the only place hide-logic exists. If a new hide condition is
added, the matrix in this doctrine is updated **first**, then the hook,
then the component.

---

## §4 Safe-area rules

Every fixed/floating surface in TOP zones uses `env(safe-area-inset-top, 0px)` in its offset calc. Every BOTTOM zone uses `env(safe-area-inset-bottom, 0px)`. No exceptions.

Standard offset formulae (from `surfaceLayers.ts`):

```
TOP_HUD_OFFSET     = calc(env(safe-area-inset-top, 0px) + 12px)
TOP_RAIL_OFFSET    = calc(env(safe-area-inset-top, 0px) + 88px)
BOTTOM_NAV_HEIGHT  = 56px
BOTTOM_FAB_OFFSET  = calc(env(safe-area-inset-bottom, 0px) + BOTTOM_NAV_HEIGHT + 24px)
```

Reason: iOS notches, dynamic islands, and home indicators change available area. Hardcoding pixel offsets breaks on every new phone.

---

## §5 Scroll & gesture rules

Three rules end the Safari pull-to-refresh leaking into sheets:

1. **`html { overscroll-behavior-y: contain }`** is set globally in `index.html`. Page-level pull-to-refresh uses our own `useLocalPullToRefresh` hook, never the browser's native PTR.

2. **Every L2 sheet root** sets `overscroll-behavior: contain` and `touch-action: pan-y`. The sheet's drag handle area gets `touch-action: none` — only the framer-motion drag controls own that gesture.

3. **No floating element below the PAGE_CHROME layer ever uses `position: fixed`** unless it explicitly cleans up on unmount and is registered here. (Phantom fixed elements left over after navigation are how PTR-style ghosts appear in screenshots.)

---

## §6 The new-floating-element gate

Before any PR adds a new floating, fixed, sticky, or overlay surface, the
PR description must answer **all five** questions:

1. **Which layer (§1)?** Pick exactly one: MAP_OVERLAY / PAGE_CHROME / PEEK / FAB / L2_SHEET / TOAST / INTERRUPT.
2. **Which placement zone (§2)?** Pick exactly one. If you need a new zone, update §2 in this doc first.
3. **What's already in that slot?** If anything, what hides what (update §3 table) — collisions must be resolved in the doctrine before the code lands.
4. **Safe-area offset?** Must use the constants in §4. No raw pixel offsets.
5. **Gesture model?** If your element receives touch, declare its `touch-action` and `overscroll-behavior` values against §5.

A PR that fails to answer all five will be reverted, regardless of how
clean the code looks. The doctrine is the gate.

---

## §7 Current floating-surface registry (as of D16 lock)

This is the audited list of every floating surface that exists today and
which zone/layer it sits in. New floating elements must extend this list
in the same PR that adds them.

| Surface | Layer | Zone | Hide rules |
|---|---|---|---|
| TopHUD search bar | PAGE_CHROME | TOP-CENTER | Always visible (except INTERRUPT) |
| Right rail (Bell, Layers, tier btns, Me) | PAGE_CHROME | TOP-RIGHT | Hidden when L2 sheet open |
| Bottom nav | PAGE_CHROME | BOTTOM-CENTER | Always visible (except INTERRUPT) |
| Brand mark | PAGE_CHROME | TOP-LEFT | Always visible (except INTERRUPT) |
| "You're online" pill | PAGE_CHROME | TOP-LEFT | Visible on `/pulse` only |
| SafetyFAB | FAB | BOTTOM-RIGHT (above bottom nav, NOT in BOTTOM-RIGHT collision with primary FAB — see hide rule) | Hidden on `/safety`, hidden when L2 sheet open |
| Drop Beacon FAB | FAB | TOP-RIGHT (last item of right rail with `mt-3` separator) | Hidden when L2 sheet open. **Was previously absolute-positioned BOTTOM-RIGHT and collided with SafetyFAB + rail; D16 moves it into the rail.** |
| Pulse feedback button | FAB | BOTTOM-RIGHT | Hidden on `/ghosted` (overlapped chat icon, see #256) and when L2 sheet open |
| Beacon peek panel | PEEK | CENTER | Dismissed by tap-away or new peek |
| Cluster peek panel | PEEK | CENTER | Dismissed by tap-away or new peek |
| Sonner toasts | TOAST | TOP-CENTER | Auto-dismiss; never blocks |
| Tier upgrade flash | TOAST | TOP-CENTER | Auto-dismiss; never blocks |
| L2 sheets (12 types) | L2_SHEET | Bottom slide-up | Drag-down, backdrop tap, ESC, route change |
| Age gate | INTERRUPT | Full overlay | Once-per-session, blocks everything |
| Version update banner | INTERRUPT | TOP-FULL | Until user taps Refresh |
| SOS overlay | INTERRUPT | Full overlay | Until user dismisses or fires |
| Check-in timer modal | INTERRUPT | Full overlay | Until user sets or cancels |

---

## §8 Companion code

`src/lib/surfaceLayers.ts` exports:

- `Z_INDEX` — the integer values from §1
- `OFFSET` — the safe-area calc strings from §4
- `useSurfaceVisibility(component)` — the hide-rules hook from §3

Every floating surface in the app imports from this file. PR review
verifies no new file hardcodes `z-[…]` or `bottom-[…]` outside of
`surfaceLayers.ts`.

---

## §9 What this doctrine does NOT cover

- Inside-sheet layout. Sheets own their internal layout; D16 governs the
  sheet *as a surface*, not its contents.
- Mapbox layer ordering. That belongs in the Pulse Doctrine appendix.
- Backend state (visibility, presence, off-grid). D08 owns that.
- Typography, colour, brand register. D15 + brand kit own those.

---

**Effective date:** 2026-05-30 on merge.
**Reviewed:** Phil Gizzie.
**Enforcement:** PR template gate (§6) added in the same merge.
