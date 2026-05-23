# Globe Mapbox Layer Stack

Purpose: define the exact Mapbox local-mode layer order, rendering responsibilities, interaction priority, privacy rules, and performance constraints for HOTMESS Globe local detail.

This document is the local renderer contract.

It exists because the Globe should not keep zooming into a blurry sphere. When the user enters district/local detail, Mapbox must take over with a clean, readable, privacy-safe layer stack.

---

# Core principle

Mapbox local mode is for:

- real geography;
- streets;
- districts;
- venues;
- local stacks;
- route context;
- precise-but-safe interaction.

It is NOT for:

- public exact user GPS;
- Help/SOS public display;
- giant boosted ad pins;
- every beacon rendered individually;
- casino-map clutter.

---

# Layer stack overview

Mapbox layers must render in this conceptual order:

1. base map;
2. atmospheric tint;
3. district boundaries;
4. heat / density fields;
5. care and sober-safe context;
6. routes;
7. clusters and stacks;
8. venue markers;
9. individual allowed beacons;
10. selected object;
11. labels;
12. interaction hit areas;
13. overlays/cards outside map canvas.

---

# Layer order contract

## L0 — Base style

Purpose:

- provide real map detail;
- streets;
- water;
- parks;
- transit;
- buildings.

Visual direction:

- dark;
- muted;
- premium;
- low-noise;
- readable.

Rules:

- never let base map overpower signals;
- avoid bright default map colours;
- avoid generic Google-style utility look.

---

## L1 — Atmospheric tint

Purpose:

- preserve HOTMESS mood after Mapbox handoff;
- avoid sterile utility-map feel.

Visual:

- subtle black/gold wash;
- low-opacity vignette;
- soft district glow.

Rules:

- must not reduce label readability;
- disable/reduce in high contrast mode.

---

## L2 — District boundary layer

Purpose:

- make neighbourhoods understandable;
- support density stacks;
- help users orient locally.

Data:

- district/neighbourhood geometry, if available;
- fallback: computed area bucket / bounding region.

Visual:

- thin outline;
- low-opacity fill;
- selected district stronger.

Interaction:

- tap district -> DistrictExplorer;
- long press -> filter/category menu.

---

## L3 — Heat / density layer

Purpose:

- show activity without pin spam.

Sources:

- `pulse_signals`;
- `place_intensity`;
- aggregate `right_now_status`;
- venue/city density;
- approved beacon aggregates.

Visual:

- heat field;
- district haze;
- category-weighted glow.

Rules:

- never use raw user GPS;
- sensitive categories must be threshold-safe;
- NA/AA and Help/SOS cannot create exact public heat.

---

## L4 — Care / sober context layer

Purpose:

- keep care visible before commerce and event noise.

Sources:

- care routes;
- sober support;
- NA/AA public/curated support listings;
- accessibility/support routes;
- Hand N Hand signposting.

Visual:

- calm white/blue/soft gold;
- low-stimulation;
- no nightclub pulse.

Rules:

- no attendee counts;
- no user identity;
- exact user participation hidden;
- label public markers as `Sober route` when appropriate.

Interaction:

- tap -> CareBeaconCard / Sober Support card;
- CTAs: Care, Save privately, Report problem, Privacy controls.

---

## L5 — Route layer

Purpose:

- walking/local movement;
- safe-route preference;
- venue-to-venue movement;
- radio/culture pathing only where useful.

Types:

- standard route;
- safer/calm route;
- venue route;
- care route;
- selected route.

Visual:

- thin;
- readable;
- not spaghetti.

Rules:

- route layer must respect reduced motion;
- private movement trails never public;
- care/safety route visible only according to user scope.

---

## L6 — Cluster layer

Purpose:

- handle local density before individual pins.

Data:

- output from `GlobeDensityEngine` / Mapbox local cluster adapter.

Visual:

- compact cluster bubble;
- category ticks;
- count only where safe;
- priority badge if selected/saved/care.

Interaction:

- tap cluster -> expand stack;
- second-level tap -> category filter;
- no immediate pin explosion.

Rules:

- urgent/private safety cannot be hidden in public clusters;
- care should not be buried under market clusters;
- boosts raise within clusters but do not enlarge cluster excessively.

---

## L7 — Stack layer

Purpose:

- represent dense local signal groups as actionable category stacks.

Examples:

- Events 8;
- Tickets 2;
- Chill 5;
- Care available;
- Market 7.

Visual:

- compact stacked pill/card anchor;
- category chips;
- selected category highlight.

Interaction:

- tap -> LocalSignalDrawer;
- filter by category;
- open item card.

Rules:

- stack is preferred over pin spam;
- market appears after care/events/venues;
- low-count sensitive categories use copy, not exact counts.

---

## L8 — Venue marker layer

Purpose:

- public place discovery;
- venue energy;
- event/ticket anchor.

Sources:

- `venues`;
- `place_intensity`;
- `venue_vibe_mix`;
- approved public events.

Visual:

- anchored venue dot;
- selected venue halo;
- intensity ring only when useful.

Interaction:

- tap -> VenueSheet;
- open events/tickets/vibe/care/accessibility.

Rules:

- venue marker can be exact if public venue;
- do not attach private user identity to venue heat;
- avoid marker towers.

---

## L9 — Individual beacon layer

Purpose:

- render individual signals only when allowed and useful.

Allowed when:

- density budget permits;
- privacy allows;
- local mode active;
- category priority justifies it;
- signal is selected/saved/high relevance.

Visual:

- compact;
- category-specific;
- no giant glow.

Rules:

- no raw people GPS;
- Chill/Meetup use approximate area unless public venue;
- Preloved pickup never exposes home address;
- Help/SOS not public.

---

## L10 — Selected object layer

Purpose:

- make the focused item unmistakable.

Visual:

- strongest halo;
- clear label;
- route/connection emphasis;
- nearby dimming.

Rules:

- selected state may enlarge slightly;
- never becomes a giant tower;
- exact safety location only in protected trusted-contact surface.

---

## L11 — Label layer

Purpose:

- readable names and context.

Label priority:

1. selected object;
2. selected district;
3. care/sober route;
4. venue/event;
5. cluster/stack;
6. market.

Rules:

- collision-aware;
- no all-label clutter;
- no public person names as map labels unless profile surface is opened;
- high contrast mode increases label readability.

---

## L12 — Interaction hit layer

Purpose:

- accessible tap/click targets without visually bloating markers.

Rules:

- hit areas can be larger than visible marker;
- visual marker stays elegant;
- keyboard/list fallback required;
- pointer/hover state on desktop.

---

## L13 — Overlay layer

Purpose:

- cards;
- drawers;
- sheets;
- filters;
- status bars;
- breadcrumbs.

Examples:

- LocalSignalDrawer;
- VenueSheet;
- CareBeaconCard;
- RadioPulseCard;
- MarketSignalCard;
- DistrictExplorer.

Rules:

- overlays are outside Mapbox canvas;
- overlay state owned centrally;
- no dead-end overlays;
- every overlay has a back path.

---

# Interaction priority

When layers overlap, interaction priority is:

1. selected object;
2. Help/SOS protected surface where authorised;
3. care/sober route;
4. cluster/stack;
5. venue marker;
6. event/ticket beacon;
7. chill/meetup;
8. radio;
9. market/preloved;
10. district background.

---

# Mapbox source strategy

Use separate sources for different volatility and privacy classes.

Suggested sources:

```txt
source:districts
source:heat_public
source:care_public
source:routes_public
source:clusters_public
source:stacks_public
source:venues_public
source:beacons_public
source:selected_private_or_scoped
```

Rules:

- never mix raw private safety data into public sources;
- public sources should already be privacy-checked;
- selected private/scoped source only exists inside protected surfaces.

---

# Mapbox layer naming convention

Use stable names:

```txt
hm-base-atmosphere
hm-district-fill
hm-district-outline
hm-heat-nightlife
hm-care-routes
hm-route-lines
hm-cluster-circles
hm-cluster-symbols
hm-stack-anchors
hm-venue-markers
hm-beacon-markers
hm-selected-halo
hm-labels-primary
hm-labels-secondary
hm-hit-areas
```

---

# Style modes

## Nightlife mode

Default.

- dark;
- gold atmosphere;
- strong signal contrast;
- restrained motion.

## Care mode

- lower saturation;
- calmer labels;
- sober support visible;
- market reduced.

## High contrast mode

- stronger outlines;
- less glow dependence;
- clearer labels;
- reduced atmosphere tint.

## Reduced motion mode

- no animated heat shimmer;
- no pulsing clusters;
- static selected halo;
- simplified route drawing.

---

# Privacy constraints

## Public local map can show

- public venues;
- approved public events;
- approved public market listings with safe pickup area;
- sober/care public listings;
- aggregate density;
- approximate social presence.

## Public local map cannot show

- exact user GPS;
- exact Help/SOS locations;
- raw location_shares;
- private messages/taps;
- NA/AA attendee identity;
- private home pickup address;
- trusted contact details.

---

# Performance budgets

| Layer family | Budget rule |
|---|---|
| heat | one or few aggregated layers |
| clusters | preferred at high density |
| stacks | preferred over pins |
| venues | cap by viewport and relevance |
| individual beacons | density capped |
| labels | collision-aware and capped |
| routes | selected/filtered only |
| animated effects | reduced/capped |

---

# Layer update frequency

| Layer | Update cadence |
|---|---|
| base map | static/style |
| district boundaries | static/rare |
| heat | batched 10–30s |
| care public | rare/curated |
| routes | on selection or live scoped |
| clusters | on viewport/filter/density update |
| stacks | on density/category change |
| venues | batched 5–15s if intensity changes |
| individual beacons | batched realtime |
| selected object | immediate |

---

# Failure handling

## Mapbox style fails

Fallback:

- list mode;
- district cards;
- no fake over-zoom Globe fallback.

## Source fails

Fallback:

- hide affected layer;
- show safe empty state;
- do not fake live.

## Privacy conflict

Fallback:

- hide signal;
- show safer aggregate if available;
- log safe diagnostic.

---

# Implementation targets

Create/refactor toward:

```txt
src/components/globe/local/LocalMapboxScene.tsx
src/components/globe/local/MapboxLayerStack.ts
src/components/globe/local/MapboxSources.ts
src/components/globe/local/MapboxStyleModes.ts
src/components/globe/local/MapboxInteractionRouter.ts
src/components/globe/local/LocalSignalDrawer.tsx
src/components/globe/local/VenueSheet.tsx
src/lib/globe/mapbox/mapboxLayerIds.ts
src/lib/globe/mapbox/buildMapboxSources.ts
src/lib/globe/mapbox/buildMapboxLayers.ts
src/lib/globe/mapbox/mapboxPrivacyAdapter.ts
src/lib/globe/mapbox/mapboxDensityAdapter.ts
```

---

# Testing requirements

## Unit tests

Test:

- layer ordering;
- source privacy separation;
- style mode variants;
- hit-area generation;
- label priority;
- density capped marker output.

## Integration tests

Test:

- packed district renders stacks before pins;
- care layer remains above market;
- selected object renders above all normal markers;
- high contrast removes glow dependency;
- reduced motion disables animated local effects;
- private Help/SOS never enters public source.

## E2E tests

Test:

- enter local mode from city cluster;
- tap stack and filter category;
- open venue sheet;
- open care route;
- fail Mapbox style and fallback to list;
- switch calm mode and verify reduced market/noise.

---

# Acceptance criteria

The Mapbox layer stack succeeds when:

- local mode feels sharp, usable, and premium;
- dense districts render as stacks/clusters, not pin soup;
- care/sober support stays visible and calm;
- market/preloved never dominates;
- public exact user GPS never appears;
- Help/SOS exact locations never enter public Mapbox sources;
- venue detail is easy to open;
- selected object is visually clear;
- accessibility modes change actual layer behaviour;
- performance stays stable in nightlife-density areas;
- every layer has a known owner, source, and interaction priority.