# Globe District Heat And City Energy Model

Purpose: define how HOTMESS Globe models realtime city energy, district activity, nightlife density, movement pulses, venue clusters, and cultural momentum.

This document governs:

- district aggregation;
- heat generation;
- city energy rendering;
- density interpretation;
- event influence;
- beacon clustering;
- nightlife pulse systems;
- accessibility-aware city rendering;
- safety-aware energy suppression.

The model exists to:

- help users understand city activity;
- reduce map chaos;
- support discovery;
- improve realtime readability;
- support cultural exploration.

NOT to:

- track people individually;
- expose movement trails;
- gamify cities;
- create addictive engagement loops;
- encourage crowd panic.

---

# Core philosophy

The city should feel:

```txt
alive, breathable, cinematic, emotionally readable
```

NOT:

```txt
an airport radar screen
```

District heat represents:

- collective energy;
- cultural momentum;
- nightlife activity;
- realtime city rhythm.

It does NOT represent:

- exact crowd counts;
- exact location precision;
- popularity competitions;
- social dominance.

---

# Canonical energy hierarchy

```txt
City
→ District
→ Zone
→ Cluster
→ Beacon
→ Interaction
```

Each layer should:

- aggregate upward;
- smooth noise;
- reduce visual overload.

---

# City layer

The city layer is visible from:

```txt
space scale
```

Displays:

- soft atmospheric glow;
- district warmth;
- cultural pulse;
- major live activity;
- transport rhythm;
- city-wide event energy.

Must avoid:

- beacon overload;
- tiny unreadable markers;
- flashing noise.

---

# District layer

Districts are the canonical aggregation surface.

Examples:

- Soho;
- Kreuzberg;
- Bushwick;
- Shinjuku;
- Silom.

Districts aggregate:

- beacon density;
- event activity;
- venue activity;
- queue pressure;
- transport movement;
- save momentum;
- route taps.

Districts should feel:

```txt
warm and breathing
```

NOT:

```txt
blinking tactical warfare maps
```

---

# Zone layer

Zones subdivide districts.

Purpose:

- local readability;
- nearby discovery;
- congestion reduction;
- walkable understanding.

Zone rendering supports:

- cluster resolution;
- local event stacks;
- accessibility overlays;
- queue routing.

---

# Cluster layer

Clusters represent:

```txt
shared local energy
```

NOT:

```txt
combined popularity scores
```

Clusters form dynamically from:

- beacon proximity;
- interaction velocity;
- district density;
- event overlap;
- venue activity.

Clusters should:

- merge softly;
- expand gently;
- dissolve naturally.

---

# Beacon contribution model

Beacon types contribute differently.

| Beacon Type | Heat Influence |
|---|---|
| Event | high |
| Venue | steady |
| Ticket | temporary |
| Chill | soft/local |
| Creator | moderate |
| Radio | distributed/citywide |
| Popup | sharp/temporary |
| Preloved | local pulse |
| Care | soft calming |
| Help | hidden/private |
| SOS | hidden/private |

Help and SOS must NEVER:

- increase public district heat;
- expose presence.

---

# Heat generation inputs

District heat MAY include:

- active beacon count;
- save velocity;
- route taps;
- verified event activity;
- ticket check-ins;
- queue conditions;
- venue momentum;
- district movement trends;
- transport flow;
- realtime attendance estimates.

Heat MUST NOT include:

- individual identity;
- exact GPS trails;
- Ghosted chat activity;
- recovery participation;
- private user movement.

---

# Heat decay model

Heat should decay:

- naturally;
- gradually;
- cinematically.

Decay factors:

- beacon expiry;
- event ending;
- reduced interaction velocity;
- venue closure;
- overnight cycles.

Decay must avoid:

- instant dead collapse;
- chaotic flicker;
- visual instability.

---

# Day/night energy rhythms

Cities should breathe differently by time.

Examples:

| Time | Energy Character |
|---|---|
| Morning | low pulse |
| Afternoon | distributed warmth |
| Evening | rising clusters |
| Night | dense district intensity |
| Late night | concentrated flow |
| Dawn | cooling trails |

Rhythms should feel:

- atmospheric;
- emotional;
- cinematic.

---

# Cultural pulse system

Major moments may create:

- city-wide resonance;
- district synchronisation;
- event ripples;
- transport pulses.

Examples:

- Pride;
- festivals;
- city-wide events;
- major radio takeovers.

Pulse systems must remain:

- soft;
- elegant;
- non-overwhelming.

---

# Density governance

District heat must obey:

- marker budgets;
- cluster budgets;
- GPU budgets;
- accessibility constraints.

High density should produce:

- stronger district atmosphere;
- smarter clustering;
- calmer rendering.

NOT:

- giant pin forests;
- unreadable chaos.

---

# Zoom-dependent rendering

## Orbit scale

Show:

- city glow;
- major pulses;
- atmospheric arcs.

Hide:

- individual beacons.

---

## City scale

Show:

- district heat;
- major event clusters;
- transport flow.

---

## District scale

Show:

- local stacks;
- venue pulses;
- beacon clusters;
- queue pressure.

---

## Street scale

Show:

- individual beacons;
- venue states;
- accessibility routing;
- live entry information.

---

# Transport and movement layer

Movement should feel:

```txt
flowing
```

NOT:

```txt
surveillance tracking
```

Movement models may aggregate:

- route demand;
- transport pressure;
- pedestrian flow;
- venue arrival patterns.

Movement systems must NEVER expose:

- individual travel history;
- exact user trails.

---

# Accessibility-aware heat

Reduced stimulation mode should:

- soften animation;
- reduce pulsing;
- reduce atmospheric intensity;
- reduce motion speed;
- simplify glow systems.

Accessibility overlays may show:

- calm districts;
- quieter routes;
- low stimulation venues;
- accessible transport paths.

---

# Safety-aware suppression

District energy may suppress when:

- severe moderation event;
- emergency response;
- dangerous congestion;
- transport failure;
- public safety issue.

Suppression should:

- reduce amplification;
- reduce recommendations;
- avoid panic visuals.

---

# Monetisation boundaries

Boosts may:

- slightly influence discovery;
- contribute lightly to district visibility;
- improve local surfacing.

Boosts may NEVER:

- dominate district heat;
- override cluster budgets;
- create fake city energy;
- create giant visual structures.

Money must not:

```txt
buy the skyline
```

---

# HOTMESS RADIO influence

Radio systems may contribute:

- cultural resonance;
- city-wide mood;
- event synchronisation;
- nightlife momentum.

Examples:

- live takeovers;
- city broadcasts;
- coordinated events;
- after-hours flows.

Radio influence should feel:

```txt
atmospheric
```

NOT:

```txt
commercial advertising overlays
```

---

# Privacy policy

The energy model must NEVER expose:

- exact attendee counts;
- individual GPS trails;
- home/work inference;
- Ghosted interactions;
- Help/SOS activity;
- recovery participation.

All city energy is:

- aggregate;
- probabilistic;
- privacy-safe.

---

# Suggested Supabase tables

```txt
city_energy_snapshots
district_energy_scores
district_cluster_states
district_transport_flows
district_queue_pressure
district_heat_events
zone_activity_aggregates
city_pulse_events
```

Related existing tables:

```txt
beacons
beacon_analytics
event_beacons
venue_entry_states
queue_estimates
transport_overlays
```

---

# Suggested implementation targets

```txt
src/lib/city/CityEnergyEngine.ts
src/lib/city/DistrictHeatEngine.ts
src/lib/city/ClusterAggregationEngine.ts
src/lib/city/ZoneDensityResolver.ts
src/lib/city/HeatDecayEngine.ts
src/lib/city/CulturalPulseEngine.ts
src/lib/city/TransportFlowAggregator.ts
src/lib/city/AccessibilityHeatReducer.ts
src/lib/city/SafetySuppressionEngine.ts
src/components/globe/DistrictHeatLayer.tsx
src/components/globe/CityAtmosphereLayer.tsx
src/components/globe/ClusterPulseLayer.tsx
src/components/globe/TransportFlowLayer.tsx
```

---

# Rendering requirements

District rendering should:

- stay soft;
- avoid hard tactical edges;
- preserve map readability;
- preserve geographic clarity.

Animation should:

- ease smoothly;
- avoid rapid flicker;
- remain GPU-safe.

---

# Acceptance criteria

The model succeeds when:

- cities feel emotionally alive;
- dense nightlife remains readable;
- districts communicate atmosphere clearly;
- users understand where energy exists without surveillance;
- accessibility modes remain calm;
- boosts do not dominate the skyline;
- realtime movement feels cinematic rather than invasive;
- transport and venue coordination improve naturally;
- safety systems suppress chaos without panic;
- HOTMESS Globe feels like a living cultural atlas rather than a tactical tracking system.
