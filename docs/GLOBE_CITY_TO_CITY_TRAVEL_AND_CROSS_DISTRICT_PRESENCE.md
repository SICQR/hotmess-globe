# Globe City To City Travel And Cross District Presence

Purpose: define how HOTMESS Globe supports movement between cities, cross-district discovery, temporary presence, nightlife travel, roaming identity, and cultural continuity across regions.

This document governs:

- travel-aware presence;
- cross-city discovery;
- roaming beacon behaviour;
- temporary district visibility;
- traveller safety systems;
- cultural continuity;
- city transition rendering;
- transport-linked nightlife coordination.

The system exists to:

- help people navigate unfamiliar nightlife safely;
- support queer travel culture;
- improve local discovery;
- preserve privacy during movement;
- create continuity between cities.

NOT to:

- track user movement permanently;
- expose travel history;
- create surveillance trails;
- encourage unsafe location exposure.

---

# Core philosophy

Travel presence should feel:

```txt
fluid, cinematic, temporary, culturally connected
```

NOT:

```txt
constant global location broadcasting
```

Movement through cities should feel:

- intentional;
- ambient;
- emotionally readable;
- privacy-safe.

---

# Canonical movement hierarchy

```txt
Region
→ City
→ District
→ Zone
→ Temporary Presence
→ Interaction
```

Each layer should:

- reduce precision;
- protect identity;
- preserve discoverability.

---

# City presence states

Canonical presence states:

```txt
Local
Visiting
Travelling
Passing Through
Temporarily Active
Offline
Ghosted
```

Presence should:

- remain user-controlled;
- expire naturally;
- support privacy overrides.

---

# Local versus visitor identity

The system may distinguish:

- locals;
- visitors;
- temporary creators;
- touring artists;
- travelling vendors.

This distinction should support:

- discovery;
- cultural connection;
- local recommendations.

It must NEVER:

- rank people socially;
- create outsider penalties.

---

# Cross-city discovery

Users may explore:

- upcoming trips;
- destination districts;
- cultural hotspots;
- venue ecosystems;
- radio-active cities;
- Pride events;
- popup activity.

Discovery should prioritise:

- trust;
- safety;
- cultural relevance;
- accessibility.

---

# Temporary district presence

Users may appear temporarily within:

- districts;
- venue zones;
- event clusters.

Temporary presence should:

- decay automatically;
- reduce stale visibility;
- avoid permanent travel trails.

Examples:

```txt
Tonight in Kreuzberg
Weekend in Soho
Pride week in Madrid
```

---

# Travel mode

Travel mode may:

- soften visibility;
- reduce exact location precision;
- suppress home-city inference;
- enable temporary discovery.

Travel mode should support:

- queer safety;
- discretion;
- temporary anonymity.

---

# Traveller safety systems

Travellers may access:

- trusted routes;
- verified venues;
- safe districts;
- accessibility overlays;
- emergency resources;
- trusted contacts.

Safety systems should prioritise:

- calm guidance;
- low cognitive load;
- cultural trust.

---

# Trusted contact travel awareness

Users may optionally share:

- temporary city presence;
- arrival state;
- safety check-ins;
- SOS escalation.

Shared information must:

- remain consent-based;
- expire automatically;
- remain encrypted where appropriate.

---

# Roaming beacon behaviour

Beacon visibility should adapt while travelling.

Examples:

| Beacon Type | Travel Behaviour |
|---|---|
| Chill | local-only |
| Event | destination-aware |
| Creator | roaming-capable |
| Radio | city-spanning |
| Popup | temporary/local |
| Care | softly visible |
| Help | private |
| SOS | trusted-only |

Help and SOS must NEVER:

- expose public travel presence.

---

# Touring creators and artists

Creators may:

- announce city runs;
- sync tours;
- connect broadcasts;
- activate temporary districts;
- link venue chains.

Tour systems should feel:

```txt
cultural movement
```

NOT:

```txt
influencer growth hacking
```

---

# City transition rendering

Movement between cities should feel:

- atmospheric;
- cinematic;
- spatially coherent.

Examples:

- glowing travel arcs;
- soft transit trails;
- fading district resonance.

Rendering must avoid:

- precise path replay;
- exact travel reconstruction.

---

# District handoff model

When users move districts:

```txt
Previous Presence
→ Fade
→ Transitional State
→ New District Pulse
```

This should feel:

- organic;
- emotionally smooth;
- privacy-safe.

---

# Time-limited presence

Temporary presence should expire:

- automatically;
- gracefully;
- predictably.

Examples:

| Presence Type | Typical Lifetime |
|---|---|
| Chill | 1–4 hrs |
| Event | event duration |
| Visiting | 24–72 hrs |
| Popup | configurable |
| Radio Activation | broadcast duration |

---

# Cross-city social continuity

Users may maintain:

- recurring cities;
- favourite districts;
- venue histories;
- creator follows;
- radio affinities.

Continuity should:

- feel warm;
- preserve identity fluidity;
- avoid behavioural profiling.

---

# Accessibility-aware travel

Travel systems should support:

- calm routes;
- wheelchair-accessible transit;
- low stimulation districts;
- sober-safe venues;
- multilingual overlays.

Accessibility information must:

- remain visible during travel discovery;
- avoid becoming premium-only.

---

# Transport integrations

Transport overlays may include:

- late-night transit;
- congestion alerts;
- route disruptions;
- district access timing;
- ferry/train overlays;
- safe return routes.

Transport systems should:

- reduce nightlife friction;
- support safer movement.

---

# Privacy policy

The system must NEVER expose:

- exact travel history;
- home/work inference;
- continuous movement replay;
- Ghosted chats;
- Help/SOS participation;
- precise temporary accommodation.

Travel systems must remain:

- aggregate-aware;
- privacy-safe;
- consent-driven.

---

# Moderation and trust

Travelling accounts may trigger:

- temporary trust review;
- fraud checks;
- spam monitoring;
- beacon throttling.

This should reduce:

- scam tourism;
- fraudulent ticketing;
- unsafe popup abuse.

---

# Monetisation boundaries

Allowed:

- destination discovery boosts;
- city guide partnerships;
- travel-aware creator campaigns;
- verified tourism integrations.

Forbidden:

- selling travel histories;
- behavioural movement ads;
- hidden location monetisation;
- surveillance analytics.

Travel culture must NEVER become:

```txt
movement data extraction infrastructure
```

---

# HOTMESS RADIO integrations

Radio may support:

- city takeovers;
- travel soundtracks;
- destination discovery;
- district mood transitions;
- cross-city broadcasts.

Examples:

```txt
London → Berlin weekend takeover
Bangkok Pride route soundtrack
Late-night Tokyo district pulse
```

---

# Suggested Supabase tables

```txt
travel_presence_states
city_transition_events
cross_district_presence
traveller_safety_preferences
travel_visibility_rules
roaming_creator_routes
city_affinity_profiles
district_visit_history
travel_trust_reviews
```

Related existing tables:

```txt
beacons
presence_states
trusted_contacts
city_energy_snapshots
district_heat_events
transport_overlays
```

---

# Suggested implementation targets

```txt
src/lib/travel/TravelPresenceEngine.ts
src/lib/travel/CrossDistrictResolver.ts
src/lib/travel/TemporaryPresenceManager.ts
src/lib/travel/TravelSafetyService.ts
src/lib/travel/CityTransitionRenderer.ts
src/lib/travel/RoamingBeaconController.ts
src/lib/travel/TravelPrivacyController.ts
src/lib/travel/TouringCreatorEngine.ts
src/components/travel/TravelModeToggle.tsx
src/components/travel/CityTransitionArc.tsx
src/components/travel/DestinationDiscoveryPanel.tsx
src/components/travel/TravellerSafetyCard.tsx
```

---

# Rendering philosophy

Travel rendering should feel:

- soft;
- flowing;
- cinematic;
- emotionally spatial.

Avoid:

- military-style trajectory lines;
- tactical tracking visuals;
- invasive movement replay.

---

# Acceptance criteria

The system succeeds when:

- queer travellers discover cities safely;
- nightlife movement feels culturally connected;
- temporary presence remains privacy-safe;
- district transitions feel emotionally smooth;
- transport overlays reduce friction;
- accessibility-aware travel remains visible;
- creators and artists move fluidly between cities;
- roaming visibility expires naturally;
- travel systems avoid surveillance patterns;
- HOTMESS Globe feels like a living network of queer cultural movement rather than a global tracking system.
