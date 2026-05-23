# Globe To Local Transition Animation System

Purpose: define how HOTMESS Globe transitions from planetary-scale rendering into local district and street-level exploration.

This document governs:

- globe-to-city transitions;
- city-to-district transitions;
- district-to-local map handoffs;
- camera choreography;
- beacon reveal behaviour;
- environmental continuity;
- Mapbox transition logic;
- motion pacing;
- reduced motion accessibility.

The system exists to:

- make navigation emotionally immersive;
- preserve geographic orientation;
- create nightlife gravity;
- avoid disorientation;
- maintain atmospheric continuity.

NOT to:

- feel like a generic map zoom;
- create abrupt rendering jumps;
- overload users with motion.

---

# Core philosophy

The globe should NEVER feel like:

```txt
zooming into software
```

It should feel like:

```txt
being pulled toward energy
```

Transitions should feel:

- seductive;
- cinematic;
- spatially emotional;
- breathable;
- nocturnal.

Underlying systems may be:

- technically complex;
- heavily orchestrated;
- realtime adaptive.

But the user experience should feel:

```txt
fluid and inevitable
```

---

# Canonical transition hierarchy

```txt
Planet
→ Region
→ City
→ District
→ Street
→ Beacon
→ Profile
→ Ghosted Chat
```

Each layer transition should:

- preserve orientation;
- maintain emotional continuity;
- progressively reveal detail.

---

# Camera philosophy

The camera should feel:

- curious;
- drifting;
- tempted;
- magnetised.

NOT:

- tactical;
- mechanical;
- GIS-like.

The camera is:

```txt
emotional choreography
```

NOT:

```txt
navigation utility
```

---

# Transition stages

## Stage 1 — Planetary Orbit

User sees:

- rotating globe;
- district energy pulses;
- atmospheric glow;
- transport arcs;
- city weather;
- soft beacon density.

Visual language:

- low detail;
- atmospheric;
- cosmic nightlife.

---

## Stage 2 — Regional Pull

When selecting a city:

- the camera subtly locks;
- nearby districts intensify;
- atmospheric haze tightens;
- local energy becomes visible.

The transition should feel:

```txt
like gravity increasing
```

NOT:

```txt
teleportation
```

---

## Stage 3 — City Drift

The globe transitions into:

- illuminated streets;
- district boundaries;
- city environmental mood;
- aggregate nightlife flow.

Map detail begins loading progressively.

Beacon systems remain:

- aggregated;
- softened.

---

## Stage 4 — District Lock

The camera slows.

Districts begin:

- breathing;
- glowing;
- separating.

Local geometry becomes visible:

- roads;
- waterways;
- transport overlays;
- venue clusters.

This is where:

```txt
space becomes place
```

---

## Stage 5 — Local Reveal

The system transitions fully into:

- Mapbox local rendering;
- venue-level detail;
- local beacon interactions;
- transport overlays;
- walking routes.

The handoff must feel:

- seamless;
- fluid;
- inevitable.

The user should NEVER perceive:

```txt
mode switching
```

---

# Mapbox handoff system

The transition from globe renderer to Mapbox must:

- preserve camera bearing;
- preserve motion velocity;
- preserve lighting continuity;
- preserve environmental atmosphere.

Mapbox should progressively:

- increase detail density;
- increase typography clarity;
- reveal roads;
- reveal venue geometry.

Avoid:

- hard renderer swaps;
- tile flashing;
- texture popping.

---

# Anti-blur rendering rules

Critical requirement:

The globe must NEVER:

```txt
become blurry during zoom
```

Progressive detail systems should:

- swap texture resolution gradually;
- progressively load vector detail;
- sharpen typography over time;
- increase environmental precision smoothly.

At no point should the user feel:

- low-resolution collapse;
- texture smearing;
- stretched map imagery.

---

# Beacon transition behaviour

Current oversized beacon behaviour is forbidden.

As users zoom inward:

```txt
beacon size should reduce
```

NOT:

```txt
expand proportionally forever
```

Beacon logic:

| Zoom Level | Behaviour |
|---|---|
| Planet | aggregate glow |
| Region | district pulse |
| City | cluster shimmer |
| District | beacon separation |
| Street | individual signal |

---

# Beacon reveal choreography

Beacon reveal should feel:

- atmospheric;
- magnetic;
- gradual.

Examples:

- distant glow becomes local signal;
- clusters separate softly;
- local pulses emerge from haze;
- transport activity resolves.

Avoid:

- marker explosions;
- UI spam;
- hard pop-ins.

---

# Cluster dissolution system

Dense beacon clusters should:

- dissolve progressively;
- separate spatially;
- preserve readability.

Cluster transitions should:

- animate softly;
- avoid collision chaos.

Clusters should feel:

```txt
like constellations resolving into streets
```

---

# Environmental continuity

Environmental systems must persist through transitions.

Examples:

- cloud movement;
- weather state;
- district haze;
- lighting temperature;
- sunrise/sunset positioning.

Atmosphere should NEVER:

```txt
reset during transitions
```

---

# Audio transition choreography

Audio should transition progressively.

Examples:

| Zoom State | Audio Behaviour |
|---|---|
| Globe | ambient planetary tone |
| Region | distant district bleed |
| City | transport + nightlife texture |
| District | local atmosphere |
| Beacon | intimate signal tone |

Audio should feel:

```txt
like entering a living space
```

---

# Motion pacing

Motion speed should adapt dynamically.

Examples:

| Interaction | Motion |
|---|---|
| Casual exploration | slow drift |
| Direct selection | stronger pull |
| SOS routing | fast but calm |
| Reduced stimulation | softened movement |

Avoid:

- excessive acceleration;
- rollercoaster movement;
- violent easing curves.

---

# Reduced stimulation mode

Reduced stimulation mode should:

- reduce camera acceleration;
- simplify transitions;
- reduce environmental particles;
- reduce bloom;
- minimise parallax.

The experience should remain:

- spatially understandable;
- emotionally calm.

---

# Accessibility requirements

Transitions must support:

- reduced motion;
- keyboard navigation;
- screen readers;
- simplified transition timing;
- lower visual complexity.

No critical interaction may depend solely on:

- animation timing;
- visual motion.

---

# Performance scaling

Transition systems must scale by:

- device capability;
- GPU performance;
- network speed;
- thermal conditions.

Performance fallback systems may:

- reduce particles;
- reduce environmental depth;
- simplify lighting.

Low-end devices must STILL feel:

```txt
atmospheric and premium
```

---

# Globe to local interaction chain

Canonical interaction flow:

```txt
Globe
→ District curiosity
→ Zoom drift
→ Beacon discovery
→ Beacon open
→ Profile preview
→ Ghosted chat
```

The transition should feel:

```txt
emotionally continuous
```

NOT:

```txt
page navigation
```

---

# HOTMESS RADIO integrations

Radio should reinforce transitions.

Examples:

- district audio bleed;
- city takeover ambience;
- sunrise transition soundscapes;
- local event pulse audio.

Radio acts as:

```txt
the emotional glue of spatial transition
```

---

# Monetisation boundaries

Allowed:

- sponsored district transitions;
- venue reveal sequences;
- event-linked environmental effects.

Forbidden:

- forced ad interruptions;
- manipulative motion systems;
- addictive transition loops.

Transitions must NEVER become:

```txt
attention-harvesting animation traps
```

---

# Suggested Supabase tables

```txt
camera_transition_profiles
beacon_transition_states
district_transition_layers
environmental_transition_states
transition_audio_profiles
reduced_motion_preferences
```

Related existing tables:

```txt
beacons
presence_states
district_heat_events
weather_snapshots
city_energy_snapshots
```

---

# Suggested implementation targets

```txt
src/lib/transition/CameraChoreographyEngine.ts
src/lib/transition/GlobeToMapboxBridge.ts
src/lib/transition/BeaconRevealSystem.ts
src/lib/transition/ClusterDissolutionEngine.ts
src/lib/transition/TransitionAudioController.ts
src/lib/transition/ReducedMotionTransitionMode.ts
src/lib/transition/EnvironmentalContinuityEngine.ts
src/lib/transition/AdaptivePerformanceTransitionScaler.ts
src/components/transition/PlanetaryOrbitView.tsx
src/components/transition/DistrictLockView.tsx
src/components/transition/LocalRevealLayer.tsx
src/components/transition/TransitionAtmosphereLayer.tsx
```

---

# Rendering philosophy

Transitions should feel:

- seductive;
- cinematic;
- emotionally spatial;
- soft;
- nocturnal.

Avoid:

- mechanical zooming;
- abrupt renderer swaps;
- hard UI transitions.

The system should feel:

```txt
like descending into living nightlife energy from orbit
```

---

# Acceptance criteria

The system succeeds when:

- globe navigation feels emotionally immersive;
- city transitions feel spatially coherent;
- local detail resolves smoothly;
- Mapbox handoffs remain seamless;
- beacon clutter reduces naturally during zoom;
- environmental continuity persists across transitions;
- reduced motion users remain comfortable;
- audio deepens immersion without overwhelming;
- the globe never becomes blurry during zoom;
- HOTMESS Globe feels like drifting into queer nightlife gravity rather than operating a mapping application.
