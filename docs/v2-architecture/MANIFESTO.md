# HOTMESS Globe — V2 Architectural Manifesto

> **Status:** canonical architectural North Star, not a sprint plan
> **Authored by:** Phil Gizzie · 17 May 2026 · Koh Samui
> **Adopted as canonical:** 17 May 2026, weekend pre-launch
> **Implementation roadmap:** [`docs/v2-architecture/ROADMAP.md`](./ROADMAP.md)

This document defines what HOTMESS Globe is meant to become.

It does not define what ships this weekend, this month, or this quarter. Those decisions live in the roadmap. This document is what every future engineering, design, and product decision on the globe is measured against.

When the roadmap and this manifesto disagree, this manifesto wins. The roadmap adapts.

When a sprint adds something not in this manifesto, the manifesto is updated first — not the sprint.

When something already shipped contradicts this manifesto, it's flagged as architectural debt, not as a reason to weaken the manifesto.

The four lines that load-bear the whole document:

- _"Satellite-level awareness collapsing into venue intimacy."_
- _"Care infrastructure is first-class."_
- _"This is not a globe full of pins. It is living queer signal infrastructure."_
- _"Scoped to viewport and zoom state — the world is not always relevant."_

Everything below is in Phil's voice.

---

## CONTEXT

We need to evolve HOTMESS Globe from a "3D map with pins" into a layered spatial signal system.

Current implementation works visually at wide zoom, but the interaction model breaks down when attempting venue-scale detail directly on the globe.

This is not a bug-fix task.

This is a world-model + rendering-architecture redesign.

Use the existing deployed HOTMESS ecosystem, Supabase infrastructure, realtime systems, connectors, and Mapbox stack already available in the project.

Do not simplify the ambition.

Refactor the architecture to support cinematic scale + tactical precision simultaneously.

---

## PRODUCT DIRECTION

The globe should feel like:

- a living queer signal network
- nightlife intelligence infrastructure
- emotional/cartographic radar
- a care-aware social operating system
- satellite-level awareness collapsing into venue intimacy

The experience should transition seamlessly between:

1. Planetary awareness
2. Regional signal density
3. District-level tactical exploration
4. Venue-level interaction

The current implementation tries to render all four simultaneously.

That must change.

---

## NEW SPATIAL MODEL

### Zoom state system

Implement explicit spatial modes:

```ts
enum GlobeMode {
  ORBIT,
  SIGNAL,
  DISTRICT,
  VENUE
}
```

These are not cosmetic.

Each mode has:

- different render rules
- different data density
- different subscription scope
- different interaction systems
- different UI hierarchy

### 1. ORBIT MODE

**Purpose:** planet-scale emotional signal visualization. This is atmosphere + density + movement. Not venue interaction.

**Render only:** city pulses · regional glow fields · radio activity · route arcs · signal density · care infrastructure · major activity clusters · weather/light cycles.

**Never render:** detailed labels · venue cards · avatars · dense metadata · expanded overlays · DOM-heavy marker systems.

**Technical direction:**

- **Prefer:** GPU particles · instanced rendering · emissive signal shaders · clustered aggregates · sprite systems.
- **Avoid:** individual React nodes · large DOM overlays · high-frequency marker updates.

### 2. SIGNAL MODE

**Purpose:** reveal meaningful individual signals. This is where users begin discovering activity.

Signals become typed entities:

```ts
type SignalType =
  | "radio"
  | "party"
  | "care"
  | "cruise"
  | "host"
  | "shop"
  | "live"
  | "district";
```

Each type should define:

- emissive behavior
- pulse timing
- hover interaction
- visibility priority
- zoom thresholds
- cluster rules

Examples:

- **CARE** — warm amber breathing beacon
- **PARTY** — aggressive flare pulse
- **RADIO** — persistent transmission ring
- **CRUISE** — diffuse heatmap behavior

### 3. DISTRICT MODE

**Critical architectural shift:** at close zoom, the globe should stop being the primary interaction surface. Transition into tactical district rendering. Use Mapbox as the precision layer.

**District mode responsibilities:** venue precision · street geometry · tactical overlays · hover systems · popup interaction · district heatmaps · clustering · signal routing · local density visualization.

Adopt the patterns from Mapbox's documented examples directly into the HOTMESS spatial system: hover state architecture · popup interaction · feature-state styling · heatmaps · lighting presets.

### 4. VENUE MODE

Only at venue depth should we render:

- venue cards
- hosts
- room state
- live broadcasts
- schedules
- check-ins
- consent states
- care overlays
- community activity

This should feel like "nightlife operating system."

Not: "Google Maps pins."

---

## CAMERA SYSTEM

Transitions between modes should be cinematic.

Use: eased camera rails · atmospheric fades · signal amplification · progressive reveal · opacity interpolation · audio/environment transitions.

The globe should feel alive during zoom. Not like stepping between unrelated screens.

---

## DATA + REALTIME ARCHITECTURE

**Current problem:** the app behaves as though every entity globally matters simultaneously. That creates unnecessary rendering pressure and subscription churn.

**Required refactor:** scope realtime subscriptions to viewport + zoom state.

```ts
// Bad
subscribeToAllSignalsWorldwide()

// Correct
subscribeToViewportSignals(bounds, mode)
```

Realtime density should scale with zoom depth.

---

## PERFORMANCE TARGETS

- **ORBIT** — minimal CPU overhead · GPU-first rendering · aggressive clustering · no detailed labels
- **SIGNAL** — controlled signal count · pooled objects · typed rendering
- **DISTRICT** — Mapbox handles tactical geometry · overlays become interaction-first
- **VENUE** — lazy-loaded detail systems · mount only when needed

---

## RENDERING RULES — DO NOT

- ❌ Render large React trees inside globe loops
- ❌ Use DOM labels globally
- ❌ Keep venue detail active at orbital zoom
- ❌ Treat the globe as a database dump
- ❌ Spawn realtime listeners without spatial scope

---

## THREE.JS / RENDER STACK

Audit the rendering stack for duplicate Three.js imports and renderer overlap. Current architecture likely mixes: `react-globe.gl` · `globe.gl` · `@react-three/fiber` · `drei` · Mapbox custom layers.

We need a single authoritative Three runtime.

---

## SERVICE WORKER + CACHE STRATEGY

Current cache strategy is too broad for dynamic spatial rendering. Refactor caching into explicit layers:

```
hotmess-static
hotmess-map
hotmess-media
hotmess-api
```

Avoid caching volatile auth/session flows aggressively.

---

## UX REFERENCES

The experience should evoke:

- satellite intelligence systems
- cyberpunk transit maps
- Berlin nightlife infrastructure
- queer weather systems
- emotional radar
- tactical urban sensing

The visual language is: masculine · cinematic · dark · electric · intimate · infrastructural · care-aware.

---

## CARE SYSTEMS

Care infrastructure is first-class. Care nodes should feel stable, safe, warm, grounding, persistent.

Visually distinct from nightlife energy. Less aggressive. More breathing/pulsing warmth.

---

## IMPLEMENTATION PHASES

### Phase 1 — Stabilization

Reduce render density · eliminate unnecessary object counts · dedupe rendering dependencies · remove DOM-heavy globe behavior · regionalize subscriptions.

### Phase 2 — World model

Implement `ORBIT / SIGNAL / DISTRICT / VENUE` as real render states. Not just zoom values.

### Phase 3 — Tactical districts

Integrate Mapbox tactical layer: district overlays · hover systems · heatmaps · venue precision · popup architecture · layered signal rendering.

### Phase 4 — Immersion

Cinematic transitions · environmental motion · adaptive atmosphere · signal choreography · audio-linked spatial behavior.

---

## SUCCESS CRITERIA

The finished system should:

- feel alive
- scale naturally
- remain readable at all zoom levels
- preserve cinematic atmosphere
- support tactical venue interaction
- maintain performance under density
- support future growth without collapsing UX

The final result should feel like "living queer signal infrastructure."

Not "a globe full of pins."

---

## Postscript — how this document is used

This manifesto is not aspirational marketing copy. It is the architectural contract for HOTMESS Globe. Every PR that touches `src/components/globe/*`, `src/hooks/use*Globe*`, the realtime subscription layer, or the spatial render path should be measured against it.

Sprint plans, time horizons, and "what ships this week" decisions live in `ROADMAP.md`. That document changes weekly. This one doesn't.

If you are reading this and the current globe behaviour contradicts something here, the gap is tracked in the roadmap with an issue number. The contradiction is debt, not licence.
