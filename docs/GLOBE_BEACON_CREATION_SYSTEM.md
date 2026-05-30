# Globe Beacon Creation System

Purpose: define the canonical beacon creation architecture, lifecycle flows, UX patterns, monetisation hooks, moderation constraints, safety protections, visibility logic, and realtime publication pipeline for the HOTMESS Globe.

This document governs how signals are born.

Beacon creation is not just posting content.

It is:

- spatial publishing;
- social intent;
- realtime atmosphere generation;
- care signalling;
- nightlife orchestration;
- trust-sensitive location sharing.

Done badly, beacon systems become:

- spam;
- surveillance;
- visual collapse;
- fake urgency;
- dangerous meetup tooling.

This system must avoid all of that.

---

# Core beacon philosophy

The beacon system should feel:

```txt
intentional, temporary, spatial, human
```

Beacons should:

- appear meaningful;
- expire naturally;
- feel alive;
- respect privacy;
- avoid map pollution;
- encourage real-world movement.

---

# Core system principles

## 1. Beacons are temporary by default

Signals should decay naturally.

The Globe should feel:

```txt
alive in the moment
```

NOT:

```txt
abandoned classifieds map
```

---

## 2. Visibility must scale safely

Not every beacon deserves:

- global visibility;
- exact location;
- giant rendering priority.

Visibility depends on:

- beacon type;
- trust;
- density;
- boost status;
- moderation;
- privacy class.

---

## 3. Creation should be fast

Beacon creation should feel:

- lightweight;
- expressive;
- mobile-first;
- low-friction.

Ideal completion:

```txt
under 20 seconds
```

---

## 4. Care and safety override growth

The system must protect:

- consent;
- recovery participation;
- trusted location sharing;
- Help/SOS visibility.

Over:

- virality;
- monetisation;
- spam amplification.

---

# Canonical beacon types

## Social beacons

### Chill

Purpose:

- casual meetup;
- nearby vibe;
- social energy.

Defaults:

- approximate location;
- short expiry;
- low visual aggression.

---

### Going Out

Purpose:

- nightlife movement;
- pregame;
- migration energy.

Defaults:

- district or venue visibility;
- animated movement trails optional.

---

## Venue and nightlife beacons

### Event

Purpose:

- parties;
- live sets;
- performances;
- happenings.

Defaults:

- venue-linked;
- ticket-capable;
- stack-prioritised.

---

### Ticket

Purpose:

- spare tickets;
- guestlist transfer;
- entry coordination.

Defaults:

- venue-linked;
- anti-scalping policy.

---

### Vendor

Purpose:

- brands;
- partner activations;
- drops;
- sponsored moments.

Defaults:

- lower visual priority than care/safety;
- monetisation eligible.

---

## Marketplace beacons

### Preloved Drop

Purpose:

- clothing;
- accessories;
- nightlife exchange.

Defaults:

- pickup-zone model;
- district visibility;
- expiry when sold.

---

## Care and support beacons

### Care

Purpose:

- support;
- calm spaces;
- hydration;
- grounding.

Defaults:

- calming visual language;
- protected interaction priority.

---

### NA/AA Support

Purpose:

- sober support;
- recovery visibility.

Defaults:

- heavily privacy-protected;
- non-identifying;
- district-level visibility.

---

### Help

Purpose:

- assistance;
- escort;
- support.

Defaults:

- scoped visibility;
- trusted escalation.

---

### SOS

Purpose:

- crisis;
- emergency;
- immediate assistance.

Defaults:

- emergency-scoped visibility only;
- exact coordinates hidden publicly.

---

# Beacon creation flow

## Canonical creation sequence

```txt
Type
→ Visibility
→ Location
→ Duration
→ Preview
→ Publish
```

Should feel:

- fast;
- cinematic;
- safe.

---

# Step 1 — Type selection

The first choice determines:

- visual language;
- duration limits;
- visibility defaults;
- moderation rules;
- monetisation eligibility.

---

## Type picker design

Should:

- use icons + labels;
- explain intent;
- avoid overwhelming lists.

Suggested groups:

| Group | Types |
|---|---|
| Social | Chill, Going Out |
| Nightlife | Event, Ticket |
| Market | Preloved |
| Care | Care, NA/AA |
| Safety | Help, SOS |

---

# Step 2 — Visibility selection

Users choose:

- public;
- followers;
- trusted;
- private;
- approximate;
- venue-only.

The system should:

- explain implications;
- preview audience scope.

---

# Step 3 — Location selection

Users choose:

- venue;
- district;
- approximate area;
- exact scoped location.

---

## Location UX principles

Avoid:

```txt
share exact GPS immediately
```

Prefer:

- venue association;
- district presence;
- approximate radius.

---

## Safe pickup zones

Marketplace and ticket flows should encourage:

- public venues;
- venue pickups;
- transport-adjacent safe zones.

---

# Step 4 — Duration selection

Beacon duration determines:

- visibility;
- realtime priority;
- monetisation eligibility;
- decay timing.

---

## Canonical duration model

| Type | Default |
|---|---|
| Chill | 1–4hr |
| Going Out | 2–8hr |
| Event | event duration |
| Ticket | until event start |
| Preloved | until sold/expired |
| Care | configurable |
| Trusted live share | 15–120min |
| SOS | until resolved |

---

# 4hr beacon governance

The “4hr beacon” should be treated as:

```txt
default max for casual social signals
```

NOT:

```txt
mandatory fixed duration
```

Users should be able to:

- choose shorter durations;
- end early;
- extend where allowed.

---

# Beacon quotas and anti-spam rules

## Casual user quotas

Suggested:

| Type | Concurrent limit |
|---|---|
| Chill | 1–2 |
| Going Out | 1 |
| Ticket | 3 |
| Preloved | 5 |

---

## Vendor quotas

Vendor limits depend on:

- trust;
- subscription;
- moderation score;
- city saturation.

---

## Dynamic saturation control

Dense districts should dynamically reduce:

- duplicate beacons;
- low-quality spam;
- visual aggression.

---

# Density-aware publishing

Beacon creation must account for:

- local density;
- cluster saturation;
- district load;
- visual noise.

---

## Dense-area behaviour

In high-density districts:

- similar beacons merge into stacks;
- rendering priority lowers;
- exact dots disappear;
- category representation increases.

---

# Beacon preview system

Before publish, users preview:

- visibility;
- duration;
- approximate location;
- visual appearance;
- audience scope.

Critical for trust.

---

# Publish animation

Beacon publication should feel:

```txt
signal entering the atmosphere
```

Not:

```txt
posting to classifieds
```

---

## Suggested publish sequence

1. pulse;
2. ripple;
3. local glow;
4. stack integration;
5. realtime propagation.

Subtle.

Not casino energy.

---

# Beacon visual identity

Every beacon type requires:

- icon;
- glow profile;
- motion profile;
- density behaviour;
- stack behaviour;
- accessibility variant.

Defined in:

```txt
GLOBE_BEACON_VISUAL_SYSTEM.md
```

---

# Beacon interaction states

```ts
export type BeaconState =
  | 'draft'
  | 'preview'
  | 'publishing'
  | 'live'
  | 'boosted'
  | 'expiring'
  | 'ended'
  | 'cancelled'
  | 'moderated'
  | 'hidden';
```

---

# Beacon lifecycle

## Live phase

During live state:

- visible according to policy;
- realtime-updated;
- density-managed.

---

## Expiring phase

Before expiry:

- visuals soften;
- intensity lowers;
- stack priority drops.

Never:

```txt
hard disappear suddenly
```

---

## Ended phase

After expiry:

- removed from realtime map;
- optionally retained in history;
- analytics preserved.

---

## Cancelled phase

Cancellation should:

- remove routing;
- remove visibility;
- propagate immediately.

---

# Editing rules

Users may edit:

- description;
- duration;
- visibility;
- category.

Restricted edits:

- major location changes after publication;
- visibility escalation without consent.

---

# Monetisation system

## Beacon boosts

Boosts may:

- increase discovery;
- increase stack priority;
- increase recommendation weight.

Boosts may NOT:

- hijack camera;
- bypass privacy;
- override care/safety;
- create giant markers;
- bypass moderation.

---

## Sponsored beacons

Sponsored content must:

- be clearly disclosed;
- respect density limits;
- obey interaction rules.

---

## Reputation-aware amplification

Higher quality signals receive:

- more surfacing;
- better recommendations;
- stronger stack placement.

Signals considered:

- saves;
- attendance;
- moderation score;
- reports;
- trust graph.

---

# Moderation system

Beacon creation requires:

- anti-spam checks;
- duplicate detection;
- abuse heuristics;
- trust scoring.

---

## Auto-moderation checks

Check for:

- duplicate spam;
- harassment;
- scam ticketing;
- suspicious meetup patterns;
- unsafe content;
- underage risk.

---

## Rate limiting

The system should dynamically limit:

- spam bursts;
- abusive reposting;
- district flooding.

---

# Trust and reputation integration

Trust score should influence:

- visibility;
- publishing limits;
- moderation thresholds;
- recommendation eligibility.

---

# Beacon routing integration

Beacon creation may automatically generate:

- meetup routes;
- venue routes;
- safer routes;
- calm routes.

But only:

- when consent allows;
- when privacy class permits.

---

# Realtime architecture

Publishing should:

- create DB row;
- broadcast realtime event;
- update district aggregates;
- update stacks;
- update heat layers;
- invalidate caches.

---

# Supabase architecture guidance

Suggested tables:

```txt
beacons
beacon_presence
beacon_boosts
beacon_reports
beacon_visibility
beacon_routes
beacon_analytics
beacon_trust_scores
```

---

# RLS requirements

All beacon reads must enforce:

- visibility scope;
- privacy class;
- trusted relationships;
- moderation state;
- blocked-user policy.

---

# Offline and failure behaviour

## Draft preservation

If publish fails:

- preserve draft;
- allow retry;
- maintain privacy.

---

## Network degradation

During poor connectivity:

- queue publication;
- avoid duplicate publish;
- preserve expiration integrity.

---

# Accessibility requirements

Beacon creation must support:

- reduced motion;
- keyboard navigation;
- screen readers;
- large touch targets;
- non-color differentiation.

---

# Consent requirements

Consent prompts required for:

- exact location escalation;
- trusted sharing;
- private meetup precision;
- Help/SOS escalation.

---

# Analytics and telemetry

Track:

- creation completion rate;
- publish duration;
- expiry rates;
- cancellation rates;
- stack integration;
- boost performance;
- moderation events.

Never track publicly:

- sensitive routes;
- exact SOS history;
- recovery attendance.

---

# Implementation targets

Create/refactor toward:

```txt
src/lib/beacons/BeaconCreationEngine.ts
src/lib/beacons/BeaconDraftStore.ts
src/lib/beacons/BeaconPublishPipeline.ts
src/lib/beacons/BeaconVisibilityPolicy.ts
src/lib/beacons/BeaconDurationPolicy.ts
src/lib/beacons/BeaconQuotaEngine.ts
src/lib/beacons/BeaconBoostEngine.ts
src/lib/beacons/BeaconModerationPipeline.ts
src/lib/beacons/BeaconRealtimePublisher.ts
src/lib/beacons/BeaconDecayService.ts
src/components/globe/beacons/BeaconComposer.tsx
src/components/globe/beacons/BeaconTypePicker.tsx
src/components/globe/beacons/BeaconVisibilityPicker.tsx
src/components/globe/beacons/BeaconDurationPicker.tsx
src/components/globe/beacons/BeaconPreviewSheet.tsx
```

---

# Testing requirements

## Unit tests

Test:

- quota enforcement;
- duration limits;
- visibility policies;
- density downgrade;
- boost restrictions;
- decay behaviour.

## Integration tests

Test:

- realtime publish pipeline;
- district stack integration;
- privacy propagation;
- cancellation behaviour;
- moderation intervention.

## E2E tests

Test:

- beacon publish under 20s;
- dense districts remain readable;
- boosts never override safety;
- Help/SOS never public;
- expired beacons disappear correctly;
- cancellation propagates immediately;
- district clustering behaves correctly under load.

---

# Acceptance criteria

The beacon creation system succeeds when:

- beacon creation feels fast and expressive;
- the Globe stays readable at scale;
- beacons feel alive but temporary;
- dense cities avoid visual collapse;
- boosts improve discovery without becoming ads;
- care and safety remain protected;
- users understand visibility and expiry;
- privacy-safe publishing is the default;
- moderation prevents spam and abuse;
- local districts feel socially alive;
- cancellation and expiry feel trustworthy;
- the Globe encourages real-world movement without becoming surveillance.