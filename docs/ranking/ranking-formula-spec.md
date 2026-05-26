# Ranking Formula Spec

## Purpose

Define the concrete ranking logic that decides what is seen, in what order, and under what conditions.

This document sits below:
- Ranking Constitution
- Signal Economics Spec
- Trust System Spec
- Developer Rules Checklist

It translates governance into scoring behavior.

---

# Core Principle

Ranking is decision support, not content maximization.

The job of ranking is to help the user understand:
- what is most relevant
- what is most current
- what is most credible
- what is most useful right now

Ranking should optimize for:
- freshness
- trust
- proximity
- local momentum
- readability
- safety

Ranking should not optimize for:
- raw engagement alone
- endless activity
- paid dominance
- spam tolerance
- attention extraction

---

# Scoring Philosophy

The score should be bounded, interpretable, and resistant to abuse.

Use a composite model where:
- trust and freshness dominate
- proximity matters strongly in local views
- momentum matters more than static density
- engagement refines but does not dominate
- payment can only bend outcomes within strict bounds

Hard rule:
No single factor should overwhelm all others except safety.

---

# Ranking Inputs

1. Freshness
2. Trust
3. Proximity
4. Momentum
5. Density
6. Engagement Quality
7. Safety Risk
8. Payment or Boost

---

# Suggested Score Structure

Use a bounded score from 0 to 100.

Suggested ranges:
- Freshness: 0–30
- Trust: 0–25
- Proximity: 0–15
- Momentum: 0–15
- Density Fit: 0–10
- Engagement Quality: 0–10
- Boost: 0–10

Apply penalties for:
- staleness
- disputes
- spam
- safety risk
- duplication
- saturation

Boosts must always be capped before final ranking.

---

# Freshness Logic

Freshness decays continuously.

Lifecycle:
- just created → strongest freshness
- recent → strong freshness
- aging → moderate freshness
- stale → weak freshness
- expired → removed from active ranking

Freshness matters more in street and venue views than in broad discovery.

---

# Trust Logic

Trust acts as:
- multiplier
- stabilizer
- decay modifier

High trust:
- preserves rank longer
- reduces decay penalties
- increases confidence
- improves amplification efficiency slightly

Low trust:
- decays faster
- loses visibility earlier
- requires corroboration
- suppresses sooner

Trust must never make stale content appear current.

---

# Proximity Logic

Street view:
- nearest items dominate

Venue view:
- surrounding operational truth dominates

District view:
- trusted local clusters dominate

City view:
- district relevance dominates

Exploration mode allows broader relevance.
Routing mode prioritizes closeness.
Planning mode allows future verified relevance.

---

# Momentum Logic

Momentum measures direction, not just size.

Strong momentum means:
- increasing arrivals
- increasing queue activity
- increasing corroboration
- increasing local movement

Momentum outranks dead density.

A growing queue outranks a frozen crowd.

Momentum decays quickly if activity stops.

---

# Density Logic

Density helps identify meaningful clusters.

Density should:
- improve discoverability
- strengthen local leaders
- improve browse usefulness

Density should not:
- overwhelm readability
- duplicate noise
- override trust
- override freshness

High density requires:
- cluster collapse
- duplicate suppression
- representative leaders

---

# Engagement Quality Logic

Engagement measures usefulness.

Useful engagement:
- confirmations
- saves
- route starts
- accurate check-ins
- constructive corroboration

Low-value engagement:
- repetitive taps
- spam loops
- artificial amplification

Engagement refines ranking.
It does not drive ranking.

---

# Safety Logic

Safety outranks everything.

Unsafe content may be:
- suppressed
- hidden
- frozen
- reviewed
- removed

Safety can override:
- trust
- momentum
- freshness
- payment
- engagement

---

# Payment Logic

Payment may:
- slightly improve visibility
- temporarily improve placement
- increase surface priority in crowded contexts

Payment may never:
- override trust
- override safety
- resurrect stale content
- guarantee permanent top placement

Boosts must be:
- capped
- time-limited
- saturation-aware
- district-aware
- trust-sensitive

---

# State-Based Ranking

States:
- Active
- Decaying
- Stale
- Expired
- Hidden

State matters more than boost.

State transitions:
- Created → Active
- Active → Decaying
- Decaying → Stale
- Stale → Expired
- Any state → Hidden when moderation or trust intervention occurs

---

# Final Rank Shape

Final Rank Score =
- Freshness
- Trust
- Proximity
- Momentum
- Density Fit
- Engagement Quality
- Boost
- Penalties

Penalties include:
- stale penalty
- dispute penalty
- spam penalty
- saturation penalty
- repetition penalty
- trust penalty
- safety penalty

Penalties must be able to suppress visibility entirely.

---

# Visibility Thresholds

Not every item should surface.

Visibility depends on:
- zoom level
- density
- trust
- context
- readability
- safety

Dense views require higher thresholds.

Low-quality clutter should collapse early.

---

# Cluster Ranking

At high density:
- rank clusters before individuals
- surface strongest trusted representatives
- suppress duplicates
- preserve readability

Cluster quality considers:
- local activity
- momentum
- trust mix
- saturation
- readability

---

# District Dominance Protection

No single source should dominate indefinitely.

Apply:
- source caps
- category balancing
- boost saturation limits
- repetition penalties
- district throttles

Dominance triggers:
- reduced marginal gain
- shorter visibility windows
- stronger saturation penalties

---

# Quiet-State Ranking

Low activity is valid.

When density is low:
- verified venues surface more easily
- upcoming events remain legible
- honest emptiness remains visible
- urgency must not be fabricated

Truth matters more during quiet states.

---

# Immutable Invariants

- Safety outranks everything
- Truth outranks trust
- Trust outranks payment
- Freshness outranks static popularity
- Momentum outranks dead volume
- Readability outranks completeness
- Quiet states are valid
- Boosts are bounded
- Stale data must not masquerade as live data
