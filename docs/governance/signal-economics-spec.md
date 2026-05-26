# HOTMESS Signal Economics Specification

## Purpose

This document defines:
- visibility economics
- signal weighting
- saturation handling
- amplification controls
- freshness prioritization
- trust-weighted discovery

The objective is NOT maximum engagement.

The objective is:
- trustworthy realtime awareness
- readable local density
- bounded amplification
- abuse resistance
- socially useful discovery

---

# Core Ranking Priorities

Order is immutable.

1. Safety
2. Truth
3. Trust
4. Freshness
5. Readability
6. Relevance
7. Monetization

No downstream system may violate this hierarchy.

---

# Signal Types

## Primary Signals

Signals generated directly by user behavior.

Examples:
- RSVP
- check-in
- attendance confirmation
- save
- share
- route open
- profile open
- verified media upload
- local engagement
- dwell time

Primary signals decay over time.

---

## Secondary Signals

Derived from aggregate interaction patterns.

Examples:
- neighborhood momentum
- velocity increase
- repeat visitation
- trusted creator overlap
- venue reliability
- density clustering

Secondary signals are weighted lower than primary signals.

---

## Artificial Signals

Signals generated through:
- payments
- boosts
- sponsorships
- partnerships
- featured placements

Artificial signals may amplify.

Artificial signals may NEVER override:
- safety
- trust
- moderation actions
- saturation caps
- freshness requirements

---

# Freshness Model

Realtime systems degrade when stale content dominates.

Therefore:

- freshness outranks static popularity
- momentum outranks dead volume
- active density outranks historical reputation

## Freshness Windows

### Live Window
0–2 hours

Highest sensitivity.

Realtime velocity heavily weighted.

### Active Window
2–12 hours

Moderate momentum weighting.

### Discovery Window
12–72 hours

Reduced velocity weighting.

### Archive Window
72+ hours

Searchable but minimally ranked.

---

# Saturation Controls

Visibility concentration damages trust.

The system must prevent:
- feed domination
- repetitive venue flooding
- sponsor monopolization
- creator overexposure
- geographic monoculture

## Hard Caps

Per-feed caps:
- max repeated venue frequency
- max sponsor density
- max creator density
- max boosted visibility share

## Soft Caps

Progressive score decay:
- repeated impressions
- repeated district exposure
- repeated creator exposure

---

# Momentum Model

Momentum is:
- acceleration
NOT:
- total size

A smaller rapidly emerging event may outrank:
- older large events
- stale venues
- boosted listings

Momentum indicators:
- check-in velocity
- RSVP acceleration
- route openings
- repeat trusted engagement
- local clustering

---

# Trust Weighting

Signals are trust-weighted.

High-trust actors produce stronger signals.

Trust modifiers include:
- account age
- moderation history
- behavioral consistency
- verified attendance
- abuse reports
- spam indicators
- trusted network overlap

Trust is:
- contextual
- reversible
- decaying

No permanent trust states exist.

---

# Boost System

Boosts are bounded amplification.

Boosts may:
- increase discovery probability
- increase temporary ranking weight
- increase geographic reach

Boosts may NOT:
- bypass moderation
- override trust suppression
- exceed saturation caps
- override freshness decay
- guarantee top placement

## Mandatory Disclosure

All boosted content must be visibly labeled.

---

# Quiet State Philosophy

Quiet states are valid.

The system must NEVER:
- invent density
- manufacture urgency
- fabricate activity
- fake attendance
- simulate momentum

If a district is quiet:
- show quietness honestly

Trust requires truthful emptiness.

---

# Readability Constraints

Ranking quality includes readability.

Feeds should feel:
- scannable
- breathable
- understandable
- locally coherent

The system should penalize:
- visual spam
- duplicate formatting
- repetitive messaging
- excessive sponsor density
- noisy clustering

---

# Monetization Constraints

Monetization is subordinate.

Revenue systems may NOT:
- bypass moderation
- override safety
- override trust
- override saturation rules
- manipulate urgency
- suppress organic discovery unfairly

Sponsored visibility is bounded.

---

# Failure States

Critical system failures include:
- stale content dominance
- sponsor monopolization
- engagement farming
- visibility loops
- density hallucination
- fake urgency
- trust collapse
- unreadable feeds

These conditions require:
- automatic degradation
- moderation intervention
- operational alerts

---

# Strategic Doctrine

HOTMESS is not a content-maximization platform.

It is a:
- realtime coordination layer
- trust-weighted discovery system
- readable density engine
- governed nightlife infrastructure
