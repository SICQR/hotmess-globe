# Globe Beacon Visual System

Purpose: define every beacon, node, signal, stack, pulse, and interaction state on the HOTMESS Globe.

This document establishes:

- beacon archetypes;
- category visuals;
- interaction behaviour;
- density adaptation;
- animation language;
- selection states;
- urgency systems;
- monetisation boundaries;
- accessibility-safe rendering.

This is the canonical visual grammar for Globe signals.

---

# Core philosophy

A beacon is not:

- a map pin;
- a notification badge;
- an ad unit;
- a giant glowing spike.

A beacon is:

```txt
an emotional spatial signal
```

Users should feel:

- invitation;
- energy;
- safety;
- momentum;
- atmosphere;
- proximity.

Without overwhelming the map.

---

# Core architectural rule

Beacon visuals are determined by:

```txt
category
+ lifecycle
+ density
+ privacy
+ interaction state
+ accessibility policy
```

NOT:

```txt
who paid the most
```

---

# Beacon hierarchy

## Primary categories

| Category | Purpose |
|---|---|
| Event | nightlife/event destination |
| Chill | social/casual meet |
| Ticket | ticket exchange |
| Preloved | market/drop/trade |
| Care | support/wellbeing |
| HNH MESS | sponsored care layer |
| Radio | live cultural signal |
| NA/AA | sober-safe support |
| Venue | venue energy node |
| Creator | creator activation |
| Route | movement/navigation |
| SOS | emergency/private safety |

---

# Visual beacon archetypes

Every category maps to a visual archetype.

Users should identify category instantly without reading text.

---

# Event beacon

## Emotional role

```txt
something is happening here
```

## Shape language

- circular pulse core;
- layered glow ring;
- rhythmic movement.

## Motion

- medium pulse;
- subtle energy breathing.

## Interaction

- expands into stack/card;
- nearby events bloom outward.

## Space-view behaviour

Contributes to:

- city nightlife glow;
- constellation density.

---

# Chill beacon

## Emotional role

```txt
low-pressure social energy
```

## Shape language

- soft rounded orb;
- minimal hard edges.

## Motion

- slow breathing;
- gentle drift.

## Behaviour

- lower urgency;
- calmer glow profile.

---

# Ticket beacon

## Emotional role

```txt
exchange opportunity
```

## Shape language

- segmented ring;
- directional opening.

## Motion

- periodic signal sweep;
- restrained pulse.

## Behaviour

- expires visually as time decreases;
- urgency rises near event time.

---

# Preloved beacon

## Emotional role

```txt
community marketplace signal
```

## Shape language

- layered object halo;
- modular geometry.

## Motion

- minimal movement;
- soft idle shimmer.

## Rules

- no aggressive motion spam;
- marketplace should not dominate Globe.

---

# Care beacon

## Emotional role

```txt
support exists nearby
```

## Shape language

- soft concentric rings;
- calm centre;
- low contrast.

## Motion

- extremely calm;
- low-frequency breathing.

## Behaviour

- visible but non-invasive;
- should feel emotionally safe.

---

# HNH MESS beacon

## Emotional role

```txt
care after the chaos
```

## Shape language

- warm layered glow;
- soft pulse envelope;
- grounded centre.

## Motion

- reassuring rhythm;
- slower pulse cadence.

## Behaviour

- stronger presence during late-night windows;
- contextual surfacing after venue/event interaction.

---

# Radio beacon

## Emotional role

```txt
culture is broadcasting from here
```

## Shape language

- waveform-inspired rings;
- directional audio ripple.

## Motion

- audio-reactive optional behaviour;
- pulse synced softly to stream activity.

## Behaviour

- can create sparse atmospheric arcs;
- should feel alive but elegant.

---

# NA/AA beacon

## Emotional role

```txt
quiet support nearby
```

## Shape language

- protected circular form;
- reduced visibility shell.

## Motion

- almost static;
- gentle fade breathing only.

## Privacy rules

- exact coordinates may be fuzzed;
- low-density suppression enabled;
- anonymity protected first.

---

# Venue intensity node

## Emotional role

```txt
this place is active right now
```

## Shape language

- anchored atmospheric node;
- low-altitude field.

## Motion

- crowd intensity breathing;
- no sharp pulses.

## Density behaviour

In dense districts:

- merge into district glow;
- suppress individual venue spam.

---

# Creator beacon

## Emotional role

```txt
someone is dropping something culturally relevant
```

## Shape language

- editorial flare;
- asymmetric glow signature.

## Motion

- restrained hero animation.

## Rules

- curated;
- should feel premium;
- never influencer chaos.

---

# Route beacon

## Emotional role

```txt
movement is happening
```

## Shape language

- directional node;
- route-linked anchor.

## Motion

- flow movement;
- directional fade.

---

# SOS beacon

## Emotional role

```txt
private urgent support
```

## Critical rule

SOS is NOT a public spectacle.

---

# SOS public rendering

Public Globe must NOT show:

- exact SOS location;
- panic animation;
- flashing red emergency markers;
- identifiable distress signals.

---

# SOS trusted-contact rendering

Allowed:

- protected pulse;
- controlled urgency glow;
- route assistance;
- safety overlays.

---

# SOS motion rules

Should communicate:

- urgency;
- care;
- stability.

NOT:

```txt
alarm panic energy
```

---

# Beacon states

Every beacon supports lifecycle states.

---

# Core states

| State | Meaning |
|---|---|
| idle | visible default |
| live | active now |
| selected | focused by user |
| nearby | geographically relevant |
| boosted | promoted visibility |
| stacked | grouped in density cluster |
| hidden | suppressed |
| reported | moderation state |
| expired | ended |
| cancelled | withdrawn |
| stale | outdated |

---

# Idle state

Should feel:

- calm;
- readable;
- ambient.

No aggressive animation.

---

# Live state

Should indicate:

```txt
active right now
```

Methods:

- subtle pulse;
- glow warmth;
- soft animation increase.

Avoid:

- constant flashing;
- scale explosions.

---

# Selected state

Selection is the strongest interaction state.

Can affect:

- glow;
- scale;
- altitude;
- nearby dimming;
- route visibility;
- label visibility.

Selection should feel:

```txt
focused and cinematic
```

---

# Nearby state

Used when:

- beacon is geographically close;
- user enters local mode.

Should:

- slightly increase prominence;
- improve discoverability.

---

# Boosted state

Boosting is visibility assistance.

Boosting is NOT:

```txt
buying the entire skyline
```

---

# Boost visual rules

Boosts may increase:

- discovery likelihood;
- selection frequency;
- cluster priority;
- atmospheric contribution.

Boosts may NOT:

- massively scale markers;
- block other signals;
- create giant spikes;
- force camera takeover.

---

# Expired state

Expired signals should:

- fade naturally;
- softly dissolve;
- reduce glow gradually.

Avoid:

```txt
instant teleport disappearance
```

---

# Cancelled state

Cancelled beacons should:

- collapse quietly;
- stop animation immediately;
- retain minimal history if needed.

Optional copy:

```txt
This signal ended early.
```

---

# Reported/moderated state

Reported signals:

- lose promotional behaviour;
- lose boosts;
- reduce visibility.

Unsafe signals may:

- disappear entirely;
- route to moderation queue.

---

# Density adaptation system

Beacon visuals must adapt by density.

---

# Low density

Allowed:

- richer glow;
- more atmosphere;
- stronger individual identity.

---

# Medium density

Shift toward:

- stack grouping;
- reduced pulse count;
- reduced glow overlap.

---

# High density

Switch to:

- constellation systems;
- cluster shells;
- district haze;
- aggregate intensity.

NOT:

```txt
200 giant pins overlapping
```

---

# Zoom adaptation

## Space view

Signals become:

- constellation particles;
- atmospheric glow contributors.

---

## City view

Signals become:

- categorized nodes;
- stack systems;
- district clusters.

---

## Local view

Signals become:

- actionable nearby places;
- navigation-aware markers;
- route-aware interactions.

---

# Beacon stacking

Stacks are essential for dense nightlife zones.

---

# Stack behaviour

A stack should:

- feel spatially organized;
- reveal categories;
- prioritize relevance;
- avoid total overlap.

---

# Stack interaction

Possible interactions:

- fan out;
- carousel expand;
- radial reveal;
- layered card stack.

---

# Recommended interaction

Preferred:

```txt
radial + layered hybrid expansion
```

Reason:

- cinematic;
- spatially understandable;
- touch-friendly.

---

# Beacon labels

Labels should:

- appear intentionally;
- avoid clutter;
- respect density.

---

# Label visibility rules

Always visible:

- selected;
- active route destination;
- nearby critical care.

Conditional:

- events;
- venues;
- creator drops.

Suppressed in space view.

---

# Interaction choreography

## Hover

Subtle.

- mild glow increase;
- slight altitude lift;
- optional metadata preview.

---

## Select

Cinematic.

- nearby dim;
- focus route;
- label reveal;
- camera assist.

---

## Deselect

Should ease naturally.

No abrupt collapse.

---

# Accessibility behaviour

Beacon visuals must support:

- reduced motion;
- high contrast;
- low stimulation;
- color-blind-safe differentiation.

---

# Reduced motion beacon policy

Reduced motion should:

- remove pulse loops;
- reduce glow breathing;
- simplify transitions.

The Globe should still feel alive.

---

# Calm mode beacon policy

Calm mode:

- reduces simultaneous animation;
- softens saturation;
- lowers glow intensity;
- simplifies stacks.

---

# Monetisation boundaries

Critical governance section.

---

# Monetisation must NEVER

- block safety visibility;
- suppress care;
- dominate the skyline;
- create deceptive urgency;
- override density policy;
- hijack camera choreography.

---

# Acceptable monetisation behaviour

Allowed:

- discovery weighting;
- tasteful featured treatment;
- editorial spotlighting;
- subtle atmospheric amplification.

---

# Forbidden monetisation visuals

Forbidden:

- giant premium pins;
- flashing sponsored markers;
- forced popups;
- casino-style urgency.

---

# Beacon audio policy

Optional audio-reactive systems:

- radio;
- featured events;
- editorial broadcasts.

Rules:

- muted by default;
- subtle;
- accessibility aware.

---

# Renderer ownership

Beacon renderers consume:

```ts
BeaconVisualRegistry
GlobeVisualTokens
GlobeMotionTokens
DensityPolicy
AccessibilityPolicy
```

Renderers do not invent visuals ad hoc.

---

# Required implementation targets

```txt
src/lib/globe/beacons/BeaconVisualRegistry.ts
src/lib/globe/beacons/BeaconStateMachine.ts
src/lib/globe/beacons/BeaconDensityAdapter.ts
src/lib/globe/beacons/BeaconInteractionPolicy.ts
src/lib/globe/beacons/BeaconAccessibilityAdapter.ts
src/lib/globe/beacons/BeaconLifecycleAnimator.ts
src/lib/globe/beacons/BeaconClusterRenderer.ts
src/lib/globe/beacons/BeaconStackRenderer.ts
src/lib/globe/beacons/BeaconMonetisationPolicy.ts
```

---

# Acceptance criteria

The beacon system succeeds when:

- users instantly understand beacon meaning visually;
- dense cities remain readable;
- boosted signals remain tasteful;
- Help/SOS stays private and calm;
- care signals feel emotionally safe;
- nightlife energy feels alive but not frantic;
- selection feels cinematic;
- stacks feel spatially understandable;
- clusters remain elegant;
- zoom transitions preserve clarity;
- accessibility modes remain premium;
- monetisation never compromises trust;
- the Globe feels culturally alive instead of visually chaotic.