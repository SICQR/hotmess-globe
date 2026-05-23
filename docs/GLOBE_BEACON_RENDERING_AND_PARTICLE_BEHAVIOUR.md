# Globe Beacon Rendering And Particle Behaviour

Purpose: define the visual behaviour, particle language, scale rules, density adaptation, interaction states, and accessibility variants for all HOTMESS Globe beacons.

This document governs:

- beacon rendering;
- particle systems;
- glow behaviour;
- scale rules;
- altitude behaviour;
- zoom behaviour;
- clustering;
- beacon reveal;
- beacon interaction states;
- reduced motion variants;
- Mapbox/local mode behaviour.

The system exists to make beacons feel like:

```txt
emotional gravity signals
```

NOT:

```txt
database markers stuck on a map
```

---

# Core philosophy

Beacons are not pins.

Beacons are:

- signals;
- pulses;
- invitations;
- warnings;
- care flares;
- nightlife gravity;
- temporary emotional weather.

They should feel:

```txt
seductive on the surface, protective underneath
```

This is the visual expression of:

```txt
care dressed as kink
```

---

# Non-negotiable rendering correction

Current problem:

```txt
beacons are oversized nodes rising out of the globe and covering large areas
```

This is forbidden.

Beacon rendering must obey:

- zoom-aware scaling;
- density-aware reduction;
- local-mode restraint;
- accessibility-safe motion;
- marker budget limits;
- privacy visibility rules.

A beacon should NEVER become:

```txt
a giant pillar consuming geography
```

---

# Canonical beacon scale hierarchy

```txt
Planet
→ Region
→ City
→ District
→ Street
→ Venue
→ Interaction
```

Beacon scale must reduce and refine as the user moves inward.

| Scale | Beacon Behaviour |
|---|---|
| Planet | atmospheric glow only |
| Region | district pulse |
| City | soft cluster shimmer |
| District | separated beacon groups |
| Street | individual beacon marker |
| Venue | contextual signal |
| Interaction | detailed card/profile state |

---

# Beacon size law

Beacon screen size must stay bounded.

Rule:

```txt
visual importance may increase, physical map footprint must not explode
```

Beacon radius should be calculated from:

- zoom level;
- beacon type;
- density state;
- interaction state;
- accessibility mode;
- privacy class.

Not from raw world scale alone.

---

# Altitude behaviour

Beacons may rise subtly from the globe at broad zoom.

But altitude should:

- collapse toward surface as zoom increases;
- never obscure large land masses;
- never become vertical skyscrapers;
- never imply exact location publicly.

Suggested altitude profile:

| Zoom State | Altitude |
|---|---:|
| Planet | soft atmospheric lift |
| Region | low lift |
| City | near-surface |
| District | surface-bound |
| Street | marker/card only |

---

# Beacon anatomy

Canonical beacon anatomy:

```txt
Core
Glow
Halo
Particle Edge
Pulse Ring
Interaction Field
Label State
```

Each layer must be independently controllable for:

- density;
- motion;
- accessibility;
- state;
- zoom.

---

# Core visual language

## Core

The core indicates:

- type;
- state;
- interaction focus.

Should be:

- small;
- legible;
- icon-capable;
- shape-coded.

## Glow

The glow indicates:

- atmosphere;
- warmth;
- energy.

Should be:

- soft;
- bounded;
- density-aware.

## Halo

The halo indicates:

- reach;
- relevance;
- approximate area.

Should NEVER imply exact radius unless explicitly scoped.

## Pulse Ring

The pulse indicates:

- freshness;
- selected state;
- live energy.

Should be:

- subtle;
- infrequent;
- reduced under accessibility modes.

---

# Beacon type visual system

## Event

Feeling:

```txt
hot gravity
```

Behaviour:

- stronger glow;
- slow pulse;
- cluster friendly;
- venue anchored.

Avoid:

- firework spam;
- giant columns.

---

## Chill

Feeling:

```txt
low warm invitation
```

Behaviour:

- small glow;
- soft breathing;
- approximate area;
- low aggression.

Avoid:

- exact pin pressure;
- high urgency.

---

## Ticket

Feeling:

```txt
sharp temporary access
```

Behaviour:

- compact icon;
- expiry shimmer;
- venue linked.

Avoid:

- panic countdown visuals;
- fake scarcity animation.

---

## Preloved Drop

Feeling:

```txt
small electric find
```

Behaviour:

- local sparkle;
- capped visibility;
- quick decay.

Avoid:

- marketplace clutter;
- shopping-app energy.

---

## Radio

Feeling:

```txt
soundwave through the city
```

Behaviour:

- wave-like pulse;
- distributed district shimmer;
- low visual density.

Avoid:

- equalizer gimmicks;
- aggressive animation.

---

## Care

Feeling:

```txt
low light, safe room
```

Behaviour:

- calming glow;
- minimal motion;
- high legibility;
- soft priority.

Avoid:

- clinical icons;
- panic colour language.

---

## Help

Feeling:

```txt
quietly visible to the right people
```

Behaviour:

- scoped visibility;
- calm urgency;
- no public exact marker.

Avoid:

- public flares;
- crisis theatre.

---

## SOS

Feeling:

```txt
private emergency signal
```

Behaviour:

- trusted-only;
- high legibility;
- no public heat;
- no public marker.

Avoid:

- public alarms;
- giant red map icons;
- spectacle.

---

# Particle behaviour

Particles should feel:

- atmospheric;
- restrained;
- sensual;
- spatial.

Particles should NOT feel:

- casino-like;
- game-like;
- noisy;
- cheap.

Allowed particle behaviours:

- haze shimmer;
- edge diffusion;
- slow pulse dust;
- wake trails for selected transitions;
- subtle radio waves.

Forbidden particle behaviours:

- confetti;
- XP bursts;
- loot-box sparkle;
- constant fireworks;
- aggressive streak trails.

---

# Freshness rendering

Beacon freshness states:

```txt
Live
Recent
Cooling
Stale
Expired
```

Visual behaviour:

| Freshness | Behaviour |
|---|---|
| Live | clear core, soft pulse |
| Recent | stable glow |
| Cooling | fading halo |
| Stale | low opacity |
| Expired | dissolve out |

Expired beacons should:

- dissolve gracefully;
- not hard pop;
- leave no clutter.

---

# Lifecycle animation

Beacon lifecycle:

```txt
Draft
Preview
Publishing
Live
Boosted
Cooling
Expired
Cancelled
Moderated
Hidden
```

## Publishing

Should feel:

```txt
signal entering the atmosphere
```

Animation:

- soft birth glow;
- small ripple;
- local integration.

## Boosted

Boosted beacons may:

- gain clearer stack position;
- gain slightly stronger edge glow.

Boosted beacons may NOT:

- become huge;
- hijack camera;
- create pay-to-win skyline.

## Cancelled

Cancelled beacons should:

- contract;
- fade;
- remove routing;
- update realtime immediately.

## Moderated

Moderated beacons should:

- disappear quietly;
- not create public shame.

---

# Density behaviour

Density states:

```txt
Quiet
Warm
Hot
Packed
Overloaded
```

| Density | Beacon Behaviour |
|---|---|
| Quiet | individual beacons allowed |
| Warm | mild clustering |
| Hot | stacks preferred |
| Packed | heat + stacks only |
| Overloaded | suppress individual rendering |

Dense districts should NEVER render:

```txt
hundreds of individual glowing nodes
```

---

# Cluster fusion

When beacons cluster:

- cores merge into shared glow;
- halos blend softly;
- particles reduce;
- labels collapse;
- stack card becomes primary interaction.

Clusters should feel:

```txt
like heat gathering
```

NOT:

```txt
icons colliding
```

---

# Cluster dissolution

When zooming inward:

- cluster glow separates;
- core signals emerge;
- local labels appear;
- individual beacons become interactive.

Dissolution should feel:

```txt
like constellations resolving into bodies
```

---

# Label behaviour

Labels must be restrained.

Label hierarchy:

```txt
None
Category
Venue
Short Title
Full Card
```

Labels appear only when:

- zoom permits;
- density permits;
- interaction focus permits;
- accessibility mode permits.

Avoid:

- floating name spam;
- public identity exposure;
- unreadable label clouds.

---

# Interaction states

Beacon interaction states:

```txt
Idle
Hover
Focused
Selected
Card Open
Profile Preview
Chat Intent
Saved
Reported
Hidden
```

Interaction should:

- increase clarity;
- not increase physical footprint excessively.

Selected beacon behaviour:

- core sharpens;
- surrounding clutter softens;
- related routes appear;
- card opens.

---

# Local Mapbox mode

In Mapbox local mode:

- beacons become surface-bound;
- altitude is disabled;
- individual markers are small;
- labels obey collision rules;
- clusters use Mapbox-friendly layers.

Local mode must feel:

```txt
real map, still HOTMESS
```

NOT:

```txt
flat utility map with neon stickers
```

---

# Privacy-aware rendering

Beacon rendering must obey:

- visibility scope;
- precision class;
- trusted contact state;
- blocked-user state;
- moderation state;
- safety policy.

Exact location-sensitive beacons must:

- render approximate publicly;
- render scoped privately;
- never leak through halo shape.

---

# Accessibility rendering

Reduced motion:

- disables most pulses;
- reduces particles;
- softens glow transitions;
- uses static state changes.

High contrast:

- increases shape coding;
- reduces glow dependence;
- improves outline clarity.

Reduced stimulation:

- lowers bloom;
- removes non-essential shimmer;
- collapses dense effects faster.

---

# Performance budgets

Beacon rendering must be GPU-safe.

Suggested budgets:

| Layer | Budget |
|---|---:|
| individual animated beacons | 50 visible max |
| static beacons | 200 visible max |
| clusters | 100 max |
| active particle systems | 12 max |
| labels | collision-budgeted |

Performance fallback:

- particles off;
- glow simplified;
- labels reduced;
- cluster-only rendering.

---

# Audio-linked behaviour

Beacon audio may support:

- selected hum;
- radio wave bleed;
- district ambience;
- event pulse.

Audio must remain:

- subtle;
- optional;
- reduced under accessibility settings.

---

# Monetisation boundaries

Boosted visuals may:

- sharpen edge glow;
- improve stack placement;
- increase discoverability.

Boosted visuals must NEVER:

- grow physically huge;
- dominate district heat;
- imitate safety;
- create fake urgency;
- create skyline ownership.

---

# Suggested Supabase tables

```txt
beacon_render_states
beacon_visual_profiles
beacon_particle_profiles
beacon_zoom_profiles
beacon_density_states
beacon_accessibility_variants
beacon_transition_states
```

Related existing tables:

```txt
beacons
beacon_boosts
beacon_visibility
beacon_analytics
beacon_reports
district_heat_events
```

---

# Suggested implementation targets

```txt
src/lib/beaconRendering/BeaconScaleEngine.ts
src/lib/beaconRendering/BeaconParticleController.ts
src/lib/beaconRendering/BeaconGlowSystem.ts
src/lib/beaconRendering/BeaconAltitudeController.ts
src/lib/beaconRendering/BeaconDensityAdapter.ts
src/lib/beaconRendering/BeaconAccessibilityRenderer.ts
src/lib/beaconRendering/BeaconPrivacyRenderer.ts
src/lib/beaconRendering/BeaconLifecycleAnimator.ts
src/lib/beaconRendering/ClusterFusionEngine.ts
src/lib/beaconRendering/ClusterDissolutionAnimator.ts
src/components/globe/beacons/BeaconCore.tsx
src/components/globe/beacons/BeaconGlow.tsx
src/components/globe/beacons/BeaconCluster.tsx
src/components/globe/beacons/BeaconParticleField.tsx
src/components/globe/beacons/BeaconLabel.tsx
```

---

# Testing requirements

## Unit tests

Test:

- zoom scaling;
- altitude collapse;
- density adaptation;
- privacy rendering;
- boost visual boundaries;
- reduced motion suppression;
- lifecycle animations.

## Integration tests

Test:

- dense district clusters correctly;
- beacons shrink during zoom;
- Mapbox local markers remain small;
- SOS never renders publicly;
- boosted beacons do not exceed size caps;
- labels obey collision rules.

## E2E tests

Test:

- orbit to local reveal feels smooth;
- no giant beacon pillars appear;
- local map remains readable;
- reduced stimulation materially changes visuals;
- expired beacons dissolve gracefully;
- selected beacon opens card/profile/chat flow cleanly.

---

# Acceptance criteria

The system succeeds when:

- beacons feel seductive, alive, and legible;
- giant node pillars are eliminated;
- zooming inward reduces footprint and increases clarity;
- dense districts become heat/stacks rather than clutter;
- care and safety signals remain protected;
- boosted beacons remain restrained;
- local Mapbox mode feels real and readable;
- reduced motion users remain comfortable;
- particles feel atmospheric rather than gamified;
- HOTMESS beacons feel like queer emotional gravity signals rather than map pins.
