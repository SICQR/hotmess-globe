# Observability and Alerting Spec

## Purpose

Observability exists to detect failure early enough to intervene.

The system must detect:
- safety failures
- truth failures
- trust manipulation
- readability collapse
- saturation overload
- monetization distortion
- launch instability

## Observability Priorities

1. Safety
2. Truth
3. Trust
4. Readability
5. Saturation
6. Launch Stability
7. Monetization Side Effects

## Alert Classes

### Info
Expected operational changes.

### Watch
Concerning directional movement.

### Warning
Likely degradation if unaddressed.

### Critical
Active damage occurring.

### Emergency
Immediate intervention required.

## Trigger Types

### Threshold Triggers
Metric exceeds defined boundary.

### Rate Triggers
Metric changes too quickly.

### Pattern Triggers
Known abuse signature detected.

### Correlation Triggers
Multiple weak indicators combine into meaningful risk.

### Policy Triggers
Hard governance rule violated.

## Core Alert Domains

### Safety
Monitor:
- unsafe visibility
- harassment spikes
- stalking-risk content
- moderation escapes

### Truth
Monitor:
- stale leakage
- contradiction spikes
- false urgency
- correction latency

### Trust
Monitor:
- trust collapse
- trust inflation
- verification reversals
- abnormal recovery patterns

### Readability
Monitor:
- cluster overload
- label collision
- clutter score
- abandonment patterns

### Saturation
Monitor:
- boost concentration
- promoter dominance
- paid surface share
- category imbalance

### Launch Stability
Monitor:
- moderation load
- district stability
- source quality mix
- synthetic-looking activity

## Routing Rules

Safety alerts:
- moderation owner

Truth alerts:
- ranking + moderation owners

Trust alerts:
- trust systems owner

Saturation alerts:
- ops + ranking owners

Launch alerts:
- launch lead

Platform incidents:
- incident commander

## Containment Actions

Automatic containment may include:
- suppressing visibility
- freezing sources
- tightening caps
- increasing rate limits
- collapsing clusters earlier
- pausing boosts
- requiring verification

Containment must remain reversible.

## Incident States

1. Observed
2. Triaged
3. Contained
4. Investigating
5. Mitigated
6. Resolved
7. Monitored

## Noise Control

Do NOT alert on:
- truthful quiet states
- expected decay
- harmless fluctuations
- normal saturation release
- predictable boost expiry

Alert fatigue is a system failure.

## Alert Metadata

Every alert should include:
- alert id
- severity
- district
- category
- source cluster
- triggering metrics
- recommended action
- owner
- status

## Operational Doctrine

Contain damage faster than abuse can adapt.

When uncertain:
- reduce amplification
- reduce certainty
- tighten visibility
- require corroboration
- prefer reversibility

## Immutable Rules

- safety alerts outrank all others
- truth alerts cannot be ignored
- every critical alert requires an owner
- observability must trigger action
- quiet states are not incidents
- suppression must be traceable
