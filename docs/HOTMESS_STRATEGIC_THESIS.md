# HOTMESS GLOBE — STRATEGIC THESIS

> **Operational backbone — wedge market, growth loops, monetization, MVP, launch, metrics.**
> Source: Phil Gizzie, 2026-05-26 (canonical).
> Companion to [`HOTMESS_PRODUCT_BRIEF.md`](./HOTMESS_PRODUCT_BRIEF.md) — the Brief is the **what we are**; this Thesis is the **how we go to market**.

---

## STRATEGIC THESIS

HOTMESS Globe is a **realtime queer nightlife intelligence platform.**

It surfaces live user intent, venue status, event escalation and atmospheric cues on a single interactive globe.

The product's value comes from the **signal economy** — the more signals, venues and events participate, the more useful the map becomes.

It is **not** a dating app, swipe feed or generic directory; it is the infrastructure that decides **where people go, when they go, and what the room feels like.**

---

## WEDGE MARKET & LAUNCH CITY

- **Target city:** a dense queer-nightlife hub (e.g., Berlin, London, New York) with multiple active districts and a strong promoter community.
- **First audience:** regular queer nightlife participants (age 18–35) who plan outings nightly and are comfortable using mobile location-based tools.
- **Primary use case:** "What's happening right now? Where should I go?" — a repeatable, must-open question each evening.
- **Launch partners:** 5–10 flagship venues (clubs, bars, saunas) and 2–3 prominent promoters willing to seed early signals and events.

---

## CORE BUSINESS LOOPS

### 1. USER ENGAGEMENT LOOP
1. User opens the globe to see current hotspots.
2. User posts a temporary signal (LOOKING, GOING OUT, CREW UP, etc.).
3. Signal appears on the map, increasing map richness for all users.
4. Richer map drives more frequent user visits.
5. More visits generate more signals → **loop accelerates.**

### 2. VENUE REVENUE LOOP
1. Venues subscribe to visibility tiers (BASIC BEACON, LIVE BEACON).
2. Paid venues provide accurate opening-hours, occupancy, and event data.
3. High-quality venue data improves user trust and map usefulness.
4. Trust drives higher user traffic, raising the value of venue placements.
5. Increased value encourages more venues to pay → **loop sustains.**

### 3. EVENT AMPLIFICATION LOOP
1. Promoters purchase event amplification (LIVE BEACON, SIGNAL PARTNER).
2. Amplified events create spikes in user movement and signal density.
3. Spikes make the globe feel urgent and alive, prompting more user opens.
4. Higher user activity makes event slots more valuable, attracting more promoter spend.

### 4. DISTRICT SPONSORSHIP LOOP *(later phase)*
1. District sponsors pay for overlay branding and priority rendering.
2. Sponsored districts attract additional venue and promoter interest.
3. Increased ecosystem activity raises sponsor ROI, fueling further sponsorship.

---

## MONETIZATION MODEL

### Users

| Tier               | Price          | Includes                                                                                                |
| ------------------ | -------------- | ------------------------------------------------------------------------------------------------------- |
| FREE               | —              | basic map · 1 active signal · core filters (nearby, open now, venue type)                               |
| HIGH SIGNAL        | £12.99 / month | multiple concurrent signals · advanced filters (atmosphere, crowd energy) · travel mode · stealth visibility · signal boost credits |
| BLACK SIGNAL       | £29.99 / month | priority rendering · hidden layers · VIP district access · concierge support · premium event passes      |

### Venue Subscriptions

| Tier         | Price       | Includes                                                                                |
| ------------ | ----------- | --------------------------------------------------------------------------------------- |
| BASIC BEACON | £19 / month | static listing · fuzzy location · basic analytics                                       |
| LIVE BEACON  | £79 / month | animated rendering · real-time occupancy · queue state · event tools · detailed analytics |

### Promoter / Event Packages

| Tier            | Price        | Includes                                                                  |
| --------------- | ------------ | ------------------------------------------------------------------------- |
| SIGNAL PARTNER  | £249 / month | boosted placement · editorial integration · radio sync · post-event analytics |

### District Sponsorship

| Tier               | Price          | Includes                                                              |
| ------------------ | -------------- | --------------------------------------------------------------------- |
| DISTRICT SPONSOR   | £499–£999 / mo | district-wide branding · premium overlays · homepage visibility · data insights |

---

## MOAT & DEFENSIBILITY

- **Data density:** realtime, expiring signals create a constantly refreshed map that competitors cannot replicate without a live user base.
- **Signal engine:** priority scoring, zoom-aware decluttering and suppression keep the globe readable at any scale.
- **Venue infrastructure:** integrated occupancy, queue and analytics tools lock venues into the platform.
- **Cultural authority:** editorial / care layer curates safe spaces and community resources, building trust and brand loyalty.
- **Network effects:** each additional user, venue or event improves the signal economy for all participants.

---

## MVP SCOPE (Phase 1 — Retention Core)

- **Signal engine:** creation, expiry, cooldown, moderation, priority scoring.
- **Realtime globe rendering** with zoom-based layers (planet, city, street).
- **Core entity models:** USER, SIGNAL, VENUE, EVENT, DISTRICT.
- **Basic decluttering and clustering** to maintain readability.
- **Venue layer:** static listings with opening hours and fuzzy location.
- **Event states:** scheduled events with live/expired flags.
- **Free user flow:** map view, create one signal, basic filters.

**Out of scope for MVP:** premium visual styles · radio sync · after-care routing · predictive nightlife forecasting · district sponsorship UI · advanced analytics dashboards.

---

## NON-NEGOTIABLE TRUST & SAFETY RULES

- **No exact user coordinates exposed** — location shown as fuzzy radius (≤ 200 m).
- **All signals auto-expire** (default 60 min) and enter a cooldown period before re-use.
- **Mandatory reporting flow** for abuse, spam or harassment.
- **Trust score per user** influences signal priority and visibility.
- **Venue verification required for LIVE BEACON tier;** unverified venues limited to BASIC BEACON.
- **Cooldown limits on signal boosts** to prevent spam.

These rules are restated and bound in [`docs/governance/sacred-invariants.md`](./doctrine/sacred-invariants.md).

---

## LAUNCH PLAN

1. Secure 5–10 flagship venues and 2–3 promoters in the chosen city.
2. Seed the globe with pre-created signals (staffed "look-around" bots) for launch day to avoid empty-map perception.
3. Run an invite-only beta for the core user wedge (target **2,000 nightly active users**).
4. Collect early usage data → iterate on priority engine and decluttering.
5. Open free tier to the public after **2 weeks**, introduce HIGH SIGNAL tier at **week 4**.
6. Roll out LIVE BEACON venue subscriptions at **month 2**, followed by event amplification packages at **month 3**.

---

## SUCCESS METRICS

- **DAU / WAU** — Daily and Weekly Active Users.
- **Signals/user/day** — average signals created per user per day.
- **Return-visit rate** — % of users opening the globe > 3 times per week.
- **Venue subscription conversion rate.**
- **Event amplification revenue per month.**
- **Trust-score incident rate** — reports per 10 k signals.
- **Map density KPI** — average signals per km² in core districts.

---

## RELATIONSHIP TO OTHER DOCS

- **`docs/HOTMESS_PRODUCT_BRIEF.md`** — north star (entity model, signal types, venue types, phased build order, "map IS the product").
- **`docs/governance/sacred-invariants.md`** — the ethical/operational spine; the rules that cannot be relaxed under monetisation pressure.
- **`docs/governance/`** — tier-1/2/3 specs (ranking constitution, signal economics, trust system, developer rules, metrics, observability) — the enforcement layer.

The Brief defines *what HOTMESS is*. The Thesis defines *how it goes to market*. The Sacred Invariants define *what it must never become*. The governance specs define *how the rules are enforced operationally*. All four layers must remain coherent.
