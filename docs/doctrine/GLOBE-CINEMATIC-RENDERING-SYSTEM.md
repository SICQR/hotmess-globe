# D50 — Globe Cinematic Rendering System

**Status:** Constitutional, locked
**Ratified:** Phil 2026-06-02
**Path:** `docs/doctrine/GLOBE-CINEMATIC-RENDERING-SYSTEM.md`
**Inherits from:** D13 (Spatial Continuity), D17 (Surface Layer), D43 (Cluster Preview), D48 (Spatial Identity Exposure), D49 (Entity Ontology)
**Governs:** every rendering decision in the Pulse globe — base layer, atmosphere, lighting, marker classes, cluster visuals, motion, mobile behaviour
**Companion doctrine:** D51 — Globe Zoom Semantic System

---

## Purpose

The HOTMESS globe must feel like a living city nervous system, not a map.

The reference direction is:

- black planetary depth
- dense gold urban light
- atmospheric bloom
- subtle green/aurora rim
- organic city heat
- darkness as emotional space
- human activity implied through light density

The globe should communicate:

> There are people awake somewhere right now.

Not:

> Here is a technical map with pins.

---

## Core Visual Principles

### 1. Darkness is the base layer

The globe must remain mostly dark.

Black space and dark land are not empty. They create:

- tension
- scale
- isolation
- anticipation
- emotional gravity

Avoid bright full-surface map textures.

### 2. City lights are the emotional layer

City lights should feel like heat, activity, nightlife, and human density.

They should be:

- gold / amber / dirty white
- softly bloomed
- uneven
- organic
- denser around urban areas
- not perfectly uniform
- not neon dots

Lights should read as atmosphere, not UI.

### 3. Pins must not dominate the planet

Pins, venues, beacons, events, and care markers sit above the living globe. They must not make the globe feel like a dashboard.

Hierarchy:

1. Earth darkness
2. City light heat
3. Atmosphere rim
4. Pulse haze
5. Clusters
6. Specific markers
7. Sheets / UI

### 4. Atmosphere rim

The globe should carry a faint atmospheric edge-light.

Reference:

- green/blue aurora arc
- very subtle
- cinematic
- planetary
- not sci-fi gimmick

Use it as a living boundary, not decoration.

Possible behavior:

- stronger when global activity is high
- softer when quiet
- slow breathing opacity
- never flashy

### 5. Activity should look like weather

HOTMESS activity should not appear only as static points. It should feel like social weather:

- local heat bloom
- density haze
- pulsing activity clouds
- event-today warmth
- care presence as calm light
- nightlife density as amber pressure

The user should sense where the night is gathering before reading labels.

---

## Entity Rendering Rules

### Venue

A venue is passive geography.

Visual:

- small gold pin or grounded venue glyph
- stable
- non-pulsing unless broadcasting
- visible at local/street zoom
- should feel like a place

Never render passive venues as live signals.

### Beacon / Signal

A beacon is active broadcast.

Visual:

- pulsing ring
- timed glow decay
- gold/amber if nightlife
- softer white if care/quiet hold
- rim intensity based on freshness
- fades as expiry approaches

A beacon must look temporary.

### Event Tonight

An `event_tonight` signal is a time-bound reason to move.

Visual:

- warmer gold rim
- stronger cluster halo
- TONIGHT chip
- optional time glint
- stronger when start time is near
- decays after event window

Event clusters should feel more urgent than ambient clusters.

### Care

Care is structural.

Visual:

- soft white / warm cream
- calm glow
- non-aggressive
- never alarm-red unless emergency
- should feel findable, not promotional

Care markers must be visually distinct from nightlife markers.

---

## Cluster Rendering Rules

Clusters must answer **what kind of thing** the user is seeing. A number alone is not enough.

Bad:

- "27"

Better:

- "27 nearby"
- "3 tonight"
- "Care nearby"
- "Signals live"
- "Soho warming"

### Cluster types

**Ambient Cluster** — nearby density / general activity.
Visual: soft gold cluster, light halo, neutral label.

**Event Cluster** — something is happening tonight.
Visual: TONIGHT pill, warm rim, stronger glow, soonest time available.

**Care Cluster** — care infrastructure nearby.
Visual: calm white glow, lower urgency, trust-first tone.

**Venue Cluster** — places exist here.
Visual: stable, grounded, less animated, no false urgency.

---

## Lighting System

Use layered rendering:

1. Base globe texture
2. Night earth / city lights texture
3. Bloom layer
4. Atmosphere rim
5. Cloud or haze layer
6. HOTMESS activity heat layer
7. Markers / clusters
8. UI sheets

City lights should use bloom, but controlled.

Avoid:

- overexposure
- neon rainbow gradients
- bright cartoon pins
- flat yellow dots
- excessive lens flare

---

## Motion Rules

Motion should feel alive, not busy.

Allowed:

- slow globe drift
- subtle atmospheric breathing
- beacon pulse
- cluster heat shimmer
- event glow rising as time approaches
- soft decay animation

Avoid:

- spinning too fast
- bouncing pins
- gamified animations
- particle chaos
- constant flashing
- arcade-like movement

---

## Mobile Rules

Mobile is primary.

The globe must:

- remain legible under thumb use
- keep important clusters away from nav collision
- preserve bottom sheet readability
- avoid tiny unlabelled dots where entity type matters
- support tap, long press, drag, and dismiss cleanly

At local zoom:

- care, venue, beacon, event must be visually distinguishable
- labels should appear only when useful
- tap affordance must be obvious
- no marker type should create a wrong-door collision

---

## Acceptance Criteria

The globe passes when:

- it feels cinematic before it feels technical
- black space dominates
- city lights feel alive and organic
- activity feels like heat/weather, not UI decoration
- care markers are distinct from nightlife
- events feel time-bound
- venues feel stable
- beacons feel temporary
- clusters communicate meaning, not just quantity
- mobile use remains clear
- no layer overwhelms safety access or sheets

The globe fails if it feels like:

- Google Maps with dark mode
- a sci-fi dashboard
- a strategy game
- a crypto globe
- a decorative background
- a pin board

---

## CLAUDE BUILD BRIEF — Cinematic HOTMESS Globe

### Goal

Upgrade the HOTMESS Pulse globe so it visually approaches the supplied real-world night-earth reference:

- dark planet
- gold city light density
- organic urban heat
- atmospheric green/blue rim
- subtle bloom
- living city nervous system

Do not rebuild the globe architecture. Do not change doctrine. Do not change entity routing. This is a rendering-system upgrade.

### Required Work

**1. Audit current globe rendering**

Find:

- globe component
- texture source
- marker renderer
- cluster renderer
- bloom / lighting pipeline
- atmosphere layer
- mobile rendering rules
- current entity marker styles

Document current state before changing.

**2. Add cinematic base layer**

Implement or improve:

- darker earth texture
- night city light texture
- gold/amber light treatment
- controlled bloom
- stronger black-space contrast

The globe should feel closer to orbit footage than a map.

**3. Add atmospheric rim**

Add faint atmosphere edge glow.

Rules:

- subtle
- green/blue tint
- slow opacity breathing
- no arcade neon
- no heavy animation

**4. Add activity heat layer**

Represent HOTMESS activity as atmospheric heat, not only markers.

Use existing data:

- venue density
- beacon density
- event_tonight clusters
- care clusters
- active signals

Activity should create:

- local haze
- soft bloom
- density glow
- emotional heat

**5. Distinguish marker classes**

At street/local zoom:

- venue = gold grounded pin/glyph
- beacon = pulsing temporary signal
- event_tonight = warm urgent rim / TONIGHT treatment
- care = soft white/cream calm marker

Fix wrong-door collision: care markers must not look identical to nightlife markers.

**6. Improve cluster semantics visually**

Clusters must communicate type. Do not show only raw numbers.

Cluster rendering should respond to:

- `dominant_intent`
- `event_summary`
- care presence
- `entity_kind`
- expiry/time window

Examples:

- "TONIGHT"
- "3 tonight"
- "Care nearby"
- "27 nearby"
- "Signals live"

**7. Preserve existing contracts**

Do not break:

- venue = place
- beacon = signal
- event_tonight = time-bound reason to move
- care = structural
- safety interrupt always wins
- globe persists under sheets
- L2 sheet routing
- peek-first behavior

### Technical Constraints

Use existing stack:

- React
- Vite
- TypeScript / JS where current code uses it
- Mapbox / Globe / Three pipeline already present
- Tailwind / CSS modules as existing
- no major dependency unless justified
- mobile-first
- performance-safe

No huge shader rewrite unless current code demands it. Prefer additive rendering layers.

### Acceptance Tests

**Visual**

- globe is mostly black
- city lights bloom gold
- atmosphere rim is visible but subtle
- markers remain readable
- care and venue markers are distinct
- event clusters feel warmer/more urgent
- passive venues do not pulse
- active beacons decay visually

**UX**

- tap target clarity improves
- no wrong-door collision between care and nightlife
- bottom sheets still readable
- right rail does not collide
- safety FAB remains visible
- mobile viewport still performs

**Technical**

- no console errors
- no map blanking after search flyTo
- no render crash on slow mobile
- no broken cluster tap events
- no routing regression
- no safety overlay regression

### Ship Order

- **PR 1** — Rendering audit + doctrine doc. No code changes except docs.
- **PR 2** — Base globe cinematic texture / lighting pass. Darkness, city lights, bloom, atmosphere rim.
- **PR 3** — Marker differentiation. Venue / care / beacon / event_tonight marker classes.
- **PR 4** — Activity heat layer. Density haze / social weather.
- **PR 5** — Mobile polish + performance pass. FPS, tap targets, collision, low-end behavior.

### Final Rule

Do not make the globe prettier. Make it feel more alive. That is the critical question.

Because the globe only works if **the emotional illusion survives zoom depth.**

Most products fail here. They start cinematic at orbit level… then collapse into:

- Google Maps
- GIS tooling
- flat pins
- tactical clutter
- UI noise

Your system cannot do that.

The emotional transition must feel like:

> descending into the living night.

Not:

> switching map modes.

For the full per-zoom-level semantic responsibility, see the companion doctrine D51 — `GLOBE-ZOOM-SEMANTIC-SYSTEM.md`.

---

## Ratification trail

- 2026-06-02 — D50 ratified. Triggered by Phil's reference-photo direction (NASA-like night-earth imagery) and the recurring tactical/cinematic collapse seen in D43 cluster work and D49 entity ontology field tests. The rendering-vs-architecture distinction is the lock: this doctrine governs rendering, never routing.
- Companion D51 ratified same session to govern zoom-level semantic responsibility.

---

*End of D50.*
