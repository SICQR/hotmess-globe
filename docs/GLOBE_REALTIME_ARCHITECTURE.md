# Globe Realtime Architecture

Purpose: define how realtime data enters the HOTMESS Globe safely, efficiently, and coherently.

Realtime must make the Globe feel alive.

Realtime must NOT create:

- subscription storms;
- duplicated listeners;
- raw GPS leakage;
- infinite rerenders;
- fake live claims;
- unsafe Help/SOS exposure;
- memory leaks;
- animation chaos.

This document is the contract for realtime ingestion, fanout, privacy, throttling, freshness, and fallback.

---

# Core rule

Realtime is an ingestion layer, not a rendering layer.

Realtime events must pass through:

```txt
Realtime intake
→ normalization
→ privacy/safety gate
→ lifecycle/economy gate
→ density/visibility engine
→ accessibility policy
→ renderer adapter
```

Never render raw realtime payloads directly.

---

# Current known realtime surfaces

Current Globe-related realtime/hooks include:

- `useRealtimeBeacons()`
- `useRightNowCount()`
- `useRealtimeLocations()`
- `useRealtimeRoutes()`
- `useGlobeRealtime()`
- `useGlobeActivity()`
- `GlobeContext` beacon insert subscription
- Supabase auth listeners elsewhere in the app

Known risk:

- there are already multiple `onAuthStateChange` listeners in the app;
- do not add another auth listener for Globe without audit.

---

# Realtime design goal

## One realtime bridge

Create one coordination layer:

```txt
BeaconRealtimeBridge
```

or:

```txt
GlobeRealtimeBridge
```

This bridge owns:

- subscriptions;
- channel lifecycle;
- payload validation;
- event normalization;
- throttling;
- dedupe;
- fanout;
- fallback freshness state.

Components subscribe to bridge output, not directly to Supabase.

---

# Forbidden pattern

Do NOT allow this:

```txt
Globe component subscribes
Venue component subscribes
City overlay subscribes
Beacon card subscribes
Layer toggle subscribes
Profile card subscribes
```

That creates:

- duplicated data;
- race conditions;
- memory leaks;
- render storms;
- inconsistent freshness labels.

---

# Realtime channels

## Public signal channels

Can feed public Globe after policy gates.

Examples:

- public beacon/event inserts;
- venue intensity changes;
- radio show state;
- city heat changes;
- aggregate right-now counts.

Allowed output:

- aggregate heat;
- signal pulses;
- clusters;
- stack updates;
- honest `Live` labels.

---

## Private user channels

Must never feed public Globe directly.

Examples:

- raw user presence;
- location shares;
- profile updates;
- chats;
- taps;
- blocks.

Allowed output:

- profile-safe surfaces only;
- self-owned views;
- matched/trusted-contact scoped flows;
- aggregate after privacy policy.

---

## Private safety channels

Highest risk.

Examples:

- Help Beacon;
- SOS;
- trusted contact delivery;
- safety location snapshots.

Allowed output:

- self view;
- chosen trusted contacts;
- server-side delivery;
- threshold-safe aggregate only if explicitly designed.

Never output:

- public exact pins;
- public red SOS dots;
- vendor-visible safety state;
- sponsor-visible safety state.

---

# Recommended channel ownership

| Channel type | Owner | Public render? | Notes |
|---|---|---|---|
| beacons/events | `GlobeRealtimeBridge` | yes after policy | no raw rendering |
| venue intensity | `GlobeRealtimeBridge` | aggregate only | low-count suppression |
| right-now counts | `GlobeRealtimeBridge` | aggregate only | no identity |
| user presence | secure proximity service | no raw public | fuzz/aggregate |
| routes | `GlobeRealtimeBridge` | only safe routes | no private trails |
| radio state | Radio context + bridge | yes | no fake live metadata |
| Help/SOS | safety service | no public exact | trusted-contact only |
| chat/taps | chat/social services | no Globe | private surfaces only |

---

# Event model

Realtime payloads should normalize into typed events.

```ts
export type GlobeRealtimeEvent =
  | { type: 'BEACON_CREATED'; beaconId: string; source: 'supabase'; receivedAt: string }
  | { type: 'BEACON_UPDATED'; beaconId: string; source: 'supabase'; receivedAt: string }
  | { type: 'BEACON_EXPIRED'; beaconId: string; source: 'system'; receivedAt: string }
  | { type: 'CITY_HEAT_CHANGED'; cityId: string; source: 'aggregate'; receivedAt: string }
  | { type: 'VENUE_INTENSITY_CHANGED'; venueId: string; source: 'aggregate'; receivedAt: string }
  | { type: 'RADIO_STATE_CHANGED'; showId?: string; source: 'radio'; receivedAt: string }
  | { type: 'ROUTE_UPDATED'; routeId: string; source: 'supabase'; receivedAt: string }
  | { type: 'SAFETY_ACTIVATION_CREATED'; activationId: string; scope: 'self' | 'trusted_contact'; receivedAt: string }
  | { type: 'SAFETY_ACTIVATION_CANCELLED'; activationId: string; scope: 'self' | 'trusted_contact'; receivedAt: string };
```

Rules:

- public renderers should not receive `SAFETY_*` events;
- they go to safety-owned surfaces only;
- public Globe receives only derived/approved signals.

---

# Payload validation

Every realtime payload must validate:

- expected table/view/source;
- required ID;
- timestamp;
- coordinates if applicable;
- lifecycle state;
- moderation status;
- visibility scope;
- source provenance.

Invalid payloads:

- drop safely;
- log safe diagnostic;
- never crash Globe;
- never render as generic fallback pin.

---

# Freshness model

Realtime drives freshness labels.

```ts
export type RealtimeFreshness =
  | 'live'
  | 'recent'
  | 'stale'
  | 'curated'
  | 'offline'
  | 'unknown';
```

## Rules

- `Live` requires an active realtime path or current server timestamp.
- `Recent` means timestamped data but no active realtime proof.
- `Curated` means editorial/static/system-configured.
- `Offline` means realtime unavailable.
- `Unknown` should render quietly or not at all.

Never label static/curated signals as live.

---

# Dedupe and ordering

Realtime events often arrive alongside refetches.

Bridge must dedupe by:

- stable ID;
- source table;
- version/updated timestamp;
- received timestamp;
- lifecycle state.

Conflict rule:

- server timestamp wins over client timestamp;
- cancellation/hidden/reported wins over boosted/live;
- safety privacy wins over all.

---

# Throttling and batching

Realtime must not animate every individual event immediately.

## Batch windows

Recommended:

- public beacons: 500ms–1500ms batch;
- venue intensity: 5s–15s batch;
- city heat: 10s–30s batch;
- routes/arcs: 2s–10s batch;
- right-now counts: 15s–30s batch;
- safety: immediate to intended recipients only.

## Rules

- safety delivery is immediate;
- public visual animation can be batched;
- dense areas should update stacks/heat, not individual pins.

---

# Subscription lifecycle

Every subscription must support:

- setup;
- active state;
- pause;
- resume;
- cleanup;
- error state;
- backoff;
- offline mode.

## Route-aware subscription policy

Since Globe only renders on `/pulse` and `/globe`, realtime should be route-aware.

On non-Globe routes:

- stop heavy Globe visual streams;
- keep lightweight global state only where needed;
- never leave canvas/realtime loops running needlessly.

---

# Channel cleanup

On unmount:

- remove Supabase channel;
- clear animation queues;
- cancel timers;
- cancel pending batches;
- clear stale listeners.

Hot-reload safe cleanup required in development.

---

# Offline and degraded mode

If realtime fails:

- do not blank the Globe;
- display cached/recent data;
- downgrade labels from `Live` to `Recent` or `Offline`;
- stop live pulse animations;
- show subtle status only if useful.

Copy:

```txt
Signal is recent. Live updates are reconnecting.
```

Avoid:

```txt
ERROR REALTIME FAILED
```

---

# Privacy gates for realtime

## Public Globe gate

Before a realtime event reaches public rendering:

- remove exact user GPS;
- apply visibility scope;
- apply blocks;
- apply moderation;
- apply low-count suppression;
- apply NA/AA anonymity;
- apply Help/SOS exclusion.

## Help/SOS gate

Safety events are routed only to:

- self;
- chosen trusted contacts;
- authorised server delivery.

Exact lat/lng must never enter:

- public signal cache;
- public cluster engine;
- public analytics;
- public map renderer.

---

# Realtime and density

Realtime updates should feed density intelligently.

## Good

- `London heat increased`
- `Soho stack now has 8 events`
- `Venue intensity changed`
- `Radio pulse live`

## Bad

- animate 60 individual user dots;
- make every new beacon spawn a giant ring;
- force camera jumps on every update;
- show private location spikes publicly.

---

# Animation policy

Realtime should not always equal animation.

Only animate:

- selected item;
- newly relevant cluster;
- meaningful city/district change;
- live radio pulse;
- urgent safety inside private safety surface.

Do not animate:

- every update;
- stale updates;
- hidden updates;
- private safety publicly;
- low-priority market changes at city scale.

---

# Interaction with React Query

React Query should own cached fetch snapshots.

Realtime bridge should:

- update/invalidate query keys deliberately;
- avoid invalidating broad keys on every payload;
- batch invalidations;
- keep cache and realtime event stream consistent.

Rules:

- no global invalidation storm;
- no full refetch for every beacon insert;
- prefer targeted updates.

---

# Query keys to standardize

Suggested key namespaces:

```ts
['globe', 'signals']
['globe', 'cityHeat']
['globe', 'venueIntensity']
['globe', 'routes']
['globe', 'radio']
['globe', 'local', cityId, districtId]
['safety', 'activations']
['safety', 'trustedContacts']
```

---

# Error handling

## Supabase channel error

- mark affected stream `offline`;
- attempt backoff reconnect;
- do not crash UI;
- do not show fake live.

## Invalid payload

- drop;
- log safe diagnostic;
- optionally trigger schema audit issue.

## Permission/RLS error

- treat as policy failure;
- do not retry aggressively;
- do not fallback to wider access.

## Safety delivery error

- show clear user-owned status;
- retry server-side where safe;
- never expose exact location to public fallback.

---

# Security and RLS expectations

Realtime does not bypass RLS.

Every channel must respect:

- owner scopes;
- recipient scopes;
- public read policy;
- no unsafe anon reads;
- no service-role client usage.

If realtime needs privileged aggregation:

- perform server-side;
- expose only safe aggregate view/RPC;
- never publish raw private rows.

---

# Performance budgets

## Subscriptions

Goal:

- one bridge;
- few channels;
- route-aware activation;
- cleanup on unmount.

## Animation

Recommended caps:

- new-pulse animations: 6–12 visible;
- active realtime rings: 12 max;
- route arcs: 8 max;
- local live markers: density-dependent.

## Batching

Required for:

- right-now counts;
- city heat;
- venue intensity;
- dense beacon inserts.

---

# Testing requirements

## Unit tests

Test:

- payload validation;
- dedupe;
- freshness labels;
- privacy routing;
- safety event isolation;
- batch windows;
- cache updates.

## Integration tests

Test:

- 100 beacon inserts in 10 seconds;
- 60 visible people in one district;
- realtime outage/reconnect;
- cancellation beats boosted state;
- reported signal disappears;
- NA/AA update stays anonymous;
- Help/SOS exact location does not reach public store.

## E2E tests

Test:

- open `/pulse` and receive live beacons;
- leave `/pulse` and heavy subscriptions pause;
- return and resume;
- realtime offline displays recent state;
- safety alert reaches trusted contact path only.

---

# Required implementation targets

Create/refactor toward:

```txt
src/lib/globe/realtime/GlobeRealtimeBridge.ts
src/lib/globe/realtime/GlobeRealtimeEvent.ts
src/lib/globe/realtime/GlobeRealtimeFreshness.ts
src/lib/globe/realtime/GlobeRealtimeDedupe.ts
src/lib/globe/realtime/GlobeRealtimeBatcher.ts
src/lib/globe/realtime/GlobeRealtimePrivacyRouter.ts
src/lib/globe/realtime/GlobeRealtimeQuerySync.ts
```

Safety-owned realtime lives separately:

```txt
src/lib/safety/realtime/SafetyRealtimeBridge.ts
```

---

# Migration path from current code

## Step 1

Inventory existing realtime hooks:

- `useRealtimeBeacons()`
- `useRightNowCount()`
- `useRealtimeLocations()`
- `useRealtimeRoutes()`
- `useGlobeRealtime()`
- `GlobeContext` subscription

## Step 2

Classify each hook:

- keep;
- wrap;
- merge;
- delete;
- safety-only;
- aggregate-only.

## Step 3

Move shared subscription responsibility into bridge.

## Step 4

Make UI consume normalized bridge output.

## Step 5

Apply render pipeline before UI.

## Step 6

Delete duplicate subscriptions.

---

# Acceptance criteria

Realtime architecture succeeds when:

- Globe has one coordinated realtime bridge;
- subscriptions clean up reliably;
- route changes pause heavy streams;
- Help/SOS exact location never reaches public Globe state;
- raw user presence never becomes public pins;
- dense updates batch into heat/stacks;
- `Live` labels are honest;
- realtime failure downgrades gracefully;
- React Query does not get invalidation storms;
- duplicate auth/listeners are not added;
- tests prove privacy routing and density batching;
- the Globe feels alive without becoming frantic.