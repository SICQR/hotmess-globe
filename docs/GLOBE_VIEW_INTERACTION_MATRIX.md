# Globe View & Interaction Matrix

Purpose: define the visual modes, data layers, user interactions, and build priorities for the HOTMESS Globe.

This document is grounded in the current implementation:

- `src/pages/Globe.jsx`
- `src/components/globe/EnhancedGlobe3D.jsx`
- `src/components/globe/UnifiedGlobe.tsx`
- `src/contexts/GlobeContext.jsx`
- Supabase tables/views documented in `HANDOVER.md`

## Current state summary

The Globe is not a blank surface. It already supports:

- layer toggles: events, venues, people, safety, market, radio;
- live beacon filtering;
- city heat via `useGlobeRealtime()`;
- nearby people pins via `fetchNearbyCandidates()`;
- realtime location spikes;
- realtime routes;
- venue intensity via `useVenueIntensity()`;
- venue vibe mix via `venue_vibe_mix`;
- pulse places via `usePulsePlacesByType()`;
- recovery pins;
- founding tier labels/arcs/rings;
- city click -> city search/filter;
- beacon click -> profile, beacon sheet, preview panel, or shop panel;
- beacon drop modal;
- layer bottom sheet;
- city overlay;
- activity tracking.

## Mapbox patterns to translate

Mapbox examples should inform interaction behaviour, not force a renderer swap.

### 1. Globe spin / motion state

Mapbox pattern: rotating globe pauses during direct interaction and resumes only when appropriate.

HOTMESS translation:

- ambient mode: very slow drift only when user is idle;
- explore mode: no auto movement while user drags/taps/searches;
- live mode: pulse animation can fire without stealing camera;
- focused mode: camera flies to selected city/beacon then settles.

Do not re-enable global auto-rotate by default. Existing `autoRotate={false}` is correct for mobile control.

### 2. Cluster expansion

Mapbox pattern: click a cluster, calculate expansion zoom, `easeTo` centre.

HOTMESS translation:

- when many signals overlap, show a single aggregate marker;
- tap aggregate -> rotate/zoom to area and open a stacked drawer;
- drawer lists individual signals grouped by kind;
- never hide safety/care signals behind commercial signals.

### 3. Point detail

Mapbox pattern: click an unclustered point, open popup.

HOTMESS translation:

- tap point -> open rich HOTMESS card/sheet, not a raw popup;
- people -> profile sheet through existing `openProfile()`;
- venue/event/hotmess -> `openSheet('beacon')`;
- shop-linked location -> `LocationShopPanel`;
- recovery/care -> preview panel with Care CTA.

### 4. Hover affordance

Mapbox pattern: cursor changes on hover.

HOTMESS translation:

- desktop hover: glow, label, cursor pointer;
- mobile tap: larger hit zone, haptic-style scale, bottom preview;
- keyboard: list/card alternative for every visible signal.

## View modes

### 1. Pulse View

Default route: `/pulse`.

Purpose: show the live world signal without asking the user to understand all layers first.

Data:

- `pulse_signals`
- `place_intensity`
- `cities`
- `venues`
- `events`
- `right_now_status`
- `user_presence` aggregate only

Primary interactions:

- drag globe;
- tap city;
- tap signal;
- open layers;
- drop beacon;
- open city overlay.

Visual treatment:

- black world;
- gold primary pins;
- restrained rings;
- city labels in gold;
- no pink/neon palette sprawl.

Build need:

- simplify current colour system;
- make all six layers visually distinct but brand-coherent;
- add data provenance badge.

### 2. City View

Trigger:

- tap city label;
- select city in overlay;
- search result city match;
- context-selected city from `GlobeContext`.

Purpose: make a city feel like a living node.

Data:

- `cities`
- beacons filtered by city;
- venue intensity;
- shows/radio cue;
- recovery/care pins;
- events.

Primary card sections:

- now pulsing;
- top venues;
- radio cue;
- care routes;
- shop/kit link.

Interactions:

- zoom/rotate to city;
- open city drawer;
- filter by layer;
- clear city focus;
- route to Radio/Care/Shop.

Build need:

- replace passive `CityDataOverlay` with a clearer city signal drawer;
- show counts by layer;
- keep selected city sticky until cleared.

### 3. Venue View

Trigger:

- tap venue point;
- tap place from Pulse place layer;
- city drawer venue card.

Purpose: explain what is happening at a place without exposing private users.

Data:

- `venues`
- `place_intensity`
- `venue_vibe_mix`
- public events at venue;
- aggregate `right_now_status` only.

Interactions:

- preview venue;
- open beacon/place sheet;
- show vibe mix;
- jump to Ghosted context only where allowed;
- route to Care if venue is safety/recovery related.

Build need:

- introduce `VenueSignalCard`;
- badge `Live`, `Recent`, or `Curated`;
- never show exact private user identity from venue heat.

### 4. People View

Trigger:

- people layer toggle;
- nearby query when user location is available;
- person pin tap.

Purpose: show social possibility without turning the Globe into a stalker map.

Data:

- `fetchNearbyCandidates()`;
- `profiles` via secure server/API path;
- `user_presence` only through approximate/safe outputs.

Interactions:

- tap person -> `openProfile()`;
- no public exact coordinates;
- no persistent trail;
- show distance/ETA only if already approved by existing proximity rules.

Build need:

- rename visual language from `people` to `Nearby` or `Signal` in user-facing copy;
- use blue/gold, not green gaming dots;
- add privacy microcopy.

### 5. Event / Beacon View

Trigger:

- events layer toggle;
- event pin tap;
- beacon drop FAB;
- search/radius results.

Purpose: let users discover and create time-bound signals.

Data:

- write to `events`;
- read through realtime beacons and `beacons` view where appropriate.

Interactions:

- tap event -> beacon sheet;
- drop beacon -> `BeaconDropModal`;
- after complete -> invalidate `beacons` and `pulse-places` queries;
- amplify if valid and available.

Build need:

- make beacon types clearer;
- add creation success state that routes onward;
- never write directly to `beacons` view.

### 6. Radio View

Trigger:

- radio layer toggle;
- radio pulse card;
- global Radio player state.

Purpose: make sound feel physically present in the world.

Data:

- `shows`;
- existing radio context;
- future live metadata if available.

Interactions:

- tap radio marker -> radio card;
- play/pause;
- view schedule;
- sponsor this hour.

Build need:

- add `RadioPulseCard`;
- attach Now/Next to city/global card;
- no fake live DJ metadata.

### 7. Care / Recovery View

Trigger:

- safety layer toggle;
- recovery pin tap;
- care beacon card;
- empty/lonely states.

Purpose: make care visible without making it panic-coded.

Data:

- recovery pins from `usePulsePlacesByType()`;
- curated Hand N Hand routes;
- abuse reporting/accessibility/privacy routes.

Interactions:

- tap recovery pin -> preview;
- open Care;
- report problem;
- open privacy controls.

Build need:

- split `safety` into `Care` user-facing language where possible;
- use white/gold/red only for real urgent states;
- include aftercare-as-information microcopy.

### 8. Market View

Trigger:

- market layer toggle;
- location spike with `shopify_handles`;
- city drawer kit CTA.

Purpose: turn place/context into relevant kit, not spam.

Data:

- realtime location spike shop handles;
- existing Shopify/product routes;
- HNH MESS / Shop pages.

Interactions:

- tap shop-linked signal -> `LocationShopPanel`;
- product CTA;
- affiliate disclosure where needed.

Build need:

- keep market visually secondary;
- always disclose sponsored/affiliate where relevant.

## Interaction taxonomy

### Passive interactions

- ambient globe drift;
- pulse rings;
- route arcs;
- online count;
- city heat;
- live/recent badges.

### Exploratory interactions

- drag globe;
- zoom globe;
- tap city;
- open layers;
- filter by type;
- search/radius results;
- dismiss overlays.

### Intent interactions

- tap beacon;
- open profile;
- open venue/event sheet;
- open shop panel;
- play radio;
- drop beacon;
- open care.

### Safety interactions

- report problem;
- open Care;
- open Abuse Reporting;
- open Data & Privacy Hub;
- hide sensitive layer;
- clear location focus.

### Creator/commercial interactions

- sponsor this hour;
- affiliate route;
- creator onboarding;
- amplify beacon;
- shop linked product.

## Visual layer language

Current palette is too rainbow-coded. Move to HOTMESS hierarchy:

| Layer | Current issue | Proposed visual |
|---|---|---|
| Events | pink breaks brand | gold pin + amber ring |
| Venues | cyan works but too cold | steel blue edge + gold centre |
| People | gaming green | electric blue/gold, privacy-soft |
| Safety | red over-alarms | white/gold care; red only for SOS |
| Market | yellow close to brand | gold square/kit tag |
| Radio | purple off-brand | gold waveform/ripple |
| Recovery | white works | keep white, add care halo |

## Component build list

### P0 — structure

- `GlobeSignalAdapter`
- `GlobeSignalTypes`
- `GlobeDataSourceBadge`
- `GlobeLayerLegend`
- `CitySignalDrawer`

### P1 — cards

- `VenueSignalCard`
- `RadioPulseCard`
- `CareBeaconCard`
- `MarketSignalCard`
- `PeoplePrivacyNotice`

### P2 — polish

- `GlobeClusterBubble`
- `GlobeIdleDriftController`
- `GlobeKeyboardSignalList`
- `GlobeReducedMotionFallback`

## Build sequence

1. Audit exact current fields returned by realtime beacons, pulse places, venue intensity, venue vibes, nearby candidates, and city heat.
2. Define `GlobeSignal` normalised type.
3. Convert current mixed beacon/place/person/spike data into `GlobeSignal` before rendering.
4. Replace visual colours with HOTMESS layer hierarchy.
5. Add CitySignalDrawer.
6. Add data-source/provenance badge to every preview/card.
7. Add keyboard/list fallback.
8. Add tests for adapter and click routing.

## Acceptance criteria

- The user understands what each signal type means within 3 seconds.
- Tapping a point always opens the correct surface.
- No layer has a dead end.
- No private exact user location is exposed.
- `beacons` remains read-only.
- `right_now_status` stays table-backed.
- Globe stays only on `/pulse` and `/globe`.
- Mobile nav remains tappable.
- Reduced-motion users get a usable static/list experience.
- Visual system feels black/gold HOTMESS, not demo-map rainbow.