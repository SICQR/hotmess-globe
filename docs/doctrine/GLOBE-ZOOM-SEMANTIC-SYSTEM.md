# D51 — Globe Zoom Semantic System

**Status:** Constitutional, locked
**Ratified:** Phil 2026-06-02
**Path:** `docs/doctrine/GLOBE-ZOOM-SEMANTIC-SYSTEM.md`
**Inherits from:** D13 (Spatial Continuity), D43 (Cluster Preview), D49 (Entity Ontology), D50 (Globe Cinematic Rendering)
**Governs:** what each zoom level **means** — its emotional job, its semantic responsibility, what appears, what recedes
**Companion doctrine:** D50 — `GLOBE-CINEMATIC-RENDERING-SYSTEM.md`

---

## §0 Why this exists

D50 governs how the globe looks. This doctrine governs what each zoom level means.

Most globe systems fail the same way: they start cinematic at orbit level, then collapse into Google Maps as the user descends. The rendering stays "correct" but the meaning evaporates. The user feels like they switched applications mid-gesture.

HOTMESS cannot do that. The cinematic layer must condense into reality, not vanish. Every zoom level needs:

- purpose
- semantic responsibility
- rendering rules
- emotional responsibility

Without a per-zoom contract, every implementation decision becomes ad-hoc — "show more pins at higher zoom" — and the emotional architecture dies on contact with feature work. This doctrine locks the contract.

---

## §1 The HOTMESS Zoom Doctrine

The globe should progressively reveal:

- atmosphere
- density
- intent
- human presence
- social consequence

as the user gets closer.

The important thing: **each zoom level has a different emotional job.**

---

## §2 Z0 — Orbit / Planetary View

**Reference:** the NASA-like night-earth images Phil supplied during D50 ratification.

### Feeling

- awe
- scale
- "the world is alive"
- emotional gravity
- human civilization at night

### What the user must NOT yet think

- venues
- users
- profiles
- pins

### What the user SHOULD think

> "Something is happening somewhere."

### Visuals

- black earth
- gold city heat
- atmosphere rim
- soft activity bloom
- continental density
- almost no labels

No tactical UI feeling.

---

## §3 Z1 — Regional / Continental

### What now resolves

- Europe
- UK
- Thailand
- NYC corridor
- Berlin cluster

The glow starts separating into:

- nightlife density
- active regions
- event weather
- care-active regions
- pulse pressure

### What this level answers

> "Where is the energy tonight?"

Still not individual venues.

### Cluster behaviour at Z1

Clusters should behave like:

- weather systems
- heat pressure
- urban breathing

The globe is still cinematic first.

---

## §4 Z2 — City / Metro

### What now resolves

- London
- Bangkok
- Berlin
- NYC

The system starts revealing:

- districts
- nightlife corridors
- event concentration
- neighborhood energy

### Critical lock — this is where HOTMESS becomes socially useful

Not orbit. This.

### City-layer feel

The city layer should feel like:

- arteries
- nightlife circulation
- emotional geography

### Examples of valid Z2 labels

- "Soho warming"
- "Vauxhall active"
- "Peckham rising"
- "Kreuzberg dense tonight"

### What the user now asks

> "Where should I go?"

---

## §5 Z3 — District / Local

### What now resolves

- Soho
- Vauxhall
- Hackney
- Silom
- Chueca

This is where:

- venues
- events
- signals
- care
- Ghosted
- movement

become individually meaningful.

### Critical lock — DO NOT switch into "pin board mode"

Instead:

- density haze reduces
- semantic markers emerge from atmosphere
- event clusters separate
- venue glyphs stabilize
- care markers calm the field visually

The city should still feel alive underneath. The atmosphere recedes — it does not disappear.

---

## §6 Z4 — Street / Human Scale

Now the system becomes **socially consequential.**

This is where:

- a beacon means a person
- a venue means entering somewhere
- a care marker means support nearby
- a "Tonight" signal means movement opportunity

### What Z4 must become

- readable
- emotionally clear
- trust-safe
- low-noise
- mobile-usable

No more abstract atmosphere. Now:

- marker distinction matters
- routing matters
- social risk matters
- wrong-door collisions matter

This is where the earlier care/venue collision problem appeared (see D49 §15 field-test reconciliation). It is fatal at Z4 specifically.

---

## §7 The Key Principle

Most maps zoom like this:

> globe → map → pins

HOTMESS should zoom like this:

> planet → atmosphere → nightlife weather → district energy → human consequence

That is radically different.

---

## §8 The Visual Transition Rules

### Far away

Light behaves like:

- atmospheric heat
- civilization glow
- living density

### Medium

Light behaves like:

- nightlife pressure
- movement systems
- event weather

### Close

Light behaves like:

- social possibility
- human signals
- emotionally meaningful locations

---

## §9 The Most Important Rule

The user should NEVER feel:

> "the cinematic layer disappeared."

Instead: the cinematic layer should **condense into reality.**

Meaning:

- orbit glow becomes district heat
- district heat becomes nightlife corridors
- nightlife corridors become event clusters
- event clusters become venues / signals / care

It should feel like:

> resolving deeper into the city.

Not:

> switching applications.

---

## §10 Why this also solves the UI problem

Locking per-zoom semantic responsibility gives every zoom level:

- purpose
- semantic responsibility
- rendering rules
- emotional responsibility

Instead of: "show more pins as we zoom."

That's why most globe systems fail emotionally. They have no semantic contract per altitude — only a rendering one.

---

## §11 Per-zoom acceptance matrix (LOCK)

| Zoom | Name | Emotional job | What appears | What recedes | What is forbidden |
| --- | --- | --- | --- | --- | --- |
| Z0 | Orbit / Planetary | Awe, scale, life-on-earth | Atmosphere rim, continental light heat, civilization glow | Markers, labels, individual signals | Pins, "users online" counts, tactical UI |
| Z1 | Regional / Continental | Where the energy is | Regional density clusters, weather-like activity systems | Individual venues, individual people | "Find a venue" affordances |
| Z2 | City / Metro | Where should I go | District names, neighborhood energy, nightlife corridors | Granular pins | "27 people here" raw counts; pin-board affordances |
| Z3 | District / Local | Semantic markers emerge | Venue glyphs, beacon pulses, event clusters, care markers — all atmosphere-rooted | Density haze (reduces, not vanishes) | Pin-board mode; wrong-door care/nightlife collision |
| Z4 | Street / Human | Social consequence | Tap-affordable readable markers, distinct entity classes | Abstract atmospheric overlays | Tiny unlabelled dots where entity type matters; care/nightlife visual collision |

Any rendering decision that violates the row for its current zoom is a doctrine breach.

---

## §12 What this doctrine forbids

Until a slice spec inherits from this doctrine:

- "Show more pins at higher zoom" implementations
- Atmospheric layers that vanish on zoom transitions (must condense, not switch)
- Tactical labels (`27`, `12 users`, `5 places`) at Z0–Z2
- Pin-board affordances at Z3 (markers must emerge from atmosphere, not appear over it)
- Wrong-door collisions at Z4 — care must remain visually distinct from nightlife under thumb pressure
- Zoom-mode toggles that resemble application switching

---

## §13 Inheritance and the rendering layer

D51 is the **semantic contract**. D50 is the **visual contract**. Every implementation slice must inherit from both.

A rendering decision that satisfies D50 but breaks the D51 per-zoom acceptance matrix is still a doctrine breach. The reverse holds equally.

---

## §14 Ratification trail

- 2026-06-02 — D51 ratified. Triggered by Phil's "the emotional illusion must survive zoom depth" framing during D50 cinematic doctrine ratification. The recognition that rendering-correctness alone cannot survive descent locked the per-zoom semantic responsibility as a constitutional concern. The five-altitude contract (Z0–Z4) and the "condense, do not switch" rule were both locked in the same pass.
- §11 acceptance matrix locked: 2026-06-02 — per-zoom row becomes the doctrine breach surface; implementations are measured against it, not against subjective judgement.

---

*End of D51.*
