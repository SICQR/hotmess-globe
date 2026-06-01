# D49 — Entity Ontology: Existence, Broadcast, Perception

**Status:** locked — Phil ratified 2026-06-01
**Owners:** substrate
**Supersedes:** none (load-bearing under D12, D43, D48)
**Cross-references:** D12 (4-axis signal taxonomy), D43 (in-world cluster preview), D48 (spatial identity exposure), sacred-invariants Constitutional Substrate.

---

## §0 — The architectural fault line

Three things were accidentally collapsed into one category called "beacon":

- **Existence** — a thing IS in the world
- **Broadcast** — a thing is currently signalling
- **Perception** — what others see/feel as a result of the broadcast

This collapse made the product accidentally claim *"everything visible is socially active"* when in reality *"some things are merely present."* The difference is enormous in nightlife UX.

This doctrine separates the three.

---

## §1 — Entity types (locked)

The four entity types are the only first-class noun categories in the system.

| Type | Definition | Persistence |
|---|---|---|
| Venue | A place. Geography. | Persistent |
| Event | A scheduled occurrence at a venue. | Time-bounded |
| Person | An agent capable of broadcasting state. | Persistent (account-bound) |
| Route | A path of movement between places. | Time-bounded |

No other entity types. Beacon is not an entity. Signal is not an entity.

---

## §2 — Beacon is a verb

Beacon is not an entity class. Beacon is:

- an **action** (something an entity does)
- a **state transition** (the entity's broadcast status changes)
- a **capability** (entity has the affordance to broadcast)

A venue can beacon an event. A person can beacon their own state. A venue can beacon its own presence ("open and busy"). A route can beacon movement.

Beacon as a noun is wrong language. Calling a record in the database a "beacon" was the original sin. The correct field name for a record is **signal**.

---

## §3 — Signal is the perception

A signal is what an observer perceives as a result of a beacon action.

**A signal cannot exist without an origin entity.**

No free-floating broadcast objects. Every signal belongs to person / venue / event / route. This prevents future schema drift.

---

## §4 — Signal schema (required fields)

Every signal must have:

| Field | Type | Example |
|---|---|---|
| `origin_type` | enum | `venue` |
| `origin_id` | fk | `rvt_001` |
| `signal_type` | enum | `event` |
| `intent` | enum | `event_tonight` |
| `expires_at` | timestamptz | `02:00` |
| `visibility` | enum | `public` |
| `confidence` | enum | `verified` |

`signal_type` ∈ { `event`, `presence`, `state`, `movement` }
`intent` ∈ { `looking`, `hosting`, `cruising`, `aftercare`, `quiet_hold`, `arriving`, `market`, `event_tonight`, … }
`visibility` ∈ { `public`, `mutual`, `private` } (D48 §3.1 register cascade applies)
`confidence` ∈ { `verified`, `observed`, `self_declared` }

The schema lets downstream features layer cleanly without re-doing the ontology:
- venues can auto-beacon from occupancy
- events can inherit venue trust
- routes can decay dynamically
- care signals can gain moderation weighting
- D48 consent overlays suppress per-surface visibility

---

## §5 — Render contracts

Two simultaneous world simulations.

### §5.1 — Geography layer
*"What exists here."*

- Always rendered
- Low atmospheric weight (no pulse, no glow, no intent colour)
- Persistent regardless of broadcast state
- Source: `hm-venues`

Contents: venues. Saunas, gyms, bars, clubs, care locations, recurring institutions.

### §5.2 — Atmosphere layer
*"What is happening here right now."*

- Rendered on top of geography
- Temporal — signals decay/expire
- Intent-coloured (D12 vocabulary)
- Pulsing where appropriate (D43 §9 cadence)
- Source: `hm-signals`

Contents: signals. Person presence/state, venue presence broadcasts, venue event broadcasts, route movement.

A venue that is broadcasting an event renders **twice**: once as persistent geography (low-weight venue marker), and once as an active signal pulse on top.

---

## §6 — The architectural test

For every rendered object, ask:

> *"Is this visible because it exists, or because it is broadcasting?"*

If the answer is unclear, the ontology is collapsing. Stop and fix the substrate before adding UI.

---

## §7 — The passive venue rule (load-bearing)

**A passive venue is not social proof. A passive venue MUST NOT enter the signal source.**

Examples:
- Pleasuredrome merely present → `hm-venues` only.
- Pleasuredrome broadcasts "busy tonight" → `hm-venues` + `hm-signals`.
- RVT exists → `hm-venues` only.
- RVT broadcasts Duckie tonight → `hm-venues` + `hm-signals` (signal_type = event).

This rule prevents:
- passive geography polluting atmospheric density
- wrong tap routing
- incorrect cluster language
- false social heat
- misleading emotional promises
- "dead city" perception arriving after interaction

---

## §8 — Cluster semantics (cascade from D43)

Cluster behavior is now category-aware.

### §8.1 — Venue cluster
Low-zoom rollup of geography.

- Visual: subtle ring/badge with count, no atmosphere
- Hover: nothing (geography is not atmospheric)
- Tap: zoom in (Mapbox `getClusterExpansionZoom`)
- Copy: "8 venues here" or similar geography language. No intent vocabulary.

### §8.2 — Signal cluster
Atmospheric rollup of active broadcasts.

- Visual: the D43 chip Phil ratified (smoked-glass capsule, gold rim, intent-coloured atmosphere)
- Hover/long-press: composer-driven chip with intent mix
- Tap: zoom in (the chip is the preview; no "SIGNALS HERE" list sheet)
- Copy: D43 ratified — "N nearby · looking · hosting · quiet" / dense per-intent counts / "Care held here" for aftercare-only

The signal cluster's `intent_mix` extends to include `event_tonight` as an intent class so venue-event broadcasts surface correctly in the atmospheric chip.

### §8.3 — Mixed area
At any zoom where both venue and signal clusters overlap, both layers render. The venue cluster sits underneath as quiet geography; the signal cluster's chip surfaces on top on hover/long-press.

---

## §9 — Tap routing (cascade from D17 §4)

| Tap target | Opens |
|---|---|
| Venue marker | Venue card (hours, photos, link to drop a beacon there) |
| Person signal | Profile sheet (D48 register cascade applies) |
| Venue-event signal | Event card (with parent venue card linkable) |
| Route signal | Route card |
| Venue cluster | zoom in (no L2 sheet) |
| Signal cluster | zoom in (the D43 chip is the preview) |

The "SIGNALS HERE" sheet (#307) is **deprecated** by this doctrine. It was the right answer when "beacon" was the only category; it is wrong now because it lists passive venues as signals.

---

## §10 — A11y register (cascade from D43 PR 4 + D17 §4)

The screen-reader register follows the same split:

- Venue list region: "Venues here. Tab to move between venues, Enter to open."
- Signal list region: "Signals here. Tab to move between signals, Enter to activate." — operates only on active broadcasts. Uses the D43 atmospheric copy contract.

D43 Slice A's deferred a11y cluster row consumer (#784 reverted) re-attempts here, against the new signal source only, where queryRenderedFeatures gap can be repro'd locally.

---

## §11 — Anti-drift

| Rule | Why |
|---|---|
| Beacon as noun is wrong language | Beacon is a verb. Naming records "beacons" causes the collapse. |
| A signal cannot exist without an origin entity | Prevents free-floating broadcasts. |
| Passive venues never enter `hm-signals` | The load-bearing §7 rule. |
| Render every object answering the §6 test | Self-checking against ontology collapse. |
| Schema additions go to `signals` table only | Venues/events have their own schema; do not bolt new signal fields onto venue records. |

---

## §12 — Cascade implications (build order)

This doctrine cascades through implementation in this exact order. Do NOT reorder.

1. **Doctrine lock** (this document)
2. **Source split** — `mapboxLayerStack` adds `hm-venues` source; existing `hm-public` semantically becomes `hm-signals` (rename + behavior change). `toPublicSafeFeatureCollection` splits its output by entity_kind.
3. **Render split** — venue layers added (markers, no atmosphere); signal layers existing (cluster chip stays).
4. **Routing split** — tap handlers route by entity_kind; "SIGNALS HERE" sheet deprecated on signal source.
5. **Cluster semantics** — chip composer adds `event` intent class; venue cluster gets minimal "N venues here" zoom-in interaction.
6. **Visual refinement** — venue marker styling; right-rail flattening; editorial card peek mode.

Skipping steps causes the UI to fight contaminated data. Each step assumes the previous one is true on production.

---

## §13 — Revenue model implication

Identified but parked under the build order (do not implement until step 6+).

A venue card can host **event listings** as slide-up cards within the venue surface. Each listing is a venue-broadcast event signal. The venue pays to surface its event listings prominently. This is a revenue model that emerges naturally from the ontology split — venues become commercial surfaces; events become inventory. No separate ad system needed.

Doctrine note: revenue cannot be coupled to signal eligibility. A paid event listing surfaces at higher visual weight in the venue card, but does NOT inflate its atmospheric chip weight (§3.4 default-down still applies, §7 passive-venue rule still applies). Money buys real estate on the venue surface, not lies about social density.

---

## §14 — Closing

The product is both a map and a living atmospheric system. Most apps collapse those into one dataset and end up emotionally lying to users. HOTMESS separates them at the substrate so the city stays honest:

- a passive venue is geography
- an active broadcast is atmosphere
- the user always knows which one they're seeing

Locked. Build proceeds per §12.
