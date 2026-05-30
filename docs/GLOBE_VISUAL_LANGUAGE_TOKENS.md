# Globe Visual Language Tokens

Purpose: define the canonical visual language system for the HOTMESS Globe.

This document establishes:

- visual hierarchy;
- tokenized rendering;
- beacon appearance;
- motion language;
- atmospheric systems;
- glow policy;
- density readability;
- accessibility-safe visual behaviour;
- cinematic consistency.

This prevents the Globe from becoming:

```txt
random neon objects floating in space
```

---

# Core philosophy

The Globe is not:

- Google Maps;
- an airline tracker;
- a tactical dashboard;
- a crypto terminal;
- a gaming HUD.

The Globe should feel like:

```txt
a living emotional nightlife atmosphere
```

But:

- readable;
- trustworthy;
- calm when needed;
- density-aware;
- accessibility-safe.

---

# Visual hierarchy principles

Users must instantly understand:

- where they are;
- what matters;
- what is live;
- what is social;
- what is care/safety;
- what is background atmosphere.

Without reading.

---

# Priority order

## Visual hierarchy

| Priority | Layer |
|---|---|
| 1 | active user intent |
| 2 | Help/SOS/private safety |
| 3 | selected beacon |
| 4 | care / NA / AA / sober support |
| 5 | live events |
| 6 | venue intensity |
| 7 | radio pulses |
| 8 | social presence aggregates |
| 9 | market/preloved |
| 10 | ambient atmosphere |

This hierarchy affects:

- brightness;
- scale;
- motion;
- contrast;
- layering;
- interaction priority.

---

# Token philosophy

Every visual element must derive from tokens.

Never hardcode:

- colors;
- glow strengths;
- beacon sizes;
- animation speeds;
- blur values;
- opacities.

---

# Token groups

## Required token systems

```txt
color
motion
glow
atmosphere
density
spacing
beacon
arc
camera
fog
cluster
z-index
accessibility
```

---

# Core token structure

## Example

```ts
export const GlobeVisualTokens = {
  beacon: {},
  motion: {},
  atmosphere: {},
  glow: {},
  cluster: {},
  accessibility: {}
}
```

---

# Color language

The Globe should feel:

- nocturnal;
- atmospheric;
- emotional;
- cinematic;
- premium.

Avoid:

- rainbow overload;
- cheap cyberpunk palettes;
- crypto aesthetics;
- casino UI energy.

---

# Color roles

## Atmospheric background

Purpose:

- depth;
- mood;
- orientation.

Should remain:

- subtle;
- low-frequency;
- non-distracting.

---

## Signal colors

Used for:

- beacon classification;
- urgency;
- interaction state;
- trust level.

Must never rely on color alone.

Shape/motion/iconography required too.

---

# Recommended beacon color families

| Type | Color direction |
|---|---|
| Event | warm magenta/orange |
| Chill | soft violet/blue |
| Ticket | electric amber |
| Preloved | muted cyan |
| Care | teal/soft aqua |
| HNH MESS | deep warm red-violet |
| Radio | electric waveform cyan |
| NA/AA | calm desaturated blue |
| Sober support | soft teal |
| SOS | controlled warning coral |
| Venue intensity | atmospheric gold |
| Creator drop | ultraviolet accent |
| Record release | audio-reactive violet |

---

# Forbidden color behaviour

Do NOT:

- use pure red panic flashing;
- use rainbow beacon spam;
- animate hue shifts constantly;
- use identical colors for all beacon types.

---

# Glow system

Glow is emotional guidance.

Glow is NOT:

```txt
brightness for the sake of brightness
```

---

# Glow principles

Glow should communicate:

- relevance;
- warmth;
- nightlife intensity;
- selection;
- trust;
- atmosphere.

---

# Glow layers

## Atmospheric glow

Large-scale city softness.

Seen from:

- continent view;
- space view.

Low detail.

---

## Beacon glow

Local signal emphasis.

Seen from:

- city view;
- district view.

---

## Selection glow

Strongest interactive emphasis.

Reserved for:

- selected item;
- active route;
- focused destination.

---

# Glow token examples

```ts
glow: {
  atmosphereSoft: 0.08,
  atmosphereDense: 0.16,
  beaconIdle: 0.22,
  beaconSelected: 0.42,
  beaconBoosted: 0.32,
  careBeacon: 0.18,
  sosBeacon: 0.28
}
```

---

# Beacon scale system

Critical rule:

```txt
boosts do not create skyscraper pins
```

---

# Scale philosophy

Scale should indicate:

- proximity;
- selection;
- confidence;
- category importance;
- interaction state.

Scale should NOT indicate:

- who paid the most.

---

# Beacon scale tiers

| Tier | Usage |
|---|---|
| nano | distant atmospheric signals |
| micro | dense clusters |
| standard | default beacon |
| focus | selected beacon |
| hero | temporary featured focus |

---

# Maximum scale policy

Even boosted signals must remain within:

```txt
readability-safe bounds
```

No massive spikes.

No giant towers.

No obstructing landmass visibility.

---

# Height and altitude policy

Altitude should communicate:

- zoom readability;
- selected emphasis;
- category separation.

Altitude should NOT:

- create giant needles;
- obscure cities;
- block map detail.

---

# Recommended altitude ranges

| Type | Altitude |
|---|---|
| atmosphere | near-surface |
| heat field | surface |
| default beacon | low |
| selected beacon | medium |
| arc origin | medium |
| SOS | controlled medium |

---

# Motion language

Motion should feel:

- fluid;
- intentional;
- cinematic;
- spatially meaningful.

Avoid:

- frantic pulsing;
- slot-machine energy;
- constant twitching.

---

# Motion token groups

```ts
motion: {
  pulseSlow: 4.5,
  pulseStandard: 2.8,
  pulseFast: 1.8,
  fadeFast: 180,
  fadeStandard: 300,
  cameraEase: 1200
}
```

---

# Motion categories

## Atmospheric drift

Slow.

Barely perceptible.

For:

- fog;
- ambient city glow;
- cloud layers.

---

## Beacon pulse

Used sparingly.

Only for:

- selected;
- live;
- relevant;
- route-linked.

---

## Realtime pulse

Should indicate:

```txt
something meaningful changed
```

Not:

```txt
system is alive every millisecond
```

---

# Reduced motion integration

All motion tokens must support:

- reduced;
- minimal;
- disabled.

No exceptions.

---

# Density visual language

The Globe must evolve visually based on zoom.

---

# Space view

Users should see:

- atmospheric cities;
- constellation clusters;
- pulse fields;
- nightlife density.

NOT:

- local venue pins;
- giant marker forests.

---

# Continent view

Users should see:

- city-level energy;
- route arcs;
- featured hubs;
- regional intensity.

---

# City view

Users should see:

- districts;
- venue zones;
- stack groups;
- beacon categories.

---

# District view

Users should see:

- local pins;
- routes;
- nearby care;
- ticket flows;
- venue intensity.

---

# Street/local mode

Handled primarily by Mapbox.

Should emphasize:

- navigation;
- clarity;
- real geography;
- route understanding.

Less cinematic.

More practical.

---

# Cluster language

Clusters should feel:

- organized;
- meaningful;
- expandable.

Not:

```txt
random overlapping bubbles
```

---

# Cluster token groups

```ts
cluster: {
  collapsedOpacity: 0.8,
  expandedSpacing: 18,
  stackDepth: 4,
  heatFade: 0.14
}
```

---

# Arc language

Arcs represent:

- movement;
- connection;
- migration;
- nightlife flow.

Arcs should NOT become:

```txt
constant airport spaghetti
```

---

# Arc categories

| Arc type | Meaning |
|---|---|
| social | friend movement |
| event flow | city migration |
| radio pulse | cultural signal |
| route | navigation |
| care route | safer path |
| featured | editorial spotlight |

---

# Arc motion rules

Arcs should:

- fade naturally;
- remain sparse;
- avoid clutter.

Dense simultaneous arcs are forbidden.

---

# Atmospheric systems

Atmosphere is critical.

Without atmosphere:

```txt
it becomes a data dashboard
```

With too much atmosphere:

```txt
it becomes unreadable sci-fi soup
```

---

# Atmospheric layers

## Globe fog

Soft depth separation.

---

## City bloom

Represents nightlife energy.

---

## Pulse haze

Represents activity density.

---

## Audio-reactive ambience

Optional.

For:

- radio;
- featured events;
- editorial moments.

Must remain subtle.

---

# Typography tokens

Typography should feel:

- editorial;
- premium;
- readable;
- cinematic.

Avoid:

- tiny labels;
- glowing unreadable text;
- HUD typography.

---

# Typography hierarchy

| Level | Usage |
|---|---|
| hero | city overlays |
| title | selected venue/event |
| label | beacon labels |
| metadata | timestamps/distance |
| ambient | atmospheric labels |

---

# Accessibility tokens

Accessibility is part of visual language.

Required support:

- high contrast;
- reduced glow;
- reduced motion;
- low stimulation;
- color-blind-safe variants.

---

# Calm mode visual language

Calm mode should:

- reduce saturation;
- reduce simultaneous motion;
- simplify overlays;
- soften transitions.

It should feel:

```txt
quietly premium
```

NOT:

```txt
disabled
```

---

# Selection language

Selection must feel:

- focused;
- intentional;
- spatially clear.

Selection can influence:

- glow;
- altitude;
- label visibility;
- nearby fade;
- route emphasis.

---

# Hover language

Hover should be subtle.

Avoid:

- giant scale jumps;
- explosive glow;
- tooltip spam.

---

# Empty state language

Low-density areas should still feel alive.

Use:

- atmospheric glow;
- soft city haze;
- subtle environmental motion.

Avoid:

```txt
dead black globe
```

---

# Performance-aware visual policy

Visual quality must scale by:

- device capability;
- battery state;
- density;
- accessibility mode;
- FPS stability.

---

# Dynamic degradation order

Reduce in this order:

1. particles
2. ambient animation
3. distant arcs
4. glow complexity
5. secondary labels
6. atmospheric layers
7. beacon motion

Never remove:

- readability;
- safety visibility;
- navigation clarity.

---

# Visual ownership architecture

Create:

```txt
BeaconVisualRegistry
GlobeVisualTokens
GlobeMotionTokens
GlobeAtmosphereTokens
GlobeDensityVisualPolicy
```

Renderers consume tokens.

Renderers do not invent visuals.

---

# Suggested implementation targets

```txt
src/lib/globe/visual/GlobeVisualTokens.ts
src/lib/globe/visual/GlobeMotionTokens.ts
src/lib/globe/visual/GlobeGlowTokens.ts
src/lib/globe/visual/GlobeAtmosphereTokens.ts
src/lib/globe/visual/BeaconVisualRegistry.ts
src/lib/globe/visual/GlobeClusterVisuals.ts
src/lib/globe/visual/GlobeArcVisuals.ts
src/lib/globe/visual/GlobeDensityVisualPolicy.ts
src/lib/globe/visual/GlobeAccessibilityVisuals.ts
```

---

# Acceptance criteria

The visual language succeeds when:

- users instantly understand visual hierarchy;
- space view feels atmospheric rather than cluttered;
- local mode feels navigable;
- boosted beacons remain tasteful;
- Help/SOS stays visible without panic visuals;
- beacon categories are distinguishable instantly;
- motion feels cinematic rather than frantic;
- density remains readable;
- calm mode feels elegant;
- accessibility integrates directly into token systems;
- clusters feel intentional;
- arcs remain sparse and meaningful;
- renderers use shared tokens consistently;
- the Globe feels emotionally alive without becoming visual chaos.