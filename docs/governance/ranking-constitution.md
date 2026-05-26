# Ranking Constitution

> **Canonical, 2026-05-26 (Phil).** Tier-1 immutable governance for HOTMESS.

## Purpose

HOTMESS ranks signals, venues, events, and movement so users can quickly decide where to go right now.

The ranking system must:
- maximize decision confidence
- preserve map readability
- reward freshness and trust
- prevent spam and clutter
- protect safety and privacy
- keep monetization subordinate to ecosystem integrity

## What ranking is for

Ranking is not for maximizing total content. It is for surfacing the most useful current state of nightlife.

The system should answer:
- what is active
- what is trustworthy
- what is nearby
- what is worth moving toward
- what should be hidden or de-emphasized

## Core ranking principles

1. **Freshness first** — recent activity matters more than old activity; expired signals decay out of visibility quickly.
2. **Trust matters** — verified, consistent, low-abuse sources rank higher than unknown or noisy sources.
3. **Density must be usable** — high activity reads as energetic, not chaotic; compress clutter when density rises.
4. **Proximity is tactical** — closer items matter more in decision mode; distance weight depends on zoom and context.
5. **Relevance beats volume** — a smaller set of high-quality signals outranks many low-quality ones.
6. **Monetization cannot break trust** — paid placement may improve visibility but must never fully override trust, safety, or readability.
7. **Safety outranks engagement** — anything increasing harassment, stalking, impersonation, or abuse is suppressed even if it performs well.
8. **Quiet is valid** — low activity is not failure; quiet districts render honestly.

## Core ranking objects

1. **Signals** — temporary user/venue/promoter posts indicating activity, mood, presence, energy, movement.
2. **Venues** — physical places with live status, event state, trust signals.
3. **Events** — scheduled or live happenings that can attract movement.
4. **Districts** — aggregated activity zones for broader browsing and density perception.

## Primary inputs

1. **Freshness** — recency, expiry proximity, currency.
2. **Trust** — source reliability, verification, report history, consistency.
3. **Density** — nearby active signals, cluster strength, momentum, attention concentration.
4. **Proximity** — distance, district relevance, zoom-level relevance.
5. **Engagement quality** — clicks, saves, route actions, dwell time, return rate.
6. **Venue status** — open, busy, queueing, afterhours, closing, private, verified.
7. **Event strength** — start-time proximity, attendance momentum, promoter trust, local relevance.
8. **Payment** — boosts, promoted visibility, venue subscriptions, event amplification.

## Trust model

Trust is a multiplier on visibility, not a badge alone. See [trust-system-spec.md](./trust-system-spec.md) for the full model.

Trust is built from:
- verified venue/promoter status
- historical accuracy
- low report rate
- consistent updates
- moderation history
- user credibility over time

Trust affects:
- rank position
- signal persistence
- amplification ceiling
- spam tolerance
- district-domination eligibility

Low trust causes:
- lower placement
- shorter persistence
- reduced amplification
- more aggressive filtering
- possible shadow de-emphasis before full removal

## Freshness rules

- Temporary signals decay automatically.
- Old signals visibly weaken over time.
- Expired signals must not remain as if current.
- Stale venue data is marked stale or unverified.
- Freshness matters more in close-range views than city-wide.

Suggested decay tiers: **very recent → recent → aging → stale → expired (removed from active ranking).**

## Density rules

**Low density:** show more context, let verified venues/events fill the gap, do not overpromise heat.

**High density:** collapse clutter, group similar signals, prioritize cluster leaders, reduce low-value repetition.

Density should improve usefulness, not just busy-ness.

## Proximity rules

- Nearby items rank higher in street/venue views.
- District-level proximity matters in city view.
- Global prominence may matter in planet view but never overrides local usefulness.

Weighted by intent:
- **exploratory mode** — broader area matters more
- **decision mode** — closer area matters more
- **venue view** — immediate surroundings matter most

## Payment rules

Allowed:
- boost placement within a fair range
- increase prominence in eligible contexts
- support event/venue amplification

**Not allowed:**
- fully override trust
- permanently dominate a district
- hide higher-trust, higher-relevance items
- make the map unreadable
- create fake urgency

Paid items still obey: freshness · safety · readability · district saturation.

## Ranking hierarchy

High-level preference order:

1. Safety-compliant items
2. Fresh, trusted, relevant items
3. Verified venue/event data
4. Nearby, high-density signals
5. Paid items within policy bounds
6. Low-trust/stale items only when needed for context

### View-specific priority

**Planet view** — active cities · major districts · verified event clusters
**City view** — districts · strong clusters · trusted venue/event layers
**Street view** — nearest active venues · immediate signals · high-confidence movement
**Venue view** — current venue state · queue · event info · trusted local signals

## Signal ranking logic

A signal **rises** if it has: recent timestamp · trusted source · nearby relevance · strong local density · meaningful engagement · low abuse history.

A signal **falls** if it has: age · low trust · repeated reports · weak engagement · irrelevant location · spam-like repetition · excessive frequency from same source.

## Venue ranking logic

**Higher:** verified · live updates · strong recent activity · reliable operational data · good engagement · low abuse.
**Lower:** stale data · unresolved reports · repeated misinformation · fake occupancy · weak/absent updates.

## Event ranking logic

**Higher:** proximity to start time · strong promoter trust · verified venue connection · rising engagement · attendance momentum.
**Lower:** bad timing · weak verification · spammy promotion · stale or inconsistent details.

## Suppression rules

Suppress or demote: stale · spammy · abusive · repetitive · misleading · unsafe · stalking-enabling · readability-overwhelming content.

Suppression triggers:
- repeated posting from same source in short windows
- unverified claims presented as current fact
- harassment or impersonation reports
- location abuse
- fake venue activity
- paid content exceeding saturation limits

## Clutter control rules

The map must remain readable at all times.

- limit visible items per zoom level
- cluster low-priority items
- collapse redundant signals
- rank by category, not raw count
- prefer the strongest representative signal from a cluster

Rendering order reflects: trust · freshness · relevance · density · monetization only within bounds.

## District dominance rules

No single source may permanently dominate a district. District caps prevent:
- sponsor monopolies
- promoter spam
- venue overexposure
- user signal flooding

District-level views maintain balance between: venues · events · user movement · paid promotion · editorial/verified context.

## User signals vs venue signals

Venue and event signals have **higher authority at city and district scale.**
User signals dominate **only in localized, immediate views.**

Reason: venues provide infrastructure truth; users provide live texture. Both matter but serve different layers. This prevents user noise from drowning out operationally valuable signals.

## Location precision rules

- Never expose exact coordinates by default.
- Use fuzzy location.
- Use broad radii where appropriate.
- Never create persistent user trails.

Exact location remains inaccessible unless explicitly justified and safe.

## Lifecycle rules

Every item has a lifecycle: **created → active → decaying → stale → expired → removed.**

No item stays visually current forever. Lifecycle state must be visible enough that users understand what is live and what is not.

## Anti-spam rules

Limit abuse through: posting cooldowns · district quotas · category quotas · boost caps · repetition penalties · trust-based rate limits.

Spam gets harder, not easier, as the system grows.

## Editorial fallback rules

When density is low or data uncertain: show verified venues · show upcoming events · show quiet zones honestly · show helpful context rather than fake heat.

**The system must never pretend there is activity when there is not.**

## Immutable invariants

These rules are never violated:
- No exact user tracking by default
- Signals always expire
- Quiet nights are valid states
- Paid visibility cannot fully override trust
- Safety outranks engagement
- Readability outranks revenue
- Stale data must not be presented as current truth
- The map must not become unreadable for monetization

See [sacred-invariants.md](./sacred-invariants.md).

## Constitutional decision hierarchy

If rules conflict, priority is:

1. Safety
2. Trust
3. Freshness
4. Readability
5. Relevance
6. Monetization

This means: if a paid item is unsafe, it loses. If a fresh signal is low-trust and harmful, it loses. If density is too high, clarity wins over volume.

## Operational questions to lock next

- exact signal duration
- cooldown lengths by tier
- how many signals per user per window
- how boosts interact with trust
- how district caps are enforced
- how far premium can bend rank
- when to hide vs dim vs collapse
- what thresholds make a district feel "alive"
- what thresholds make it feel "quiet but usable"
