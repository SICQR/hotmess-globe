# Globe Transport And Safe Route Overlays

Purpose: define how HOTMESS Globe visualises transport movement, late-night routing, accessibility-aware travel, crowd flow, safe return systems, and realtime mobility overlays.

This document governs:

- transport overlays;
- safe route systems;
- nightlife mobility;
- accessibility-aware navigation;
- queue spillover awareness;
- district congestion;
- late-night transit;
- emergency routing;
- trusted return systems.

The system exists to:

- help people move safely;
- reduce nightlife friction;
- improve realtime navigation;
- support vulnerable users;
- improve district readability.

NOT to:

- track individuals;
- expose movement histories;
- create surveillance maps;
- optimise for addictive engagement.

---

# Core philosophy

Transport systems should feel:

```txt
calm, readable, atmospheric, trustworthy
```

NOT:

```txt
military logistics software
```

Movement overlays should:

- reduce stress;
- reduce confusion;
- support confidence;
- improve safety.

---

# Canonical transport hierarchy

```txt
Region
→ City
→ District
→ Transport Layer
→ Route Layer
→ Arrival Layer
```

Each layer should:

- aggregate intelligently;
- preserve readability;
- avoid overwhelming the globe.

---

# Transport overlay types

Supported overlays:

| Overlay | Purpose |
|---|---|
| Metro | late-night rail |
| Bus | night routes |
| Ferry | waterfront movement |
| Walking | safe pedestrian routes |
| Accessibility | wheelchair-safe routing |
| Calm Route | low stimulation paths |
| Ride Share | pickup coordination |
| Emergency | escalation routing |
| Venue Queue Spill | congestion awareness |
| District Flow | aggregate movement |

---

# Late-night mobility model

The transport layer should prioritise:

- late-night movement;
- venue exit coordination;
- district transitions;
- safe return journeys.

Nightlife movement differs from daytime routing.

The system should understand:

- venue closing waves;
- district migration;
- post-event congestion;
- transport shutdown windows.

---

# Safe route overlays

Safe routes should prioritise:

- verified active areas;
- lit pathways;
- open transit options;
- accessibility access;
- trusted venue corridors.

Safe routes should NEVER:

- imply guaranteed safety;
- expose vulnerable individuals.

---

# Calm route overlays

Calm routes support:

- lower stimulation;
- quieter travel;
- reduced congestion;
- sensory-sensitive users.

Calm routes may prioritise:

- quieter streets;
- less visual chaos;
- fewer crowd bottlenecks.

---

# Accessibility-aware routing

Accessibility overlays may include:

- step-free access;
- wheelchair-compatible routes;
- lift/elevator availability;
- accessible transit stations;
- accessible venue entry paths;
- reduced incline routes.

Accessibility must remain:

```txt
first-class infrastructure
```

NOT:

```txt
hidden premium tooling
```

---

# Venue queue spillover

Large queues may affect:

- nearby routing;
- transport flow;
- district congestion;
- pickup points.

Queue overlays should:

- reduce chaos;
- improve readability;
- avoid panic signalling.

Examples:

- queue overflow glow;
- slowed route indicators;
- soft congestion warnings.

---

# District flow overlays

District flow represents:

```txt
aggregate movement rhythm
```

NOT:

```txt
individual tracking
```

Flow systems may visualise:

- migration between districts;
- transit pressure;
- late-night pulses;
- arrival waves.

Flow overlays should feel:

- fluid;
- soft;
- cinematic.

---

# Emergency routing

Emergency overlays may support:

- hospital routes;
- emergency transport;
- trusted contact rendezvous;
- evacuation guidance;
- public safety rerouting.

Emergency systems must:

- remain calm;
- avoid panic amplification.

---

# Trusted return systems

Users may optionally enable:

- trusted arrival confirmation;
- safe-return check-ins;
- temporary route sharing;
- timed safety prompts.

Trusted return systems must:

- remain opt-in;
- expire automatically;
- remain privacy-safe.

---

# Travel-time atmosphere

Movement should feel:

- emotionally spatial;
- temporally alive;
- atmospheric.

Examples:

- soft transit arcs;
- fading district resonance;
- moving pulse trails.

Avoid:

- tactical trajectory rendering;
- exact movement replay.

---

# Time-aware transport rendering

Transport visibility should adapt by time.

Examples:

| Time | Behaviour |
|---|---|
| Day | reduced emphasis |
| Evening | rising transit glow |
| Night | strong district routing |
| Dawn | dispersal flows |

---

# Weather-aware routing

Weather systems may influence:

- walking route recommendations;
- ferry availability;
- congestion intensity;
- safe return suggestions.

Examples:

- heavy rain;
- flooding;
- heat waves;
- severe storms.

Weather overlays should:

- remain readable;
- avoid fear amplification.

---

# HOTMESS RADIO integrations

Radio may influence:

- travel mood;
- district transitions;
- late-night atmosphere;
- event migration.

Examples:

```txt
Afterparty route soundtrack
District cooldown mix
Sunrise return broadcast
```

---

# Privacy policy

Transport systems must NEVER expose:

- individual movement trails;
- exact travel history;
- Ghosted chats;
- Help/SOS movement;
- precise accommodation locations.

Transport overlays must remain:

- aggregate;
- temporary;
- privacy-safe.

---

# Reduced stimulation mode

Reduced stimulation mode should:

- simplify transport layers;
- reduce motion intensity;
- reduce pulse velocity;
- suppress excessive glow.

Users should still retain:

- accessibility routing;
- safe return visibility;
- emergency overlays.

---

# Moderation and safety suppression

Transport systems may suppress:

- unsafe routes;
- congestion amplification;
- harmful routing patterns;
- emergency conflict zones.

Suppression systems should:

- avoid panic visuals;
- remain operationally calm.

---

# Monetisation boundaries

Allowed:

- verified transport partnerships;
- district travel sponsorships;
- event-linked transit integrations.

Forbidden:

- selling movement histories;
- behavioural transport ads;
- surveillance routing;
- pay-to-win safety visibility.

Safety routing must NEVER become:

```txt
advertising inventory disguised as infrastructure
```

---

# Suggested Supabase tables

```txt
transport_overlays
safe_route_segments
calm_route_layers
district_flow_aggregates
venue_queue_spillover
transport_disruption_events
accessibility_route_overlays
trusted_return_sessions
weather_transport_modifiers
```

Related existing tables:

```txt
city_energy_snapshots
district_heat_events
venue_entry_states
trusted_contacts
presence_states
```

---

# Suggested implementation targets

```txt
src/lib/transport/TransportOverlayEngine.ts
src/lib/transport/SafeRouteResolver.ts
src/lib/transport/CalmRouteEngine.ts
src/lib/transport/DistrictFlowAggregator.ts
src/lib/transport/TrustedReturnService.ts
src/lib/transport/AccessibilityRouteResolver.ts
src/lib/transport/WeatherRoutingModifier.ts
src/lib/transport/TransportSafetySuppression.ts
src/components/transport/TransportOverlayLayer.tsx
src/components/transport/SafeRouteCard.tsx
src/components/transport/CalmRouteToggle.tsx
src/components/transport/TrustedReturnPanel.tsx
src/components/transport/DistrictFlowLayer.tsx
```

---

# Rendering philosophy

Transport overlays should feel:

- breathable;
- calm;
- fluid;
- emotionally readable.

Avoid:

- dense route spaghetti;
- hard tactical lines;
- flashing congestion maps.

Movement should feel:

```txt
like the city breathing
```

---

# Acceptance criteria

The system succeeds when:

- nightlife movement becomes easier and safer;
- districts remain readable during congestion;
- safe return journeys feel supported;
- accessibility-aware routing remains visible;
- travellers navigate unfamiliar cities confidently;
- movement overlays avoid surveillance patterns;
- transport rendering remains cinematic rather than tactical;
- trusted contact systems improve user safety;
- transport layers reduce chaos without overwhelming the globe;
- HOTMESS Globe feels like a living nightlife mobility layer rather than a movement tracking platform.
