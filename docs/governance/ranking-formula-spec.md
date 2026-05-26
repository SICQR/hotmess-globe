# HOTMESS Ranking Formula Specification

## Purpose

Define the concrete ranking logic that decides:
- what is seen
- in what order
- under what conditions

This document translates governance into scoring behavior.

---

# Core Principle

Ranking is decision support.

NOT:
- attention extraction
- engagement maximization
- infinite scrolling optimization

Ranking exists to help users understand:
- what matters
- what is current
- what is trustworthy
- what is useful locally

---

# Primary Ranking Objectives

Ranking should optimize for:
- freshness
- trust
- proximity
- momentum
- readability
- safety

Ranking should NOT optimize for:
- raw engagement alone
- sponsor dominance
- density inflation
- artificial urgency
- spam persistence

---

# Ranking Inputs

Every rankable object must include:

1. Freshness
2. Trust
3. Proximity
4. Momentum
5. Density fit
6. Engagement quality
7. Safety risk
8. Boost state
9. Visibility state
10. Saturation context

---

# Base Score Shape

All scores are bounded.

Recommended v1 score range:
0–100

## Suggested Weighting

- Freshness: 0–30
- Trust: 0–25
- Proximity: 0–15
- Momentum: 0–15
- Density fit: 0–10
- Engagement quality: 0–10
- Boost: 0–10

Then subtract penalties.

---

# Penalties

Penalties may include:
- stale penalty
- spam penalty
- dispute penalty
- repetition penalty
- saturation penalty
- safety penalty
- trust penalty

Penalties must be able to suppress visibility entirely.

Even boosted items may fall below visibility threshold.

---

# Freshness Logic

Freshness decays continuously.

Freshness matters most in:
- street view
- venue view
- realtime browse contexts

Freshness must NEVER be bypassed.

Stale content must not appear live.

---

# Trust Logic

Trust acts as:
- multiplier
- stabilizer
- confidence modifier

High trust may:
- slow decay
- reduce dispute uncertainty
- improve visibility persistence

Low trust should:
- decay faster
- require corroboration
- trigger suppression earlier

Trust never overrides truth.

---

# Proximity Logic

Proximity is context-sensitive.

## Street View
Closest useful signals dominate.

## Venue View
Immediate operational truth dominates.

## District View
Cluster usefulness dominates.

## City View
District relevance dominates.

Routing mode:
- proximity stronger

Exploration mode:
- broader relevance allowed

---

# Momentum Logic

Momentum measures change velocity.

NOT total size.

Signals include:
- arrival acceleration
- queue growth
- update frequency
- cluster acceleration
- trusted confirmations

Momentum decays rapidly if activity stops.

---

# Density Logic

Density helps discover active clusters.

Density must NOT:
- overwhelm readability
- create spam walls
- duplicate weak signals
- suppress local diversity

High-density states trigger:
- cluster collapse
- duplicate suppression
- representative leader selection

---

# Engagement Quality Logic

Useful engagement includes:
- confirmations
- saves
- routes
- verified check-ins
- constructive replies
- corroboration

Low-quality engagement includes:
- repetitive taps
- loops
- spam reactions
- artificial farming

Engagement refines ranking.

It does NOT dominate ranking.

---

# Safety Logic

Safety outranks everything.

Unsafe items may be:
- hidden
- frozen
- suppressed
- throttled
- removed

Safety overrides:
- trust
- boosts
- engagement
- freshness
- momentum

---

# Boost Logic

Boosts are bounded amplification.

Boosts may:
- improve temporary placement
- improve local visibility
- improve discovery probability

Boosts may NOT:
- override trust
- override safety
- resurrect stale content
- dominate districts indefinitely

Boosts must:
- decay rapidly
- taper under saturation
- remain labeled
- obey visibility caps

---

# Visibility States

Every object exists in a state.

## Active
Full ranking participation.

## Decaying
Reduced ranking strength.

## Stale
Heavily reduced visibility.

## Expired
Removed from active ranking.

## Hidden
Suppressed from normal rendering.

State matters more than boosts.

---

# Cluster Ranking

At high density:
- rank clusters before individuals

Cluster representatives should be:
- trusted
- fresh
- locally useful
- readable

Cluster logic considers:
- local momentum
- trust mix
- saturation
- readability

---

# District Protection Rules

No source may dominate indefinitely.

Apply:
- source concentration caps
- repetition penalties
- boost saturation limits
- district throttles

Marginal gains reduce as dominance increases.

---

# Quiet State Handling

Quiet states are truthful outcomes.

The system must NEVER:
- simulate density
- fake momentum
- invent urgency

In quiet districts:
- trusted venues surface more easily
- upcoming events remain visible
- emptiness remains honest

---

# Visibility Thresholds

Not every scored item should render.

Thresholds depend on:
- zoom level
- density
- trust
- readability
- context
- available space

Higher density means higher thresholds.

---

# Suppression Logic

Suppress or demote:
- stale items
- disputed claims
- repetitive spam
- unsafe signals
- unverified critical claims
- over-boosted duplication

Suppression should happen before readability collapse.

---

# Immutable Ranking Invariants

These rules cannot be violated:

- Safety outranks everything
- Truth outranks trust
- Trust outranks payment
- Freshness outranks static popularity
- Momentum outranks dead volume
- Readability outranks completeness
- Quiet states are valid
- Boosts are bounded
- Stale data must not masquerade as live truth

---

# Implementation Rules

Every ranking system must:
- be explainable internally
- support penalties and caps
- expose observability hooks
- support moderation overrides
- remain bounded
- remain state-aware

No ranking path may bypass:
- safety
- trust
- freshness validation

---

# Launch Defaults

v1 defaults should be conservative.

Prioritize:
- trust
- freshness
- readability
- fast suppression
- aggressive cluster collapse

Do NOT optimize primarily for growth.

Optimize for:
- clarity
- integrity
- realtime truth
