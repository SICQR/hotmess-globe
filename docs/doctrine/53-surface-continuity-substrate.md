# D53 — Surface Continuity Substrate Doctrine

**Status:** DRAFTED 2026-06-02 — awaiting Phil ratification
**Path on ship:** `docs/doctrine/53-surface-continuity-substrate.md`
**Inherits from:** D17 (Surface Layer), D-EXECUTION (slice format), CLAUDE.md ("no dead ends" UX rule)
**Triggered by:** Phil 2026-06-02 — *"you are still thinking too small a scope of dead ends"* + the live PHOTOS no-op crash on production bundle CI2I0c_K.
**Forecloses:** every previously-silent sheet→sheet dead end, every "close-then-defer 300ms" workaround, every future doctrine that needs runtime enforcement instead of PDF status.

---

## §0 Why this exists

For thirteen sessions HOTMESS has played whack-a-mole. MESSAGE void. PHOTOS no-op. ALBUMS no-op. CREATE-PERSONA no-op. MEMBERSHIP no-op. Sheet won't dismiss. Bell over sheet drag. Each one shipped as a one-line patch. Each one regenerated in a new surface within days.

The pattern is not "many unrelated bugs." The pattern is a substrate that does not architecturally prevent dead ends. The substrate has been **inherited** rather than **owned** — half-finished URL↔state contracts, multiple sheet implementations forking in parallel, no compliance harness for the 50+ doctrines, no continuity contract for primary actions.

The cost of this missing substrate compounds: every dead end Phil hits is more emotional debt before the city-scale promise of HOTMESS can land. The brand pitches a nightlife operating system. The product currently delivers surfaces that fail silently. **The gap is the experience.**

This doctrine names the substrate, the contracts it owes, and the compliance harness that enforces them. Every future surface inherits from it. Every doctrine written after this one declares its own enforcement hook.

---

## §1 The substrate contract — LOCK

The platform substrate owes every surface five guarantees. Violations are doctrine breaches, not bugs.

| # | Guarantee | What it forbids |
| --- | --- | --- |
| 1 | **No silent affordance** — every clickable element must either complete its action, present an explicit error, or be visibly disabled | Buttons that fire `onClick` but produce no observable change |
| 2 | **Atomic state↔URL transitions** — primary navigation primitives (openSheet, closeSheet, navigate) update state and URL together, not via racing effects | Effect-based URL sync that can lose to itself across renders |
| 3 | **Continuity contract** — every primary action must declare its next coherent surface; the substrate refuses to render an action with no destination | `onClick` handlers wired to dead routes / missing components |
| 4 | **Single primitive per concern** — one sheet system, one auth surface, one push pipeline, one profile-edit entry, one beacon-drop modal | Drift between L2SheetContainer and other sheet forks, twin mapboxLayerStacks, multiple subscribe paths |
| 5 | **Doctrine compliance is runtime, not PDF** — every doctrine ships with a programmatic check that gates merges, not a markdown file alone | Doctrines written into `/docs/doctrine/` with no enforcement hook |

A surface that violates any of the five is a **substrate failure**, not a feature defect. Substrate failures get fixed in the substrate, not in the surface.

---

## §2 The race class — §1.2 in detail — LOCK

The PHOTOS no-op that triggered this doctrine is the canonical example. The substrate has two effects that race over the same primitive (the URL `sheet` param):

- **Effect 1** (state → URL): activeSheet changes → setSearchParams writes new sheet to URL
- **Effect 2** (URL → state): searchParams changes → openSheet/closeSheet dispatched to match URL

When state and URL agree, the contract holds. When they disagree mid-transition — and they always disagree mid-transition because React batches setSearchParams asynchronously — whichever effect runs first wins, and the loser's closure sees stale values from the previous render. The fix shipped for `closeSheet` (#566, justClosedRef) handled close. The same fix was never applied to `openSheet`. So every sheet→sheet transition silently regressed.

This race class is named the **state↔URL echo race**. It is forbidden by §1.2.

The substrate-level fix: any primitive that updates URL+state together must (a) flip a guard ref before dispatch, (b) update the URL synchronously via `history.pushState`/`history.replaceState`, (c) check the guard at the top of the reverse-direction effect to ignore exactly one self-echo. This is the pattern. It is binding for every future primitive that touches both URL and state.

---

## §3 The continuity contract — §1.3 in detail — LOCK

A primary action without a declared next surface is a doctrine breach. Examples this doctrine forbids:

- Buttons whose `onClick` opens a sheet whose component is missing
- Buttons whose `onClick` calls a hook that may silently bail without user feedback
- Sheets whose primary CTA opens a route that does not render

The runtime check (§5) walks every primary action surface, calls its handler in a test harness, and asserts that within 800ms the URL, the visible sheet, or an explicit error toast has changed. Any surface that fails this check fails CI.

---

## §4 The single-primitive rule — §1.4 in detail — LOCK

When two implementations of the same concern exist, exactly one is canonical. The other is deprecated, scheduled for deletion, and CI fails if it accumulates new imports. Examples currently in violation:

- Multiple sheet containers (L2SheetContainer drift) — already partially resolved by #169, but the underlying pattern keeps recurring
- Multiple subscribe paths (#525, #548, #821) — three code paths to write to `push_subscriptions`
- Multiple profile-edit entry points (#462 partially resolved)
- Twin mapboxLayerStacks (#314, #315 resolved by deletion)

When a drift is detected, the substrate owes a deprecation slice. Patches to non-canonical implementations are doctrine breaches.

---


### §4.1 Story Rail Class Closure — D53 §4.1 amendment

The horizontal story row above the Ghosted grid (`GhostedRecentStories`) is one primitive carrying exactly three entity classes:

1. **HOTMESS RADIO** — the operator entity. Exactly one slot, anchored leftmost, permanently present, never dismissable, never reorderable, never hidden. State broadcast: when `isPlaying === true` the circle pulses gold; otherwise it sits quiet. Tap → `/radio`. The radio anchor is the room's tone-setter; it is in-world atmosphere, not a CTA.

2. **Care beacons** — the place entity. Maximum **3** at any time, newest-first by `beaconStartsAt`. Cream ring (never gold). Tap → `/pulse` flyTo the beacon coord with `focusBeaconId` pre-set. Capped because past 3 the row reads as a list of care services instead of "what care is nearby right now." 3 is also the number that fits visually before the user has to scroll past everything else to see the rest.

3. **Person stories** — the user entity. Recent chat partners and/or owners of active beacons. Gold ring. Tap → `/profile/:userId` (optionally `?beacon=:id` if surfaced via beacon).

No other entity class may appear in the row. This includes — non-exhaustively — Pulse status indicators, Drop A Beacon CTAs, marketplace promos, founding partner cards, BOO inbox digest, atmospheric mood pills, event-tonight badges, partner takeovers, sponsored content of any kind, or future operator entities not specifically ratified here.

Rationale: the rail is bounded attention. Every additional class halves the legibility of the existing ones, and the threshold past which the row stops reading as "what's alive right now" and starts reading as "another navigation surface" is well below where engineering-driven feature density wants to push it. The closure rule exists to refuse drift before it accumulates.

Adding a fourth class requires a new D53 amendment or a successor doctrine. PRs that introduce a non-permitted entity into the row are doctrine breaches even when the entity is "clearly useful" — the test is structural, not subjective.

Ordering invariant (visual + logical): `[ RADIO_ANCHOR ] → [ careCircles.slice(0, 3) ] → [ peopleRows ]`. The radio anchor MUST be the first child of the scroll container; the care strip MUST precede person stories; person stories fill the rest.

Ratified Phil 2026-06-03 alongside `RadioRailAnchor` implementation in `GhostedRecentStories`.

---

## §5 The compliance harness — §1.5 in detail — LOCK

Every doctrine in HOTMESS now declares a **runtime hook** alongside its prose. The hook is a programmatic check that runs in CI on every PR and on a nightly schedule against production.

Required hooks for the existing doctrine corpus include but are not limited to:

- **D17** — surface registry walker: every screen, every action, every primary CTA → assert next surface declared and reachable
- **D35** — language voice linter: every text surface scanned for forbidden phrases, tier-specific tone violations
- **D44** — privacy invariant scanner: every API response sample checked for cross-account leakage
- **D48** — exposure scanner: every map surface checked for spatial identity leakage against the §3.1 matrix
- **D50/D51** — globe rendering acceptance: every Z-tier renders correctly under the acceptance matrix
- **D52** — trajectory continuity test: every trajectory feature covers the §2 nine failure modes

A doctrine without a runtime hook is a **doctrine draft**, not a ratified doctrine. Drafts cannot be cited as compliance.

---

## §6 The surface audit substrate — Slice 0 — LOCK

This doctrine ships with **Slice 0 — Surface Audit Harness**, the first runtime hook. Slice 0 builds:

- `tools/surface-audit/registry.ts` — declarative registry of every screen, sheet, and primary action in the app
- `tools/surface-audit/walker.ts` — headless harness that signs in as the E2E user, walks every registered action, asserts continuity per §1.1 and §1.3
- `tools/surface-audit/report.ts` — produces a markdown report of violations with screenshots
- `.github/workflows/surface-audit.yml` — runs on every PR + nightly against production

Slice 0 catches its first surface — the PHOTOS no-op — as proof of harness behavior. Slice 0 ships before any further surface fixes.

---

## §7 What this doctrine forbids — until amended

- Patching individual sheet→sheet transitions with close-then-defer hacks; the substrate fix (§2) is the canonical pattern
- Writing a new doctrine without a runtime hook proposal in §5 format
- Shipping a primary action whose next surface is not declared
- Forking a new sheet container, subscribe path, or profile-edit entry without an explicit deprecation slice for the existing fork
- Reactive "patches" to surfaces whose substrate is the actual failure

---

## §8 Doctrine priority placement

D53 sits in the **substrate tier** of the doctrine ladder (alongside D-EXECUTION, D17, D34, D44, D48, D49). When a substrate doctrine conflicts with a surface doctrine, the substrate wins. When a substrate doctrine conflicts with a fix request from Phil, the substrate fix wins — because the surface fix has been done before and regenerated, and Phil's actual ask (per his 2026-06-02 framing) is the substrate.

Per CLAUDE.md's doctrine priority order: safety → legal → doctrine → infra stability → operational simplicity → emotional realism → conversion → polish → novelty. D53 lives at **infra stability** and is therefore above every conversion or polish concern. Surface patches that block substrate fixes are doctrine breaches.

---

## §9 Inheritance

Every doctrine ratified after D53 must include:

1. A §0-style framing
2. A `§X — Substrate hook` section declaring the runtime check that will enforce it
3. An estimated slice for the hook implementation, sized small enough to ship in one PR

Doctrines pending hooks: D11, D14, D15, D16, D17, D18, D20, D22, D34, D35, D43, D44, D48, D49, D50, D51, D52. Slice 0 builds the harness; subsequent slices wire hooks for each.

---

## §10 Ratification trail

- 2026-06-02 — Phil flagged the substrate gap during PHOTOS crash diagnostic: *"you are still thinking to small a scope of dead ends"* and *"the dead end isn't the broken button. the dead end is the absence of a substrate that makes dead ends architecturally impossible"* (Claude's restatement, Phil's authorization).
- 2026-06-02 — Live diagnostic confirmed the state↔URL echo race on PHOTOS button; root cause matches the substrate failure class named in §2.
- D53 drafted same session. Slice 0 (Surface Audit Harness) drafted alongside.

---

*End of D53.*
