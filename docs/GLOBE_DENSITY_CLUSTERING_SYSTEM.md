# Globe Density & Clustering System

Purpose: define how the HOTMESS Globe converts many nearby people, venues, events, beacons, care routes, market drops, tickets, and realtime signals into readable, safe, elegant visual structures.

This document exists because dense nightlife areas will break the Globe unless density is treated as a first-class system.

The system must answer:

- When does a signal render as heat?
- When does it render as a constellation?
- When does it render as a cluster?
- When does it render as a stack?
- When does it render as an individual pin?
- When does it render only as a card/list item?
- When must it be hidden for privacy or safety?

---

# Core rule

Density is not a rendering accident.

Density is a product state.

A crowded district should feel:

```txt
alive and legible
```

NOT:

```txt
like 200 glowing pins fighting for oxygen
```

---

# Density philosophy

## From space

Crowds become:

- city glow;
- constellations;
- macro heat;
- cultural pulse.

## From city

Crowds become:

- district stacks;
- category counts;
- venue energy;
- care availability.

## From local

Crowds become:

- Mapbox clusters;
- stacked drawers;
- venue cards;
- local lists;
- filtered categories.

## From selected item

Crowds become:

- context;
- related signals;
- safe next actions.

---

# Render modes

Every signal must resolve to one of these render modes before it reaches Globe or Mapbox.

```ts
export type DensityRenderMode =
  | 'hidden'
  | 'heat'
  | 'constellation'
  | 'city_cluster'
  | 'district_cluster'
  | 'category_stack'
  | 'venue_stack'
  | 'individual_pin'
  | 'selected_card'
  | 'list_item'
  | 'local_map_feature';
```

---

# Zoom bands and density outputs

| Zoom band | Output style | Individual pins? |
|---|---|---|
| Space | heat / constellation | no |
| Region | city clusters | rarely |
| City | district clusters / stacks | limited |
| District | stacks / local clusters | limited |
| Local | Mapbox clusters / cards | yes, capped |
| Detail | selected card / related list | selected only |

---

# Density states

Density state is calculated per area bucket.

| State | Count | Visual output | User experience |
|---|---:|---|---|
| empty | 0 | empty/care/radio fallback | no dead end |
| quiet | 1–3 | individual pins allowed | direct discovery |
| warm | 4–9 | small cluster/stack | grouped discovery |
| hot | 10–24 | district cluster + category stack | guided filtering |
| packed | 25–74 | heat + stacks + local mode | local map recommended |
| overloaded | 75+ | heat only + forced filter/list | no pin explosion |

Sensitive categories may use lower thresholds.

---

# Area buckets

Density should be calculated across multiple bucket types.

## Bucket levels

1. world;
2. region;
3. country;
4. city;
5. district/neighbourhood;
6. venue;
7. local cell;
8. selected object.

---

# Bucket keys

Example keys:

```txt
world:global
city:london
district:london:soho
venue:heaven
cell:london:soho:250m:abc123
```

---

# Spatial bucket sizes

Recommended starting points:

| Context | Bucket radius |
|---|---:|
| space/city heat | city-level |
| district cluster | 750m–1500m |
| local cluster | 100m–300m |
| venue stack | venue id |
| sensitive care/sober | larger/fuzzed area |
| private user proximity | policy-defined approximate cell |

---

# Signal grouping dimensions

Signals group by:

- zoom band;
- area bucket;
- category;
- urgency;
- privacy level;
- freshness;
- lifecycle state;
- trust weight;
- boost weight;
- selected state.

---

# Category priorities

When density is high, categories surface in this order:

1. urgent/private safety surfaces only where authorised;
2. care / sober support;
3. selected or saved signals;
4. events / tickets;
5. venues;
6. chill / meetup;
7. radio;
8. creator / record releases;
9. market / preloved / vendor;
10. ambient decorative signals.

---

# Privacy-sensitive density rules

## People visibility

Many visible people never equals many exact dots.

Public output should be:

- area density;
- approximate signal;
- profile-safe list only after interaction;
- venue/city aggregate.

Never:

- 60 exact user GPS points;
- movement trails;
- home/private inference.

---

## Help/SOS density

Help/SOS does not become public density by default.

Exact safety location is visible only to:

- self;
- chosen trusted contacts;
- authorised safety surfaces.

Public Globe can only show threshold-safe care availability if explicitly designed.

---

## NA/AA and sober support

Rules:

- no attendee counts;
- no identity exposure;
- no exact user participation;
- marker can say `Sober route`;
- counts should be hidden or bucketed.

---

# Clustering rules

## Cluster when

- multiple signals overlap visually;
- density state is warm or above;
- zoom band is space/region/city;
- signals share area bucket;
- local marker budget is exceeded.

---

## Do not cluster when

- signal is selected;
- signal is authorised Help/SOS in private safety view;
- urgent signal must be surfaced to authorised viewer;
- category must remain separately discoverable, such as care in a commerce-heavy area.

---

# Cluster types

## City cluster

Represents:

- city-level activity.

Visual:

- atmospheric glow;
- city label;
- top category hint.

Tap:

- open CitySignalDrawer.

---

## District cluster

Represents:

- neighbourhood-level signal.

Visual:

- compact count bubble;
- category ticks;
- soft heat halo.

Tap:

- zoom/focus district;
- open DistrictExplorer.

---

## Category cluster

Represents:

- many signals of one type.

Examples:

- Events 8;
- Chill 5;
- Tickets 3;
- Care routes available.

Tap:

- open filtered stack.

---

## Venue cluster

Represents:

- many signals attached to one venue.

Tap:

- open VenueSheet with internal sections.

---

# Stack system

Stacks are the primary local-density UI.

A stack is not just a cluster.

A stack shows categories and actions.

---

# Stack anatomy

A stack contains:

- title;
- area/venue;
- category counts;
- top live signal;
- care route if present;
- selected/saved highlight;
- filter chips;
- action CTAs.

---

# Stack examples

## District stack

```txt
Soho tonight
Events 8 · Tickets 2 · Chill 5 · Care available · Market 7
```

## Venue stack

```txt
Venue signal
Live event · 3 ticket drops · vibe rising · care route nearby
```

## Care stack

```txt
Care routes nearby
Sober support · Hand N Hand · Report a problem
```

---

# Stack interaction

## Tap stack

- opens stacked drawer;
- preserves map/globe context;
- shows categories first.

## Tap category

- filters stack;
- reveals individual items.

## Tap item

- opens typed card/sheet.

## Back

- item → category → stack → district → city → world.

---

# Individual pin rules

Individual pins are allowed only when:

- density is quiet;
- item is selected;
- item is high priority;
- local mode is active;
- marker budget allows;
- privacy allows.

Individual pins are NOT default.

---

# Marker budgets

Budgets prevent visual overload.

## Globe budgets

| View | Max detailed pins | Max rings | Max arcs |
|---|---:|---:|---:|
| Space | 0–6 | 4 | 4 |
| Region | 4–10 | 6 | 6 |
| City | 8–18 | 8 | 6 |
| District | 8–16 | 8 | 4 |

## Local Mapbox budgets

| Density | Detailed markers |
|---|---:|
| quiet | 20–40 |
| warm | 15–25 |
| hot | 8–15 |
| packed | 3–8 |
| overloaded | 0–5 + stacks |

---

# Boost interaction with density

Boosts affect surfacing, not marker size.

Boosts may:

- raise within category stack;
- appear in top highlights;
- increase discovery radius;
- contribute more to city heat;
- appear in Tonight/Now rails.

Boosts may not:

- bypass clustering;
- become giant markers;
- override care/safety;
- force camera movement;
- expose private data.

---

# Freshness and density

Freshness affects order.

Priority order:

1. live;
2. boosted live;
3. trending;
4. recent;
5. scheduled;
6. curated;
7. cooling;
8. ending;
9. stale;
10. archived.

But safety/care category priority can override freshness.

---

# Low-count suppression

Sensitive categories must suppress exact counts when counts are small.

Examples:

## Bad

```txt
1 sober support user nearby
```

## Good

```txt
Sober route nearby
```

## Bad

```txt
2 people need help in Soho
```

## Good

```txt
Care routes active
```

---

# K-anonymity threshold

Suggested default:

```txt
k = 5
```

Do not show sensitive aggregate counts unless at least 5 unrelated signals/users exist in the area/time bucket.

Some categories may require stricter thresholds.

---

# Mapbox local mode relationship

When density is `packed` or `overloaded`, the system should prefer:

- Mapbox local mode;
- stacked drawers;
- category filters;
- list mode.

Do not force the Globe to solve street-level complexity.

---

# Accessibility and density

Reduced motion and calm mode lower density budgets.

## Reduced motion

- fewer animated markers;
- less pulsing;
- simpler clusters.

## Calm mode

- fewer visible categories;
- care/sober surfaced calmly;
- market reduced;
- route choices simplified.

---

# Performance rules

Density engine must be fast.

Recommended:

- pre-bucket signals;
- memoize by viewport/zoom/filter;
- throttle updates;
- batch realtime;
- avoid layout thrash;
- cap render objects.

---

# Density engine inputs

```ts
export type DensityEngineInput = {
  signals: LifecycleSignal[];
  zoomBand: 'space' | 'region' | 'city' | 'district' | 'local' | 'detail';
  viewport: ViewportBounds;
  selectedSignalId?: string;
  selectedCityId?: string;
  selectedDistrictId?: string;
  filters: GlobeFilters;
  accessibility: AccessibilityState;
  densityBudgets: DensityBudgets;
};
```

---

# Density engine output

```ts
export type DensityEngineOutput = {
  heat: HeatRenderObject[];
  constellations: ConstellationRenderObject[];
  clusters: ClusterRenderObject[];
  stacks: StackRenderObject[];
  pins: PinRenderObject[];
  listItems: SignalListItem[];
  hidden: HiddenSignalRecord[];
  modeRecommendation?: 'globe' | 'mapbox' | 'list';
};
```

---

# Example scenarios

## Scenario: Soho, 60 social users, 30 beacons

Space:

- London glow increases.

City:

- Soho district cluster appears.

District:

- Events / Chill / Tickets / Care / Market stacks.

Local:

- Mapbox + drawer.

Never:

- 90 individual pins.

---

## Scenario: Venue with 18 signals

City:

- venue cluster.

District:

- venue stack.

Detail:

- VenueSheet with sections.

Never:

- 18 pins on one doorway.

---

## Scenario: NA/AA nearby

Space:

- no sensitive marker.

City:

- care availability if safe.

Local:

- `Sober route` card/marker.

Never:

- attendee counts or exact participation.

---

## Scenario: Boosted Preloved drop in packed market area

City:

- market stack may include boosted item.

Local:

- item appears higher in Market section.

Never:

- giant boosted market pin.

---

# Implementation targets

Create/refactor toward:

```txt
src/lib/globe/density/GlobeDensityEngine.ts
src/lib/globe/density/DensityBucket.ts
src/lib/globe/density/DensityThresholds.ts
src/lib/globe/density/DensityPrivacyRules.ts
src/lib/globe/density/DensityPriority.ts
src/lib/globe/density/DensityBudgets.ts
src/lib/globe/density/ClusterBuilder.ts
src/lib/globe/density/StackBuilder.ts
src/lib/globe/density/HeatBuilder.ts
src/lib/globe/density/LocalModeRecommender.ts
src/components/globe/density/DistrictStack.tsx
src/components/globe/density/CategoryStack.tsx
src/components/globe/density/ClusterBubble.tsx
```

---

# Testing requirements

## Unit tests

Test:

- density thresholds;
- category priority;
- boost ordering;
- low-count suppression;
- k-anonymity;
- marker budgets;
- local mode recommendation.

## Integration tests

Test:

- 60 users in Soho;
- 30 beacons at one venue;
- boosted market in dense area;
- care cluster in commercial area;
- NA/AA visibility rules;
- reduced motion density budgets;
- Mapbox handoff.

## E2E tests

Test:

- city cluster expands to district stack;
- district stack filters to category;
- category opens typed card;
- back path returns to world;
- packed area recommends local mode;
- no giant pin explosion.

---

# Acceptance criteria

The density system succeeds when:

- dense cities feel alive but readable;
- people visibility is aggregate/approximate by default;
- Help/SOS stays out of public density;
- NA/AA and sober support remain anonymity-safe;
- boosted signals improve surfacing without enlarging markers;
- care cannot be buried under commerce;
- Globe view shows city/district energy, not local clutter;
- Mapbox handles local complexity;
- individual pins appear only when useful and safe;
- every cluster has a drill-down path;
- every drill-down has a back path;
- reduced motion and calm mode simplify density;
- performance remains stable under Soho/Berlin/London peak density.