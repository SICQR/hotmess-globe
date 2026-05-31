# D48 — Spatial Identity Exposure Doctrine

**Status:** Live · **Last updated:** 31 May 2026 · **Author of record:** Phil Gizzie (ratified) · **Author of draft:** Claude (HOTMESS Cowork)

**Doctrine class:** Constitutional. Governs every surface that places identity on the spatial canvas of the Pulse globe.

**Inherits from:** D08 Visibility-State Architecture (governs *whether* a person renders; D48 governs *what they render as* when they do) · D12 Drop Beacon (the four signal axes — D48 binds identity exposure to intent) · D15 HOTMESS Care Language (care defaults must over-protect, even against user wish — the structural rule D48 §3 inherits) · D24 Contextual Trust Weighting (mutual-only viewer state determines exposure register) · D31 Venue & Partner Power (operator-structural consent for venue/infrastructure mode) · product-doctrine § "Trust over virality"

**Sister to:** D43 In-World vs Sheet-World (D43 governs surface registers; D48 governs the primitives that render in those registers) · D42 Commitment Depth (zoom level is one of the gates that determines which exposure register surfaces)

**Research basis:** Phil's three-mode reframe + cruising-vs-aftercare semantic test case (2026-05-31 reflections during D43 Slice A scoping)

---

## Preamble — the transition this doctrine names

> **You stop designing markers. You start designing exposure contracts.**

That is the entire transition. Until this doctrine, the question "what does a beacon look like on the globe?" was treated as a visual question — a render contract, a sprite selection, a colour assignment. This doctrine names it as a *social question*: what an identity reveals of itself when it lands on the spatial canvas is itself a layer of meaning. The transition from "marker" to "exposure contract" is the transition from designing UI to designing consent.

The doctrine exists because HOTMESS operates inside a class of spaces where this matters more than it would for a generic platform: queer nightlife, cruising culture, care environments, proximity systems, men-only intimacy spaces. In those contexts, a face on a map is never neutral — it carries perceived invitation, risk, vulnerability, erotic tension, recognisability, safety implications, and behavioural expectations that a venue pin does not. The same UI pattern would carry different doctrine in a generic platform. Here, it requires its own.

---

## §0 — The Principle

> **A photo on the globe is a social act the user has consented to performing.**

This is the entire doctrine in one sentence. Every other section is the consequence of that line.

The sentence reframes three things at once:
1. **Avatar rendering** is not visual decoration; it is a social act.
2. **Consent** is not a checkbox; it is participation in a specific social register.
3. **The globe** is not a map carrying decoration; it is a space where social acts happen.

When the principle holds, every surface that places identity in spatial context can be evaluated against a single question: *what social act is the user being asked to perform here, and have they consented to perform it?* When the principle is honoured the globe stays trustworthy. When it breaks, the globe becomes a venue where users were exposed without choosing to be.

---

## §1 — The Three Spatial Identity Modes

The single most important architectural move in the doctrine. HOTMESS recognises three distinct identity modes that may land on the spatial canvas. Each is a different social reality and requires a different primitive. The doctrine forbids collapsing them into a single "pin."

| Mode | Question it answers | Reality it is | Primitive | Consent layer |
|---|---|---|---|---|
| **Infrastructure** | *"something exists here"* | informational | glyph · signal · sprite-icon | operator-structural (venue catalog, partner placement — consent is the placement itself) |
| **Atmosphere** | *"something is happening here"* | emotional | field · pulse · editorial presence · ambient halo | operator-act (district editorial, curated reads — consent is the curation) |
| **Human Presence** | *"someone is here"* | social | face · body · persona | individual-explicit (every face on the globe = a consented social act) |

These are three different realities, not three styles of pin.

**Infrastructure** is informational. A venue glyph on the globe carries *no erotic or vulnerability semantics*. Its job is to declare existence. The user looking at it asks "is there a place here?" — a factual question. The consent layer is structural: the venue exists, the operator has placed it, no individual is exposed by its presence.

**Atmosphere** is emotional. A district editorial read ("Soho is warming") carries *mood and momentum* but does not expose an individual. It signals to the user "this neighbourhood has texture right now" without naming any single person. The consent layer is operator-act: HOTMESS or a partner has curated this read, no individual user is implicated.

**Human Presence** is social. A face on the globe is a person inside the city, signalling some version of themselves to other people. It carries every dimension Phil named: perceived invitation, risk, vulnerability, erotic tension, recognisability, safety, behavioural expectation. The consent layer is individual-explicit: only that person can decide what they reveal, to whom, in what register.

**Only the third mode requires explicit embodied consent.** Infrastructure declares; atmosphere implies; human presence exposes. The doctrine's binding force is concentrated on the third mode.

---

## §2 — The Exposure Spectrum Within Human Presence

This section applies only to Human Presence mode. Infrastructure and Atmosphere have their own registers (a glyph is a glyph; an editorial card is an editorial card); they do not traverse a consent spectrum because no individual identity is at stake.

For Human Presence, four exposure registers exist in increasing order of identity-revealed:

1. **Anonymous** — presence-implied, no identity-revealed. The system signals "someone is here" without surfacing any feature of who. Used as the most-protective render; used when consent gates fail; used as the default for care intents.
2. **Persona shape** — silhouette, persona-coded, no face. Communicates that a person of a particular persona (Daddy / Brat / Pup / Top / Bottom / Boy etc. per D31 §17 scoped continuity) is here. Identity is implied at the persona layer, never at the face layer.
3. **Face avatar** — single photo, identity present. The recognisable register. Used when intent + viewer trust + per-surface consent all permit.
4. **Full reveal** — multi-photo, profile in sheet-world only. Never in-world. The user has chosen to engage with this person via the profile sheet; the full identity surface unlocks there.

Movement up the spectrum requires earning each step. Movement down the spectrum is always permissible — a more-protective render is never a violation; a less-protective render without the consent ladder having been climbed always is.

---

## §3 — Intent Routes Exposure

The most behaviourally consequential rule in the doctrine. **Per-beacon-intent governs which exposure register is honest.** A cruising beacon and an aftercare beacon are not the same social act; they cannot share an exposure register.

The semantic test case: *an aftercare cluster showing recognisable faces by default would feel emotionally wrong almost immediately.* The system feels wrong because the social register is wrong. Care surfaces are not invitations; they are infrastructure. Faces on care infrastructure transform care into performance. *A cruising cluster aggregating identity into a count circle would erase the whole point of "who's there?"* — because cruising IS the social act of recognisable mutual presence. Each intent carries its own register because each is a different act.

### §3.1 The per-intent matrix (locked)

| Intent | Default exposure register | Opt-in available? | Rationale |
|---|---|---|---|
| **Aftercare offered** | Anonymous | **No — structurally forbidden** | Aftercare is care infrastructure, not social signalling. Faces transform care into performance. See §3.2. |
| **Cruising** | Intent-routed (per §3.3) | N/A — exposure is gated by viewer trust + zoom, not toggled | The "who's there?" tension IS the social act. Aggregating to count erases the act; defaulting to face exposes too far. The register surfaces *to mutuals and at proximity*, aggregates at distance. |
| **Hosting** | Intent-routed (per §3.3) | N/A — same gating as cruising | Identity is part of the offering, but the offering is to a specific audience; faces surface to mutuals and at proximity, aggregate to strangers and at distance. |
| **Quiet hold** | Anonymous | Yes — user can opt in per-surface | A low-key, around-if-needed register. The default mirrors the intent's register; the user owns the choice to surface. |
| **Arriving** | Persona shape | Yes — user can opt in per-surface | Transient signal. Persona shape (not face) is the honest default; the user can climb the spectrum if they want. |
| **Selling/swap** | Anonymous | Yes — user can opt in per-surface | Semi-commercial; the listing is the offering, not the seller's face. Opt-in available for sellers who want to add a face to the listing. |

### §3.2 The Aftercare Structural Forbiddance — why it is not opt-in

Aftercare-offered does not permit face avatar at any consent gate, viewer trust state, zoom level, or per-surface override. The intent is the gate; the gate cannot be opened.

The reasoning, captured for the doctrine record: aftercare is care infrastructure, not social signalling. The moment recognisable faces become default-capable in care-space, care transforms into performance — the offering becomes a marketing surface, the recipient becomes an audience, and the trust layer that makes the offering possible at all collapses. The same protective logic D15 (HOTMESS Care Language) applies at the linguistic layer applies here at the spatial layer: care defaults must over-protect, even against user wish.

A user offering aftercare may genuinely want to be a recognisable face attached to the offer. The doctrine declines that wish, not as paternalism but as protection of the care surface itself. The user's individual choice cannot be permitted to alter the social register of the care space for everyone who relies on it being non-performative. The structural forbiddance is the protection.

Aftercare-offered renders as anonymous (signal that care is available, no face), at the cream-coloured care register (D15), with the offering's text content in the hover chip and the offering's owner reachable via the profile sheet only after the recipient has committed to engaging — the profile sheet is in sheet-world (D43) and faces may surface there per the user's profile consent. The face exists; the doctrine forbids it from existing *in spatial context tied to the care offer.*

### §3.3 The Intent-Routed Gating Rule (cruising, hosting)

For intent-routed exposure, the register that surfaces is determined by:

- **Viewer trust** — mutual-only relationships permit face avatar; non-mutual viewers see persona shape or anonymous
- **Proximity** — the closer the viewer (in physical distance, not just zoom), the more the constituent has consented to being recognised. Distance is its own privacy layer.
- **Zoom level** — at low zoom (cluster-folded), aggregate or count; at higher zoom, persona shape; at street zoom with proximity + viewer-trust gates passed, face avatar
- **Per-surface consent** — the user has consented to face avatar for this specific surface (cluster preview vs profile sheet are different consent surfaces and may carry different consents)

All four gates must pass for the highest register to surface. Any failed gate steps the render down the spectrum.

---

## §4 — Coupling with D08 Visibility State

D08 (Visibility-State Architecture) and D48 collaborate:

- **D08 governs whether a person renders at all.** Off-grid → user is absent from canvas entirely. Mutual-only → user is rendered to mutuals only. Public → user is rendered to all viewers subject to D48 gates.
- **D48 governs what they render as when they do.** Per §1 mode, per §2 spectrum, per §3 intent matrix.

The doctrines are orthogonal: D08 is the on/off switch for spatial existence; D48 is the spectrum of what exists when the switch is on. A user can be public (D08) and rendering as anonymous (D48 — because their intent is aftercare). A user can be mutual-only (D08) and rendering as face avatar (D48 — to mutuals, intent cruising, proximity gate passed). The two doctrines cover different questions and must both be honoured.

---

## §5 — The Consent Contract

A face on the globe is never default. The user must opt in, per:

- **Per surface** — cluster preview / hover chip / selectedHalo / profile sheet are different surfaces and may carry different consents
- **Per viewer trust state** — mutual-only opt-in is distinct from public opt-in
- **Per beacon intent** — cruising opt-in is distinct from hosting opt-in; aftercare opt-in is forbidden entirely

The opt-in language must name the *social act*, not the *technical action*. Examples:

| Wrong (technical action) | Right (social act) |
|---|---|
| *"Show my profile photo on the map"* | *"Be recognisable to boys nearby when you're cruising"* |
| *"Enable avatar in cluster previews"* | *"Let mutuals see your face in groups you're part of on the globe"* |
| *"Use photo as map marker"* | *"Be visibly here"* |

The user's consent is to the social register, not to the data flow. The doctrine forbids consent language that frames the choice as a settings toggle abstracted from social meaning.

Consents are revocable in real time. A user revoking face-avatar consent on cruising means their face stops appearing in cruising-mode cluster previews and hover chips on the next render. No retroactive privacy debt; revocation is forward-secret per D22 (Temporal Doctrine).

---

## §6 — The Cluster Question (where D43 Slice A inherits from)

When a cluster contains person beacons, the render depends on multiple gates evaluated together:

1. **Homogeneity of constituent intents.** A homogeneous cruising cluster can render as a face stack; a homogeneous aftercare cluster *cannot* (§3.2 structural forbiddance); a heterogeneous cluster (cruising + aftercare + hosting) defaults to the most-protective render of any constituent.
2. **Average viewer-trust to constituents.** A viewer whose mutual-overlap with the cluster's constituents is high earns the right to see faces (subject to per-constituent consents); a viewer with low mutual-overlap sees aggregate.
3. **Cluster size.** Small clusters (≤ N — to be set by Slice A) can carry a face stack; large clusters collapse to aggregate because aggregating into a face wall is its own form of overexposure (50 faces on screen is not "transparency," it is "every face the system knows about, exposed at once").
4. **Zoom level.** Low zoom (city scale) defaults to aggregate even when other gates pass; high zoom (street scale) permits face stack if other gates pass.

The default is always the most-protective render that any constituent's intent + consent permits. **A face stack must be earned by intent + consent + viewer trust + zoom — never assumed.**

This is the rule D43 Slice A (in-world cluster preview) inherits from when it ships. Slice A does not invent cluster behaviour; it surfaces what this doctrine declares.

---

## §7 — Cruising Dynamics (the HOTMESS-specific weight named here)

A face on a hookup app's spatial canvas is a different social act than a name on a calendar. The doctrine names the dimensions that change because HOTMESS operates in queer nightlife, cruising culture, care environments, proximity systems, and men-only intimacy spaces:

- **Proximity exposure.** Distance is its own privacy layer. A face that surfaces to a viewer 500m away is a different social act than the same face surfacing to a viewer 50m away. The closer the viewer, the more the constituent has consented (per §3.3 proximity gate) to being recognised in this moment, here, by someone who could physically be the next person they meet. The doctrine treats proximity as part of the consent contract, not as an unrelated render parameter.

- **Safety perception.** A face stack visible to strangers in a hookup context carries different threat semantics than the same stack in a friends app. The user's calculus when consenting to be a face on the globe includes "who might be seeing this who I don't want seeing this" — homophobic neighbours, family members, employers, ex-partners, stalkers. Consent surfaces must name this risk class without catastrophising it; the language must allow the user to make an informed choice that honours both their right to be seen and their right to be protected.

- **Signal of intent.** A face appearing in a Pulse cluster IS a social signal — the constituent has chosen to be recognisable here, now, in this intent. This is a different signal than the same person appearing passively in the Ghosted grid (where the choice is to be in a discovery surface, not to be in a spatial-now surface). The doctrine treats the two surfaces as distinct consent decisions; a user being visible in Ghosted does not grant consent to be visible in Pulse.

- **Cruising as legitimate erotic recognition.** A cruising face stack is the social act the surface exists to support. The doctrine does not pathologise this; it protects the conditions that make it possible — voluntary opt-in, intent-matched register, viewer-trust gating, proximity respect.

This section names HOTMESS as a queer-men's-OS in spatial terms. The same UI pattern in a generic platform would carry different doctrine. Here, the consent contract is shaped by the specific social acts the surface supports.

---

## §8 — Three Modes, Three In-World Primitives (Coupling with D43)

D43 (In-World vs Sheet-World) governs the surface registers — what kind of relationship the user has with the world right now. D48 governs the primitives that render in those registers.

| Mode | In-world primitive | Sheet-world primitive | Modal-world primitive |
|---|---|---|---|
| Infrastructure | category glyph anchored at coordinates | venue sheet (full venue detail) | none — venue placement is operator-act, not user-modal |
| Atmosphere | field / pulse / editorial card / ambient halo | editorial deep-read sheet (rare) | none — atmosphere does not seize attention |
| Human Presence | face / persona shape / anonymous-signal per §2 | profile sheet (full identity, per profile consent) | dropper's own avatar preview during beacon-drop (the only modal-world face case) |

The doctrines collaborate cleanly: D43 says *which kind of surface* a user is on; D48 says *what identity primitive renders on that surface*. A future surface proposed against both doctrines must declare its register (D43) AND its primitive (D48). Surfaces that fail either declaration are not yet ready to ship.

---

## §9 — Constitutional Inheritance Gate

(Per EXECUTION.md §9.)

D48 produces the standard X-Y pair:

- **X (preserved):** the user's right to control their spatial exposure per register, per viewer, per surface, per intent — including the right to be over-protected by the system when the social register they are operating in requires over-protection.
- **Y (forbidden):** collapsing the three identity modes (§1) into a single primitive; any default that surfaces a face avatar without explicit per-surface consent (§5); any cluster render that reveals identity beyond what its constituents consented to (§6); any treatment of "photo markers" as visual enhancement rather than social act (§0); any opt-in available for aftercare-offered faces (§3.2); any consent language that frames the choice as a settings toggle abstracted from social meaning (§5).

Future doctrines inheriting from D48 must declare which mode they operate in, which exposure register their primitives carry, and which intents (if any) gate those primitives.

---

## §10 — Sequencing & What This Unblocks

D48 ships first. Every dependent surface is re-scoped against this doctrine before any code lands.

### §10.1 Direct inheritance (must re-scope before implementation)

- **Slice G — Person Photo Markers.** Was scoped at task #388 as a flag-gated visual feature. D48 reframes it as the implementation of §1 Human Presence mode + §2 exposure spectrum + §3 intent matrix + §5 consent contract. Slice G is not "add photos to beacons"; it is "build the exposure-contract pipeline that §2 declares."
- **D43 Slice A — in-world cluster preview.** Was scoped earlier as count-and-summary card. D48 reframes the cluster render itself: §6 cluster question governs what shows, and the face-stack-vs-aggregate decision is per-intent and per-viewer-trust, not a UI option. Slice A inherits this and ships with face stacks only where §6 permits.
- **Future hover-chip per-intent render.** The hover chip currently shows title + subtitle + countdown for all beacons. D48 says hover chip primitive varies per mode: infrastructure shows glyph + category, atmosphere shows editorial atmospherics, human presence shows face / persona / anonymous per §2 + §3.
- **Future selectedHalo.** Currently uniform (white circle around tapped beacon). D48 says the halo's primitive may vary per mode — Human Presence selected halo may include face avatar; Infrastructure selectedHalo stays as the structural ring.
- **Future BeaconA11yList.** Screen-reader equivalent of the visual register. Must describe identity in mode-appropriate language: *"venue: The Mall,"* *"atmosphere: Soho is warming,"* *"someone here, persona Daddy, intent cruising"* — not *"beacon at coordinates."* The accessibility surface inherits D48's three-mode structure directly.

### §10.2 The pre-photo Slice A is discarded

The Slice A scoping that proposed Path A (count + summary) and Path B (compact list) is dropped. Neither path passed §1's three-mode test; both treated person clusters as if they were signal clusters. D48's framing reveals that this was the design error the audit-then-scope pattern was supposed to catch and didn't. The corrected sequencing — D48 → Slice G re-scope → D43 Slice A re-scope — prevents the design from re-baking around the wrong primitive.

### §10.3 The doctrine's burden

Every PR landing a person-beacon surface (now or in future) must reference D48 §1's mode, §2's spectrum, §3's intent matrix, and §5's consent contract in its description. A PR that does not declare these is not yet ready for review.

---

## §11 — The Anti-Collapse Clause

The most consequential single clause in the doctrine. **The most dangerous failure mode is the slow collapse of the three identity modes back into a single "pin" primitive.**

Every platform that has ever rendered identity on a map has experienced this entropy. Different social truths — infrastructure, atmosphere, human presence — start as distinct primitives and slowly merge: the venue becomes a pin, the editorial atmosphere becomes a pin, the person becomes a pin, until everything is a pin with different colours. The platform drifts toward generic map software not by deliberate decision but by accumulated convenience.

D48 declares that this collapse is structurally forbidden in HOTMESS. **Every future surface proposed must declare which mode it renders, with its own primitive.** A pin that has to serve all three modes IS the failure. The clause exists because most apps' UX entropy is exactly this collapse — and HOTMESS is written specifically to resist it.

The diagnostic: when a designer or engineer proposes "let's make all beacons render as the same kind of dot/circle/icon for consistency," that is the collapse arriving. The correct response is *"infrastructure is informational, atmosphere is emotional, human presence is social — these are not three styles of pin, they are three different realities. The consistency they share is that each is rendered honestly in its own primitive, not that they all look the same."*

The clause has constitutional force because every other clause in the doctrine depends on it. If the three modes collapse, §1's typology dissolves, §2's spectrum is meaningless (there is nothing for the exposure register to be a register of), §3's intent matrix has nothing to route, §5's consent contract becomes a generic privacy-toggle, §6's cluster question reverts to count-vs-list, and §7's HOTMESS-specific weight evaporates. The anti-collapse clause is the load-bearing wall that holds every other clause up.

**Future doctrines may NOT introduce a fourth mode** without explicit amendment to D48 §1 and re-evaluation of every dependent doctrine. Three modes is the constitutional shape.

---

## §12 — Implementation discipline

D48 declares the rule; implementation lands in slices, each governed by this doctrine.

The slices the doctrine immediately unblocks (per §10):
- **D48 Slice 1 — exposure-register pipeline in the public-safe FeatureCollection** (adds the per-feature register field; defaults to most-protective; no rendering changes yet — pure data plumbing)
- **D48 Slice 2 — Slice G (Person Photo Markers) re-scope and implementation** (the photo-marker work, now governed by §1 + §2 + §3 + §5)
- **D48 Slice 3 — D43 Slice A re-scope and implementation** (in-world cluster preview, now governed by §6)
- **D48 Slice 4 — consent surfaces** (the per-surface, per-intent, per-viewer-trust opt-in flows users encounter)
- **D48 Slice 5 — hover chip + selectedHalo + BeaconA11yList re-render** (the secondary surfaces that inherit from §1 + §2)

Sequencing: Slice 1 first (the data layer); Slice 4 in parallel (the user-facing consents); Slices 2 / 3 / 5 after Slices 1 + 4 ratify.

Each slice ships with its own doctrine inheritance declared. No slice ships before the slice it depends on. Doctrine-first, then implementation, then observation — per Phil's Execution Rule (D-EXECUTION).

---

## Closing — the doctrine in one sentence the team can hold

> **HOTMESS recognises three identity modes on the globe; only one carries faces; faces are social acts the user has consented to performing; aftercare never surfaces faces; everything else is gated by intent + consent + viewer trust + proximity.**

The doctrine is written to be re-readable in that one line. The architecture, the rules, the protection, and the constitutional weight collapse into that sentence and expand back out into the full doctrine when needed.

Phil's reflection, recorded for the doctrine record:

> *"The moment you say 'a face on the globe is a social act,' you stop designing markers and start designing exposure contracts. That's the real transition."*

That sentence is the doctrine's spine, the audit's resolution, and the project's reframe — all at once.
