# Globe Mapbox Local Mode

Purpose: define how the HOTMESS Globe transitions from:

- cinematic planetary exploration;
- atmospheric city energy;

INTO:

- usable local navigation;
- readable density;
- real map detail;
- venue interaction;
- proximity discovery.

This document exists because:

- the current Globe blurs when zooming;
- there is no true local map mode;
- oversized beacon pillars dominate cities;
- local interaction density will become unusable without policy.

The solution is NOT:

```txt
keep zooming the globe harder
```

The solution is:

```txt
transition from globe renderer into local map system
```

---

# Core philosophy

## The Globe is cinematic

The Globe should feel:

- emotional;
- atmospheric;
- social;
- alive;
- energetic;
- global.

The Globe is NOT:

- a GIS tool;
- Google Earth clone;
- flat utility map.

---

## Local mode is functional

Local mode exists for:

- venue discovery;
- navigation;
- meetup coordination;
- district exploration;
- dense beacon interpretation;
- proximity interaction.

Local mode should feel:

- sharp;
- tactile;
- readable;
- urban;
- layered.

---

# Globe-to-local transition

This is the most important architectural concept.

The system should NOT infinitely zoom one renderer.

Instead:

| Stage | Renderer |
|---|---|
| Space | Globe renderer |
| Region | Globe renderer |
| City | Hybrid transition |
| Local | Mapbox local renderer |

---

# Zoom stages

## Z0 — Orbital

Purpose:

- global energy;
- city glow;
- world atmosphere.

Visible:

- major city pulses;
- global arcs;
- trending regions.

NOT visible:

- individual users;
- local pins;
- venue cards.

Camera:

- cinematic orbit;
- slow inertia.

---

## Z1 — Continental

Purpose:

- regional energy;
- travel flows;
- macro nightlife patterns.

Visible:

- city clusters;
- radio arcs;
- major events.

NOT visible:

- venue detail;
- small beacons.

---

## Z2 — City

Purpose:

- city overview;
- district interpretation.

Visible:

- district stacks;
- major venue signals;
- city heat.

Rendering:

- clustered signals;
- district halos;
- subtle stacks.

NOT visible:

- every individual beacon.

---

## Z3 — District

Purpose:

- neighbourhood exploration.

Transition begins.

System starts blending:

- Globe renderer;
- Mapbox vector map;
- district overlays.

Visible:

- district clusters;
- local stacks;
- venue groups.

---

## Z4 — Local Mapbox Mode

This is true local interaction mode.

Renderer focus shifts to:

- Mapbox vector tiles;
- real street detail;
- venue geometry;
- local navigation.

Visible:

- local beacon stacks;
- venue cards;
- walking context;
- local density.

---

## Z5 — Venue / Street

Purpose:

- precise interaction.

Visible:

- venue sheet;
- entry details;
- queue state;
- event overlays;
- route guidance.

NOT visible:

- giant globe effects.

---

# Why current zoom breaks

Current issues:

- texture blur;
- fake detail;
- stretched atmosphere;
- giant marker overlap;
- no tile system;
- no vector geometry.

This happens because:

```txt
a globe renderer is being used like a local map renderer
```

That architecture does not scale.

---

# Required Mapbox capabilities

Research-backed features the system should use.

---

# Vector tiles

Required for:

- sharp streets;
- scalable rendering;
- smooth transitions;
- low-memory rendering.

Use:

- Mapbox vector tile pipeline.

---

# Style switching

Need multiple styles:

| Mode | Style direction |
|---|---|
| Nightlife | dark atmospheric |
| Care | calm low-stimulation |
| Day | brighter utility |
| Accessibility | high contrast |

---

# 3D buildings

Use selectively.

Purpose:

- urban depth;
- city readability;
- cinematic navigation.

Rules:

- subtle;
- performance-aware;
- not full cyberpunk overload.

---

# Terrain

Use minimally.

Purpose:

- geography;
- coastline readability;
- mountainous region depth.

Avoid:

- exaggerated terrain distortion.

---

# Symbol layers

Required for:

- venue labels;
- district labels;
- beacon labels;
- subtle category indicators.

Rules:

- density-aware;
- collision-aware;
- decluttered.

---

# Clustering

Critical.

Must use:

- spatial clustering;
- dynamic cluster radius;
- zoom-aware grouping.

Without clustering:

- cities become unusable.

---

# Heatmaps

Use for:

- atmospheric density;
- nightlife intensity;
- crowd energy.

Heatmaps should NOT:

- expose exact users;
- become weather-radar blobs.

---

# Camera choreography

Transitions matter.

The Globe should feel:

```txt
cinematic
```

NOT:

```txt
teleported
```

---

# Transition sequence

## Globe → City

Sequence:

1. city selected;
2. atmosphere tightens;
3. district glow increases;
4. vector map fades in subtly;
5. camera lowers;
6. local stacks appear.

---

## City → Local

Sequence:

1. globe curvature reduces;
2. Mapbox detail strengthens;
3. labels sharpen;
4. venue clusters separate;
5. navigation UI activates.

---

# Mapbox layer architecture

Suggested layer hierarchy.

---

# Base layers

## water
## land
## roads
## transit
## parks
## buildings

Rules:

- muted;
- atmospheric;
- Globe visuals remain hero.

---

# Globe overlay layers

## city glow layer

Purpose:

- nightlife atmosphere.

---

## district energy layer

Purpose:

- density interpretation.

---

## beacon field layer

Purpose:

- local activity rendering.

Rules:

- clustered;
- capped;
- animated subtly.

---

## venue emphasis layer

Purpose:

- trusted venues;
- selected venues;
- active destinations.

---

## care layer

Purpose:

- sober support;
- wellness;
- safety.

Rules:

- calm visual language;
- low stimulation.

---

# Local beacon rendering

## Problem

Current markers:

- giant;
- vertical;
- unreadable;
- overlapping.

---

# Local rendering solution

## Space view

Render:

- atmospheric glow only.

---

## City view

Render:

- district stacks;
- cluster rings.

---

## Local view

Render:

- compact cards;
- smart clusters;
- soft pulses;
- category badges.

---

# Marker sizing rules

Markers should scale by:

- zoom;
- density;
- selection;
- category priority.

NOT:

- monetisation alone.

---

# Marker caps

Maximum visible local markers:

| Density | Visible detailed markers |
|---|---|
| Low | 20–40 |
| Medium | 15–25 |
| High | 8–15 |
| Extreme | 3–8 + stacks |

Everything else becomes:

- stacks;
- heat;
- grouped signals.

---

# Stack system

Critical for nightlife districts.

A stack represents:

- multiple nearby signals;
- shared category energy;
- layered local activity.

Stack interaction:

- tap;
- expand;
- filter;
- route;
- compare.

---

# Venue sheets

Venue sheets become primary interaction surface.

Should include:

- vibe;
- live density;
- events;
- nearby beacons;
- ticket state;
- care information;
- accessibility;
- routes.

---

# Local navigation

Mapbox local mode enables:

- walking routes;
- transit overlays;
- safe-route preference;
- low-stimulation route preference;
- district hopping.

---

# Safe navigation mode

Important for:

- Help Beacon;
- SOS;
- sober users;
- vulnerable users.

Features:

- calmer paths;
- trusted venues;
- lower-intensity routes;
- contact quick access.

---

# Performance strategy

## Globe renderer and local renderer should separate responsibilities

This is essential.

Do NOT:

```txt
render every venue on the globe
```

Do:

```txt
stream local detail only when needed
```

---

# Required optimisation systems

## Tile-based loading

Only load nearby detail.

---

## Visibility budgets

Hard cap visible interactive objects.

---

## LOD system

Different detail at different zooms.

---

## Render throttling

Reduce animation in dense zones.

---

## Reduced motion mode

Disable:

- pulsing;
- animated arcs;
- excessive transitions.

---

# Interaction patterns

## Tap beacon

Should:

- highlight;
- expand card;
- route option;
- save;
- share;
- open venue.

---

## Long press district

Should:

- open district explorer;
- filter categories;
- compare energy.

---

## Drag city

Should:

- maintain inertial motion;
- preserve cinematic feel.

---

## Two-finger local tilt

Optional:

- subtle urban perspective.

---

# Accessibility

Local mode must support:

- reduced motion;
- list fallback;
- screen readers;
- larger labels;
- high contrast;
- low stimulation.

---

# Privacy rules

Local mode increases risk.

Therefore:

- exact Help/SOS locations remain private;
- exact user GPS never public;
- density aggregation required;
- venue-level visibility preferred over person-level visibility.

---

# Monetisation rules

Local mode must NOT become:

```txt
Uber Eats ad map
```

Boosts may:

- improve stack placement;
- increase discovery.

Boosts may NOT:

- dominate screen space;
- override safety layers;
- create giant markers.

---

# Suggested component architecture

## Globe renderer

Files:

- `EnhancedGlobe3D`
- `UnifiedGlobe`
- `GlobeCameraPolicy`

Responsibilities:

- atmosphere;
- orbital rendering;
- macro energy.

---

## Local renderer

Suggested files:

- `LocalMapboxScene`
- `DistrictExplorer`
- `VenueSheet`
- `LocalBeaconStack`
- `MapboxSignalLayer`

Responsibilities:

- navigation;
- local density;
- venue interaction;
- realtime local rendering.

---

# Acceptance criteria

The system succeeds when:

- zooming never blurs into fake detail;
- local cities remain readable at high density;
- the Globe feels cinematic at distance;
- local mode feels sharp and usable;
- giant beacon towers disappear;
- venue discovery becomes intuitive;
- nightlife districts feel alive;
- Mapbox detail appears naturally;
- Help/SOS remains protected;
- local mode stays performant in dense nightlife cities;
- monetisation never dominates the map;
- the transition between Globe and Mapbox feels magical.