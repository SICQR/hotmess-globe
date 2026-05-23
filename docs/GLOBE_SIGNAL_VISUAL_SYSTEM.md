# Globe Signal Visual System

Purpose: define the exact visual and interaction language for every HOTMESS Globe signal type: pins, nodes, beacons, arcs, rings, clusters, labels, heat, and detail states.

This is the design contract before implementation. Do not add new Globe markers without mapping them here.

## Core principle

The Globe is not a Christmas tree. It is a black/gold signal instrument.

Default state must be quiet. Interaction creates intensity.

Rules:

- Small by default.
- Clear on focus.
- Dense areas cluster.
- Urgent states are rare and unmistakable.
- Care is visible but not panic-coded.
- Commercial markers never overpower people, care, or city signal.
- Visual size must never be used as the only tap target.
- Tap target can be generous; visible marker must stay elegant.

## Visual states

Every signal supports these states unless explicitly exempted.

| State | Meaning | Visual behaviour | Interaction |
|---|---|---|---|
| idle | visible but not selected | small, low glow, no aggressive animation | tap/click available |
| hover | pointer/focus nearby | slight scale, label, cursor/affordance | desktop only |
| pressed | touch/click feedback | quick scale down/up | opens preview or drawer |
| selected | current focus | halo, stronger label, controlled pulse | opens card/sheet |
| live | actively updating | subtle breathing glow | can be filtered |
| recent | updated recently but not live | steady marker, small timestamp | can be opened |
| curated | editorial/static route | quiet marker, `Curated` badge | opens care/radio/shop card |
| disabled | layer hidden/unavailable | not rendered or faded in list | no map tap |
| urgent | SOS/safety emergency | red ring, high contrast, no ambiguity | opens urgent/safety surface |

## Scale policy

Current beacons are too large. Replace giant nodes with layer-aware scale.

| Signal | Idle radius | Selected radius | Altitude | Ring max | Notes |
|---|---:|---:|---:|---:|---|
| city node | 0.10–0.14 | 0.20 | 0.012 | 0.9 | mostly label-led |
| venue pin | 0.16–0.22 | 0.32 | 0.018 | 1.0 | no towers |
| event beacon | 0.18–0.26 | 0.36 | 0.020 | 1.2 | time-bound |
| nearby/person | 0.12–0.18 | 0.26 | 0.014 | 0.7 | privacy-soft |
| care/recovery | 0.22–0.30 | 0.40 | 0.018 | 1.1 | calm visibility |
| radio pulse | 0.16–0.22 | 0.32 | 0.016 | 1.3 | waveform/ripple not spike |
| market tag | 0.14–0.20 | 0.30 | 0.014 | 0.8 | commercial secondary |
| founding anchor | custom label | custom label | 0.10 HTML | custom | separate founding layer |
| SOS urgent | 0.34–0.46 | 0.56 | 0.024 | 1.8 | red only here |
| cluster | 0.26–0.44 | 0.54 | 0.016 | 1.0 | shows count, expands |

Implementation rule:

- `pointAltitude` must become signal-aware.
- `pointRadius` must become signal-aware.
- Ring size must become signal-aware.
- Never use a global default that makes every marker huge.

## Camera policy

Signals must not force the user into the blurry texture zone.

| Intent | Altitude | Result |
|---|---:|---|
| overview | 2.4–3.2 | whole-world browsing |
| city select | 1.4–2.0 | city/region focus |
| cluster expand | 1.3–1.8 | split dense area |
| signal select | 1.1–1.4 | selected context |
| forbidden | < 1.0 | avoid until real map detail exists |

Tap behaviour:

- Point tap should move to signal focus, not street-level fake zoom.
- Deep spatial detail must live in drawer/card/map inset.
- Mobile should stay slightly farther out than desktop.

## Signal types

### 1. City Node

Meaning: a city-level HOTMESS signal hub.

Data:

- `cities`
- `cityHeat` from `useGlobeRealtime()`
- aggregate beacon count
- aggregate venue/place intensity

Visual:

- gold text label;
- tiny gold dot;
- optional soft amber halo if active;
- no giant pillar.

States:

- idle: label + dot;
- active: label brightens, halo expands once;
- selected: city drawer opens, camera to city altitude.

Interaction:

- tap/click city label -> select city;
- opens `CitySignalDrawer`;
- filters visible signals by city;
- shows counts by layer.

Microcopy:

- `London is pulsing`
- `Quiet signal here`
- `Open city signal`

### 2. Venue Pin

Meaning: a place/venue with public signal, vibe, event, or heat.

Data:

- `venues`
- `place_intensity`
- `venue_vibe_mix`
- public event links
- aggregate `right_now_status`

Visual:

- steel-blue outer edge;
- gold centre;
- low circular glow;
- no vertical spike.

States:

- live: small breathing gold centre;
- recent: steady centre;
- selected: venue halo + card;
- dense: cluster by neighbourhood.

Interaction:

- tap -> `VenueSignalCard` or beacon/place sheet;
- show vibe, intensity, last updated;
- offer Radio/Care/Shop/Ghosted context only where allowed.

Microcopy:

- `Venue signal`
- `Live vibe`
- `Recently active`

### 3. Event Beacon

Meaning: time-bound event, beacon, or user-created public signal.

Data:

- write source: `events`;
- read source: realtime beacons / `beacons` view;
- metadata may live in `events.metadata`.

Visual:

- gold pin;
- amber ring if upcoming/live;
- small event notch or diamond shape;
- selected state gets one strong pulse.

States:

- upcoming: steady gold;
- live: slow amber pulse;
- ending soon: tighter pulse;
- expired: removed or muted in list.

Interaction:

- tap -> beacon preview;
- venue/event/hotmess category -> `openSheet('beacon')`;
- creation via `BeaconDropModal`;
- never write directly to `beacons` view.

Microcopy:

- `Beacon live`
- `Event signal`
- `Open details`

### 4. Nearby / Person Signal

Meaning: privacy-safe nearby social possibility.

Data:

- `fetchNearbyCandidates()`;
- secure profile output;
- approximate proximity only.

Visual:

- small electric-blue/gold dot;
- never red;
- never exact-looking crosshair;
- no trail.

States:

- idle: tiny blue/gold point;
- selected: soft halo and profile sheet;
- stale: fade/remove.

Interaction:

- tap -> `openProfile()`;
- do not expose exact user location;
- show distance/ETA only where existing rules allow.

Microcopy:

- `Nearby signal`
- `Approximate location`
- `Open profile`

Privacy copy:

- `Locations are approximate. Consent keeps the signal clean.`

### 5. Care / Recovery Beacon

Meaning: care route, recovery space, Hand N Hand, reporting, accessibility, privacy, or support resource.

Data:

- recovery pins from `usePulsePlacesByType()`;
- curated care config;
- future Supabase care/resources table if created.

Visual:

- white centre;
- gold care halo;
- calm pulse;
- red only if truly urgent/SOS.

States:

- curated: steady white/gold;
- live/service-open: subtle breathing halo;
- selected: Care card;
- urgent: red emergency state only.

Interaction:

- tap -> `CareBeaconCard`;
- CTAs: Care, Abuse Reporting, Accessibility, Data & Privacy Hub;
- aftercare framed as information/services/support.

Microcopy:

- `Place to land`
- `Care route`
- `Hand N Hand`
- `Get support`

### 6. Radio Pulse

Meaning: HOTMESS RADIO as a live/global sound signal.

Data:

- `shows`;
- Radio context;
- live metadata only if real.

Visual:

- gold waveform ripple;
- no purple marker;
- soft expanding rings from relevant city/global point;
- can be global if no city metadata.

States:

- live: waveform pulse;
- scheduled: steady small wave icon;
- selected: RadioPulseCard;
- playing: mini-player state reflected subtly.

Interaction:

- tap -> play/radio card;
- CTAs: Listen Live, Schedule, Sponsor This Hour;
- no fake DJ/live metadata.

Microcopy:

- `Radio pulse`
- `Now transmitting`
- `Listen live`

### 7. Market Tag

Meaning: shop/kit/affiliate/location-linked commerce.

Data:

- shop-linked location spikes;
- Shopify handles;
- HNH MESS / Shop routes;
- affiliate/sponsor config where relevant.

Visual:

- small gold square/tag;
- secondary hierarchy;
- no large pulsing rings unless selected.

States:

- idle: small tag;
- selected: product/location panel;
- sponsored: disclosure badge.

Interaction:

- tap -> `LocationShopPanel`;
- always disclose sponsored/affiliate where relevant;
- never obscure care or safety signals.

Microcopy:

- `Kit nearby`
- `Shop signal`
- `Sponsored` where required.

### 8. Route Arc

Meaning: movement, relationship, founding migration, radio transmission, or city-to-city connection.

Types:

| Arc type | Meaning | Visual |
|---|---|---|
| founding | founding/promoter connection | thin gold dashed arc |
| route | active movement/route | steel-blue moving dash |
| radio | broadcast/sound link | gold waveform arc |
| care | care route/signpost | white-gold calm arc |
| market | commerce/logistics | dim gold dotted arc |
| urgent | SOS/emergency route | red, only if real |

Rules:

- arcs must be thinner than pins;
- arcs never dominate the Globe;
- arc animation should be slow and premium;
- no more than one primary arc family should animate heavily at a time;
- respect reduced motion.

Interaction:

- hover/tap arc -> route summary;
- selected arc opens relevant card;
- routes with private user movement must be aggregate or permission-gated.

### 9. Pulse Ring

Meaning: intensity, live update, or selected-state confirmation.

Types:

| Ring type | Meaning | Visual |
|---|---|---|
| live | recently active | subtle gold breath |
| selected | user has tapped/focused | one strong halo |
| care | support route | white-gold soft halo |
| radio | audio transmission | waveform-like ripple |
| urgent | SOS only | red fast pulse |

Rules:

- default rings must be small;
- global `ringMaxRadius` should be lowered;
- ring radius should be signal-aware;
- rings must not blanket whole countries/cities;
- urgent red is reserved.

### 10. Cluster Bubble

Meaning: multiple signals too dense to render individually.

Data:

- generated client-side from normalized `GlobeSignal` list;
- grouped by proximity, city, or screen-space density;
- priority keeps care/urgent separate where needed.

Visual:

- compact gold/black bubble;
- count text;
- tiny category ticks around edge;
- no giant blob.

States:

- idle: count bubble;
- hover: category preview;
- selected: expands camera and opens stacked drawer;
- urgent child: cluster gets small red notch, but urgent can split out if necessary.

Interaction:

- tap cluster -> rotate/zoom to expansion altitude;
- open stacked drawer grouped by Events, Venues, Nearby, Care, Radio, Market;
- second tap on item opens exact card.

Microcopy:

- `42 signals`
- `Open cluster`
- `Split signal`

### 11. Label

Meaning: city/place/signal identity.

Rules:

- labels appear based on zoom/camera mode;
- city labels always more important than random beacon names;
- selected item label can appear even at dense zoom;
- avoid all-caps walls except UI headers.

Treatment:

- city: gold uppercase;
- venue: white/gold small;
- care: white;
- market: dim gold;
- person: no public name on Globe unless opening profile sheet.

## Layer priority

When visual elements overlap, use this priority:

1. urgent/SOS
2. selected item
3. care/recovery
4. city label
5. venue/event live signal
6. radio live signal
7. nearby/person signal
8. market/commercial tag
9. decorative arcs
10. ambient heat

## Interaction model

### Tap / click

| Element | Action |
|---|---|
| city node | focus city + open city drawer |
| venue pin | open venue card/sheet |
| event beacon | open beacon preview/sheet |
| nearby/person | open profile sheet |
| care beacon | open care card |
| radio pulse | open radio card / play control |
| market tag | open shop panel |
| cluster | expand cluster + stacked drawer |
| arc | open route/transmission summary |

### Long press

Mobile only, optional:

- reveal quick actions;
- save/share/report;
- do not trigger destructive actions.

### Hover

Desktop only:

- marker glow;
- safe label;
- cursor pointer;
- no large popup that blocks the globe.

### Keyboard/list fallback

Every visible signal must be reachable via a list/card alternative:

- layer legend;
- city drawer;
- signal list;
- selected cluster drawer.

## Motion rules

Motion should feel expensive, not frantic.

Allowed:

- slow pulse;
- one-shot selected halo;
- subtle route dash;
- camera ease;
- soft hover scale.

Avoid:

- constant frantic rings;
- every marker animating at once;
- jump-cut camera moves;
- aggressive spin;
- flashing red unless urgent.

Reduced motion:

- disable continuous ring animation;
- use static halos;
- reduce camera animation duration;
- provide list-first detail.

## Suggested implementation constants

```ts
export const GLOBE_CAMERA = {
  overview: { altitude: 2.8 },
  city: { altitude: 1.7 },
  cluster: { altitude: 1.55 },
  signal: { altitude: 1.25 },
  minSafe: { altitude: 1.05 },
};

export const GLOBE_SIGNAL_SCALE = {
  city: { radius: 0.12, selectedRadius: 0.2, altitude: 0.012, ring: 0.9 },
  venue: { radius: 0.2, selectedRadius: 0.32, altitude: 0.018, ring: 1.0 },
  event: { radius: 0.22, selectedRadius: 0.36, altitude: 0.02, ring: 1.2 },
  person: { radius: 0.14, selectedRadius: 0.26, altitude: 0.014, ring: 0.7 },
  care: { radius: 0.26, selectedRadius: 0.4, altitude: 0.018, ring: 1.1 },
  radio: { radius: 0.2, selectedRadius: 0.32, altitude: 0.016, ring: 1.3 },
  market: { radius: 0.16, selectedRadius: 0.3, altitude: 0.014, ring: 0.8 },
  urgent: { radius: 0.4, selectedRadius: 0.56, altitude: 0.024, ring: 1.8 },
  cluster: { radius: 0.34, selectedRadius: 0.54, altitude: 0.016, ring: 1.0 },
};
```

## Required components

P0:

- `GlobeSignalTypes.ts`
- `GlobeSignalAdapter.ts`
- `GlobeSignalVisuals.ts`
- `GlobeCameraPolicy.ts`
- `GlobeMarkerScale.ts`
- `GlobeClusterBubble.tsx`
- `GlobeDataSourceBadge.tsx`

P1:

- `CitySignalDrawer.tsx`
- `VenueSignalCard.tsx`
- `CareBeaconCard.tsx`
- `RadioPulseCard.tsx`
- `MarketSignalCard.tsx`
- `PeoplePrivacyNotice.tsx`

P2:

- `GlobeDetailMapInset.tsx`
- `GlobeKeyboardSignalList.tsx`
- `GlobeReducedMotionFallback.tsx`

## Acceptance criteria

- No default marker looks like a skyscraper.
- No normal tap zooms below safe altitude.
- Dense areas cluster instead of stacking huge pins.
- User can tell city, venue, event, care, radio, market, and nearby signals apart.
- Care is always findable.
- Red is reserved for urgent/SOS states.
- Commercial markers are visually secondary.
- Every marker has a clear tap result.
- Every marker has an accessible list/card equivalent.
- The Globe feels black/gold HOTMESS, not demo-map rainbow.
- Real location detail appears in cards/drawers/insets, not by over-zooming the sphere.