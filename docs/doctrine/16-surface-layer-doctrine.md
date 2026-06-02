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

---

## §10 Right Rail Hierarchy and Collapse Discipline

**Status:** Constitutional amendment to D16, locked
**Ratified:** Phil 2026-06-02
**Supersedes:** opportunistic rail-icon accumulation

### §10.0 Why this amendment exists

The right rail has been accumulating icons opportunistically — Safety FAB, music, radio, drop beacon, viewer toggles, contextual mode icons. Without a constitutional rule, every new icon was a per-page decision. This produced inconsistent placement (notification bell on some pages and not others), duplicated controls (search input in the Pulse top bar instead of a single surface), subjective collapse behaviour under viewport constraint, and rail clutter.

This amendment locks the rail as a single constitutional surface with one matrix that governs both placement and collapse priority. Capacity is not entitlement.

### §10.1 The 4-tier rail matrix (LOCK)

Every rail icon declares its tier exactly once. The tier determines placement (top-to-bottom from Emergency down) AND collapse priority (lower tiers collapse first under environmental pressure). Hierarchy and collapse are the same information seen from two angles, captured in one table to prevent drift.

| Tier | Name | Examples | Action when tapped | State broadcast at rest | Collapse rank |
| --- | --- | --- | --- | --- | --- |
| 1 | Emergency | Safety FAB, SOS | Open safety surface | Active-alert pulse | Never collapses |
| 2 | System | Bell, search-on-Pulse | Open system / global surface | Unread count, ambient state badge | Rarely collapses (extreme cases only) |
| 3 | Page-primary | Drop Beacon (Pulse), Inbox FAB (Ghosted) | Primary page action | Quota indicator, queue badge | Conditional collapse |
| 4 | Page-secondary | Music, Radio, Viewer toggles | Local tools | Now-playing dot, mode indicator | First to collapse |

### §10.2 The action-and-state contract (LOCK)

Every rail icon MUST answer both questions before it ships:

1. **What action does it perform when tapped?**
2. **What persistent state does it broadcast when at rest?**

An icon with no state to broadcast — no badge, no halo, no indicator, no rest-state meaning — does not belong in the rail. It belongs in a menu, a contextual surface, or a settings sub-page. The rail's power is glanceability plus state-at-rest. Pure-action icons without state are decoration; decoration lives outside the rail.

### §10.3 Capacity is not entitlement (LOCK)

The rail holds at most **5 visible icons including the Emergency FAB**. This is a maximum, not a target. The rail's strength comes from scarcity, not density.

If a sixth qualified icon is proposed, the answer is never "expand the rail." The answer is "which existing icon has degraded into low-traffic territory and should move to a contextual surface?" New icons displace; they do not spawn.

A rail with three well-chosen icons is stronger than a rail with five average ones. Capacity is not entitlement.

### §10.4 Collapse triggers (LOCK)

The rail collapses under named environmental conditions, not subjective judgement. Triggers are enforceable, machine-detectable, and constitutional.

| Condition | Detection | Collapse action |
| --- | --- | --- |
| Narrow viewport | `window.innerWidth < 360px` | Collapse Tier 4 into `…` overflow |
| Software keyboard open | `window.visualViewport.height < window.innerHeight * 0.75` | Collapse Tier 4 |
| Landscape mobile | `matchMedia('(orientation: landscape)').matches` AND viewport short-edge < 500px | Collapse Tier 3 + Tier 4 |
| Accessibility text scaling | text-size factor > 1.5x baseline | Collapse Tier 3 + Tier 4 |
| **Sheet open** | `useSheet().activeSheet` is non-null | **Collapse Tier 2 + Tier 3 + Tier 4 to invisibility.** Tier 1 (SafetyFAB) remains visible. |
| Multiple triggers simultaneous | Stack the most aggressive | Cumulative collapse |

**Tier 1 (Emergency) never collapses.** Tier 2 (System) collapses only as a last resort under multiple-simultaneous extreme triggers — **and when a sheet is open**, because a sheet is a focal user interaction and the rail is ambient. Ambient yields to focal. Tier 1 (SafetyFAB) does not yield because its coordinate space (bottom-right) does not collide with sheet drag affordances; safety access remains continuous through any focal flow.

**Why sheet-open is constitutional and not implementation detail:** the rail and the sheet are both substrate layers. Two substrate layers occupying the same coordinate space without a yield rule will always collide somewhere. Locking the rule in doctrine prevents the rail from drifting back into pip-collision territory when a new rail icon is added or a sheet's geometry changes.

**Collapse means "moved to `…` overflow," never "disappeared."** The overflow trigger itself is always visible whenever any tier is collapsed. Users always have a recovery affordance. An icon that cannot be reached at all is a regression; an icon that requires one tap to reach is collapsed.

### §10.5 The rail is constitutional substrate, not chrome

The right rail is part of the constitutional substrate of HOTMESS, not page decoration. Every primary action that needs persistence across surfaces lives here, and every action that lives here meets §10.2.

This locks future product behaviour: a new feature that proposes a floating action button or persistent control anywhere else must first answer *"why is this not in the rail?"* If the answer is "because the rail is full," see §10.3 — the rail does not expand; an existing tenant moves out.

### §10.6 Internal framing vs external framing

The rail being a constitutional substrate is **internal aspiration language**. Externally, HOTMESS is "an immersive platform," "a live city layer," "a nightlife substrate." HOTMESS is **not** publicly framed as an operating system. OS framing creates user expectations (OS-level persistence, OS-level cross-context memory, OS-level reliability) that the platform aspires to but does not yet fully meet. Frame becomes promise the moment users hear it. Internal direction, external honesty.

### §10.7 What this amendment forbids

Until a doctrine slice inherits from §10.1–§10.5, the following may not ship:

- Adding any rail icon that has not declared its tier and answered §10.2
- Expanding the rail's visible-icon count beyond 5 (including FAB)
- Floating action surfaces outside the rail that should be in the rail under §10.1
- Subjective collapse rules ("looks crowded," "feels cluttered") in place of §10.4 triggers
- Any icon that can become totally unreachable under collapse (no `…` overflow path)

### §10.8 Ratification trail

- 2026-06-02: §10 ratified. Triggered by Phil's proposal to relocate the notification bell to the rail and move the Pulse search from top-bar input to a rail icon opening an overlay. Surfaced the absence of constitutional rail rules. The §10 matrix, action-and-state contract, capacity rule, enforceable collapse triggers, and the substrate-vs-chrome framing all locked in one pass.
- §10.6 captures the OS-framing caution: internal aspiration only, external language uses "immersive platform" / "live city layer" / "nightlife substrate."

---

*End of §10 amendment.*
