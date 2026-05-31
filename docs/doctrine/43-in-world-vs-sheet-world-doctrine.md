# D43 — In-World vs Sheet-World Boundary

**Status:** Live · **Last updated:** 31 May 2026 · **Author of record:** Phil Gizzie (ratified) · **Author of draft:** Claude (HOTMESS Cowork)

**Doctrine class:** Spatial law. Governs every surface that will ever land on the Pulse globe, including any future assistant.

**Inherits from:** product-doctrine §"Readability over completeness" + §"Utility over engagement" · D17 Surface Layer · D35 §0 Language Layers (the linguistic analogue of the spatial split this doctrine names)

**Sister to:** D42 Commitment Depth (D42 says zoom should remove interaction work as care rises; D43 says sheets should not become the work the user has to navigate to in order to do that work) · D44 Quiet Recede (both doctrines govern the kinetic register of a surface)

**Research basis:** [`docs/research/pulse-embodied-interaction-audit.md`](../research/pulse-embodied-interaction-audit.md) §6 (in-world vs sheet-world) + §7 (zoom: reveal vs filter)

---

## §0 — The Principle

> **The world is the default. Sheets are invoked for commitment, not for previews or filters.**

This is the entire doctrine in one sentence. Every other section is the consequence of that line.

The principle reverses modern app psychology. Most platforms default to sheets, modals, feeds, routes, and pages — they treat the canvas as background and the chrome as the interface. HOTMESS does the opposite: the world is the interface. Chrome is invoked, not assumed. The city itself doesn't open a sheet every time you notice something across the street; the Pulse globe carries the same instinct.

When the principle holds, the user is *in the city*. When it breaks, the user is *operating map software*. The audit identified two specific surfaces — cluster preview, Layers filter — that currently break it. Those are the day-one violations the doctrine resolves.

---

## §1 — The Three Surface Registers

Every user-facing surface in the Pulse globe (and every future surface that lands on it) belongs to exactly one register. Register is determined by *what kind of relationship the user has with the world right now*, not by where the surface sits in the codebase.

### Layer 1 — In-world

**Purpose:** to be inside the world while the world tells you something.

**Used for:** previews · filters · ambient atmosphere · status surfaces that do not require the user to commit to anything. The world remains the canvas; the in-world element is overlayed on it without obscuring it.

**Canonical examples in current code:**
- Hover chip (anchored to feature centroid; reads title + subtitle + countdown)
- Cluster hover chip ("N signals here · strongest title")
- Inline tap popup label
- Tier toast (1500ms flash: WORLDWIDE / IN REGION / IN CITY / NEARBY)
- DistrictEditorialCard (ambient, reveal at z≥10 in editorial cities)
- AtmosphereCue · CareDecompressionCue (also ambient, paired with DistrictEditorialCard)
- ArrivalSignal pill (one-shot confirmation under safe-area)
- Self-marker (pulsing gold dot tracking GPS)
- Time-of-day atmospheric fog
- Neon coastline + admin overlay (z=2–9, fade out z=9–11)
- Selected-halo (white circle around tapped beacon)

**Rules:**
1. **Anchored or ambient, never modal.** An in-world element either points at a specific feature on the globe (anchored) or sits as an environmental quality (ambient). It does not interrupt.
2. **Reveals do not block input.** The user can continue panning, pinching, tapping past the in-world element without dismissing it explicitly.
3. **Recessions are quiet.** Reveals can be announced; recessions should be quiet. (Per the sister D44 doctrine. The cross-doctrine principle: in-world is the register where Quiet Recede has the most binding force.)
4. **Restrained energy.** In-world surfaces sit at Energy 2–4 per D35 §3. The globe is the high-energy surface; everything overlayed on it must be more restrained, not less.

### Layer 2 — Sheet-world

**Purpose:** to commit to a decision target.

**Used for:** the entity destination surfaces — profile · venue · event · chat · cart · settings · edit-profile · membership · cancellation · etc. — every surface where the user has *already* chosen to engage with a single thing and wants to do something with it. Sheet-world is invoked, never assumed. The world remains visible behind the backdrop but is intentionally pushed back.

**Canonical examples in current code:**
- L2 profile sheet (person commit, peek 92%)
- L2 event sheet (event commit, peek default)
- L2 venue sheet (venue commit, peek default)
- L2 chat sheet (conversation commit, peek 85%)
- L2 inbox sheet (the unified inbox, peek 85%)
- L2 product / cart / checkout sheets (commerce commit, peek 92%)
- L2 settings · edit-profile · membership · privacy sheets
- L2 hybrid-exchange sheet (D34 convergence — beacon-contextualised exchange surface)

**Rules:**
1. **Commitment is the only reason to invoke sheet-world.** The user must have already chosen *what* before sheet-world opens. Sheets are not browsers.
2. **One sheet at a time, LIFO stack.** Per sheetSystem.ts §LAW 2. Nested commitment (profile → venue link → venue sheet) pushes; back pops.
3. **The world stays visible behind the backdrop but is intentionally pushed back.** The backdrop blur (currently 20px) is the visual signal that the user has chosen to leave the world for this surface.
4. **Sheet-world inherits per-surface peek floors from sheetSystem.ts.** The hierarchy is correct as it stands; this doctrine does not alter it.

### Layer 3 — Modal-world

**Purpose:** attention seizure.

**Used for:** flows where the user is not browsing, not committing to an existing thing — they are *altering the city state*. Modal-world is reserved for full-attention authoring acts. Dropping a beacon is the canonical case: the user is putting a new signal *into the world*, and that act deserves the full attention modal-world demands.

Modal-world is **not "sheet-world with a different shape."** It is a psychologically distinct register. A sheet means *"I have chosen to focus on this existing thing."* A modal means *"I am changing the world; the world should wait."*

**Canonical examples in current code:**
- BeaconDropModal (the only current resident)

**Rules:**
1. **Modal-world is rare by design.** Every new modal must justify its existence against §6's commitment test AND against the test in §7 below ("does this alter the city state?"). If the answer is no to the second test, modal is wrong.
2. **The world is hidden during modal-world.** This is the price of attention seizure and the reason modal-world is rare — the user has chosen to leave the world momentarily, which means the world should stop competing for their attention.
3. **The modal should communicate what the user is about to do to the world.** A beacon drop modal should make clear that the user is about to place a signal that other people will see. Modal-world surfaces should announce their consequence.

### The split is enforced, not negotiated

A single moment may carry elements from multiple registers — e.g. a user looking at the globe (in-world) with a profile sheet open (sheet-world) and the BeaconDropModal closed (modal-world dormant). What is forbidden is *a single surface inhabiting two registers at once* — a sheet that is also ambient, a modal that is also a preview, an in-world element that demands commitment.

When in doubt, default to in-world. In-world preserved is recoverable; in-world broken is the failure mode the doctrine exists to prevent.

---

## §2 — The Commitment Test

For every surface, ask one question:

> **Is the user previewing the world, filtering the world, or committing to a decision?**

The answer routes the surface to a register:

| Answer | Register |
|---|---|
| Previewing the world | In-world |
| Filtering what the world shows | In-world (or implicit in zoom per D42) |
| Committing to a single decision target | Sheet-world |
| Altering the city state (authoring) | Modal-world |

The test is mechanical. Every surface — current or future — must pass it. The doctrine does not negotiate edge cases by aesthetic preference; the test is the answer.

---

## §3 — The Two Day-One Violations the Doctrine Resolves

### Violation 1 — The cluster preview sheet

**Current behaviour:** Tapping a cluster bubble on Pulse opens an L2 sheet (`beacon-cluster` in the registry, height `large`, default peek 0.50) showing *"N signals here · strongest title · list of constituents · Zoom in CTA"*.

**Why it violates D43:** The user is being asked to leave the world to look at a summary of what is in the world. The very signal the cluster summarised is now hidden under the sheet backdrop. The user is *previewing the world from outside the world*. This is the canonical inversion D43 exists to prevent.

**Resolution:** The cluster preview becomes an in-world card anchored at the cluster centroid. Tap-to-zoom remains; tap-a-constituent navigates to the entity destination (sheet-world, correctly — the constituent is a commitment); the *summary* of what is in the cluster stays in-world.

The mechanism is a D42 slice question (how to render an in-world card with a list and a CTA without crowding the surrounding signal). D43 just declares the rule. The first slice that implements this proves D43 in code.

### Violation 2 — The Layers filter sheet

**Current behaviour:** Tapping the Layers FAB opens an L2 sheet with six toggleable category rows (events / venues / people / safety / market / radio). The user toggles, closes the sheet, and the markers re-filter.

**Why it violates D43:** The user is being asked to leave the world to choose what is visible in the world. Three taps + a sheet round-trip to filter what the user is looking at, with the world hidden during the filter operation. The chrome is doing categorical filtering work the world should do implicitly.

**Resolution:** Layers must leave sheet-world. *How* it leaves is a D42 slice question: per the embodied audit §7, the cleanest answer is that categorical filtering becomes implicit in commitment-depth (zoom), and the explicit Layers surface either disappears entirely or persists as an in-world override strip. D43 declares the violation; D42 owns the mechanism.

### What both violations share

Both are *"leave the world to inspect the world"* surfaces. The phrase is diagnostic: any future surface that asks the user to leave the world in order to look at, summarise, or filter the world is in violation by definition, regardless of what category it serves.

---

## §4 — What Stays in Sheet-World

Every surface where the user has *already* chosen to engage with a single decision target. The audit named these as correctly sheet-world; D43 confirms them.

- **Profile sheet** — person tap. The user has selected a single person; the sheet is the decision surface for whether to boo, message, block, etc.
- **Venue sheet** — venue tap. The user has selected a single venue; the sheet is the decision surface for whether to go, save, share, etc.
- **Event sheet** — event tap. Same pattern.
- **Chat sheet** — conversation commit. The user has chosen to talk to one person.
- **Inbox sheet** — list of pending conversations. The user has chosen to engage with their incoming queue.
- **Cart · checkout · order-confirmation sheets** — commerce commits.
- **Settings · edit-profile · membership · privacy sheets** — account commits.
- **L2HybridExchange sheet (D34 convergence)** — beacon-contextualised exchange surface; a commitment to engage with a structured trajectory.

These surfaces are sheet-world because they are *decisions about a single thing*. The world is visible behind the backdrop (per §1.L2 rule 3) but is intentionally pushed back so the user can focus.

---

## §5 — In-World Patterns the Doctrine Inherits From

The current code already has the right in-world vocabulary in several places. New in-world surfaces inherit their register from these existing patterns.

- **Hover chip + cluster hover chip** — anchored, short-lived, announces the feature it points at, dismisses quietly.
- **Tier toast** — ambient, brief, dismisses on its own.
- **DistrictEditorialCard** — ambient, conditional on geographic focus, reveals when the camera settles, currently dismisses hard (D44 will quiet this).
- **AtmosphereCue · CareDecompressionCue** — environmental, paired with editorial focus, restrained.
- **Self-marker** — persistent, subtle pulse, never demands attention.
- **ArrivalSignal pill** — one-shot, gold ribbon, dismisses on tap or 4s timeout.
- **Time-of-day atmospheric fog** — entirely environmental, transitions across the day without announcement.
- **Neon coastline + admin overlay** — opacity-ramped fade across zoom levels.

The register is consistent: in-world surfaces *sit on the world*, not *over the world*. They have visual mass but no commitment friction. The user can act past them or wait them out.

---

## §6 — The Boundary Test for New Surfaces

For every new surface proposed against this doctrine, the default question is:

> **Why is this not in-world?**

The burden of proof is on sheet-world and modal-world. Not on in-world. Reversing this question is the single biggest behavioural shift D43 produces.

If the answer is *"because the user is committing to a single decision target"* → sheet-world.
If the answer is *"because the user is altering the city state"* → modal-world.
If the answer is *"because we wanted to show more of it / scroll the list / give it room"* → that is a layout convenience reason, not a register justification. The proposed sheet does not pass §2's commitment test and should be re-thought as in-world.

The implicit norm of modern app design — *everything becomes a modal or a sheet eventually* — is the entropy this section exists to counter. Every PR that adds a new sheet-world or modal-world surface must reference §2's commitment test in its description.

---

## §7 — Modal-World Is Reserved

Modal-world deserves a stricter test than sheet-world because modal-world is attention seizure. The §6 question becomes a two-step gate:

1. Does the user pass the commitment test for sheet-world? (i.e. they have already chosen a thing)
2. **Are they about to alter the city state?** (i.e. their commitment will change what other users see)

Both answers must be yes for modal-world. BeaconDropModal currently passes both:
- The user has committed to dropping a beacon (yes, sheet-world commitment passes)
- The act will place a signal other users will see (yes, city-state alteration)

A future surface that passes the first test but not the second — e.g. a "set my preferences" full-screen flow — belongs in sheet-world, not modal-world. The reverse — a surface that alters city state without the user explicitly committing — should not exist at all.

---

## §8 — The Doctrine Governs Every Future Surface, Including Any Future Assistant

This clause is the most important constitutional move in the doctrine.

Every surface that will ever land on the Pulse globe inherits these three registers. **The doctrine does not permit a fourth.** Future surfaces — boost states, weather overlays, music-moment beacons, signal-thinning cues, route atmospherics, and any future assistant — inherit from §1's three registers and pass §2's commitment test. They do not invent their own.

In particular, **any future HOTMESS assistant inherits the three registers and may not arrive as persistent chrome.** The assistant must take one of three forms:

- **In-world** — ambient cues, soft interpretation of movement and signal: *"queue building east of you," "this district is cooling off," "care spaces nearby are quiet right now,"* surfacing at the appropriate moment, dismissing quietly.
- **Sheet-world** — decision support invoked when the user has committed to engaging with a specific question: a venue assessment surface inside a venue sheet, a coordination tool inside a chat sheet.
- **Modal-world** — rare, high-attention intervention only when the assistant is altering city state on the user's behalf with their explicit commitment (this register is very narrow for an assistant — it is harder to justify than for a beacon drop).

The assistant must not become a persistent chrome layer ("Ask HOTMESS"), a floating helper, a support widget, a chatbot summon button, or a generic copilot. Those forms would collapse the world into "operating an assistant on top of a map." The assistant — if and when it arrives — is interpretation woven into the world, not a layer above it. The globe remains the operating system. The assistant is the whisper inside the OS, not the OS itself.

The principle stated as a single rule: **the assistant must inherit the same spatial law as everything else. It is summoned by friction, not by chrome.**

---

## §9 — Constitutional Inheritance Gate

(Per EXECUTION.md §9.)

D43 produces the standard X-Y pair:

- **X (preserved):** the user's immersion in the world — the felt experience that the Pulse globe is a place, not a control panel.
- **Y (forbidden):** any new sheet, modal, or surface that summarises, filters, or previews the world; any UI pattern that makes the world a thing the user has to leave in order to operate; any future surface that invents a register outside the three §1 declares; any future assistant that arrives as persistent chrome.

Future doctrines (D42 Commitment Depth, D44 Quiet Recede, D45 Magnetic Movement, D46 Hover-Tap-Sheet Commit Chain) inherit from D43's three-register architecture and pass §2's commitment test for their proposed surfaces.

---

## §10 — Implementation Sequencing

This doctrine declares the rule; implementation lands in slices.

- **Slice A — In-world cluster preview.** Replaces the L2 `beacon-cluster` sheet with an in-world anchored card at the cluster centroid. Tap-to-zoom and tap-a-constituent contracts preserved.
- **Slice B — Layers filter resolution.** D42 owns the mechanism (commitment-depth filter implicit in zoom OR in-world override strip OR removal entirely). D43 declares the violation; the slice writes the resolution.
- **Slice C — Burden-of-proof PR-template clause.** Every PR adding a new sheet or modal must reference §6's question in its description, and reviewers may invoke §2's commitment test as a gating concern.

Sequencing recommendation: Slice A ships first (smallest, most observable, lowest risk). Slice B ships second (depends on D42 progress). Slice C is a process change, not code, and ships alongside Slice A.

---

## Appendix A — Future-Inheritance Reference: the Assistant Frame

(Recorded here as reference material, not as constitutionalised doctrine. Captured from Phil's reflection 2026-05-31 when he ratified D43's skeleton. Held as research-grade material for whenever a HOTMESS assistant is built; the doctrine that governs it will inherit from this frame.)

The assistant must emerge as **latent city intelligence**:

> The globe remains primary. The assistant is inferred · ambient · contextual · summoned by friction · aware of movement/state · woven into the world itself. Not a second operating system layered on top.

The assistant obeys the same three registers D43 names:

| Register | Assistant behaviour |
|---|---|
| In-world | ambient cues, soft suggestions, signal interpretation |
| Sheet-world | decision support, context explanation, coordination |
| Modal-world | rare, high-attention intervention |

**Examples of good HOTMESS assistant behaviour** (city instinct, atmospheric interpretation):
- *"Queue building east of you."*
- *"Three compatible signals moving toward Soho."*
- *"That beacon expired 12m ago."*
- *"You usually head south after 2am."*
- *"Care spaces nearby are quiet right now."*
- *"This district is cooling off."*

**Examples of bad HOTMESS assistant behaviour** (chatbot register, would destroy atmosphere):
- *"How can I help you today?"*
- *"Would you like recommendations?"*
- *"Here are some things you can do."*
- *"Ask me anything."*

The assistant is an **interpretation layer**, not a **command layer**. It helps the user understand movement, tension, timing, proximity, energy, relevance, safety, transitions — but does not become the primary interaction mechanic. The globe must still feel like the operating system. The assistant is the whisper inside the OS.

The smart move is to defer the assistant to the end of the next product epoch — after the ontology series (D36–D41) stabilises and the kinetic series (D42–D46) stabilises. Then the assistant inherits those rules instead of inventing its own. Until then, the assistant lives as constitutional pressure under D43 §8: an unwritten doctrine whose absence is felt in every decision about whether a surface deserves persistent chrome.

---

## Appendix B — Unwritten Constitutional Pressure (the D47 question)

(Recorded for the same reason: captured but not constitutionalised. Phil's restraint instruction 2026-05-31.)

There is a deeper principle behind D42 + D43 + D44 + D45 + D46:

> **The system should do more understanding and ask the user to do less operating.**

This pressure governs the entire kinetic series. It is real, it is consequential, and codifying it now would create premature space for hidden behaviour, over-inference, magic UX, removed-explicit-control, and assistant-as-cleverness violations. HOTMESS still requires clarity, boundaries, consent, and intentionality as floor.

The pressure is therefore **acknowledged but not constitutionalised** in this doctrine cycle. D43 (and every sibling doctrine in the kinetic series) inherits it implicitly. A future doctrine — provisionally D47, Interaction Weight Doctrine — may codify it when the right slice of code proves what the codification should permit and forbid. Until then, D43 §6's burden-of-proof clause carries the pressure: every new sheet or modal must justify itself against in-world by default, which is the practical expression of the unwritten principle.

The restraint is the doctrine. Writing too early would be the failure.
