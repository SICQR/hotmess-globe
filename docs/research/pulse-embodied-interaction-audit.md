# Pulse Globe — Embodied Interaction Audit

**Status:** Pre-doctrine research artifact · **Author of record:** Phil Gizzie (commissioned) · **Author of draft:** Claude (HOTMESS Cowork) · **Date:** 31 May 2026 · **Method:** code-as-truth, kinetic lens · **Sibling artifact:** [`pulse-behavioural-audit.md`](./pulse-behavioural-audit.md) (the ontology pass — what exists)

This audit asks a different question than the ontology audit. Ontology asks *what is*. This asks *what is felt while moving*.

## The meta-frame Phil named

> **Zoom is not camera scale. Zoom is commitment depth.**
>
> Every zoom step is the user saying *"I care more about this."* The system's job is to translate that increment of care into a proportional reveal — and to remove interaction work as care goes up. The failure mode is technically rich + emotionally correct + semantically governed + **physically annoying**. That kills everything.

That sentence is the spine of this artifact. Every section below tests whether the current code translates increments of care into proportional reveal and removed work. Where it does not, the audit names the kinetic friction.

The success criterion the audit is measuring against: *"the globe understands what I'm trying to do."* The failure criterion: *"I'm operating map software."*

## What changed between this audit and #763

#763 read the implementation through an ontological lens — categories, hierarchies, entity types, render contracts, doctrine inheritance. This audit reads the same implementation through a kinetic lens — gesture mechanics, timing constants, snapping rules, the seam between the camera layer and the chrome layer.

**Additional code read for this pass:**
- `src/pages/Globe.jsx` (742 lines) — the parent that owns the chrome above PulseMap
- `src/components/sheets/L2SheetContainer.jsx` (393 lines) — the gesture mechanics every sheet inherits

Key numeric constants traced from the source:

| Constant | Value | Where |
|---|---|---|
| PEEK fraction | 50% viewport | L2SheetContainer.jsx |
| EXPANDED fraction | 90% dvh | L2SheetContainer.jsx |
| Drag-up expand threshold | 80px | EXPAND_OFFSET |
| Drag-down dismiss threshold | 120px from peek | DISMISS_OFFSET |
| Velocity flick threshold | 500px/s | VELOCITY_FLICK |
| Expanded → dismiss velocity | 750px/s (1.5×) | derived |
| Long-press timer (mobile) | 350ms | PulseMap.jsx |
| Long-press cancel move | 100px (10px squared) | PulseMap.jsx |
| Hover popup dismiss after touchend | 600ms delay | PulseMap.jsx |
| flyTo duration | 1600ms (or 0 with reduced-motion) | PulseMap.jsx |
| Spring damping/stiffness (sheet) | 28 / 320 | L2SheetContainer.jsx |
| Backdrop fade in / out | 200ms / 150ms | sheetSystem.ts |
| Satellite raster fade | 300ms | mapboxLayerStack.js |
| Cluster max zoom | 13 (single-engine), 16 (legacy) | mapboxLayerStack.js |
| Icon min zoom | 11 | mapboxLayerStack.js |
| Icon overlap suppress | z ≥ 15 | mapboxLayerStack.js |
| Editorial-city focus min zoom | 10 | PulseMap.jsx |
| Editorial-city focus max distance | 1.5° (~150km) | PulseMap.jsx |
| Tier toast trigger | every `moveend` that crosses a boundary | Globe.jsx |

These numbers are the physical reality of the interaction. The audit reads them as a body would — *what is this asking of me right now?*

## §1 — Tap-chain map: how many taps until intent resolution?

The user arrives at `/pulse` with an unspoken intent. The system answers in N taps. Counted from the code paths, not estimated.

### Intent A — "see what's happening near me"

| Step | Tap count |
|---|---|
| Arrival at `/pulse` (camera opens centred on London at z=2.2 regardless of user GPS) | 0 |
| Tap the "Me" button (Crosshair icon, right-rail) → toggleLocal — flies to user GPS at LOCAL_ZOOM=14, duration 1600ms | 1 |
| Camera settles, sprite icons reveal at z≥11, lifecycle sprites + selectedHalo active | — |
| Result: viewable nearby signal | **1 tap** |

This is the fastest intent path and it is correctly minimal. The only friction is the 1600ms flight — for an *"I want to see what's around me NOW"* intent, sub-second arrival would be more honest. (The reduced-motion flag collapses this to 0ms, which is the correct behaviour for users who have asked for less motion, but it would also be correct for *intent-velocity* users who just want to land.)

### Intent B — "see what's happening in Soho specifically"

| Step | Tap count |
|---|---|
| Arrival at /pulse | 0 |
| Tap header search (TopHUD, drives the map via `window event` per Globe.jsx comment) | 1 |
| Type "Soho", select result | 2 |
| `flyTo` with returned coordinates + LOCAL_ZOOM, duration 1600ms | — |
| DistrictEditorialCard surfaces (one beat after moveend; Soho is in the London editorial focus radius) | — |
| Result: viewable Soho signal | **2 taps** |

Also minimal, also correct. The TopHUD search is the right surface. The friction is that the search lives in the header rather than on the globe itself — a user looking at the city already on screen has to lift attention to a separate strip.

### Intent C — "show me only events" (the layer filter)

| Step | Tap count |
|---|---|
| Arrival at /pulse | 0 |
| Tap Layers FAB | 1 |
| LayersSheet opens (its own 200ms backdrop fade + spring entry) | — |
| Tap Events row in the sheet | 2 |
| Close the LayersSheet (drag down, backdrop tap, or wait for auto-dismiss) | 3 |
| Camera unchanged; markers filter | — |
| Result: events-only globe | **3 taps + a sheet round-trip** |

Three taps for what is, ergonomically, a filter — and the user has to ENTER sheet-world (§6) just to filter what's on the globe behind them. This is the single most physically annoying flow the audit identified in this pass. The chrome is doing categorical filtering work the zoom layer should arguably be doing implicitly (§7).

### Intent D — "drop a beacon where I am right now"

| Step | Tap count |
|---|---|
| Tap Drop FAB | 1 |
| BeaconDropModal opens | — |
| Intent picker visible — tap "Looking" (or any of 7 intents) | 2 |
| Title field → type a title | 3 (plus typing) |
| Location resolution: GPS shortcut is one tap; otherwise type into Mapbox autocomplete | 4 (GPS) or N+ (autocomplete) |
| Submit | 5 |
| Result: beacon dropped, modal dismisses, globe re-renders | **5 taps minimum, more if typing-heavy** |

This is heavier than the other intents but it is correctly heavier — a beacon is a *commitment*, and a commitment that takes one tap is a commitment users will regret. The intent picker is doctrinally load-bearing (D12) and removing it would break the four-axis signal taxonomy. The audit names this flow as appropriate-weight, not friction-heavy.

### Intent E — "tap a specific beacon I can see, get to the person"

| Step | Tap count |
|---|---|
| Hover (desktop) / long-press 350ms (mobile) → chip surfaces with title + subtitle + countdown | 0 (preview, not commit) |
| Tap the beacon | 1 |
| Inline Mapbox popup label appears + sheet opens at peek (50%) | — |
| (If sheet is peek-only and entity is visible: done.) Otherwise drag up to expand | 2 |
| Result: profile / event / venue surface visible | **1–2 taps** |

This is the most-traversed path in the system and it is correctly minimal. The hover-preview-before-tap pattern is the single best embodied interaction the globe currently has. **However**: the inline popup label appears AT THE SAME TIME as the sheet opens. The user is reading the same title in three places at once — the hover chip just dismissed (or is dismissing), the popup label that just appeared, and the sheet header. The "double confirm at commit" is the F3 / §7 redundancy the ontology audit also flagged from a different angle.

### Intent F — "find someone tonight, decide whether to message"

| Step | Tap count |
|---|---|
| Tap nearby person beacon | 1 |
| Profile sheet opens at peek 92% (photo-led tier) | — |
| Decision point: Boo? Message? Block? | — |
| Tap Boo (if not yet mutual) — recoverable | 2 |
| (If counterparty has booed back → chat unlocks per D25; otherwise wait) | — |
| If mutual: tap Message → chat sheet opens (LIFO push onto profile sheet) | 3 |
| Result: chat composer | **2–3 taps** |

Correct. The boo-first gate (D25) is structural friction that protects the inbox; it should not be reduced. The 92% peek floor on profile means the photo is above the fold immediately, which removes the *"drag up to see the actual person"* friction the audit would otherwise name.

### Aggregate read

The fast paths (A, B, E, F) are well-tuned. The slow path (C — Layers filter) and the heavy path (D — Drop) are heavier for different reasons: D is appropriately heavy because commitment, C is inappropriately heavy because chrome. **The intent-resolution map is mostly correct, with one specific friction node — categorical filtering — that probably belongs in the zoom doctrine (§7), not in a separate filter sheet.**

---

## §2 — Hover → sheet: when does a hover become a sheet?

The current rule, traced from PulseMap.jsx:

- **Desktop mouseenter** on a beacon (or cluster) → hover chip appears
- **Desktop mouseleave** → chip dismisses
- **Mobile touchstart** + 350ms hold without 10px movement → chip appears
- **Mobile touchmove > 10px** during the 350ms → cancelled (read as pan)
- **Mobile touchend** → chip dismisses after 600ms delay
- **Any commit tap** (desktop click, mobile tap-release before 350ms) → sheet opens via parent handler

The chip never becomes a sheet automatically. The transition is always user-initiated. This is the correct invariant — preview must not auto-promote to commit. The audit names this positively.

**Where this gets physically annoying:**

- The 350ms long-press window on mobile is the single most felt timing constant. It is too long for a user who is decisively reaching toward a pin (the 350ms feels like delay before reward) and too short for a user reading the map (they accidentally trigger the chip while panning).
- The 600ms dismissal delay on touchend means a user who long-pressed, saw the chip, and lifted their finger to consider, has 600ms to commit a tap before the chip vanishes. In practice this means *the chip flickers* if the user's finger releases briefly while deciding. Felt as instability.
- There is **no kinetic feedback when the chip appears**. No haptic, no audio, no subtle scale animation. The chip just is. On a moving map, a body needs to know its action *produced something* — a tiny haptic tap at chip-appear would make the long-press feel earned.

**The single question the audit names:** should hover-chip → sheet ever be one-stage (e.g. a *secondary* hold beyond the 350ms that commits without a separate tap)? Currently no. Probably correctly no — the second stage is the commitment. But the question deserves a doctrine answer rather than an implementation default.

---

## §3 — Card expansion: when should a card expand automatically?

Current rule (L2SheetContainer.jsx): a sheet opens at its declared `peekFraction` (default 0.50, profile 0.92, inbox 0.85, product 0.92, filters 0.92, cart 0.92, etc.) and never auto-expands. Only the user's drag-up gesture promotes peek → expanded.

This is mostly right. The audit named, in #763 §7, that per-type peek floors are well-calibrated. But there are three cases where the auto-expand question lives:

### A. Profile sheet on a person tap

Peek floor is 0.92 — the photo is above the fold immediately. Auto-expand would not change much (0.92 → 1.0 reveals only the safe-area inset). Correctly tuned.

### B. Beacon-cluster sheet on a cluster tap

Peek floor is the default 0.50. The cluster sheet shows *"N signals here · strongest title · list of constituents · Zoom in CTA"*. With 30 constituents the list extends well below 50%. The user has to drag up to read the full list. **This is the audit's strongest candidate for auto-expand-on-content-density**: if the leaf count exceeds a threshold (e.g. ≥ 6 constituents), the sheet should open at 0.85 instead of 0.50.

### C. Editorial card on city focus

The DistrictEditorialCard is not a sheet — it surfaces as an ambient card via Globe.jsx (§4 below). It does not have a peek/expand model. It either is or is not.

**The audit's question:** should the cluster preview sheet's peek floor be dynamic on content density, or should density itself collapse the cluster differently? Per product-doctrine ("show the answer, not the count"), the answer might be neither — the cluster should *summarise* rather than enumerate, and the peek would never need to expand because the summary fits.

---

## §4 — Camera motion: when should it stop?

Camera motion currently terminates in three cases:

1. **`flyTo` duration elapses** — 1600ms or 0 (reduced-motion).
2. **`moveend` fires after a user-initiated pan or pinch** — the camera stops where the user stopped it.
3. **`map.remove()` on unmount** — camera dies with the component.

There is no notion of *narrative termination*: the camera does not stop when the system has nothing to reveal at the current centre. It will fly anywhere the user (or a search result) sends it, settle, and emit `pulse:tier` + `onLocalFocus` (if in the editorial-focus zone).

**Where this becomes embodied friction:**

- A user pans to the Pacific Ocean. The camera dutifully settles. No editorial focus, no signal, no atmosphere change beyond the time-of-day fog. The system has nothing to say but is silent about that silence. The user is left holding the camera in their hand with nothing to do. This is the F6 (no map-tap behaviour) of #763, viewed kinetically.
- A user pans into a city the system doesn't have editorial data for (e.g. Vauxhall when the editorial city is London — the focus radius covers it; e.g. Paris which is NOT in the hardcoded EDITORIAL_CITIES list). The camera settles, the tier toast fires (IN CITY / NEARBY), nothing else changes. The system asserts a tier without delivering on it.
- A `flyTo` from the tier rail (e.g. tapping CITY when the user is at GLOBE) flies for 1600ms but during that flight, the user cannot tap. The camera owns the screen. For users on a slow connection or weak device, the 1600ms flight becomes a *"the app froze"* read.

**The audit's question:** should camera motion *anticipate* its own ending? E.g. a fly-to that is about to land on a low-signal centre could *announce its uselessness* (briefly surface "this area is quiet — nearest movement: Vauxhall, 4km away") instead of just landing. This is the §4 Absence-and-Silence pattern from D35, applied to spatial motion.

---

## §5 — Snapping: when should snapping occur?

Currently snaps:

1. **Sheet peek ↔ expanded** — snaps to PEEK or EXPANDED targets on drag-end, based on offset + velocity thresholds.
2. **Sheet dismiss** — full off-screen on drag-down past peek + threshold.
3. **Tier rail tap** — `flyTo` with fixed zoom + pitch for the named tier.

Currently does NOT snap:

1. **Free-pan camera** — the user can stop the camera anywhere. There is no "snap to city centre," no "snap to nearest signal cluster," no "snap to alignment with the cardinal directions."
2. **Pinch-to-zoom** — the user can land at any zoom. No snap to GLOBE/REGION/CITY/LOCAL thresholds even though those are the canonical tiers.
3. **Hover chip position** — anchored to feature centroid; not snapped to viewport edges.

**The friction this produces:** the four canonical tiers are *named* (the rail uses them) but the user can be in a tier-boundary zone (e.g. z=6.9, almost CITY but officially REGION) with no snap to either side. The tier toast fires the moment they cross z=7 — which can happen mid-pinch with no commitment from the user. The audit names this as **threshold dithering** — the user's pinch passes through z=7 and the system asserts "IN CITY" even though the user is still pinching.

**The audit's question:** should pinch-to-zoom snap to canonical tiers when the user's velocity decays (i.e. they stop pinching near a boundary)? Snap-on-rest is the kinetic pattern that resolves threshold dithering without removing free-pinch control mid-gesture. This is one of the higher-leverage interaction questions the audit identified.

---

## §6 — In-world vs sheet-world: when should the user stay where they are?

The most behaviourally important question Phil named. Currently:

| Surface | In-world or sheet-world? |
|---|---|
| Hover chip | In-world (popup anchored to feature) |
| Inline tap popup | In-world (popup anchored to feature) |
| Cluster preview sheet | **Sheet-world** (covers bottom 50–85% of viewport, camera frozen) |
| Profile sheet (person tap) | **Sheet-world** (covers 92%, camera invisible behind backdrop) |
| Event sheet | **Sheet-world** |
| Venue sheet | **Sheet-world** (assumed — not read deeply) |
| Layers filter sheet | **Sheet-world** (filtering the world while not in it) |
| BeaconDropModal | **Modal-world** (above sheet-world; the camera is barely visible) |
| District Editorial card | **In-world** (ambient card overlayed on the globe) |
| Care Decompression cue | **In-world** |
| Atmosphere cue | **In-world** |
| Tier toast | **In-world** (1500ms flash) |
| Arrival signal pill | **In-world** |

**The pattern read.** Pure *information* surfaces stay in-world. Pure *decision* surfaces enter sheet-world. The transition rule is *commitment*. This is correct as a principle and the code mostly honours it.

**Where it breaks:**

- **Cluster preview sheet is sheet-world** but its purpose is *previewing the world* before committing. The user is being asked to leave the world to look at a list of things in the world. A peek-card anchored to the cluster, in-world, would honour the preview principle better. The current sheet works at default 50% peek but it *visually obliterates* the very signal the cluster was summarising.
- **Layers filter sheet is sheet-world** but its purpose is *changing what is visible in the world*. The user has to leave the world to filter the world. This is the worst sheet-world misuse the audit found. Categorical filtering should be in-world (the tier rail could carry it; a strip on the globe could carry it; the §7 zoom doctrine might absorb it entirely).
- **BeaconDropModal is modal-world** (above sheet-world). The user is dropping a signal *into the world* but the world is hidden behind the modal during the entire flow. The location picker should be in-world (the modal's bottom edge could be transparent so the user sees the map behind the form; the picked-location pin could render on the live globe during the flow).

**The audit's question:** should the *world* be the default surface, and sheets only invoked when the user has committed to a decision? Currently the system enters sheet-world for previews (clusters) and for filters (Layers), which inverts the principle. This is the highest-leverage *embodied* question in the audit.

---

## §7 — Zoom: reveal vs filter?

Currently zoom does both, implicitly:

- **Reveal:** sprite icons appear at z≥11; lifecycle sprites swap by ttl; selectedHalo activates; District Editorial card surfaces at z≥10 in focus cities.
- **Filter:** clusters fold below z≈11; fallback gold dots render at all zooms but the icon swap at z≥11 changes what is *visible* per pin.

The system additionally provides an *explicit* filter surface (the Layers sheet, six toggleable categories) and a *commitment-depth* surface (the tier rail, four buttons).

**This is the configuration the audit's meta-frame stress-tests directly.** *Zoom is commitment depth.* The system should translate that commitment into proportional reveal. It currently does so *additively* (zoom up reveals more) but not *substitutively* (zoom up doesn't suppress less-relevant categories).

Worked example. The user is at GLOBE (z=2.2). Every active beacon is folded into clusters. The user pinches in to CITY (z=10). Sprites appear, decay states render, editorial card surfaces. The user pinches further to LOCAL (z=14). Sprite overlap suppression engages. *The category mix the user sees does not change at any of these tiers.* If there are simultaneously a care beacon, a hosting beacon, and an editorial read at the same centre, all three are visible at all four tiers (subject to cluster fold).

**The audit's question:** should commitment-depth carry a *per-tier filter*? At GLOBE, perhaps only editorial + city-momentum should surface (the only categories that read at that scale). At REGION, perhaps editorial + event clusters. At CITY, perhaps editorial + venues + open hosting beacons. At LOCAL, perhaps everything. This is the D36 question from #763 §11, re-asked through the kinetic lens: *the reveal at each tier should be what the body needs to make the next decision*, not "everything at every tier with clusters folding density."

**Concrete consequence**: if zoom carries the filter implicitly, the explicit Layers sheet (§1 Intent C) becomes obsolete or repurposes itself (e.g. to *override* the implicit per-tier filter for a specific need). The 3-tap detour to filter is removed. The user *zooms* to filter, which is the unification of commitment-depth and category-relevance into one gesture.

---

## §8 — Magnetic movement: when should movement feel pulled?

Currently the camera is free. Pinch and pan do exactly what the user asks. There is no magnetic snap, no signal-attraction, no "the camera wants to settle on the nearest cluster."

There ARE moments where magnetism would be honest:

- **Pan ending near a cluster centroid** — the camera could subtly pull to the centroid (10–15px / 100–200ms) so the cluster sits visually centred. The user's intent ("I was reaching for that thing") gets fulfilled by the camera, not the user.
- **flyTo landing near a stronger nearby signal** — if the search result lands at coords that have no active beacon but a 200m-distant cluster does, the camera could end its flight at the cluster instead of the bare coords. The search becomes signal-aware.
- **Idle drift on no input** — if the user is reading the map for >5s with no input, the camera could ever-so-gently re-frame to put live signal near the visual centre. "The globe leans toward what's alive."

The audit explicitly does not propose implementing any of these. It names them as the *category* of question: when should the camera serve the user's intent rather than execute the user's gesture? This is the difference between operating map software and being understood by the surface.

**The risk:** magnetism becomes manipulation. A camera that pulls toward boosted beacons (globe_glow) would be a form of paid attention bias. The doctrine that governs magnetism would have to forbid relevance-distorting magnetic forces — magnetism is permitted on *centroid alignment* and *signal-proximity*, never on *paid amplification*.

---

## §9 — Quiet recede: when should things quietly leave?

The system currently *announces* most reveals (toasts, popups, card animations) and *dismisses* most surfaces explicitly (drag, tap, Escape). There is little kinetic vocabulary for *quietly receding*.

Where quiet recede should already be happening but isn't:

- **The tier toast.** Every tier crossing emits "WORLDWIDE / IN REGION / IN CITY / NEARBY." On a fast pinch from z=2 to z=14, the user sees four toasts in sequence. Each correct in isolation, all four together a stutter. Toast should suppress if the user crossed the boundary in <300ms (still mid-gesture).
- **The District Editorial card.** When the camera leaves the focus zone (zooming out, panning away), the card vanishes. Currently a hard removal (`localFocus={null}` → conditional render evaluates false → exit animation). A graceful 800ms opacity fade with no exit motion would honour the *atmospheric* register the card carries.
- **The PULSE wordmark + tagline ("The signal starts here.")** at z<8. In localmode this is hidden; in macro mode it lingers. As the user pinches in, the wordmark should fade out at z≈4 with no explicit gesture. Currently it pops out at the camera-style change.
- **The hover chip dismissing 600ms after touchend.** The 600ms is a hold, but the dismissal at the end is binary — chip then no chip. A 300ms opacity fade would honour the "the chip was a thought you almost committed to" register.
- **Sprite swap at lifecycle decay thresholds.** A beacon transitions from active sprite to `--decaying` sprite at the next render frame after ttl ≤ 30 min. The user (if watching) sees a sprite pop. Currently no `icon-fade` or cross-fade.

**The pattern the audit names:** reveals should be announced; recessions should be quiet. The system currently treats the two symmetrically (both visible). They are not symmetric — a thing arriving asks the user to attend; a thing leaving asks the user to let go. Different kinetic register.

**Where quiet recede is already correct:**

- **The self-marker** pulses gently and never leaves. Correct.
- **The atmospheric fog** transitions across the day with no announcement. Correct.
- **The neon coastline + admin overlay opacity ramps** fade out smoothly between z=9 and z=11 as the dark-vector base takes over. Correct.

These three are the best examples of the register the audit recommends extending to the surfaces above.

---

## §10 — Recommended doctrines (the kinetic D-series)

Sibling to the D36–D41 ontology series the #763 audit named. These are the *embodied* doctrines, ordered by leverage.

**D42 — Commitment Depth Doctrine.** Phil's reframe codified. Names zoom as commitment depth; names what the system reveals per increment of care; names what interaction work disappears as commitment rises. Provides the meta-frame that D36 (Pulse Behavioural Hierarchy from #763) hangs from. Could plausibly absorb D36 — the audit suggests D42 is the **broader, kinetic** spine and D36 is the **per-tier semantic** definition that inherits from it.

**D43 — In-World vs Sheet-World Boundary.** Names the rule: *the world is the default; sheets are invoked for commitment, not for previews or filters*. Cluster previews and Layers filtering should be in-world. Profile / venue / event sheets remain sheet-world because they ARE the decision surface. This is the highest-leverage embodied doctrine — it would reverse the §6 inversion the audit identified.

**D44 — Quiet Recede.** Names the asymmetry between announcement and recession. Reveals are kinetic events; dismissals are kinetic non-events. Lists the surfaces currently mishandling this (tier toast stutter, editorial card hard-remove, hover chip binary dismiss, sprite-swap pop) and names the register their dismissals should adopt. Inherits from D35 §4 (Absence & Silence) — the language-layer version of the same principle.

**D45 — Magnetic Movement Doctrine.** Names where the camera serves user intent vs executes user gesture. Permits: centroid alignment, signal-proximity at flight-end, idle-drift toward live signal. Forbids: paid-amplification magnetism (globe_glow), relevance-distorting forces, anything that would convert magnetism into bias. Inherits from D31 §17 (scoped continuity) and product-doctrine § trust-over-virality.

**D46 — Hover-Tap-Sheet Commit Chain.** Names the rule that preview must never auto-promote to commit; names the timing constants (350ms long-press, 600ms dismissal grace, kinetic feedback at chip appearance) and binds them to a single doctrine rather than scattered code constants. Closes the F3 mobile-hover-ambiguity gap from #763.

**Sequencing recommendation** (per anti-doctrine-inflation rule):

1. **D43 In-World vs Sheet-World** first — biggest leverage, would change two specific surfaces (cluster preview, Layers filter) immediately.
2. **D44 Quiet Recede** second — small kinetic doctrine, would unblock five named refinements (tier toast suppression, editorial card fade, hover chip fade, sprite cross-fade, wordmark fade-on-zoom).
3. **D42 Commitment Depth** third — codifies the meta-frame and unifies with D36 (which becomes its inheriting sibling).
4. **D46 Hover-Tap-Sheet** fourth — closes the mobile timing question.
5. **D45 Magnetic Movement** last — most cinematic, most risky, most easily abused. Should ship only after D43+D44+D42+D46 have observed slices and the team has learned what restraint magnetism actually requires.

The audit explicitly recommends NOT writing all five at once. Doctrine-first → observe → next.

---

## §11 — Biggest physical-annoyance risks to avoid

Pre-emptive ban list. Each item flagged because the kinetic lens identified it as a step away from "the globe understands me" toward "I'm operating map software."

**P1 — Multi-tap filters when zoom could imply.** The Layers sheet is the canonical example. Every additional categorical control surface adds a tap chain and reinforces sheet-world. Commitment-depth (D42) should subsume most filtering.

**P2 — Toast stutter on rapid gestures.** Suppress in-flight toasts when the user is still actively gesturing. The principle: announce arrival, not transit.

**P3 — Sheet-world for preview surfaces.** Cluster preview entering sheet-world to summarise the world is the canonical inversion. Any future "peek at X" sheet should be challenged: could this be in-world?

**P4 — Magnetic camera tied to monetisation.** D45 will forbid this in advance; the risk is implementation drift. Any future "camera leans toward boosted beacons" should be a hard-stop.

**P5 — Hover-to-commit one-stage.** Tempting on mobile to reduce the 350ms friction by making a longer hold auto-commit. This breaks the preview-vs-commit invariant. The 350ms should be tuned, not removed.

**P6 — Modal location pickers.** BeaconDropModal hides the world during a "drop a beacon at a place" flow. Every modal location picker should be challenged: could the user see the map behind it?

**P7 — Synchronous reveal stacking on city focus.** DistrictEditorialCard + AtmosphereCue + CareDecompressionCue all render simultaneously on the same `localFocus` signal. Three in-world cards arriving in one frame is a stutter. Stagger or suppress to one at a time.

**P8 — Camera flights that announce nothing.** A `flyTo` that lands at a quiet centre with no further reveal is a wasted second. Either the flight should be shorter, or the landing should announce the silence (per D35 §4 absence-as-atmosphere).

**P9 — Threshold dithering on pinch.** Pinch passing through z=7 mid-gesture should not commit a tier crossing. The threshold needs *velocity-aware debounce* (or the snap-on-rest from §5).

**P10 — Hard removals where fades belong.** The pattern named in §9. Every conditional `&&` removal in the JSX is a candidate for review against the recede doctrine.

**P11 — Adding more in-world cards.** The world is already busy. Each new ambient surface (editorial, care, atmosphere, arrival, weather, tier toast, future signal-thinning cues) competes with the canvas. The §4 risk from #763 ("M2 — adding more chrome elements above the globe") restated as a kinetic concern.

**P12 — Gestures that are physically rewarding but informationally empty.** A magnetic pull that satisfies the body but routes the user to no useful destination is a slot machine. Any kinetic refinement that feels good without producing decision-grade outcome should be challenged.

---

## Closing note

This artifact is research, not a doctrine. It names what should be governed and proposes a sequenced ratification. The single sentence it carries forward:

> **Zoom is commitment depth.** The globe's job is to translate increments of care into proportional reveal and removed work. When it does this the user feels understood; when it does not, they feel they are operating map software. The current implementation is closer to the second than the first — not because the engineering is wrong, but because the kinetic doctrine the engineering implies has never been written down.

The highest-leverage next move: write **D43 (In-World vs Sheet-World Boundary)** as a small, observable, ratifiable doctrine, and apply it to two specific surfaces (cluster preview, Layers filter) in a single slice. The other four embodied doctrines incubate in parallel.

This audit is the companion to [`pulse-behavioural-audit.md`](./pulse-behavioural-audit.md). The two together form the full pre-doctrine research basis for the next-generation Pulse work. Neither is implementation; both are observation. The implementation begins after Phil ratifies which doctrine to write first.
