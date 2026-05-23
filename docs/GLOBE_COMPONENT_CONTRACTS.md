# Globe Component Contracts

Purpose: define the architectural boundaries, responsibilities, inputs, outputs, and interaction contracts for all major Globe rendering systems.

This document exists to prevent:

- renderer chaos;
- duplicate state systems;
- Mapbox/Three.js conflicts;
- realtime memory leaks;
- uncontrolled component growth;
- animation overload;
- beacon rendering inconsistency;
- Supabase subscription duplication.

The Globe must evolve as:

```txt
multiple specialised systems cooperating
```

NOT:

```txt
one giant component doing everything
```

---

# Core architectural philosophy

## One responsibility per major rendering system

Each major system should own:

- one rendering concern;
- one state concern;
- one interaction layer.

Avoid:

- giant god components;
- duplicated camera logic;
- duplicated realtime subscriptions;
- duplicated visibility calculations.

---

# High-level architecture

## Rendering stack

| Layer | Responsibility |
|---|---|
| App shell | routing + orchestration |
| Globe controller | mode management |
| Globe renderer | orbital rendering |
| Local renderer | Mapbox local mode |
| Data layer | Supabase + aggregation |
| Interaction layer | gestures + selection |
| Overlay layer | cards + UI |
| Safety layer | privacy enforcement |

---

# Primary systems

## `UnifiedGlobe`

Primary orchestration component.

This is NOT a renderer.

Purpose:

- coordinate systems;
- manage render mode;
- manage transitions;
- own top-level Globe state.

---

# Responsibilities

## Allowed

- active zoom band;
- renderer switching;
- camera mode state;
- selected city;
- selected district;
- active overlay coordination.

---

## Forbidden

- direct beacon rendering;
- heavy data transforms;
- local Mapbox rendering;
- realtime aggregation logic;
- giant animation systems.

---

# Inputs

- Globe state;
- viewport state;
- auth state;
- filter state;
- accessibility settings.

---

# Outputs

- active renderer mode;
- selected surface state;
- interaction dispatch;
- overlay coordination.

---

# `EnhancedGlobe3D`

Primary orbital renderer.

Purpose:

- planetary rendering;
- atmosphere;
- global energy;
- macro animation.

---

# Responsibilities

## Allowed

- globe mesh;
- atmosphere shader;
- orbital camera;
- arcs;
- city glow;
- macro beacon fields.

---

## Forbidden

- local venue detail;
- street rendering;
- local cards;
- heavy realtime subscriptions;
- direct Supabase querying.

---

# Rendering limits

Must NOT render:

- thousands of markers;
- local venue geometry;
- every live beacon.

Purpose is:

```txt
emotion and atmosphere
```

NOT:

```txt
GIS precision
```

---

# `LocalMapboxScene`

Primary local renderer.

Purpose:

- district exploration;
- local navigation;
- venue interaction;
- dense-city interpretation.

---

# Responsibilities

## Allowed

- Mapbox integration;
- vector tiles;
- local clusters;
- local beacon rendering;
- venue geometry;
- route overlays.

---

## Forbidden

- planetary rendering;
- orbital effects;
- global arcs;
- atmospheric Earth shaders.

---

# Inputs

- local viewport;
- district state;
- filtered beacon data;
- visibility budget;
- accessibility mode.

---

# Outputs

- local selections;
- venue interactions;
- navigation events;
- local hover/tap state.

---

# `GlobeCameraPolicy`

Single source of truth for:

- camera movement;
- zoom thresholds;
- transitions;
- cinematic choreography.

---

# Responsibilities

## Allowed

- zoom bands;
- easing;
- orbital transitions;
- local transition choreography;
- motion reduction.

---

## Forbidden

- beacon rendering;
- Supabase calls;
- UI overlays.

---

# Hard rule

No other component should independently:

- invent zoom thresholds;
- animate orbital camera;
- override transition choreography.

This prevents:

- camera fighting;
- animation jitter;
- inconsistent transitions.

---

# `BeaconVisibilityEngine`

Critical system.

Purpose:

- density suppression;
- stack creation;
- render budgets;
- visibility prioritisation.

---

# Responsibilities

## Allowed

- clustering;
- LOD decisions;
- visibility ranking;
- stack generation;
- density reduction.

---

## Forbidden

- direct rendering;
- database writes;
- camera logic.

---

# Inputs

- zoom band;
- beacon density;
- trust scores;
- boosts;
- proximity.

---

# Outputs

- renderable markers;
- cluster groups;
- stack objects;
- hidden objects.

---

# `BeaconRealtimeBridge`

Single realtime coordination layer.

Purpose:

- Supabase subscriptions;
- realtime ingestion;
- event fanout.

---

# Hard rule

Realtime subscriptions should NOT exist everywhere.

Otherwise:

- duplicate listeners;
- memory leaks;
- repeated renders;
- race conditions;
- subscription storms.

---

# Responsibilities

## Allowed

- subscribe;
- unsubscribe;
- aggregate updates;
- dispatch normalized events.

---

## Forbidden

- rendering;
- heavy transforms;
- camera manipulation.

---

# Outputs

Normalized events only.

Example:

```ts
BeaconCreated
BeaconUpdated
BeaconExpired
DistrictHeatChanged
VenueIntensityChanged
```

---

# `DistrictExplorer`

Purpose:

- district-level exploration;
- stack browsing;
- category filtering.

---

# Responsibilities

## Allowed

- local filtering;
- district cards;
- stack expansion;
- district summaries.

---

## Forbidden

- orbital rendering;
- global navigation;
- realtime subscriptions.

---

# `VenueSheet`

Primary venue interaction surface.

Purpose:

- detailed venue interaction.

---

# Responsibilities

## Allowed

- event list;
- vibe display;
- routes;
- tickets;
- accessibility;
- care information.

---

## Forbidden

- map rendering;
- global overlays;
- realtime orchestration.

---

# `SignalArcSystem`

Purpose:

- radio arcs;
- travel flows;
- event relationships;
- macro movement.

---

# Rules

Arcs are:

- atmospheric;
- selective;
- cinematic.

Arcs are NOT:

- spaghetti lines across Earth.

---

# `CareSafetyLayer`

Critical privacy system.

Purpose:

- Help Beacon;
- SOS;
- trusted contact visibility;
- protected rendering rules.

---

# Responsibilities

## Allowed

- privacy enforcement;
- visibility gating;
- emergency prioritisation;
- trusted-contact rendering.

---

## Forbidden

- public rendering exposure;
- monetisation logic.

---

# Hard privacy rule

Exact Help/SOS coordinates:

```txt
must NEVER enter public render pipelines
```

---

# `AccessibilityController`

Purpose:

- reduced motion;
- calm mode;
- high contrast;
- low stimulation.

---

# Responsibilities

## Allowed

- animation reduction;
- motion suppression;
- visual simplification;
- accessibility overrides.

---

## Forbidden

- business logic;
- realtime subscriptions.

---

# Data contracts

## Globe data should arrive normalized

Renderers should NOT:

- query raw tables directly;
- merge complex schemas;
- infer business rules.

---

# Suggested normalized types

## `RenderableBeacon`

Contains:

- id;
- type;
- category;
- priority;
- visibility level;
- stack group;
- coordinates;
- trust weight;
- render mode.

---

## `DistrictSignal`

Contains:

- district id;
- energy score;
- active stacks;
- dominant categories;
- motion intensity.

---

## `VenueSignal`

Contains:

- venue id;
- current vibe;
- density;
- active events;
- accessibility state.

---

# Render pipeline contract

## Stage 1

Supabase/raw realtime.

---

## Stage 2

Aggregation + normalization.

---

## Stage 3

Visibility engine.

---

## Stage 4

Renderer-specific adaptation.

---

## Stage 5

Actual rendering.

---

# Forbidden architecture

Renderers must NEVER:

```txt
query Supabase directly inside animation loops
```

---

# Interaction contracts

## Globe tap

Outputs:

- selected city;
- selected district;
- transition intent.

---

## Local tap

Outputs:

- selected venue;
- selected beacon;
- route request.

---

## Stack expansion

Outputs:

- grouped beacon explorer.

---

# Overlay contracts

Overlays should be:

- renderer-independent;
- reusable;
- accessibility-aware.

---

# Examples

## Good

```txt
VenueSheet
BeaconCard
DistrictPanel
```

---

## Bad

```txt
MapboxSpecificMegaCardThatOnlyWorksInsideOneRenderer
```

---

# Animation contracts

Animations should be:

- centralized;
- throttled;
- density-aware.

---

# Hard rules

## Forbidden

- infinite beacon pulses;
- independent animation loops everywhere;
- uncontrolled particle systems;
- every marker animating simultaneously.

---

# Performance contracts

## Visibility budgets required

Every renderer must respect:

- object caps;
- animation caps;
- memory budgets.

---

# Suggested budgets

| System | Budget |
|---|---|
| Visible detailed markers | capped |
| Active animated pulses | capped |
| Active arcs | capped |
| Simultaneous shaders | limited |
| Realtime subscriptions | centralized |

---

# State ownership

Critical rule.

Every state should have:

- one owner;
- one authority;
- one update pathway.

Avoid:

- duplicated zoom state;
- duplicated selected venue state;
- duplicated beacon collections.

---

# Testing contracts

Every major component should support:

- isolated rendering;
- mocked realtime;
- reduced-motion mode;
- density stress tests;
- offline fallback.

---

# Error handling

## Globe renderer failure

Fallback:

- static globe;
- reduced effects.

---

## Mapbox failure

Fallback:

- simplified district view;
- list mode.

---

## Realtime failure

Fallback:

- cached snapshot;
- degraded live indicators.

---

# Acceptance criteria

The architecture succeeds when:

- render systems remain separated;
- realtime subscriptions stay centralized;
- zoom transitions remain consistent;
- local mode scales in dense cities;
- Mapbox and Globe never fight;
- Help/SOS remains protected;
- accessibility overrides work globally;
- animation remains performant;
- beacon visibility remains readable;
- new beacon types can be added safely;
- overlays remain reusable;
- developers understand where logic belongs;
- the Globe can scale without collapsing into one giant component.