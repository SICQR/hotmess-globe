# Globe Beacon Lifecycle & Economy

Purpose: define how Globe beacons are created, activated, surfaced, prioritised, monetised, expired, cancelled, and moderated.

This document exists to stop the Globe becoming:

- a spam wall;
- an ad board;
- a chaos map;
- a permanent notification feed;
- a giant collection of glowing pins;
- a pay-to-win visibility system.

The beacon economy must support:

- nightlife;
- care;
- community;
- creators;
- vendors;
- realtime energy;
- monetisation;

WITHOUT destroying:

- readability;
- trust;
- privacy;
- safety;
- atmosphere.

---

# Core philosophy

## A beacon is a temporary signal

A beacon is:

- alive;
- contextual;
- time-bound;
- localised;
- socially weighted;
- density-aware.

A beacon is NOT:

- permanent advertising;
- infinite visibility;
- a profile replacement;
- a static map pin.

---

## Beacons are emotional states, not database rows

The Globe should feel:

- alive;
- breathing;
- social;
- cinematic;
- active;
- shifting by hour.

The system should communicate:

- momentum;
- urgency;
- intimacy;
- popularity;
- rarity;
- trust.

NOT:

- dashboards;
- admin panels;
- crypto charts;
- XP gamification.

---

# Beacon lifecycle states

Every beacon exists inside a lifecycle.

No beacon is permanent.

---

# Lifecycle state machine

## `draft`

Created but not yet visible.

Examples:

- unfinished event;
- creator preparing drop;
- vendor preparing market listing.

Visibility:

- creator only.

---

## `scheduled`

Future beacon.

Used for:

- events;
- radio premieres;
- ticket drops;
- creator launches;
- HNH MESS launches.

Visibility:

- can appear faintly in future timeline.

Visual treatment:

- dim;
- low pulse;
- countdown ring.

---

## `queued`

Approved and waiting for activation.

Used for:

- moderation queue;
- timed activation;
- delayed visibility.

Visibility:

- not public yet.

---

## `live`

Active beacon.

Default active state.

Visibility:

- subject to density/render policy.

Visual treatment:

- standard pulse;
- category ring;
- time decay.

---

## `boosted`

Temporary visibility amplification.

Boosts affect:

- ranking;
- discovery;
- stack prominence;
- city visibility.

Boosts NEVER affect:

- marker size beyond safe scaling;
- public safety priority;
- emergency visibility.

Visual treatment:

- subtle energy halo;
- increased cadence;
- elevated stack order.

---

## `trending`

Community-generated momentum.

Triggered by:

- saves;
- shares;
- traffic;
- venue intensity;
- live engagement;
- mutual interactions.

Trending is NOT directly purchasable.

Visual treatment:

- warm energy field;
- social ripple;
- atmospheric glow.

---

## `cooling`

Beacon is ending.

Used for:

- events winding down;
- temporary drops expiring;
- social energy declining.

Visual treatment:

- fading pulse;
- lower opacity;
- slower cadence.

---

## `ending`

Final visible state.

Purpose:

- communicate temporality;
- encourage action;
- avoid abrupt disappearance.

Visual treatment:

- soft dissolve;
- final pulse;
- ring collapse.

---

## `expired`

No longer visible publicly.

Data may remain:

- archived;
- analytics;
- moderation review;
- creator history.

Visibility:

- owner/admin only unless archived publicly.

---

## `cancelled`

Creator or moderator cancelled beacon.

Visual treatment:

- graceful fade;
- no aggressive error state.

Rules:

- remove from public discovery quickly;
- revoke boosts;
- stop notifications.

---

## `reported`

Under moderation review.

Rules:

- visibility may be reduced;
- hidden from some feeds;
- moderation queue.

---

## `hidden`

Suppressed.

Used for:

- moderation;
- abuse;
- spam;
- unsafe activity.

Visibility:

- invisible publicly.

---

## `archived`

Historical/public memory state.

Examples:

- iconic event;
- record launch;
- cultural moment.

Visual treatment:

- muted archive layer;
- historical card.

---

# Beacon categories

## Core social beacons

### Chill Beacon

Purpose:

- casual social energy;
- hanging out;
- local vibe.

Typical duration:

- 30 mins → 4 hours.

Priority:

- medium.

---

### Linkup Beacon

Purpose:

- social gathering;
- intentional meetup.

Priority:

- medium/high.

---

### Afterparty Beacon

Purpose:

- moving energy after event closure.

Rules:

- stronger proximity weighting;
- short lifespan.

---

# Event and venue beacons

## Event Beacon

Purpose:

- official event.

Examples:

- club night;
- concert;
- takeover;
- launch.

Typical duration:

- scheduled → ending.

Priority:

- high.

---

## Ticket Beacon

Purpose:

- ticket availability;
- limited release;
- resale.

Rules:

- anti-scalping moderation;
- cooldowns;
- duplicate suppression.

Priority:

- medium/high.

---

## Venue Beacon

Purpose:

- active venue signal.

Rules:

- often auto-generated from aggregate energy.

Priority:

- contextual.

---

# Commerce and creator beacons

## Preloved Drop

Purpose:

- peer-to-peer marketplace.

Rules:

- no home-address exposure;
- area/venue only;
- limited visibility window.

Typical duration:

- 1–24 hours.

Priority:

- low/medium.

---

## Vendor Drop

Purpose:

- vendor activation;
- temporary offer;
- popup.

Rules:

- must not dominate Globe;
- cooldowns apply.

---

## Creator Drop

Purpose:

- creator release;
- merch;
- content;
- appearance.

Priority:

- medium/high.

---

## HNH MESS Beacon

Purpose:

- care-first product activation.

Rules:

- subtle;
- elegant;
- non-aggressive commerce.

---

# Care and safety beacons

## Help Beacon

Purpose:

- support;
- trusted-contact visibility;
- assistance.

Rules:

- exact location private;
- trusted-contact scoped;
- not publicly discoverable.

Priority:

- extremely high.

---

## SOS Beacon

Purpose:

- urgent emergency.

Rules:

- no monetisation;
- no suppression;
- no ad adjacency;
- exact location private.

Visual treatment:

- reserved emergency red.

---

## NA / AA / Sober Support Beacon

Purpose:

- sober support;
- meeting visibility;
- low-stimulation safe navigation.

Rules:

- anonymity-safe;
- no forced profile exposure;
- calm visual language.

Visual treatment:

- soft blue/white;
- calm pulse;
- non-club aesthetic.

Priority:

- high.

---

# Beacon timing model

## Default duration system

Every beacon type has:

- minimum duration;
- maximum duration;
- cooldown;
- renewal logic.

---

# Suggested durations

| Beacon type | Min | Max | Renewal |
|---|---|---|---|
| Chill | 30m | 4h | yes |
| Linkup | 30m | 6h | yes |
| Afterparty | 15m | 3h | limited |
| Event | scheduled | 24h+ | event-driven |
| Ticket | 15m | 12h | yes |
| Venue | realtime | ongoing | auto |
| Preloved | 1h | 24h | limited |
| Vendor | 1h | 48h | controlled |
| Creator | 1h | 72h | yes |
| HNH MESS | campaign | campaign | admin |
| Help | manual | until cancelled | no abuse |
| SOS | immediate | until resolved | protected |
| NA/AA | scheduled | meeting-based | yes |

---

# User-controlled timing

Users SHOULD choose:

- start time;
- duration;
- visibility window.

This is critical.

Otherwise users are forced into:

```txt
post immediately or disappear
```

That creates:

- spam;
- repetitive reposting;
- chaotic signal behaviour.

---

# Cooldowns and anti-spam

## Goal

Prevent:

- beacon flooding;
- fake urgency;
- visual domination;
- city saturation.

WITHOUT making the Globe feel restrictive.

---

# Suggested cooldown system

## User limits

| Tier | Simultaneous live beacons |
|---|---|
| Standard user | 1–2 |
| Verified creator | 3–5 |
| Verified venue | 5–10 |
| Admin/system | governed |

---

## Area saturation limits

If too many similar beacons exist nearby:

System should:

- cluster;
- rotate;
- queue;
- reduce visibility;
- prioritize quality/trust.

NOT:

- stack infinite giant pins.

---

# Trust and quality scoring

Every beacon should have hidden weighting.

---

# Signal score inputs

## Positive signals

- verified creator;
- venue trust;
- engagement;
- saves;
- successful events;
- mutual interactions;
- low report rate;
- freshness.

---

## Negative signals

- spam reports;
- cancellations;
- duplicate posts;
- excessive boosts;
- rapid reposting;
- low interaction quality.

---

# Trust effects

Trust influences:

- visibility;
- queue priority;
- density suppression;
- cluster prominence;
- recommendation quality.

Trust should NEVER become:

- public score;
- visible XP system;
- gamified hierarchy.

---

# Boost economy

## Philosophy

Boosting should feel like:

```txt
adding energy to the city
```

NOT:

```txt
buying the entire skyline
```

---

# What boosts can do

## Allowed

- increase discovery;
- increase recommendation probability;
- improve stack position;
- expand district visibility;
- extend active discovery time slightly.

---

# What boosts cannot do

## Forbidden

- override SOS/help priority;
- create giant pins;
- bypass moderation;
- expose private users;
- dominate dense cities;
- force homepage placement.

---

# Boost types

## Discovery Boost

Purpose:

- broader discovery.

Effect:

- appears in more nearby surfaces.

---

## District Boost

Purpose:

- stronger city-area visibility.

Effect:

- better district prominence.

---

## Time Extension

Purpose:

- slightly longer visibility.

Rules:

- hard cap enforced.

---

## Momentum Boost

Purpose:

- accelerate trending eligibility.

Rules:

- cannot force trending alone.

---

# Density handling

## Problem

Many people may activate beacons in one area simultaneously.

Without policy:

- the Globe becomes unreadable;
- giant clusters form;
- users cannot interpret local activity.

---

# Density solution hierarchy

## Space level

Render:

- atmospheric energy;
- city glow;
- major trending pulses.

Do NOT render:

- individual local pins.

---

## Region level

Render:

- city stacks;
- district pulses;
- trend movement.

---

## City level

Render:

- clusters;
- stacks;
- category grouping;
- district intensity.

---

## Local level

Render:

- Mapbox detail;
- cards;
- local stacks;
- venue sheets;
- route overlays.

---

# Reverse flows

Reverse flows are critical.

Most systems only design:

```txt
creation
```

But Globe quality depends equally on:

```txt
ending
cancelling
expiring
cooling
moderating
fading
```

---

# Cancellation flow

When user cancels beacon:

## Immediate effects

- remove from discovery;
- revoke boosts;
- stop notifications;
- stop recommendations.

## Visual effects

- graceful fade;
- no harsh disappearance.

## Social effects

- avoid notification spam;
- avoid false urgency.

---

# Expiry flow

Expiry should feel:

- natural;
- cinematic;
- atmospheric.

Not:

```txt
hard delete
```

---

# Reporting and moderation

## Moderation triggers

- spam;
- unsafe meetup;
- fake event;
- harassment;
- commercial abuse;
- unsafe content.

---

# Moderation responses

System may:

- suppress;
- shadow-reduce;
- queue;
- cooldown;
- remove;
- suspend.

---

# Economic guardrails

## Never monetise

- SOS;
- emergency escalation;
- trusted-contact safety.

---

## Carefully monetise

- creator visibility;
- vendor activations;
- ticket promotion;
- event amplification.

---

## Avoid

- pay-to-dominate;
- manipulative urgency;
- fake scarcity;
- addictive notification loops.

---

# Notification policy

Notifications should feel:

- contextual;
- useful;
- ambient.

Not:

- casino mechanics;
- panic marketing.

---

# Allowed notifications

- nearby friend/event energy;
- saved beacon starting soon;
- trusted creator launch;
- afterparty nearby;
- safety escalation.

---

# Forbidden notifications

- aggressive spam;
- repeated commercial push;
- fake urgency countdowns;
- unsafe location disclosure.

---

# Analytics

## Measure

- activation rate;
- expiry rate;
- cancellation rate;
- save rate;
- interaction quality;
- report rate;
- density saturation;
- conversion;
- trust retention.

---

# Do NOT optimise for

- maximum notifications;
- endless engagement;
- addictive loops;
- infinite time-on-app.

---

# Accessibility

Beacon economy must support:

- reduced motion;
- low stimulation;
- sober navigation;
- calm mode;
- list fallback.

---

# Acceptance criteria

The beacon system succeeds when:

- the Globe feels alive but readable;
- dense cities remain elegant;
- beacons feel temporary and meaningful;
- boosts feel subtle;
- spam is controlled;
- monetisation feels additive;
- Help/SOS remains protected;
- NA/AA support remains calm and anonymous;
- cancellation and expiry feel natural;
- the city never becomes a wall of ads;
- users trust the signal quality;
- nightlife and care coexist safely.