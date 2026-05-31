# D34 — Trajectory & Connection Flows Doctrine

**The connective tissue doctrine. The movement layer is the OS.**

**Status:** Locked
**Written:** 2026-05-31
**Author:** Phil
**Inherits from:** D08 (visibility), D14 (routing continuity), D17 (surface layer), D19 (marketplace), D20 (identity).
**Inherited by:** D25 (messaging, when written), D26 (Right-Now layer, when written), D31 (venue partner power), all future surfaces that connect humans.

---

## §0. Sacred Trajectory Rule

**HOTMESS routes people through shared trajectory, not isolated transactions.**

That sentence reframes the entire OS. Listings, beacons, mutuals, nightlife movement, chats, ticket handoffs, convergence, Ghosted, aftercare — all become one system. Without this doctrine those remain partially isolated feature worlds. With it, they are surfaces of the same continuous behaviour.

---

## §1. The Conceptual Primitive — Shared Trajectory

HOTMESS is not a map. It is not a marketplace. It is not a chat app. It is not a nightlife directory.

**HOTMESS is trajectory infrastructure.**

A "transaction" in HOTMESS is never just item transfer. It is **two people temporarily entering the same trajectory through nightlife.** A beacon is not a pin; it is the start of a shared arc. A listing is not inventory; it is a moving object in someone's night. A chat is not the destination; it is coordination between two trajectories about to converge.

The canonical term — **shared trajectory** — should appear in:
- onboarding copy
- beacon doctrine surfaces (D12 hook)
- route language (D14 evolves to this)
- marketplace flows (D19 hook)
- chat affordances (D25 when written)
- profile state
- post-handoff residue

It is the conceptual bridge between people, nightlife, movement, commerce, and care.

---

## §2. The Connection Escalation Ladder

This is the primitive every HOTMESS surface needs to know its position on. The ladder explains the entire OS in one table.

| Stage | Example surfaces | What it feels like |
|---|---|---|
| **Ambient** | Ghosted, Pulse, beacons | Proximity, presence, the city as backdrop |
| **Contextual** | Listings, tickets, routes, care signals | A specific reason to converge appears |
| **Coordinated** | Chat, "headed there," ETA share | Two trajectories begin to align |
| **Converged** | Mutual meetup, venue handoff, in-person | Trajectories cross; the actual moment |
| **Trusted** | Repeat convergence, durable mutual | Pattern recognition; the night returns |
| **Care** | SOS, aftercare, recovery, residue | Trajectory holds after the event ends |

Every feature must know where on this ladder it operates. If a feature can't place itself on the ladder, it's an isolated tab, not part of the OS.

The ladder is **not directional in one direction only.** Movement happens both ways:
- Care → Ambient (someone you helped becomes part of your city)
- Trusted → Coordinated (mutual nights become specific nights)
- Coordinated → Contextual (the chat ends, the listing closes, the route completes)

The ladder is the structural model of how humans actually use HOTMESS over time.

---

## §3. The Universal Connection Laws

These apply regardless of entry surface. Every surface inherits all seven.

### §3.1 Every Route Preserves Continuity

A user should never feel: *"I left one app section and entered another app."*

A beacon tap opens a profile preview. The profile opens a chat. The chat opens a route. The route opens a venue handoff. **One continuous descent.** Not modal soup. Not surface fragmentation. Not a chain of disconnected screens that happen to share a brand.

The technical implication: state survives transitions. Context survives transitions. Visual language survives transitions. If a transition feels like leaving HOTMESS and entering "HOTMESS for product X," that transition is doctrinally wrong.

### §3.2 Context Survives Surface Changes

When a connection begins from "Looking for 1 Fold ticket," "Heading to Eagle," "Aftercare nearby," or "One spare in the cab," that context **persists** into:
- the profile preview
- the chat thread
- the route render
- the handoff UI
- the convergence affordance
- the post-event residue

No more "hey" as the opening message. No more chat threads that have forgotten why the two people are talking. The OS preserves *why these two people crossed paths.*

This is one of the largest HOTMESS-native differentiators. Mainstream apps drop context at every surface boundary; HOTMESS carries it forward.

### §3.3 Ghosted Is Not "Dating Mode"

Ghosted is **ambient proximity discovery**, not a hookup funnel. The distinction is doctrinally binding.

From Ghosted, every downstream route must feel valid:
- Ghosted → beacon (joining a moment)
- Ghosted → listing (browsing a friend's preloved)
- Ghosted → ticket (passing on a spare)
- Ghosted → aftercare (the morning after)
- Ghosted → mutual (the second time you cross)
- Ghosted → route (heading there together)

If only the "hookup" route feels native and the others feel grafted on, Ghosted has collapsed back into "grid app with extra tabs" and the whole system is structurally compromised. The OS holds when all six routes feel equally Ghosted-native.

### §3.4 Listings Are Routeable Nightlife Objects

A listing is not static inventory. A listing is a **moving object in someone's night.**

A listing can be:
- "heading there" (the seller is en route to the venue)
- "pickup nearby" (the seller has paused)
- "available after" (the listing is gated on event timing)
- "one left" (last-of-quantity in motion)
- "passing through Soho" (geographic transit)
- "meet outside Eagle" (a known venue handoff)

Listings inherit Pulse behaviour. They emit, decay, converge, and resolve through nightlife signals. No other resale platform does this — they all treat inventory as static rows in a database. HOTMESS treats listings as in-motion objects with the same lifecycle grammar as beacons.

This is the largest single architectural advantage HOTMESS holds in commerce. Implementation should match: listings are subject to D08 visibility, D12 beacon semantics, D14 routing continuity, D19 commerce constraints, and D20 identity layers — all simultaneously.

### §3.5 Chat Is Not a Destination

Mainstream apps collapse everything into DM. HOTMESS structurally resists.

**Chat is:**
- coordination
- continuity
- escalation
- convergence

**Chat is NOT:**
- the primary experience
- the conversion endpoint
- the metric to maximise
- the surface that "wins"

The city remains the primary experience. Chat is the layer between trajectories — useful, necessary, not central.

Doctrinal binding: **chat should resolve back into movement whenever possible.** A "headed there" button beats a five-message planning thread. A shared route beats a chat about meeting. A check-in timer beats "are you here yet?" Chat collapses back into trajectory; it is not where trajectories end.

### §3.6 Routes Are Social, Not Navigational

This is where D14 (Routing Continuity) evolves under D34.

Routes feel like:
- *heading there too*
- *meet outside*
- *one stop away*
- *nearby now*
- *same trajectory*
- *converging*

Routes do NOT feel like:
- Apple Maps handoff
- "Optimised arrival time"
- "Fastest route via M25"
- transport UX
- logistics calculation

The same primitive — movement through space — is rendered with **human gravity**, not navigation gravity. D14 already prohibits the Google Maps escape; D34 extends that by making the affirmative case: routes are how two people are coming into the same place at the same time.

### §3.7 Every Path Inherits D08 + D20

Universal protection rule. No route, no surface, no flow, no connection path may:
- reconstruct off-grid presence (D08 + D19 §1)
- leak online state
- force disclosure (D20 §3, §10, §10.1)
- expose Legal Identity (D20 §2)
- bypass pseudonymity (D20 §6)
- expose Recovery or Safety identity (D20 §2)

This is stated once globally so future surfaces inherit automatically. If a new feature requires breaking any of the above, the feature is doctrinally wrong — regardless of UX justification.

---

## §4. Transaction Connection Flows

This section closes the gap D19 left around how humans actually move through commerce.

### §4.1 The First-Contact Moment

A first contact in HOTMESS commerce should never feel like cold DM spam.

**Structured openers** appear contextually, derived from beacon state:
- "Still available?"
- "Need one?"
- "Can pick up after Eagle"
- "Passing one on?"
- "Heading there too?"
- "Outside in 10?"
- "Aftercare run — pickup tomorrow?"

These are **low-pressure defaults**, not required scripts. Users may type freely. But the system surfaces context-aware openers so the default behaviour is observational, not predatory. "Hey" should never be the default first message in a commerce thread.

The opener inherits trajectory context (§3.2): if the listing said "available after Fold," the opener defaults to "Heading to Fold?" not "Hi."

### §4.2 Mutual-First Routing

The HOTMESS-native advantage. When two users:
- are mutuals
- share venue overlap
- are converging on the same beacon
- have a prior trajectory in common

…the system **biases that connection path first**. Specifically:
- mutual paths surface above anonymous paths in discovery
- friction is lower (no boo-gate, no first-contact warning for already-mutuals)
- context is richer (the system can render "you've crossed before")
- copy adapts ("already in the same night")

This is profoundly different from resale platforms, which treat every buyer as a stranger. HOTMESS biases the social path because the social path is the safer path AND the better experience.

### §4.3 The Handoff Model

Exchanges happen in **nightlife-native locations**, not warehouses:

- **Venue-linked handoff** — at or outside a venue both parties recognise
- **In-app meet point** — system-rendered convergence pin
- **"Outside Eagle"** — known landmark, no exact coordinate exchanged
- **"Before doors"** — temporal handoff bound to event start
- **"Cab from Vauxhall"** — shared-trajectory handoff (the ride IS the meet)
- **"Door transfer"** — at the venue entrance, ticket-state transfer
- **"Aftercare pickup tomorrow"** — handoff bound to recovery state (D15 territory)

Doctrinally rejected handoff language:
- "shipping"
- "fulfilment"
- "warehouse"
- "delivery to address"
- "tracking number"
- generic ecommerce logistics

Shipping is *supported* (D19 §5.8) — it is not the default mental model. The default mental model is nightlife logistics. The UI reflects that ordering.

### §4.4 Safety Escalation Path

Every transaction connection inherits HOTMESS safety primitives:
- SOS (instant escalation to trusted contacts via D20 §7.2)
- Trusted contacts (per D20 §7.2)
- Off-grid dignity (D08 + D19 §1 + D20 §9)
- Temporary location sharing (bounded, expiring, never persistent)
- Check-in timers (D08-adjacent safety surface, integrates here)
- Post-handoff acknowledgement (the "did it happen safely?" prompt)

This is where HOTMESS becomes infrastructure rather than a marketplace. Late-night exchanges, unknown mutuals, ticket handoffs, post-club pickups — each of these is where safety primitives matter most, and each is where mainstream marketplaces have nothing. HOTMESS already built the primitives in D08 / D20 / D15; D34 binds them to commerce flows automatically.

### §4.5 Presence Leakage Rules

When seller is off-grid and buyer is not (or vice versa), what leaks? This intersects D08, D19 §1, D20 §2, and D25 (when written).

Binding rules:
- **"Typing…" indicators** do NOT render across off-grid boundaries. An off-grid seller does not emit typing presence to a public buyer.
- **"Seen / read receipts"** do NOT cross off-grid boundaries either direction.
- **Handoff ETA share** is bounded and expiring; it does not retroactively override off-grid for any other surface. Sharing "I'll be at Eagle in 10" with one counterpart does not surface presence on Pulse, Ghosted, or any third-party view.
- **"Heading there"** decays automatically — at event start, at handoff acknowledgement, or after a default window — whichever comes first.
- **Ticket exchange does not surface activity** beyond the two-party thread. No "X just listed a ticket" Pulse signal for off-grid sellers (already locked in D19 §6.10).

The default position: any presence inferred from a commerce action is bounded to the smallest scope necessary for the handoff to succeed, expires automatically, and does not reconstruct general visibility. Commerce cannot become a side-channel around D08. Restated and applied to the message layer.

### §4.6 No Deal-Optimisation Behaviour

Doctrinally prohibited from any HOTMESS commerce surface:
- bidding wars
- auction mechanics
- "highest offer" framing
- surge pricing
- urgency manipulation
- "3 others interested"
- recommendation ranking by transaction value
- "best offer wins"
- countdown-to-deal mechanics
- "competing buyers" UI
- algorithmic upsell at handoff

The moment commerce becomes optimisation, HOTMESS dies culturally. The system optimises for:
- continuity
- convergence
- circulation
- successful handoff
- low-friction trust

Not extraction. The §0 sacred rule (and D19 §0) keeps winning here.

### §4.7 Resolution States — Language

Full language set, binding across all commerce surfaces:

**Use:**
- Passed on
- Sorted
- Covered
- Claimed
- Found one
- Going together
- Heading there
- Picked up
- Handed over

**Avoid:**
- Sold
- Buyer
- Seller completed
- Transaction successful
- Marketplace completed
- "Order fulfilled"
- "Item shipped" (as terminal state — fine as in-flight state)

This extends D19 §6.10's "Passed on > Sold." The full table is now the binding tone. Future UI implementers: pull from the left column.

---

## §5. Cross-Doctrine Inheritance Map

D34 sits as the connective tissue between existing doctrines. Specific bindings:

- **D08 Visibility** — every trajectory surface inherits visibility state. Off-grid users participate in trajectories without emitting general presence.
- **D12 Drop Beacon** — beacons are the Ambient stage of the §2 ladder. Beacon semantics are unchanged; D34 names their role in the larger movement.
- **D14 Routing Continuity** — D14 already prohibited the Google Maps escape. D34 evolves D14 by adding the affirmative — routes are social, not navigational (§3.6). D14 should reference D34's trajectory framing in its next iteration.
- **D15 Care Language** — Care is a stage on the ladder (§2). Trajectories don't end at handoff; they continue through aftercare. D15 already locks the tone; D34 binds it as a stage.
- **D17 Surface Layer** — every trajectory surface respects D17 z-index and chrome rules. Trajectory does not override surface hygiene.
- **D19 Marketplace** — the gap D19 left around how humans connect is filled by §4 here. D19 §6.10 Commerce Beacon Doctrine is the Contextual stage; §4 is the Coordinated stage.
- **D20 Identity** — every trajectory inherits the four-layer model. Trajectories do not propagate identity across layers. §3.7 is the universal binding.
- **D25 Messaging (future)** — chat is the Coordinated stage on the ladder. D25 should adopt §3.5 (chat is not a destination) and §3.2 (context survives) as anchor sentences.
- **D26 Right-Now Layer (future)** — Right-Now sits at the Ambient/Contextual boundary. D34 defines what it routes from and into.
- **D31 Venue & Partner Power (future)** — venues are surfaces on which trajectories converge. D31 inherits §3.7 (no venue may bypass visibility/identity protections via partnership).

---

## §6. Acceptance Test

**No HOTMESS surface may break trajectory continuity, drop connection context across transitions, or render any stage of the §2 ladder as a destination rather than a passage.**

Specific failure modes that fail D34:
- A first message defaulting to "hey" with no inherited context
- A route surface that renders as Apple Maps handoff
- A chat thread that loses the "why" of the original connection
- A listing that behaves as static inventory instead of a moving object
- A beacon → chat transition that feels like opening a separate app
- An off-grid user emitting presence through a commerce action
- A Ghosted route that only feels native to hookups
- Trajectory residue that fails to persist after a successful handoff

A second test, at the language layer:
> If a feature ships with copy that says "Sold," "Order," "Transaction," "Buyer," or "Seller completed," the build fails D34 §4.7.

---

## §7. Final Operating Sentence

**HOTMESS routes people through shared trajectory, not isolated transactions.**

That sentence is the entire doctrine compressed. If a future feature, integration, or partner request would fragment trajectory back into isolated transactions — the request is doctrinally wrong, regardless of conversion uplift or commercial framing.

The movement layer is the OS. Everything else is a surface on it.
