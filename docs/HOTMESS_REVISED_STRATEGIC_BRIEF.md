# HOTMESS GLOBE — REVISED STRATEGIC BRIEF (v2)

> **Working canonical, 2026-05-26.** Consolidates the [Product Brief](./HOTMESS_PRODUCT_BRIEF.md) (north star), the [Strategic Thesis](./HOTMESS_STRATEGIC_THESIS.md) (v1 go-to-market), and the [Founder Critique](./HOTMESS_FOUNDER_CRITIQUE.md) (refinements) into a single 17-section operating spec.
> All earlier docs remain in-repo as journey-of-thinking history. **This v2 is the working reference.**

---

## 1. PRODUCT THESIS

HOTMESS is a **realtime queer nightlife intelligence platform**.

It helps people answer one question: **What's happening right now, and where should I go?**

It is **not** a dating app, not a generic directory, and not a social feed. It is **nightlife decision infrastructure**.

---

## 2. WEDGE MARKET

### First city
- One dense queer nightlife city.
- **Start district-first, not city-wide.**
- Example launch patterns: Soho only · Vauxhall only · Kreuzberg only · Bushwick only.

### First core audience
- Queer nightlife regulars.
- Promoters and venue operators.
- People who already go out weekly and make decisions fast.

### First repeat use case
- Nightly or weekly planning.
- "Where is the energy tonight?"
- "Which room feels right right now?"

### First high-frequency behaviour
- Open map → check live signal → move to venue → post or react to signal → return later the same night.

---

## 3. CORE LOOP

### Primary retention loop
- User checks live map → sees movement, venues, events → posts a temporary signal → map becomes more useful → more people return → density increases → product feels alive.

### Value created for other users
- Each signal improves decision quality for everyone else.
- Venue and event updates increase trust.
- More participation improves perceived accuracy.

### What gets better as more people use it
- Density · freshness · routing quality · venue relevance · event urgency.

### What brings users back
- Nightly relevance · FOMO · movement intelligence · social proof of where energy is building.

---

## 4. COLD-START PLAN

### How the map looks alive at low density
- Seed only a few districts.
- Use tightly bounded launch zones.
- Show curated, verified, or staff-seeded activity in the first wave.

### How activity is seeded
- Launch with 5–10 flagship venues.
- Launch with 2–3 active promoters.
- Preload scheduled events and verified venue data.
- Use founder-operated seeding if needed.

### How quiet zones are handled
- Quiet zones are shown as quiet.
- Silence is framed as **low activity, not failure**.
- Empty space is part of the map language.

### How to avoid a dead feel
- Never show too much of the city at once.
- Keep the view scoped to active districts.
- Use density thresholds before expanding visibility.
- **Don't let user signals overrun venue signals.**

---

## 5. BUSINESS MODEL

### Who pays first
- **Venues and promoters first.**
- Users later, through premium utility.
- Sponsors later, after legitimacy is proven.

### First paid tier
- Venues pay for visibility plus operational value.
- Promoters pay for event amplification.

### What stays free
- Core map browsing · basic live signals · minimal venue discovery · entry-level participation.

### What triggers conversion
- Better placement · more visibility · real analytics · event amplification · operational tools for venues.

---

## 6. PRICING (starting points)

| Tier            | Range            | Unlocks                                                     |
| --------------- | ---------------- | ----------------------------------------------------------- |
| User premium    | £8–£15 / month   | more filters · advanced signal controls · stealth/privacy   |
| Venue tier      | £25–£99 / month  | live beacon status · richer analytics · better placement    |
| Promoter tier   | £150–£300 / mo   | event boosts · featured visibility · live event tools       |

### How to avoid exclusion
- Keep the core map usable for free.
- Make paid value about **speed, control, and utility**.
- Avoid gating basic belonging or access.

### Where premium is defensible
- Visibility · trust · placement · analytics · operational tooling.

---

## 7. TRUST AND SAFETY

### Location precision
- Never expose exact coordinates by default.
- Use fuzzy location only.
- Use broad radii and city/district levels.

### Expiry and cooldown
- Signals expire automatically.
- Cooldowns limit repeated spam.
- High-trust users may get more flexibility.

### Abuse handling
- Reporting flow for spam, harassment, impersonation.
- Trust scores affect visibility.
- Repeated abuse leads to suppression or removal.

### Anti-stalking rule
- **No exact tracking.**
- **No permanent presence markers.**
- **No persistent user location trails.**

---

## 8. CONSENT MODEL

### Users explicitly opt into
- Showing presence · showing a signal · showing approximate location · showing venue affiliation (if applicable).

### Visible by default
- Only what is needed for the map to function.
- Fuzzy, temporary, non-identifying signals.

### What can be hidden
- Identity · exact location · profile details · presence status.

### Visibility control
- Users control whether they appear.
- Signals are temporary by default.
- Presence should decay quickly.

---

## 9. DATA FRESHNESS

### Who updates data
- Venues update their own listing data.
- Promoters update event data.
- Users contribute live signals.
- Moderators or ops verify disputes.

### Refresh cadence
- Occupancy and venue state should refresh often.
- Hours and event data should be checked regularly.
- **Stale data should visibly degrade in confidence.**

### If data cannot be verified
- Mark it as unverified · lower its ranking · avoid presenting it as current truth.

---

## 10. EMPTY-STATE BEHAVIOUR

### When there are no signals
- Show quiet districts clearly.
- Show verified venues and upcoming events.
- Offer guidance instead of emptiness.

### How silence is framed
- Quiet is not broken.
- Quiet means low current activity.
- It can still be useful for planning.

### How the product stays useful
- Venue listings · scheduled events · district-level browsing · saved places and default routes.

---

## 11. INFORMATION HIERARCHY

| View         | Show                                                                 |
| ------------ | -------------------------------------------------------------------- |
| Planet view  | broad activity · active cities · major density clusters              |
| City view    | districts · hot zones · event concentration · nightlife movement     |
| Street view  | nearby venues · local signals · immediate movement · tactical decisions |
| Venue view   | occupancy · events · status · trust indicators · operational details |

---

## 12. PRODUCT SCOPE

### In MVP
- Globe/map with district-first browsing
- Temporary signals
- Venue listings
- Event listings
- Expiry and cooldown
- Basic moderation
- Basic venue tools

### Out of scope
- Dating features · DM chat · endless feed mechanics · predictive nightlife forecasting · heavy personalisation · complex sponsor tooling.

### What waits until retention is proven
- Advanced venue operations · premium analytics depth · district sponsorships · editorial layers · smart recommendations.

### What will not be built
- **Exact tracking · permanent visibility trails · swipe-based dating mechanics · generic social network behaviour.**

---

## 13. MODERATION AND OPERATIONS

### Who reviews reports
- Small internal ops and trust team first.
- Escalation to higher review for serious abuse.

### Trust scores
- Based on signal quality · report history · venue verification · consistency over time.

### What causes suppression
- Spam · harassment · fake venues · impersonation · repeated abuse · manipulated signals.

### Escalation path
- Auto-flag → human review → temporary suppression → permanent removal if needed.

---

## 14. SUCCESS METRICS

### Core usage
- DAU · WAU · return visits per user.

### Signal health
- Signal creation rate · signal expiry rate · report rate per signal.

### Business
- Venue participation rate · promoter participation rate · conversion to paid · event click-through · venue click-through.

### Trust and safety
- Abuse incident rate · spam suppression rate · false report rate.

---

## 15. LAUNCH STRATEGY

### Launch partners
- 5–10 flagship venues.
- 2–3 prominent promoters.
- Possibly one cultural or community anchor partner.

### Launch mode
- Invite-only or tightly controlled public beta.
- **District-first, not full-city.**

### How to create legitimacy
- Verified venues · real events · clear city presence · strong design language · staff-seeded density where needed.

---

## 16. CATEGORY CLARITY

### What the product is
- A realtime queer nightlife map that helps people decide where to go now.

### What it is not
- A dating app · a generic directory · a social feed · a chat app.

### Strategic difference
- Dating apps optimise for matching.
- Directory apps optimise for listings.
- Feed apps optimise for content consumption.
- **HOTMESS optimises for nightlife movement and decision-making.**

### Emotional promise
- Less uncertainty · more confidence · better nights out · a stronger sense of where the energy is.

---

## 17. IMMEDIATE FOUNDER DECISIONS

We should lock these next:

- [ ] First launch district
- [ ] First venue list
- [ ] First promoter list
- [ ] Exact signal types
- [ ] Cooldown rules
- [ ] Ranking hierarchy
- [ ] Pricing starting point
- [ ] Moderation thresholds

---

## NEXT DOCUMENT — RECOMMENDATION

Per the [Founder Critique](./HOTMESS_FOUNDER_CRITIQUE.md) and the [Doctrine Notes](./HOTMESS_DOCTRINE_NOTES.md), the next working document should be **the v1 Product Ruleset** — exact defaults for signals, cooldowns, ranking, decluttering, launch geography. That is the doc that turns this brief into something a build team can actually execute.

Alternative orderings (Risk Register + Mitigations · Launch Ops Playbook · Infrastructure Constraints Memo) are valuable but lower urgency than the Ruleset.

---

## CANONICAL DOC MAP

- [`HOTMESS_PRODUCT_BRIEF.md`](./HOTMESS_PRODUCT_BRIEF.md) — north star (what HOTMESS IS).
- **`HOTMESS_REVISED_STRATEGIC_BRIEF.md`** *(this file)* — working operational spec.
- [`HOTMESS_STRATEGIC_THESIS.md`](./HOTMESS_STRATEGIC_THESIS.md) — v1 thesis (kept as history).
- [`HOTMESS_FOUNDER_CRITIQUE.md`](./HOTMESS_FOUNDER_CRITIQUE.md) — refinements applied into v2 (kept as journey-of-thinking).
- [`HOTMESS_DOCTRINE_NOTES.md`](./HOTMESS_DOCTRINE_NOTES.md) — doctrine read + build-order recommendation.
- [`governance/sacred-invariants.md`](./governance/sacred-invariants.md) — ethical/operational spine.
- [`governance/`](./governance/) — Tier-1/2/3 enforcement specs (PR #411 in flight).
