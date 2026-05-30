# Globe Render Pipeline Spec

Purpose: define the exact pipeline that turns Supabase data, realtime events, user visibility choices, beacon lifecycle states, boosts, density, accessibility preferences, and safety policy into rendered Globe and Mapbox visuals.

This is the anti-chaos document.

The renderer must never decide business rules by itself.

The pipeline is:

```txt
Raw data
→ normalized signal
→ privacy/safety policy
→ lifecycle/economy policy
→ density/visibility policy
→ accessibility/motion policy
→ renderer adapter
→ Globe / Mapbox / list output
```

---

# Why this exists

The current Globe risks:

- giant nodes;
- blurry zoom;
- duplicated realtime;
- public/private data confusion;
- unsafe Help/SOS leakage;
- fake live claims;
- density overload;
- animation spam;
- inconsistent marker styles.

A strict pipeline prevents those problems.

---

# Pipeline principles

## 1. Renderers do not make policy

Renderers display already-approved render objects.

Renderers must not:

- query Supabase directly;
- decide privacy;
- decide lifecycle;
- decide boost eligibility;
- decide exact location visibility;
- decide density suppression;
- invent beacon types.

---

## 2. Privacy happens before visibility

A signal must pass privacy/safety rules before any rendering decision.

This prevents:

- exact Help/SOS leaks;
- raw user presence leaks;
- sober support inference;
- private profile exposure.

---

## 3. Density happens before pins

The system must decide whether a signal becomes:

- heat;
- cluster;
- stack;
- pin;
- card;
- list item;
- hidden.

before it reaches a renderer.

---

## 4. Accessibility can override rendering

Reduced motion, calm mode, high contrast, and list fallback can override:

- animation;
- density;
- camera transitions;
- visual effects;
- local mode complexity.

---

# Pipeline stages

---

# Stage 0 — Source intake

Purpose:

Collect source data from Supabase, APIs, local state, realtime, and app context.

Sources include:

- `cities`
- `venues`
- `events`
- `beacons` view
- `pulse_signals`
- `place_intensity`
- `right_now_status`
- `user_presence`
- `location_shares`
- `shows`
- `preloved_listings`
- `products`
- `profiles`
- `profile_photos`
- `trusted_contacts`
- safety tables
- realtime beacon events
- realtime route events
- local user filters
- accessibility state
- selected city/district/signal

## Output

Raw source records.

## Rules

- Source intake does not render.
- Source intake does not expose raw private data.
- Source intake does not make marker choices.
- Realtime intake is centralized.

---

# Stage 1 — Schema adapter

Purpose:

Convert raw database/API shapes into normalized internal source objects.

## Example inputs

- event row;
- beacon view row;
- venue row;
- realtime location spike;
- radio show row;
- profile-safe candidate;
- market listing;
- safety activation.

## Output

```ts
type GlobeSourceRecord = {
  id: string;
  sourceTable?: string;
  sourceKind: 'city' | 'venue' | 'event' | 'person' | 'radio' | 'market' | 'care' | 'safety' | 'route';
  rawType?: string;
  lat?: number;
  lng?: number;
  city?: string;
  venueId?: string;
  ownerId?: string;
  startsAt?: string;
  endsAt?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
};
```

## Rules

- No visual style here.
- No boost logic here.
- No renderer-specific fields here.
- Preserve provenance.

---

# Stage 2 — Type classification

Purpose:

Convert source records into known Globe signal/beacon categories.

## Output

```ts
type ClassifiedSignal = GlobeSourceRecord & {
  signalKind: 'city' | 'venue' | 'beacon' | 'cluster_seed' | 'route' | 'heat_seed';
  beaconType?:
    | 'event'
    | 'ticket'
    | 'chill'
    | 'preloved_drop'
    | 'hnh_mess'
    | 'radio'
    | 'care'
    | 'na_aa'
    | 'sober_support'
    | 'venue_vibe'
    | 'meetup'
    | 'afterparty'
    | 'creator_drop'
    | 'record_release'
    | 'urgent_safety';
};
```

## Rules

- Unknown types become `hidden` or `needs_mapping`.
- Do not render unknown beacon categories as generic gold pins.
- Every renderable type must exist in `GLOBE_BEACON_TAXONOMY.md`.

---

# Stage 3 — Privacy and safety gate

Purpose:

Decide whether a signal can enter public rendering.

## Inputs

- classified signal;
- current user;
- visibility settings;
- trusted contacts;
- blocks;
- profile permissions;
- safety status;
- Help/SOS policy.

## Output

```ts
type PrivacyCheckedSignal = ClassifiedSignal & {
  privacyClass:
    | 'public_signal'
    | 'aggregate_signal'
    | 'profile_safe'
    | 'private_user'
    | 'private_safety'
    | 'admin_only'
    | 'server_only';
  publicRenderAllowed: boolean;
  locationPrecision: 'exact' | 'venue' | 'area' | 'city' | 'none';
  safeLat?: number;
  safeLng?: number;
  hiddenReason?: string;
};
```

## Rules

- Exact Help/SOS lat/lng never enters public render output.
- Raw `user_presence` never becomes public exact pins.
- NA/AA and sober support must be anonymity-safe.
- Preloved pickup never exposes home address.
- Blocked users/signals are removed for the viewer.
- Private safety data only reaches self/trusted-contact surfaces.

---

# Stage 4 — Lifecycle and economy gate

Purpose:

Apply state, expiry, cancellation, boost, trust, and monetisation policy.

## Inputs

- privacy-checked signal;
- lifecycle state;
- expiry window;
- trust score;
- boost state;
- moderation state;
- account tier.

## Output

```ts
type LifecycleSignal = PrivacyCheckedSignal & {
  lifecycleState:
    | 'draft'
    | 'scheduled'
    | 'queued'
    | 'live'
    | 'boosted'
    | 'trending'
    | 'cooling'
    | 'ending'
    | 'expired'
    | 'cancelled'
    | 'reported'
    | 'hidden'
    | 'archived';
  trustWeight: number;
  boostWeight: number;
  freshnessWeight: number;
  renderEligible: boolean;
};
```

## Rules

- Cancelled/expired/reported/hidden signals do not render publicly unless an archive/review surface is explicit.
- Boosts affect priority, not huge marker size.
- SOS/help cannot be boosted.
- Sponsored/vendor signals require disclosure.
- Moderation can suppress visibility regardless of boost.

---

# Stage 5 — Density engine

Purpose:

Decide how many signals can appear and in what form.

## Inputs

- lifecycle signals;
- zoom band;
- viewport;
- city/district;
- density thresholds;
- category priority;
- selected state.

## Output

```ts
type DensityDecision = {
  renderMode:
    | 'hidden'
    | 'heat'
    | 'constellation'
    | 'cluster'
    | 'stack'
    | 'pin'
    | 'card'
    | 'list'
    | 'local_map';
  groupId?: string;
  priority: number;
  categoryCount?: number;
};
```

## Rules

- Space view should produce heat/constellations, not local pins.
- Dense areas produce clusters/stacks before pins.
- Care and urgent safety split out of commercial clusters.
- Market is visually secondary.
- People visibility is aggregate/approximate by default.

---

# Stage 6 — Accessibility and motion policy

Purpose:

Adapt render decisions to user accessibility state.

## Inputs

- density decisions;
- reduced motion;
- calm mode;
- high contrast;
- low stimulation;
- list fallback.

## Output

```ts
type AccessibilityAdjustedSignal = LifecycleSignal & DensityDecision & {
  motionLevel: 'none' | 'minimal' | 'standard';
  contrastMode: 'standard' | 'high';
  listFallbackRequired: boolean;
  animationAllowed: boolean;
};
```

## Rules

- Reduced motion disables continuous pulse/orbit/particle systems.
- Calm mode reduces density and saturation.
- List fallback can replace map interaction.
- Help/SOS remains visible but not panic-flashing.

---

# Stage 7 — Renderer adapter

Purpose:

Convert policy-approved signals into renderer-specific objects.

## Output variants

### Globe renderer object

```ts
type GlobeRenderObject = {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  altitude: number;
  color: string;
  ring?: RenderRing;
  arc?: RenderArc;
  label?: RenderLabel;
  onSelectIntent: RenderIntent;
};
```

### Mapbox local object

```ts
type MapboxRenderObject = {
  id: string;
  type: 'Feature';
  geometry: GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon;
  properties: {
    beaconType?: string;
    priority: number;
    clusterId?: string;
    label?: string;
    disclosure?: string;
  };
};
```

### List/card object

```ts
type SignalListItem = {
  id: string;
  title: string;
  eyebrow: string;
  body?: string;
  ctaPrimary: string;
  ctaSecondary?: string;
  accessibilityLabel: string;
};
```

## Rules

- Renderer adapter is the first stage allowed to know about marker size/colour.
- It must use `BeaconVisualRegistry` and `GlobeMarkerScale`.
- It must never resurrect hidden/private signals.
- It must respect camera zoom band.

---

# Stage 8 — Render output

Purpose:

Render approved objects in the correct surface.

## Outputs

- `EnhancedGlobe3D`
- `LocalMapboxScene`
- `CitySignalDrawer`
- `DistrictExplorer`
- `VenueSheet`
- `BeaconCard`
- `SignalListView`

## Rules

- Renderers are dumb surfaces.
- Renderers emit interaction intents.
- Renderers do not mutate business state directly.
- Renderers do not perform raw database writes.

---

# Interaction loop

When a user interacts, the renderer emits an intent.

## Example intents

```ts
type RenderIntent =
  | { type: 'SELECT_CITY'; cityId: string }
  | { type: 'SELECT_DISTRICT'; districtId: string }
  | { type: 'SELECT_SIGNAL'; signalId: string }
  | { type: 'EXPAND_CLUSTER'; clusterId: string }
  | { type: 'OPEN_CARD'; signalId: string }
  | { type: 'OPEN_PROFILE'; userId: string }
  | { type: 'OPEN_CARE'; careId: string }
  | { type: 'OPEN_RADIO'; showId?: string }
  | { type: 'OPEN_MARKET'; listingId?: string }
  | { type: 'REPORT_SIGNAL'; signalId: string };
```

## Rules

- Intent handlers decide routing.
- Renderers do not open random sheets directly unless wrapped by the central intent handler.
- Safety/privacy checks run again before sensitive surfaces open.

---

# Output surface matrix

| Render mode | Surface | Example |
|---|---|---|
| heat | Globe | London glow |
| constellation | Globe | city pulse field |
| cluster | Globe/Mapbox | Soho 42 signals |
| stack | Drawer/Mapbox | Events 8, Care 2 |
| pin | Globe/Mapbox | venue/event marker |
| card | Overlay | BeaconCard |
| list | Accessibility/list mode | nearby signals |
| local_map | Mapbox | street/district detail |

---

# Failure handling

## Supabase source failure

Fallback:

- cached snapshot;
- empty state;
- no fake live claims.

## Realtime failure

Fallback:

- static latest data;
- badge becomes `Recent` instead of `Live`.

## Globe renderer failure

Fallback:

- city list;
- static background;
- Mapbox/local if available.

## Mapbox failure

Fallback:

- district cards;
- list mode;
- no street map.

## Privacy policy conflict

Fallback:

- hide signal;
- log safe diagnostic;
- never render risky data.

---

# Caching and freshness

Every renderable signal must carry freshness.

```ts
type SignalFreshness = 'live' | 'recent' | 'stale' | 'curated' | 'unknown';
```

Rules:

- `Live` requires live/realtime proof.
- `Recent` can use timestamped cached data.
- `Curated` must not pretend to be live.
- `Unknown` should render quietly or not at all.

---

# Testing requirements

## Unit tests

Test:

- schema adapter;
- type classifier;
- privacy gate;
- lifecycle gate;
- density engine;
- accessibility policy;
- renderer adapter.

## Integration tests

Test:

- dense Soho scenario;
- Help/SOS exact-location protection;
- NA/AA anonymity;
- boosted market signal staying secondary;
- expired beacon disappearing;
- cancelled beacon fading/removing;
- reduced motion output.

## E2E tests

Test:

- select city from space;
- expand district cluster;
- open venue card;
- open care route;
- open radio pulse;
- switch to list fallback;
- Mapbox failure fallback.

---

# Performance budgets

Renderer output must respect budgets.

| Surface | Budget |
|---|---:|
| Globe detailed pins | 30 max default |
| Globe animated rings | 12 max default |
| Globe arcs | 8 max default |
| Mapbox detailed visible markers | density-based, 3–40 |
| Active animated local pulses | 10 max default |
| Realtime subscriptions | centralized |

Budgets can be tightened by:

- reduced motion;
- low stimulation;
- low battery;
- dense area;
- mobile device.

---

# Forbidden shortcuts

Do not:

- render raw Supabase rows directly;
- render raw `user_presence` as pins;
- render Help/SOS exact lat/lng publicly;
- make boosts huge;
- bypass density engine;
- query Supabase in render loops;
- open sensitive surfaces without rechecking privacy;
- label curated data as live;
- use one marker style for every type.

---

# Implementation targets

Create or refactor toward:

```txt
src/types/globe/GlobeSignalTypes.ts
src/types/globe/GlobeBeaconType.ts
src/types/globe/GlobeDensity.ts
src/types/globe/GlobeVisibility.ts
src/lib/globe/GlobeSignalAdapter.ts
src/lib/globe/GlobeTypeClassifier.ts
src/lib/globe/GlobePrivacyGate.ts
src/lib/globe/GlobeLifecycleGate.ts
src/lib/globe/GlobeDensityEngine.ts
src/lib/globe/GlobeAccessibilityPolicy.ts
src/lib/globe/GlobeRendererAdapter.ts
src/lib/globe/BeaconVisualRegistry.ts
src/lib/globe/GlobeMarkerScale.ts
src/lib/globe/GlobeCameraPolicy.ts
```

---

# Acceptance criteria

The render pipeline succeeds when:

- renderers receive only approved render objects;
- privacy runs before visibility;
- density runs before pins;
- accessibility can override motion and detail;
- Help/SOS exact location never enters public render output;
- boosted signals never become giant markers;
- live/recent/curated freshness is honest;
- dense cities remain readable;
- Mapbox and Globe consume the same policy-approved signal layer;
- list fallback can render the same approved signals;
- tests cover every policy gate;
- Claude/devs know exactly where new logic belongs.