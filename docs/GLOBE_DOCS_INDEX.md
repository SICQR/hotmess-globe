# GLOBE Docs Index

A map of the 50 `GLOBE_*.md` design docs (added 2026-05-22/23), grouped by area, each with a one-line purpose and its build status from `docs/GLOBE_REALITY_AUDIT_2026_05_23.md`.

This is the **what-exists index**. `GLOBE_DOC_TRAIN.md` is the reading-order; this is the status map. Full per-doc evidence is in the reality audit (§1.5); sequenced build plan is `docs/SPRINT_PLAN_2026_05_23.md`.

**Status legend**
- `live·partial` — code exists but is incomplete
- `MISSING (S/M/L)` — described system not in code yet (the build menu); effort mirrors build-plan §2.3
- `restate → path` — documents existing architecture; canonical source is the linked code/schema
- `differs` — code exists but takes a different approach than the doc
- `contradicts` — conflicts with what's already deployed/canonical

**Tally:** 33 live·partial · 9 MISSING · 4 restate · 1 differs · 1 contradicts.

---

## Rendering & visual system
| Doc | Purpose | Status |
|---|---|---|
| `GLOBE_RENDER_PIPELINE_SPEC` | data → normalized signal → privacy/safety policy → render | live·partial |
| `GLOBE_VISUAL_LANGUAGE_TOKENS` | visual hierarchy, tokens, glow policy | live·partial |
| `GLOBE_SIGNAL_VISUAL_SYSTEM` | visual+interaction language for every signal (pins/nodes/arcs/rings/heat) | live·partial |
| `GLOBE_BEACON_VISUAL_SYSTEM` | beacon archetypes, category visuals, selection states | live·partial |
| `GLOBE_BEACON_RENDERING_AND_PARTICLE_BEHAVIOUR` | particle language, scale/altitude/zoom behaviour | live·partial |
| `GLOBE_DENSITY_CLUSTERING_SYSTEM` | heat vs constellation vs cluster vs stack vs pin | live·partial |
| `GLOBE_CAMERA_CHOREOGRAPHY` | camera movement, zoom bands, focus, reduced-motion, globe↔mapbox handoff | live·partial |
| `GLOBE_ACCESSIBILITY_REDUCED_MOTION` | reduced motion, low-stimulation, sober/cognitive a11y | live·partial |
| `GLOBE_WEATHER_TIME_AND_ENVIRONMENTAL_RENDERING` | weather, day/night, environmental mood | **MISSING (M)** |
| `GLOBE_AUDIO_REACTIVITY_AND_SOUNDSPACE_SYSTEM` | spatial audio, district ambience, beacon sound | **MISSING (M)** |
| `GLOBE_EMOTIONAL_RENDERING_AND_NIGHTLIFE_PSYCHOLOGY` | emotional pacing / sensory atmosphere philosophy | **MISSING (S–M)** |

## Map / local detail (the blurry-zoom cluster)
| Doc | Purpose | Status |
|---|---|---|
| `GLOBE_MAPBOX_LOCAL_MODE` | globe → real local street-map handoff (the real blur fix) | **MISSING (L)** |
| `GLOBE_MAPBOX_LAYER_STACK` | local-mode layer order, privacy, perf contract | **MISSING (M)** |
| `GLOBE_GLOBE_TO_LOCAL_TRANSITION_ANIMATION_SYSTEM` | planetary → district → street transition | **MISSING (M)** |

## Beacons (creation / lifecycle / economy / trust)
| Doc | Purpose | Status |
|---|---|---|
| `GLOBE_BEACON_TAXONOMY` | real beacon types (event/chill/ticket/preloved/NA-AA/care/radio/market/social) | live·partial |
| `GLOBE_BEACON_CREATION_SYSTEM` | creation architecture, lifecycle, publication pipeline | live·partial |
| `GLOBE_BEACON_LIFECYCLE_ECONOMY` | create/activate/surface/expire/moderate; anti-spam economy | live·partial |
| `GLOBE_BEACON_MONETISATION_AND_BOOST_POLICY` | boosts / paid visibility | **differs** — doc's Discovery/District/Momentum ≠ live Glow/Bump/Blast/Incognito/ExtraBeacon/HighlightedMsg |
| `GLOBE_BEACON_REPUTATION_AND_SPAM_CONTROL` | reputation, trust-weighting, abuse throttle | **MISSING (L)** |

## Realtime & city energy
| Doc | Purpose | Status |
|---|---|---|
| `GLOBE_REALTIME_ARCHITECTURE` | how realtime enters the globe safely (no storms/GPS leakage) | live·partial |
| `GLOBE_REALTIME_SIGNAL_ENGINE` | turning realtime activity into meaningful signal | live·partial |
| `GLOBE_DISTRICT_HEAT_AND_CITY_ENERGY_MODEL` | realtime city energy, district heat, movement pulses | live·partial |

## Social / presence / discovery / interaction
| Doc | Purpose | Status |
|---|---|---|
| `GLOBE_SOCIAL_GRAPH_AND_PRESENCE` | people-as-signal, proximity, visibility, blocks | live·partial |
| `GLOBE_SEARCH_DISCOVERY_AND_FEEDS` | discovery, search, contextual rails, feeds | live·partial |
| `GLOBE_FEED_RANKING_AND_CURATION_POLICY` | ranking, decay, suppression, safety weighting | live·partial |
| `GLOBE_INTERACTION_PATTERNS` | gestures, navigation, state transitions, overlays | live·partial |
| `GLOBE_VIEW_INTERACTION_MATRIX` | visual modes/data layers/interactions (grounded in code) + P0 blurry-zoom note | live·partial |
| `GLOBE_COMPONENT_CONTRACTS` | architectural boundaries for the renderers | restate → `src/components/globe/` (EnhancedGlobe3D.jsx, UnifiedGlobe.tsx), `src/pages/Globe.jsx` |
| `GLOBE_ONBOARDING_AND_IDENTITY_SYSTEM` | onboarding, identity, visibility/consent setup | live·partial |

## Privacy / safety / trust / comms
| Doc | Purpose | Status |
|---|---|---|
| `GLOBE_PRIVACY_LOCATION_POLICY` | who sees what, how precisely, for how long | live·partial |
| `GLOBE_HELP_SOS_PRIVACY_MODEL` | Help/SOS + exact lat/lng privacy (safety-critical) | live·partial |
| `GLOBE_TRUSTED_CONTACTS_AND_SAFETY_ESCALATION` | trusted contacts, SOS escalation, welfare | live·partial |
| `GLOBE_TRUST_SAFETY_MODERATION` | moderation, abuse prevention, enforcement pipeline | live·partial |
| `GLOBE_AFTERCARE_AND_RECOVERY_INFRASTRUCTURE` | aftercare, recovery, decompression | live·partial |
| `GLOBE_GHOSTED_CHAT_SYSTEM` | beacon-to-chat, ghosting, consent escalation | live·partial |
| `GLOBE_NOTIFICATION_AND_ALERT_POLICY` | push / in-app / realtime nudge policy | live·partial |
| `GLOBE_MEDIA_CAPTURE_AND_CONSENT_SYSTEM` | capture, photo/video/livestream, consent | live·partial |

## City / district / culture / travel
| Doc | Purpose | Status |
|---|---|---|
| `GLOBE_CITY_TO_CITY_TRAVEL_AND_CROSS_DISTRICT_PRESENCE` | travel-aware presence, roaming | live·partial |
| `GLOBE_DISTRICT_EDITORIAL_AND_CURATION_SYSTEM` | district editorial / human curation CMS | **MISSING (M)** |
| `GLOBE_EVENT_ARCHIVE_AND_CULTURAL_MEMORY_SYSTEM` | nightlife memory / event archive | **MISSING (M)** |
| `GLOBE_TRANSPORT_AND_SAFE_ROUTE_OVERLAYS` | transport, safe routes, mobility overlays | live·partial |
| `GLOBE_AI_ASSISTED_DISCOVERY_AND_CITY_GUIDANCE` | AI nightlife guidance / care-aware recs | live·partial |

## Events / venues / partners / commerce
| Doc | Purpose | Status |
|---|---|---|
| `GLOBE_EVENT_AND_VENUE_PARTNER_SYSTEM` | venues, collectives, operators | live·partial |
| `GLOBE_TICKETING_AND_GUESTLIST_SYSTEM` | ticketing, guestlist, anti-scalping | live·partial |
| `GLOBE_PARTNER_SUBSCRIPTION_TIERS` | partner subscription tiers | **contradicts** — clashes with live `membership_tiers` + `venue_beacon_tiers`; → see `docs/PARTNER_TIERS_RECONCILIATION.md` (pending, founding thread) |
| `GLOBE_VENDOR_DASHBOARD_AND_ANALYTICS` | vendor/partner dashboard + analytics | live·partial |
| `GLOBE_VENDOR_TEAM_PERMISSIONS_AND_MODERATION` | team RBAC, moderation delegation | live·partial |

## Data / meta / planning
| Doc | Purpose | Status |
|---|---|---|
| `GLOBE_SUPABASE_SCHEMA_MAP` | globe-relevant Supabase tables/views/RPCs/buckets | restate → live Supabase schema (`beacons`, `globe_events`, `right_now_posts` view, `venues`, `safety_*`) |
| `GLOBE_DOC_TRAIN` | reading order, ownership, build sequence (the index) | restate → (meta) `docs/GLOBE_*.md` reading order |
| `GLOBE_IMPLEMENTATION_PLAN` | executable build sequence | restate → `src/pages/Globe.jsx` + `src/components/globe/` |

---

## Build menu (the 9 MISSING, highest-leverage first)
1. `GLOBE_MAPBOX_LOCAL_MODE` **(L)** — fixes the blurry deep-zoom (foundational)
2. `GLOBE_MAPBOX_LAYER_STACK` **(M)** — depends on #1
3. `GLOBE_GLOBE_TO_LOCAL_TRANSITION_ANIMATION_SYSTEM` **(M)** — depends on #1/#2
4. `GLOBE_BEACON_REPUTATION_AND_SPAM_CONTROL` **(L)** — trust foundation for open beacon creation
5. `GLOBE_DISTRICT_EDITORIAL_AND_CURATION_SYSTEM` **(M)**
6. `GLOBE_EVENT_ARCHIVE_AND_CULTURAL_MEMORY_SYSTEM` **(M)**
7. `GLOBE_WEATHER_TIME_AND_ENVIRONMENTAL_RENDERING` **(M)**
8. `GLOBE_AUDIO_REACTIVITY_AND_SOUNDSPACE_SYSTEM` **(M)**
9. `GLOBE_EMOTIONAL_RENDERING_AND_NIGHTLIFE_PSYCHOLOGY` **(S–M)**

Items 5–9 are leaf/independent — ship in any order. Items 1–3 are a dependency chain. See `docs/SPRINT_PLAN_2026_05_23.md` for sequencing.
