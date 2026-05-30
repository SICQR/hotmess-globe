# Globe Realtime Signal Engine

Purpose: define how realtime activity becomes meaningful HOTMESS Globe signal.

This document sits under:

- `GLOBE_REALTIME_ARCHITECTURE.md`
- `GLOBE_RENDER_PIPELINE_SPEC.md`
- `GLOBE_DENSITY_CLUSTERING_SYSTEM.md`
- `GLOBE_SOCIAL_GRAPH_AND_PRESENCE.md`
- `GLOBE_INTERACTION_PATTERNS.md`

The realtime architecture defines subscription safety.

This document defines signal meaning.

Realtime should not make the Globe frantic.

Realtime should make the Globe feel:

```txt
alive, legible, honest, and emotionally timed
```

---

# Non-negotiable: do not gamify the Globe

The Globe must not become a game layer.

Do not introduce:

- XP;
- public scores;
- leaderboards;
- badges-as-status;
- streak mechanics;
- points;
- ranks;
- competitive presence;
- clout ladders;
- public trust numbers.

The Globe may use private internal weighting for:

- trust;
- moderation;
- signal quality;
- safety priority;
- density ranking;
- spam reduction;
- boost ordering.

But these weights are infrastructure, not user-facing gamification.

Rule:

```txt
Signal quality is internal. Social clout is not the product.
```

---

# Core rule

A realtime event is not automatically a visual event.

Realtime events must become one of:

- ignored;
- cached;
- batched;
- aggregated;
- scored internally;
- downgraded;
- converted to heat;
- converted to a stack update;
- converted to a pulse;
- converted to a private safety update;

before anything renders.

---

# Engine responsibilities

The Realtime Signal Engine owns:

- internal signal weighting;
- freshness labelling;
- event batching;
- deduplication rules;
- pulse eligibility;
- heat contribution;
- stack contribution;
- density-aware downgrade;
- privacy-safe aggregation;
- signal decay;
- live/recent/stale transitions;
- social intent routing after approved interactions.

It does NOT own:

- Supabase subscriptions;
- raw RLS policy;
- renderer visuals;
- Mapbox layer construction;
- exact safety delivery;
- chat message transport;
- public profile ranking.

---

# Signal input model

Realtime inputs arrive from the bridge as normalized events.

```ts
export type RealtimeSignalInput = {
  id: string;
  eventType:
    | 'beacon_created'
    | 'beacon_updated'
    | 'beacon_cancelled'
    | 'presence_changed'
    | 'venue_intensity_changed'
    | 'right_now_changed'
    | 'radio_state_changed'
    | 'route_changed'
    | 'market_listing_changed'
    | 'moderation_changed'
    | 'safety_changed'
    | 'boo_created'
    | 'message_requested'
    | 'ghosted_chat_created';
  sourceKind:
    | 'event'
    | 'venue'
    | 'person'
    | 'radio'
    | 'market'
    | 'care'
    | 'safety'
    | 'route'
    | 'moderation'
    | 'social';
  occurredAt: string;
  receivedAt: string;
  cityId?: string;
  districtId?: string;
  venueId?: string;
  beaconId?: string;
  userId?: string;
  targetUserId?: string;
  privacyClass: string;
  trustWeight?: number;
  boostWeight?: number;
  metadata?: Record<string, unknown>;
};
```

---

# Signal output model

The engine emits approved signal updates.

```ts
export type RealtimeSignalOutput =
  | { type: 'ignore'; reason: string }
  | { type: 'cache_update'; signalId: string; freshness: SignalFreshness }
  | { type: 'heat_delta'; bucketId: string; amount: number; freshness: SignalFreshness }
  | { type: 'stack_delta'; stackId: string; category: string; amount: number }
  | { type: 'cluster_refresh'; clusterId: string }
  | { type: 'pulse'; targetId: string; pulseKind: PulseKind; intensity: number }
  | { type: 'private_safety_update'; activationId: string; scope: 'self' | 'trusted_contact' }
  | { type: 'social_intent_update'; sourceUserId: string; targetUserId: string; intent: 'boo' | 'message' | 'ghosted_chat' }
  | { type: 'remove_signal'; signalId: string; reason: string };
```

---

# Freshness model

```ts
export type SignalFreshness =
  | 'live'
  | 'recent'
  | 'cooling'
  | 'stale'
  | 'curated'
  | 'offline'
  | 'unknown';
```

## Rules

- `live` requires current realtime proof.
- `recent` means timestamped but no active proof.
- `cooling` means activity is decaying but still relevant.
- `stale` should render quietly or not at all.
- `curated` must never pretend to be live.
- `offline` disables live pulse behaviour.
- `unknown` should fail quiet.

---

# Internal signal weighting

Every realtime signal receives an internal weight before visual output.

```ts
signalWeight = freshnessWeight
  + categoryWeight
  + trustWeight
  + proximityWeight
  + selectedWeight
  + boostWeight
  - densityPenalty
  - privacyPenalty
  - moderationPenalty
```

Important:

- this is not public;
- this is not a user score;
- this is not gamification;
- boostWeight cannot exceed care/safety priority;
- privacyPenalty can force hidden;
- moderationPenalty can force removal;
- selectedWeight improves local focus only for the current viewer.

---

# Category weights

Suggested starting internal weights:

| Category | Weight |
|---|---:|
| authorised safety | 100 |
| care / sober support | 80 |
| selected/saved | 75 |
| event / ticket | 65 |
| venue intensity | 55 |
| chill / meetup | 45 |
| radio | 40 |
| creator / records | 35 |
| market / preloved | 25 |
| ambient | 10 |

Rules:

- public Help/SOS exact signal is never scored for public render;
- authorised safety is scoped only;
- care remains above commerce;
- market/preloved never outrank care or safety.

---

# Freshness weights

| Freshness | Weight |
|---|---:|
| live | 40 |
| recent | 25 |
| cooling | 12 |
| curated | 10 |
| stale | -20 |
| offline | -30 |
| unknown | -40 |

---

# Pulse eligibility

Not every realtime update deserves a pulse.

Pulse allowed when:

- signal is selected;
- event goes live;
- radio state changes;
- district heat crosses threshold;
- care route becomes relevant;
- venue intensity meaningfully changes;
- authorised safety update needs attention.

Pulse forbidden when:

- raw user presence changes;
- market listing minor edit;
- private safety public context;
- stale update;
- duplicate payload;
- low-priority spam burst;
- reduced motion disables pulse.

---

# Pulse types

```ts
export type PulseKind =
  | 'subtle'
  | 'selected'
  | 'district_heat'
  | 'radio_wave'
  | 'care_available'
  | 'event_live'
  | 'private_safety'
  | 'cooling_down';
```

---

# Heat contribution

Realtime events contribute to heat, not always pins.

## Heat sources

- venue intensity;
- aggregate right-now status;
- approved event density;
- radio activity by city;
- district stack activity;
- aggregate social presence;
- approved care availability.

## Never heat from

- exact Help/SOS coordinates;
- raw user GPS;
- small sensitive groups;
- private recovery participation;
- trusted-contact safety shares.

---

# Stack contribution

Signals contribute to stacks when:

- district density is warm or higher;
- venue has multiple related signals;
- Mapbox local mode is active;
- marker budget is exceeded;
- category grouping improves clarity.

Stack categories:

- events;
- tickets;
- chill;
- venues;
- care;
- radio;
- market;
- creator;
- records.

---

# Realtime decay

Realtime energy decays over time.

## Default decay windows

| Signal | Live window | Recent window | Cooling window |
|---|---:|---:|---:|
| presence | 5–20m | 20–45m | 45–60m |
| venue intensity | 5–15m | 15–45m | 45–90m |
| event live | event-based | 1–2h | 2–4h |
| ticket | until event | 1h after | none |
| radio | show window | 30m | 60m |
| market/preloved | 1–24h | 24–72h | optional |
| care listing | curated | curated | none |
| safety | scoped live | scoped recent | until resolved |

---

# Batching rules

The engine batches visual updates.

| Stream | Batch strategy |
|---|---|
| presence | aggregate and decay |
| venue intensity | batch 5–15s |
| district heat | batch 10–30s |
| beacons | batch 500–1500ms |
| radio | immediate but subtle |
| moderation | immediate removal |
| safety | immediate scoped delivery |
| market | batch and stack |

---

# Dedupe rules

Dedupe by:

- source id;
- signal id;
- event type;
- occurredAt;
- lifecycle state;
- moderation version.

Conflict priority:

1. safety privacy;
2. moderation removal;
3. cancellation;
4. expiry;
5. live update;
6. boost update;
7. cosmetic update.

---

# Beacon click social flow

When a user clicks a person/social beacon, the Globe must not jump straight into public exposure.

Canonical flow:

```txt
Globe signal
→ Beacon card
→ Profile preview
→ Boo or Message intent
→ Ghosted chat auto-open/create
```

## Step 1 — Globe signal

Surface:

- approximate presence;
- beacon type;
- freshness;
- safe context.

Do not show:

- exact GPS;
- private name if not allowed;
- hidden profile content;
- unsafe distance precision.

## Step 2 — Beacon card

Shows:

- beacon intent;
- approximate area or venue;
- expiry;
- consent cue;
- primary CTA.

CTAs may include:

- `View profile`
- `Boo`
- `Message`
- `Save`
- `Report`

## Step 3 — Profile preview

Profile reveal requires:

- visibility policy;
- block check;
- age gate;
- profile moderation status;
- relationship scope.

If profile cannot reveal:

- show safe fallback;
- allow report/block where relevant;
- do not leak hidden user ID.

## Step 4 — Boo intent

Boo is a lightweight social signal.

Rules:

- no exact location escalation;
- no forced chat;
- respect blocks;
- rate limit spam;
- notify target only where allowed.

Possible output:

```ts
{ type: 'social_intent_update', intent: 'boo' }
```

## Step 5 — Message intent

Message requires:

- allowed relationship or consent;
- anti-spam check;
- block check;
- profile visibility check.

If allowed:

- create or open Ghosted chat;
- carry safe context from beacon;
- never attach exact coordinates unless explicitly shared.

## Step 6 — Ghosted chat auto-open/create

Canonical behaviour:

```txt
Message tap
→ validate permissions
→ create/find conversation
→ seed context safely
→ open Ghosted chat
```

Safe seeded context examples:

- `Replied from a Chill signal around Soho`
- `Replied from an Event beacon at public venue`
- `Replied from a Ticket signal`

Forbidden seeded context:

- exact GPS;
- private distress state;
- NA/AA attendance;
- hidden profile metadata;
- trusted contact data.

---

# Boo/message realtime events

Social realtime events should stay scoped.

## Boo event

May update:

- recipient notification;
- mutuality state;
- social intent cache.

Must not update:

- public heat;
- public popularity;
- public beacon ranking in a clout-like way.

## Message event

May update:

- conversation cache;
- recipient notification;
- profile/social surface.

Must not update:

- public Globe density;
- public score;
- public map visibility.

---

# Moderation integration

Moderation events can emit:

- `remove_signal`;
- `cluster_refresh`;
- `stack_delta`;
- `cache_update`.

Rules:

- moderation removal is immediate;
- boosted signals lose boost on report/hold;
- hidden signals never pulse;
- social intent spam can reduce future surfacing internally.

---

# Safety integration

Safety events route separately.

## Public Globe

Receives:

- nothing exact;
- no public SOS pulse;
- only threshold-safe care aggregate if designed.

## Trusted-contact surface

Receives:

- private safety update;
- exact scoped location where allowed;
- calm urgent pulse.

---

# Privacy guardrails

The engine must call privacy policy before weighting.

If privacy state is uncertain:

```txt
fail quiet
```

Meaning:

- ignore;
- cache privately;
- hide;
- never render public fallback.

---

# Density interaction

Realtime signal output must respect density state.

## Quiet density

- individual pulses allowed.

## Warm density

- limited pulses;
- small clusters.

## Hot density

- stack deltas;
- district heat changes.

## Packed / overloaded

- heat/stack only;
- no individual spawn animations.

---

# Accessibility interaction

Reduced motion:

- disables most pulses;
- uses static deltas;
- reduces heat animation.

Calm mode:

- suppresses market pulses;
- surfaces care quietly;
- lowers animation intensity.

High contrast:

- replaces glow-only signals with shape/outline changes.

---

# Realtime copy rules

Use honest freshness copy.

Good:

```txt
Live now
```

only when live proof exists.

Good:

```txt
Recently active
```

when proof is timestamped but not live.

Bad:

```txt
Live tonight
```

for curated/static entries with no active proof.

---

# Signal rails

The engine may feed UI rails:

- Live now;
- Recently active;
- Tonight;
- Care nearby;
- Radio pulse;
- Market drops;
- Saved signals.

Rules:

- care rail outranks market;
- sponsored rail requires disclosure;
- private safety never enters public rails;
- Boo/message activity never becomes a public popularity rail.

---

# Performance budgets

Engine output per tick should stay bounded.

Suggested defaults:

| Output | Max per tick |
|---|---:|
| pulses | 6 |
| heat deltas | 20 |
| stack deltas | 25 |
| cluster refreshes | 10 |
| removals | immediate but batched if spam |

---

# Implementation targets

Create/refactor toward:

```txt
src/lib/globe/realtimeSignal/RealtimeSignalEngine.ts
src/lib/globe/realtimeSignal/SignalWeighting.ts
src/lib/globe/realtimeSignal/FreshnessEngine.ts
src/lib/globe/realtimeSignal/PulseEligibility.ts
src/lib/globe/realtimeSignal/HeatContributionEngine.ts
src/lib/globe/realtimeSignal/StackContributionEngine.ts
src/lib/globe/realtimeSignal/SignalDecayService.ts
src/lib/globe/realtimeSignal/RealtimeSignalBatcher.ts
src/lib/globe/realtimeSignal/RealtimeSignalDedupe.ts
src/lib/globe/realtimeSignal/RealtimeSignalPrivacyGuard.ts
src/lib/globe/realtimeSignal/RealtimeSignalAccessibilityAdapter.ts
src/lib/globe/social/BeaconSocialIntentRouter.ts
src/lib/globe/social/BooIntentService.ts
src/lib/globe/social/GhostedChatBridge.ts
```

---

# Testing requirements

## Unit tests

Test:

- internal signal weight calculations;
- boost caps;
- freshness transitions;
- pulse eligibility;
- heat contribution;
- stack contribution;
- privacy fail-quiet;
- dedupe priority;
- accessibility suppression;
- Boo rate limits;
- Ghosted chat permission checks.

## Integration tests

Test:

- 100 presence updates become heat, not 100 pulses;
- boosted market stays below care;
- moderation removes signal immediately;
- SOS does not enter public heat;
- radio state emits subtle pulse;
- reduced motion suppresses pulses;
- packed district emits stack deltas only;
- beacon click opens profile preview safely;
- Boo does not increase public ranking;
- Message creates/opens Ghosted chat without exact GPS.

## E2E tests

Test:

- district feels live without pin spam;
- stale signal copy downgrades;
- curated entry never says live;
- care availability appears before market updates;
- realtime outage downgrades to recent/offline;
- private trusted safety update stays scoped;
- user clicks beacon, views profile, boos safely;
- user clicks beacon, messages, Ghosted chat opens with safe context.

---

# Acceptance criteria

The realtime signal engine succeeds when:

- the Globe feels alive without being frantic;
- realtime updates become heat/stacks/pulses intelligently;
- raw user presence never becomes public pin spam;
- Help/SOS never enters public visual systems;
- `Live` labels are honest;
- boosted signals remain bounded;
- dense districts update smoothly;
- care remains above commerce;
- reduced motion materially reduces live animation;
- moderation and cancellation propagate immediately;
- realtime energy decays naturally instead of lingering forever;
- beacon-to-profile-to-Boo/message works without exposing private location;
- Ghosted chat opens from a beacon with safe context;
- nothing in the Globe becomes XP, rankings, streaks, or public clout.