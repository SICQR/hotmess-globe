# HOTMESS GLOBE — REFINED MASTER PRODUCT BRIEF

> **Operational Product + Systems Specification**
> For Claude / Engineering / Product / Design
> Repository: `SICQR/hotmess-globe`
> Source: Phil Gizzie, 2026-05-26 (canonical). All future product decisions
> trace back to this document.

---

## 1. PRODUCT DEFINITION

HOTMESS Globe is a **realtime queer signal platform**. It combines:

- nightlife discovery
- venue infrastructure
- realtime user intent
- event systems
- care routing
- atmospheric mapping
- premium visibility economics

The globe is **NOT decorative UI**. The globe itself is **the operating system**.

---

## 2. POSITIONING

**NOT**: dating app · swipe app · hookup grid · nightlife directory · map skin over chat
**YES**: realtime nightlife infrastructure · live signal economy · venue + user orchestration platform · queer movement intelligence layer

---

## 3. CORE STRATEGIC DIFFERENTIATOR

Competitors optimize: profiles, messaging, proximity, hookup mechanics.
HOTMESS optimizes: atmosphere, movement, live districts, venue intelligence, temporary intent signaling, nightlife routing.

> **Core idea: "Claim your beacon, not your listing."**

---

## 4. PRIMARY USER LOOP

Users open HOTMESS to answer:

- what's happening right now?
- where's active?
- where's busy?
- where's my crowd?
- where should we go next?
- where's safe?
- where's open late?
- where's the energy moving?

**NOT:** "did someone message me?" Messaging is secondary infrastructure. **Realtime map state is primary retention.**

---

## 5. PRODUCT ARCHITECTURE

HOTMESS is a **multi-owner signal ecosystem**. Four signal owners:

| Owner     | Role                                        |
| --------- | ------------------------------------------- |
| Users     | temporary intent + movement                 |
| Venues    | persistent place identity                   |
| Promoters | temporal event promotion                    |
| HOTMESS   | editorial / radio / care                    |

---

## 6. CORE ENTITY MODEL

> **IMPORTANT:** Do NOT model everything as "beacons". A beacon is only the rendered output layer.

### USER — human account
Fields: `id`, `handle`, `tier`, `profile`, `trust_score`, `visibility_mode`, `verification_state`, `last_active`, `home_city`, `preferences`.

### SIGNAL — realtime temporary object
Examples: LOOKING · GOING OUT · TICKET · CREW UP · GHOST · AFTERHOURS.
Fields: `id`, `signal_type`, `owner_id`, `owner_type`, `geolocation`, `visibility_radius`, `priority_score`, `created_at`, `expires_at`, `boosted_state`, `moderation_state`, `linked_venue_id`, `linked_event_id`.
Signals are **temporary, realtime, expiring, priority-ranked**. NOT persistent profiles.

### VENUE — persistent location entity
Examples: club · gym · sauna · bar · clinic · café.
Fields: `id`, `category`, `geolocation`, `vendor_tier`, `beacon_style`, `occupancy_state`, `opening_hours`, `verification_state`, `analytics_enabled`.

### EVENT — scheduled temporal object
Fields: `id`, `venue_id`, `start_time`, `end_time`, `event_type`, `occupancy_state`, `visibility_tier`, `ticketing_data`, `live_state`.

### DISTRICT — geographic aggregation zone
Examples: Soho · Vauxhall · Kreuzberg.
Fields: `id`, `city`, `heat_score`, `atmosphere_state`, `active_events`, `active_signals`, `sponsor_state`.
Districts are **strategic aggregation layers**.

### ATMOSPHERE LAYER — computed environmental system
Generated from: signal density · movement velocity · venue occupancy · event escalation · time of night.
Outputs: social · packed · calm · afterhours · cruisy · dance-heavy · luxury. Should become partially algorithmic later.

---

## 7. SIGNAL SYSTEM

Signals are **temporary live intent objects**. NOT static markers.

### USER SIGNAL TYPES

| Signal         | Purpose                          |
| -------------- | -------------------------------- |
| LOOKING        | open to interaction              |
| GOING OUT      | moving toward venue/district     |
| CREW UP        | social grouping                  |
| TICKET         | buying/selling tickets           |
| RADIO ON       | listening/broadcasting           |
| SOFT LANDING   | aftercare/decompression          |
| GHOST          | anonymous presence               |
| TRAVEL         | remote temporary presence        |

### SIGNAL RULES

Every signal requires: activation · expiry · cooldown · moderation rules · visibility priority · zoom behavior.

### EXAMPLE: LOOKING SIGNAL

Lifecycle: activates → high visibility pulse → gradual fade → expires → cooldown period.
Default expiry: 60 minutes. Premium: up to 4 hours.

---

## 8. VENUE SYSTEM

Venues are **persistent premium infrastructure**. Major monetization layer.

| Type   | Visual Language     |
| ------ | ------------------- |
| CLUB   | cinematic pulse     |
| BAR    | warm social glow    |
| GYM    | metallic athletic   |
| SAUNA  | fogged heat         |
| CLINIC | calm medical        |
| CARE   | soft halo           |
| CAFÉ   | muted tobacco       |
| SHOP   | premium gold        |

Each venue type must feel distinct · be identifiable instantly · reinforce category recognition. → Implemented as the Beacon Identity System (`src/components/globe/beaconGlyphs.ts`, `beaconIconFactory.ts`).

---

## 9. EVENT SYSTEM

Events are **temporal escalation layers**. Examples: LIVE TONIGHT · AFTERHOURS · GUESTLIST OPEN · TICKET DROP · RADIO TAKEOVER.
Require: lifecycle states · queue states · escalation logic · expiry · sponsor capability.

---

## 10. SIGNAL PRIORITY ENGINE

**CRITICAL SYSTEM.** Without this, the globe becomes unusable.

Every rendered object requires: priority score · visibility weighting · zoom threshold · decluttering rules · suppression logic.

### PRIORITY HIERARCHY

| Object              | Priority      |
| ------------------- | ------------- |
| District sponsor    | highest       |
| Major live event    | high          |
| Premium venue       | medium-high   |
| Standard venue      | medium        |
| Premium user signal | medium        |
| Free user signal    | lower         |

---

## 11. ZOOM-BASED RENDERING

| View         | Show                                                 | Hide  |
| ------------ | ---------------------------------------------------- | ----- |
| Planet View  | districts · major heat · sponsors                    | users |
| City View    | venues · events · district atmosphere                | —     |
| Street View  | user signals · occupancy · venue activity            | —     |
| Venue View   | micro-interactions · queue states · detailed signals | —     |

---

## 12. RENDERING DIRECTION

Current risk: too bright · too much bloom · overlapping elements · insufficient hierarchy · noisy neon aesthetic.

### TARGET VISUAL FEEL

**NOT:** cyberpunk chaos · arcade UI · hyper-neon overload.
**YES:** restrained cinematic luxury · premium aviation feel · noir atmosphere · physically believable lighting · sparse confidence.

### RENDER RULES

- **Background:** charcoal-black · blue-black gradients · subtle atmosphere haze.
- **Glow:** indicates importance · premium status · activity · sponsorship. NOT decoration.
- **Animation:** smooth · heavy · premium · deliberate. Avoid jitter · pulse spam · cheap UI movement.

---

## 13. DECLUTTERING SYSTEM (MANDATORY)

Need: adaptive clustering · dynamic suppression · zoom-aware labels · overlap prevention · density management.
**Readability is mission critical.**

---

## 14. FILTER SYSTEM

Competitors monetize demographics. HOTMESS monetizes **nightlife intelligence**.

### FREE FILTERS
nearby · open now · venue type · online now.

### PREMIUM FILTERS
atmosphere · crowd energy · queue state · afterhours · social intensity · darkroom · dancefloor · wellness nearby · tourist ratio · district heat.

---

## 15. REALTIME SYSTEMS

Realtime is **the retention engine**. Without realtime the globe becomes static UI.

| Layer    | Realtime data                                          |
| -------- | ------------------------------------------------------ |
| User     | active signals · movement · temporary presence         |
| Venue    | occupancy · queue state · event escalation             |
| District | heat score · movement density · nightlife migration    |

---

## 16. MONETIZATION MODEL

### USERS

| Tier                  | Price        | Includes                                                              |
| --------------------- | ------------ | --------------------------------------------------------------------- |
| FREE                  | —            | basic map · 1 active signal · basic filters                           |
| HIGH SIGNAL           | £12.99       | advanced filters · multiple signals · travel · stealth · boost        |
| BLACK SIGNAL          | £29.99       | priority rendering · hidden layers · VIP districts · concierge · VIP  |

### USER ADD-ONS

| Add-On       | Purpose                  |
| ------------ | ------------------------ |
| Signal Boost | temporary prominence     |
| Travel Pass  | remote visibility        |
| Event Pass   | VIP access               |

### VENDOR TIERS

| Tier                    | Price        | Includes                                                       |
| ----------------------- | ------------ | -------------------------------------------------------------- |
| BASIC BEACON            | £19/mo       | listing · static beacon                                        |
| LIVE BEACON             | £79/mo       | animated rendering · event tools · analytics                   |
| SIGNAL PARTNER          | £249/mo      | boosted placement · editorial integration · radio integrations |
| DISTRICT SPONSOR        | £499–999/mo  | district dominance · premium overlays · homepage visibility    |

---

## 17. MODERATION + SAFETY

Required: reporting · trust scoring · verification · cooldown systems · venue verification · signal moderation queue · abuse prevention.

### LOCATION SAFETY

**DO NOT:** expose exact user coordinates · allow permanent tracking · reveal precise movement.
**Need:** fuzzy positioning · expiry · stealth · consent systems.

---

## 18. WHAT HOTMESS MUST NOT BECOME

DO NOT:

- become another messenger
- become swipe-first
- become torso-grid-first
- become feed-heavy
- overload the globe with noise
- prioritize profiles over signals

---

## 19. PHASED BUILD ORDER

### PHASE 1 — RETENTION CORE
1. signal engine
2. realtime globe
3. render hierarchy
4. venue layer
5. event states
6. decluttering

### PHASE 2 — MONETIZATION
7. subscriptions · 8. boosts · 9. premium filters · 10. vendor CMS · 11. analytics

### PHASE 3 — DIFFERENTIATION
12. radio sync · 13. aftercare routing · 14. nightlife forecasting · 15. concierge systems

### PHASE 4 — DEFENSIBILITY
16. signal graph · 17. district intelligence · 18. movement analytics · 19. predictive nightlife systems

---

## 20. CORE STRATEGIC TRUTH

HOTMESS Globe is **a realtime signal economy layered over queer nightlife infrastructure.**

The moat is **NOT**: chat · profiles · hookups.

The moat **IS**:
- live signal systems
- venue infrastructure
- realtime movement
- atmospheric intelligence
- premium rendering
- nightlife analytics
- cultural authority

**The map is not decoration. The map IS the product.**
