# Globe Implementation Plan

Purpose: convert the HOTMESS Globe strategy docs into an executable implementation sequence.

This is the operational build plan.

It exists to stop:

- random Globe rewrites;
- visual drift;
- duplicate systems;
- unsafe data handling;
- giant beacon regressions;
- fake live-state rendering;
- blurry over-zoom;
- shipping features before density/privacy are solved.

This document assumes all previous Globe docs have been read in the order defined by:

- `docs/GLOBE_DOC_TRAIN.md`

---

# Core implementation principles

## Principle 1 — the Globe is not Google Maps

The Globe is:

- emotional;
- atmospheric;
- signal-driven;
- density-aware;
- proximity-aware;
- city-first.

The Globe is NOT:

- a literal street map;
- a giant pin board;
- a GPS dot wall;
- a permanent marketplace.

Street-level detail belongs to:

- local map mode;
- drawers;
- stacked cards;
- lists;
- venue detail.

---

## Principle 2 — exact user location is private

Exact lat/lng is NEVER public Globe rendering data.

Public rendering uses:

- area;
- venue;
- district;
- city;
- aggregate density;
- fuzzed coordinates.

Help Beacon/SOS exact coordinates are governed by:

- `GLOBE_HELP_SOS_PRIVACY_MODEL.md`

---

## Principle 3 — density before detail

The system must decide:

- heat;
- cluster;
- stack;
- pin;
- card;
- list;
- map detail;

BEFORE rendering individual markers.

Never render 50 giant pins in one neighbourhood.

---

## Principle 4 — boosts affect priority, not size

Boosting changes:

- discovery;
- ordering;
- pulse priority;
- stack position;
- city prominence.

Boosting does NOT create:

- skyscraper markers;
- giant nodes;
- red-alert style visual spam.

---

## Principle 5 — care and safety outrank commerce

Priority order:

1. urgent safety;
2. care/sober support;
3. user-selected/saved;
4. events/tickets;
5. venue signals;
6. social/chill;
7. radio;
8. creator/records;
9. market/preloved/vendor.

Commerce must monetise without overwhelming the Globe.

---

# Current problems to solve

## Current visual issues

- globe becomes blurry when zooming too far;
- beacons are too large;
- markers cover mass geographic area;
- insufficient cluster/density logic;
- no proper local detail handoff;
- space view and local view use same rendering language;
- insufficient hierarchy between signal types.

---

## Current architectural risks

- ad-hoc beacon objects;
- unclear signal typing;
- possible unsafe location assumptions;
- no unified density engine;
- no beacon lifecycle state machine;
- no rendering policy by zoom level;
- mixed public/private visibility concepts.

---

# Implementation phases

---

# Phase 0 — audit and freeze

Goal:

Understand current Globe architecture before introducing new rendering systems.

## Deliverables

### Audit current code

Audit:

- Globe renderer;
- camera controls;
- marker rendering;
- beacon sources;
- clustering logic;
- Supabase fetch paths;
- realtime subscriptions;
- map integrations;
- visibility logic;
- auth listeners.

### Produce audit outputs

Create:

- `GLOBE_SUPABASE_SCHEMA_MAP.md`
- renderer inventory;
- current component graph;
- signal source inventory;
- visibility/risk inventory.

### Freeze dangerous behaviour

Temporarily block:

- giant marker scaling;
- ultra-close blur zoom;
- unbounded pin growth;
- any public exact-location assumptions.

## Acceptance criteria

- All signal sources identified.
- All beacon types identified.
- All location precision paths identified.
- Current zoom limits documented.
- Current realtime architecture documented.

---

# Phase 1 — normalise signal architecture

Goal:

Create one unified signal model.

This phase is foundational.

Nothing visual should proceed until this exists.

## Deliverables

### Types

Create:

```txt
src/types/globe/GlobeSignalTypes.ts
src/types/globe/GlobeBeaconType.ts
src/types/globe/GlobeDensity.ts
src/types/globe/GlobeVisibility.ts
src/types/globe/GlobeSafety.ts
```

### Adapters

Create:

```txt
src/lib/globe/GlobeSignalAdapter.ts
```

Purpose:

Convert:

- events;
- venues;
- tickets;
- radio;
- care;
- market;
- profiles;
- realtime states;

into one normalized render model.

### Visibility policies

Create:

```txt
src/lib/globe/SafetyVisibilityPolicy.ts
src/lib/globe/PrecisionPolicy.ts
```

### Lifecycle states

Create:

```ts
'draft'
'scheduled'
'queued'
'live'
'boosted'
'trending'
'cooling'
'ending'
'expired'
'cancelled'
'reported'
'hidden'
'archived'
```

## Acceptance criteria

- One canonical Globe signal type exists.
- All public/private visibility states are typed.
- All beacon categories are typed.
- Existing data sources adapt into normalized signals.
- No component directly invents signal shape.

---

# Phase 2 — camera and rendering foundation

Goal:

Fix the Globe itself.

## Deliverables

### Camera policy

Create:

```txt
src/lib/globe/GlobeCameraPolicy.ts
```

Responsibilities:

- zoom bands;
- blur threshold;
- local handoff trigger;
- safe min/max altitude;
- selected-target framing.

### Marker scaling

Create:

```txt
src/lib/globe/GlobeMarkerScale.ts
```

Rules:

- marker size clamps;
- selected-state amplification;
- category-aware scaling;
- no giant towers.

### Render bands

Implement:

```ts
space
region
city
local
detail
```

### Rendering policy

Create:

```txt
src/lib/globe/GlobeRenderPolicy.ts
```

Decides:

- heat vs cluster vs stack vs pin;
- which categories render at which zoom;
- what hides;
- when local mode activates.

## Acceptance criteria

- Globe no longer blurs from excessive zoom.
- Markers never dominate continents.
- Space view reads as signal constellations.
- Local view is visually distinct.
- Red reserved for urgent/SOS only.

---

# Phase 3 — signal visual system

Goal:

Implement the refined visual grammar.

## Deliverables

### Visual registry

Create:

```txt
src/lib/globe/BeaconVisualRegistry.ts
```

Defines:

- icon;
- geometry;
- ring;
- pulse;
- colour;
- stack behaviour;
- cluster priority;
- selected state.

### Components

Create:

```txt
src/components/globe/signals/
```

Expected:

```txt
BeaconMarker.tsx
BeaconCluster.tsx
DistrictStack.tsx
HeatField.tsx
SelectedSignalHalo.tsx
SignalArc.tsx
VenueMarker.tsx
CareMarker.tsx
RadioPulse.tsx
```

### Motion rules

Create:

```txt
src/lib/globe/GlobeMotionPolicy.ts
```

Rules:

- reduced motion support;
- pulse cadence;
- easing;
- selected-state transitions;
- expiry fade;
- cancellation fade.

## Acceptance criteria

- Marker system feels unified.
- Each beacon type is visually identifiable.
- No visual noise explosion.
- Selected signals are readable.
- Space view remains elegant.

---

# Phase 4 — density engine

Goal:

Solve crowded cities.

## Deliverables

### Density engine

Create:

```txt
src/lib/globe/GlobeDensityEngine.ts
```

Responsibilities:

- density states;
- spatial bucketing;
- cluster generation;
- category grouping;
- stack generation;
- zoom-aware aggregation.

### Stack rendering

Create:

```txt
DistrictSignalStack.tsx
CategoryStack.tsx
```

### Heat rendering

Create:

```txt
CityHeatLayer.tsx
SignalDensityLayer.tsx
```

### Priority ordering

Implement:

- urgent;
- care;
- selected;
- event;
- venue;
- social;
- radio;
- creator;
- market.

### Visibility budgets

Implement:

- per-user visible marker budgets;
- dense-area suppression;
- stack substitution;
- cluster substitution.

## Acceptance criteria

- Soho with 60 users does not become 60 dots.
- Dense event areas remain readable.
- Care/sober support remains visible.
- Market signals remain secondary.
- Globe performance remains stable.

---

# Phase 5 — local mode / Mapbox handoff

Goal:

Introduce true local detail.

## Deliverables

### Local mode

Create:

```txt
src/components/globe/local/
```

Expected:

```txt
LocalMapMode.tsx
LocalSignalDrawer.tsx
VenueDetailPanel.tsx
DistrictPanel.tsx
SignalListView.tsx
```

### Mapbox integration

Implement:

- vector streets;
- local clustering;
- venue detail;
- route overlays;
- area fuzzing;
- safe precision handling.

### Trigger system

Local mode activates when:

- city/local zoom reached;
- user selects district;
- density threshold exceeded;
- local search activated.

## Acceptance criteria

- Local interaction uses real map detail.
- Globe stops pretending to be street-level.
- User can understand nearby signals.
- Dense areas become navigable.

---

# Phase 6 — beacon lifecycle and economy

Goal:

Implement real signal management.

## Deliverables

### Beacon creation flows

Refactor:

```txt
BeaconDropModal
```

Into:

- type-aware;
- duration-aware;
- visibility-aware;
- privacy-aware;
- trust-aware.

### Economy engine

Create:

```txt
src/lib/globe/BeaconEconomy.ts
```

Handles:

- duration limits;
- cooldowns;
- boosts;
- pricing;
- visibility weighting;
- signal budgets.

### Trust system

Create:

```txt
src/lib/globe/BeaconTrustScore.ts
```

### Reverse flows

Implement:

- cancellation;
- expiry;
- reporting;
- fade-out;
- archive;
- moderation.

## Acceptance criteria

- Beacon spam is controlled.
- Boosts feel elegant.
- Temporary signals feel alive.
- Expiry is understandable.
- Market monetisation works without chaos.

---

# Phase 7 — Help Beacon and SOS layer

Goal:

Implement private safety architecture.

## Deliverables

### Safety services

Create:

```txt
src/lib/safety/
```

Expected:

```txt
SafetyActivationService.ts
TrustedContactService.ts
SafetyVisibilityPolicy.ts
SafetyDeliveryService.ts
```

### Safety UI

Create:

```txt
HelpBeaconModal.tsx
SOSModal.tsx
TrustedContactsPanel.tsx
SafetySharePanel.tsx
```

### Precision enforcement

Implement:

- exact vs venue vs area precision;
- trusted-contact-only exact location;
- public aggregate rendering only.

### Supabase safety layer

Implement or audit:

```txt
trusted_contacts
safety_activations
safety_location_snapshots
safety_recipients
safety_delivery_logs
```

### RLS

Implement:

- strict safety RLS;
- recipient-scoped reads;
- no public exact access.

## Acceptance criteria

- Exact SOS location never public.
- Trusted contacts work correctly.
- Cancellation revokes access.
- Safety logs are auditable.
- Notifications are privacy-safe.

---

# Phase 8 — accessibility and polish

Goal:

Make the Globe usable, performant, and production-safe.

## Deliverables

### Accessibility

Implement:

- reduced motion;
- keyboard navigation;
- list fallback;
- screen reader support;
- touch target sizing.

### Performance

Implement:

- render throttling;
- clustering optimisations;
- memoization;
- texture optimisation;
- camera smoothing;
- subscription batching.

### Moderation

Implement:

- reporting;
- abuse handling;
- beacon suppression;
- cooldown escalation.

### QA

Test:

- dense cities;
- low-end devices;
- poor network;
- realtime spikes;
- thousands of beacons;
- Help/SOS flows.

## Acceptance criteria

- Globe remains performant in dense scenarios.
- Reduced motion fully supported.
- Globe is usable on mobile.
- Abuse/spam manageable.
- Safety flows production-safe.

---

# Suggested implementation order

## Immediate build order

1. Audit current Globe architecture.
2. Create unified signal types.
3. Fix camera and zoom.
4. Replace giant markers.
5. Implement render policy.
6. Implement density engine.
7. Add local mode.
8. Refactor beacon creation.
9. Add lifecycle/economy.
10. Add Help/SOS safety layer.
11. Accessibility/performance pass.

---

# Non-negotiable implementation rules

## Data

- Never write directly to `beacons` view.
- Audit every realtime subscription.
- Never expose exact Help/SOS lat/lng publicly.
- Never assume profile visibility equals public GPS sharing.

## Rendering

- Never render giant continent-sized pins.
- Never zoom beyond blur threshold.
- Never show 50 exact user dots in one district.
- Never allow boosts to visually dominate care/safety.

## Product

- Temporary signals expire.
- Local detail belongs to local mode.
- Care and sober support remain accessible.
- Public Globe prioritises atmosphere and discovery.

## Safety

- SOS remains free.
- No ads in emergency flows.
- Lock-screen notifications remain privacy-safe.
- Trusted contacts are explicit and revocable.

---

# Definition of done

The Globe is complete when:

- from space it feels alive;
- from city level it feels readable;
- from local level it feels useful;
- dense areas remain elegant;
- Help/SOS remains private;
- monetisation feels additive, not exploitative;
- the Globe never becomes a cluttered pin wall;
- users understand signal urgency and temporality;
- care and nightlife coexist safely;
- the system scales technically and socially.