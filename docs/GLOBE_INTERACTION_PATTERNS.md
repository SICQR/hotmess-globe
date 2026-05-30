# Globe Interaction Patterns

Purpose: define the canonical interaction behaviours, gestures, navigation patterns, state transitions, overlays, safety flows, and user-feedback systems for the HOTMESS Globe.

This document governs how the Globe feels.

Not just how it renders.

The interaction layer determines whether the product feels:

- cinematic;
- trustworthy;
- spatial;
- safe;
- calm under pressure;
- socially alive.

Or:

- chaotic;
- confusing;
- aggressive;
- manipulative;
- exhausting.

---

# Core interaction philosophy

The Globe should feel:

```txt
alive but never overwhelming
```

Interactions should:

- preserve orientation;
- reveal progressively;
- reward curiosity;
- reduce clutter;
- prioritise care and safety;
- avoid casino-app behaviour.

---

# Primary interaction model

The system uses:

```txt
focus -> reveal -> filter -> deepen
```

NOT:

```txt
explode everything at once
```

---

# Canonical interaction layers

Interaction happens across:

1. world;
2. region;
3. city;
4. district;
5. local map;
6. stack/drawer;
7. card/sheet;
8. action flow.

Every layer must:

- preserve context;
- have a back path;
- avoid dead ends.

---

# Core interaction states

```ts
export type GlobeInteractionState =
  | 'idle'
  | 'hover'
  | 'focused'
  | 'selected'
  | 'expanded'
  | 'filtering'
  | 'navigating'
  | 'creating'
  | 'sharing'
  | 'reporting'
  | 'care'
  | 'safety'
  | 'reduced_motion';
```

---

# Interaction principles

## 1. No dead ends

Every interaction surface must support:

- back;
- dismiss;
- change filter;
- open related context.

---

## 2. No forced hijacking

The Globe never:

- steals focus unexpectedly;
- opens random overlays;
- jumps camera for ads;
- interrupts active exploration.

---

## 3. Safety overrides monetisation

Safety and care surfaces:

- always win interaction priority;
- cannot be buried under boosts;
- cannot be interrupted by ads.

---

## 4. Interactions must scale emotionally

World mode:

- atmospheric;
- exploratory;
- low-pressure.

Local mode:

- actionable;
- precise;
- efficient.

Care mode:

- calm;
- simple;
- reassuring.

---

# Global navigation patterns

## Orbital exploration

User can:

- drag globe;
- rotate Earth;
- slowly zoom;
- tap city pulses.

System behaviour:

- ambient drift pauses during interaction;
- focus hints appear subtly;
- no giant labels.

---

## City focus

Triggered by:

- tap city pulse;
- search result;
- featured route;
- deep link.

Sequence:

1. focus city;
2. reduce unrelated clutter;
3. reveal district stacks;
4. open CitySignalDrawer.

---

## District exploration

Triggered by:

- tap district cluster;
- tap stack;
- local recommendation.

Sequence:

1. focus district;
2. reveal category stacks;
3. enable local filters;
4. offer Mapbox local mode.

---

## Local mode

Triggered by:

- density threshold;
- venue exploration;
- selected event/ticket;
- route interaction.

Sequence:

1. Globe-to-Mapbox handoff;
2. preserve selected context;
3. open local drawer;
4. enable filters.

---

# Gesture patterns

## Tap

Primary interaction.

Tap should:

- focus;
- select;
- expand;
- open.

Never:

- trigger destructive action immediately.

---

## Double tap

Allowed uses:

- quick zoom;
- favourite/save.

Avoid:

- overloaded meaning.

---

## Long press

Reserved for:

- advanced actions;
- report;
- moderation;
- share controls;
- safety options;
- admin/vendor actions.

Never required for core navigation.

---

## Drag

Used for:

- globe rotation;
- map movement;
- drawer movement.

Rules:

- user input always overrides ambient animation;
- no fight-back inertia.

---

## Swipe

Used for:

- card stacks;
- drawer sections;
- onboarding hints.

Avoid:

- hidden critical actions.

---

## Pinch

Used for:

- zoom;
- local-mode transition.

Rules:

- respect safe camera limits;
- never zoom into blur zone.

---

# Hover patterns (desktop)

Hover may:

- reveal label;
- show quick metadata;
- preview intensity.

Hover may not:

- replace tap/click;
- expose private info.

---

# Selection patterns

## Single selection model

Default:

```txt
one primary selected object at a time
```

Selected object:

- gains focus halo;
- opens card/sheet;
- dims unrelated context slightly.

---

## Multi-selection

Allowed only for:

- filters;
- routes;
- moderation;
- admin tooling.

---

# Stack interaction patterns

## Stack collapsed

Shows:

- title;
- category counts;
- top signal;
- care presence.

---

## Stack expanded

Shows:

- categories;
- sorted items;
- filters;
- quick actions.

---

## Stack filtering

User can filter:

- Events;
- Chill;
- Tickets;
- Market;
- Radio;
- Care.

Rules:

- filters preserve context;
- back path maintained.

---

# Card and sheet patterns

## Card

Compact information surface.

Used for:

- previews;
- quick actions;
- lightweight discovery.

---

## Sheet

Expanded contextual surface.

Used for:

- venue detail;
- event detail;
- care routes;
- vendor controls;
- moderation.

---

## Drawer

Persistent contextual explorer.

Used for:

- district exploration;
- stack browsing;
- local lists.

---

# Typed interaction flows

## Event beacon flow

```txt
City -> District -> Event Stack -> Event Card -> RSVP/Ticket
```

Actions:

- save;
- share;
- route;
- ticket;
- report;
- care nearby.

---

## Chill beacon flow

```txt
District -> Chill Stack -> Chill Card -> Join / DM / Route
```

Rules:

- approximate location unless public venue;
- consent prompts before direct interaction.

---

## Ticket beacon flow

```txt
Venue -> Ticket Stack -> Ticket Card -> Transfer / Buy / Meet
```

Rules:

- anti-scalping policy;
- reputation/trust indicators;
- safe meetup guidance.

---

## Preloved / market flow

```txt
District -> Market Stack -> Item Card -> Pickup Zone / Message
```

Rules:

- never expose private home pickup publicly;
- use safe pickup zones where possible.

---

## Care flow

```txt
District -> Care Stack -> Care Card -> Route / Support / Report
```

Rules:

- calm visuals;
- low stimulation;
- no pressure language.

---

## Help/SOS flow

Protected flow.

```txt
Trusted View -> Safety Card -> Route / Contact / Emergency Actions
```

Rules:

- no public interaction surface;
- no cinematic delay;
- no ads;
- exact location only for authorised viewers.

---

# Beacon creation patterns

## Create beacon

Sequence:

1. choose type;
2. choose visibility;
3. choose duration;
4. choose approximate/exact location policy;
5. preview;
6. publish.

---

## Duration selection

User selects:

- start time;
- end time;
- optional early expiry.

Rules:

- 4hr default max for casual/social;
- vendors/events may extend;
- expired beacons fade gracefully.

---

## Visibility selection

Options:

- public;
- followers;
- trusted;
- private;
- approximate area;
- venue-only.

---

# Reverse interaction patterns

The system must support:

- cancellation;
- editing;
- expiry;
- moderation;
- withdrawal of consent;
- unshare location.

---

## Cancel beacon

Sequence:

1. confirm cancel;
2. fade beacon gracefully;
3. remove active routing;
4. preserve analytics;
5. maintain privacy.

Never:

- leave ghost live signals.

---

## Leave venue

Sequence:

1. remove live presence;
2. cool local intensity;
3. preserve anonymous aggregate where safe.

---

## Withdraw location share

Immediate:

- remove exact scoped visibility;
- downgrade to approximate or hidden;
- invalidate stale route data.

---

# Notification interaction patterns

Notifications should:

- feel useful;
- feel contextual;
- never spam.

---

## Allowed notifications

- saved event live;
- trusted friend nearby;
- care route available;
- ticket update;
- moderation response;
- safety escalation.

---

## Forbidden notification behaviour

- aggressive re-engagement spam;
- fake urgency;
- repeated boost pressure;
- manipulative scarcity loops.

---

# Monetisation interaction boundaries

Boosts may:

- improve discovery;
- appear higher in stacks;
- appear in curated rails.

Boosts may not:

- auto-open overlays;
- hijack camera;
- bypass filters;
- cover care/safety;
- create giant flashing markers.

---

# Consent interaction patterns

Consent should appear:

- before direct messaging;
- before location precision increase;
- before private meetup;
- before trusted-contact sharing.

Tone:

- direct;
- calm;
- human.

Not:

- legal panic language.

---

# Reporting and moderation patterns

## Report flow

Accessible from:

- cards;
- sheets;
- profiles;
- venue surfaces.

Report categories:

- harassment;
- unsafe meetup;
- fake listing;
- spam;
- consent violation;
- underage concern.

Rules:

- low-friction;
- private;
- actionable.

---

# Accessibility interaction rules

## Reduced motion

Changes:

- fewer animations;
- fewer simultaneous transitions;
- static highlights;
- simplified gestures.

---

## High contrast

Changes:

- stronger outlines;
- clearer labels;
- reduced glow reliance.

---

## Keyboard navigation

Required:

- stack navigation;
- drawer navigation;
- close/open controls;
- filter access;
- route access.

---

# Error and empty states

## Empty district

Show:

- radio;
- care;
- upcoming;
- explore nearby.

Never:

```txt
dead blank map
```

---

## Offline state

Show:

- cached context;
- safe retry;
- last updated.

---

## Failed action

Show:

- human-readable recovery;
- retry option;
- preserved context.

---

# State ownership

Interaction state should be centrally managed.

Suggested owners:

```txt
GlobeInteractionController
OverlayController
DrawerController
SelectionController
FilterController
SafetyController
```

---

# Interaction telemetry

Track:

- stack opens;
- filter usage;
- venue opens;
- care-route engagement;
- local-mode entry;
- cancellation rates;
- route usage;
- save/share actions.

Never track:

- private movement history beyond policy;
- exact sensitive route analytics publicly;
- Help/SOS public telemetry.

---

# Implementation targets

Create/refactor toward:

```txt
src/lib/globe/interactions/GlobeInteractionController.ts
src/lib/globe/interactions/SelectionController.ts
src/lib/globe/interactions/OverlayController.ts
src/lib/globe/interactions/DrawerController.ts
src/lib/globe/interactions/FilterController.ts
src/lib/globe/interactions/SafetyController.ts
src/lib/globe/interactions/InteractionTelemetry.ts
src/components/globe/interactions/CitySignalDrawer.tsx
src/components/globe/interactions/DistrictExplorer.tsx
src/components/globe/interactions/LocalSignalDrawer.tsx
src/components/globe/interactions/BeaconActionSheet.tsx
```

---

# Testing requirements

## Unit tests

Test:

- selection state;
- stack filtering;
- overlay transitions;
- cancellation flow;
- location withdrawal;
- reduced motion variants.

## Integration tests

Test:

- city -> district -> local flow;
- event ticket flow;
- care route flow;
- Help/SOS protected interaction;
- beacon cancellation;
- drawer back-path behaviour.

## E2E tests

Test:

- no dead-end interactions;
- no boost hijack;
- Mapbox handoff preserves selection;
- exact location never appears publicly after withdrawal;
- reduced motion disables heavy transitions;
- care flow remains accessible during dense nightlife activity.

---

# Acceptance criteria

The interaction system succeeds when:

- the Globe feels cinematic but calm;
- dense areas remain explorable;
- users always know where they are;
- every interaction has a back path;
- care and safety remain accessible;
- boosts never hijack the experience;
- Mapbox local mode feels coherent;
- beacon creation and cancellation feel trustworthy;
- privacy changes propagate immediately;
- reduced motion materially changes interaction behaviour;
- the Globe encourages exploration without becoming chaotic;
- nightlife energy feels alive without turning into manipulation.