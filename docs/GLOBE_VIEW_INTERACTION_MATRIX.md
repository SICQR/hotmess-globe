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

## Current visual problems to fix

These are P0. Do not start decorative polish until these are solved.

### 1. Close zoom becomes blurry

Current issue:

- `EnhancedGlobe3D` uses `earth-night.jpg` from the `three-globe` demo assets.
- On point click, the camera zooms to altitude `0.8`.
- At that altitude the texture does not hold up, so the Globe looks like a blurred ball rather than a real world surface.

Required fix:

- Introduce zoom-aware map detail.
- Either use a higher-resolution earth/night texture or switch to a tile/detail strategy when zoomed.
- Do not zoom closer than the current texture can support.
- Add a min/max camera policy: overview, city, venue/detail.
- If using Mapbox visual references, translate their map-detail behaviour into the current renderer; do not blindly replace the Globe engine unless there is a signed-off architecture decision.

Recommended camera bands:

| Mode | Altitude | Purpose |
|---|---:|---|
| Overview | 2.4–3.2 | global browsing |
| City focus | 1.4–2.0 | readable city/region detail |
| Signal focus | 1.1–1.4 | selected beacon/card context |
| Forbidden blur zone | below 1.0 | avoid until real map/detail tiles exist |

Immediate engineering change:

- Change point-click zoom from altitude `0.8` to approximately `1.25`.
- Make the final value responsive: mobile should stay farther out than desktop.
- Add a named constant, not magic numbers.

### 2. Beacons are too large and cover geography

Current issue:

- beacon point radii are visually too large;
- point altitude makes nodes feel like towers rising out of the earth;
- rings cover mass areas;
- dense cities become unreadable blobs.

Required fix:

- shrink default marker radius;
- reduce point altitude;
- use selected/hovered state for emphasis instead of giant default nodes;
- cluster or aggregate dense points;
- make rings subtler and category-specific;
- keep tap target accessible via interaction hit area, not visual bulk.

Recommended point scale:

| Signal | Default visual size | Selected size | Notes |
|---|---:|---:|---|
| city | label + small dot | label + halo | cities should anchor, not dominate |
| venue | 0.16–0.24 | 0.32 | aggregate if dense |
| event/beacon | 0.18–0.28 | 0.36 | no skyscraper pins |
| person/nearby | 0.12–0.18 | 0.26 | privacy-soft, not precise-looking |
| care/recovery | 0.24–0.34 | 0.42 | visible but calm |
| SOS/urgent | 0.35–0.48 | 0.56 | red only for real urgent state |

Immediate engineering change:

- Replace current `PIN_SIZE` values with smaller layer-aware constants.
- Lower `pointAltitude` from `0.07` to a subtler value around `0.018–0.03`.
- Make `ringMaxRadius` category-aware or lower the global default.
- Add selected/highlighted styling rather than making every pin huge.

### 3. No real map feeling when close

Current issue:

- close view lacks roads, neighbourhoods, boundaries, or recognisable city context;
- the user expects “map” detail after zoom but receives enlarged texture.

Required fix:

- treat the 3D Globe as the global browser;
- when a user selects a city/venue/beacon, pair the globe with a detail drawer/card that gives map-like context;
- for deeper location views, use a flat detail map or city inset rather than forcing the sphere to fake street detail.

Recommended UX pattern:

- globe overview stays cinematic;
- city drawer contains real contextual detail;
- venue/beacon panel can include a map tile/inset if available;
- never pretend the sphere is a street map.

### 4. Visual hierarchy is too equal

Current issue:

- every signal competes at once;
- large nodes plus rings flatten all meaning;
- layer colours read as demo-map rainbow.

Required fix:

- default state: quiet, small, elegant;
- active layer: visible;
- selected item: amplified;
- urgent/care: semantically distinct;
- commercial layer: secondary.

Rule: the user should understand signal importance without needing to open the layer sheet.

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
- no pink/neon palette sprawl;
- no close-zoom blur;
- no oversized nodes covering landmass.

Build need:

- simplify current colour system;
- make all six layers visually distinct but brand-coherent;
- add data provenance badge;
- add zoom-aware camera constants;
- reduce beacon/ring scale;
- add clustering or overlap aggregation.

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
- keep selected city sticky until cleared;
- avoid zooming below the texture-quality threshold.

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
- never show exact private user identity from venue heat;
- add optional flat map/inset for real location detail.

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
- add privacy microcopy;
- keep person pins deliberately smaller and less precise-looking.

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
- never write directly to `beacons` view;
- make event pins small by default, larger only on selected/highlighted state.

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
- no fake live DJ metadata;
- use waveform/ripple graphics, not oversized tower pins.

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
- include aftercare-as-information microcopy;
- recovery can be slightly larger than other pins but must not cover geography.

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
- always disclose sponsored/affiliate where relevant;
- market icons should feel tagged/pinned, not geographically dominant.

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
- `GlobeCameraPolicy`
- `GlobeMarkerScale`

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
- `GlobeDetailMapInset`

## Build sequence

1. Audit exact current fields returned by realtime beacons, pulse places, venue intensity, venue vibes, nearby candidates, and city heat.
2. Define `GlobeSignal` normalised type.
3. Convert current mixed beacon/place/person/spike data into `GlobeSignal` before rendering.
4. Add `GlobeCameraPolicy`: overview, city focus, signal focus, forbidden blur zone.
5. Add `GlobeMarkerScale`: layer-aware radii, altitude, ring scale, selected state.
6. Replace visual colours with HOTMESS layer hierarchy.
7. Add cluster/overlap aggregation for dense areas.
8. Add CitySignalDrawer.
9. Add data-source/provenance badge to every preview/card.
10. Add keyboard/list fallback.
11. Add tests for adapter, marker scale, camera policy, and click routing.

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
- Zooming in must not reveal a blurry low-resolution earth texture.
- Point-click camera altitude must not enter the forbidden blur zone.
- Default beacons must not cover entire neighbourhoods/countries.
- Dense areas must cluster, aggregate, or list signals rather than stack giant pins.
- Rings must communicate pulse/intensity without blanketing the map.
- Real street-level detail must be shown through drawers/cards/map insets, not fake close sphere zoom.