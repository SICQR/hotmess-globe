# HOTMESS Signal Lifecycle

## Purpose

Define the complete lifecycle of every realtime signal inside HOTMESS.

Signals include:
- venue updates
- crowd states
- queues
- event pulses
- promoter drops
- alerts
- user confirmations
- moderation actions
- trust mutations

This document defines:
- state transitions
- visibility behavior
- decay rules
- moderation hooks
- ranking participation

---

# Core Principle

Signals are temporary truth.

Signals are NOT permanent content.

Every signal must:
- decay
- expire
- transition state
- remain contextual

Persistence without freshness creates misinformation.

---

# Canonical Lifecycle

Every signal moves through:

1. Created
2. Verified
3. Active
4. Decaying
5. Stale
6. Expired
7. Archived

Signals may also enter:
- Suppressed
- Hidden
- Disputed
- Moderated

---

# State Definitions

## Created

Signal exists but is minimally trusted.

Characteristics:
- low visibility
- low confidence
- provisional ranking
- high moderation sensitivity

Created state should be brief.

---

## Verified

Signal gains corroboration.

Possible verification sources:
- trusted venue
- trusted promoter
- corroborating users
- sensor/system validation
- moderator validation

Verification improves:
- confidence
- visibility
- ranking stability

Verification does NOT guarantee permanence.

---

## Active

Signal is currently useful.

Characteristics:
- high freshness
- visible participation
- strong ranking eligibility
- realtime relevance

Most rendering happens here.

---

## Decaying

Signal usefulness is declining.

Characteristics:
- reduced ranking weight
- increased suppression likelihood
- reduced expansion eligibility

Decay should be smooth.

Not abrupt.

---

## Stale

Signal is no longer operationally trustworthy.

Characteristics:
- heavy visibility penalties
- hidden from primary surfaces
- excluded from realtime claims

Stale signals must NEVER appear as live truth.

---

## Expired

Signal no longer participates in ranking.

Characteristics:
- removed from live systems
- preserved only for analytics/audit

Expired is terminal.

---

## Archived

Long-term retained state.

Used for:
- analytics
- abuse review
- operational learning
- trust analysis

Archived signals do not affect visibility.

---

# Exceptional States

## Suppressed

Signal visibility intentionally reduced.

Causes include:
- spam
- duplication
- saturation
- low trust
- manipulation patterns

Suppression may be temporary.

---

## Hidden

Signal removed from standard rendering.

Causes include:
- safety issues
- moderation action
- legal requests
- severe trust failure

Hidden signals may remain internally reviewable.

---

## Disputed

Signal confidence is contested.

Triggers:
- conflicting confirmations
- moderation reports
- trust anomalies
- operational contradiction

Disputed signals:
- lose ranking strength
- gain warning state
- require corroboration

---

## Moderated

Signal entered explicit moderation workflow.

Moderation may:
- freeze state
- suppress visibility
- escalate review
- remove ranking participation

---

# Freshness Decay

All signals decay continuously.

Decay speed varies by signal type.

Examples:

## Queue Signal
Very fast decay.

## Venue Capacity
Fast decay.

## Event Start Time
Moderate decay.

## Venue Metadata
Slow decay.

Realtime claims require aggressive decay.

---

# Trust Interaction

Trust modifies:
- initial visibility
- decay speed
- dispute tolerance
- suppression thresholds

High trust:
- stabilizes ranking
- slows collapse slightly
- improves confidence

Low trust:
- accelerates suppression
- accelerates decay
- reduces reach

Trust never bypasses freshness.

---

# Momentum Interaction

Momentum amplifies active signals.

Momentum may:
- temporarily improve visibility
- increase cluster priority
- improve district awareness

Momentum collapses quickly after inactivity.

Dead momentum must not persist.

---

# Rendering Rules

Signals render differently by state.

## Active
Full rendering.

## Decaying
Reduced emphasis.

## Stale
Collapsed or hidden.

## Disputed
Warning rendering.

## Suppressed
Limited rendering.

## Hidden
No public rendering.

Rendering should communicate confidence.

---

# Ranking Participation

Only states with sufficient freshness participate fully.

Strong participation:
- Verified
- Active

Weak participation:
- Created
- Decaying

Minimal participation:
- Stale
- Disputed

No participation:
- Expired
- Hidden

---

# Signal Saturation Protection

Repeated similar signals trigger:
- clustering
- deduplication
- representative selection
- suppression

The system should prefer:
- signal quality
- clarity
- diversity

NOT raw volume.

---

# Quiet State Integrity

Absence of signals is valid.

The system must NEVER:
- fabricate activity
- inflate density
- simulate momentum

Low activity is truthful state.

---

# Moderation Hooks

Every state transition should emit:
- observability events
- moderation events
- audit records
- trust recalculation triggers

Critical transitions:
- Active → Disputed
- Active → Hidden
- Verified → Suppressed
- Decaying → Expired

must be traceable.

---

# Signal Ownership

Signals should track:
- origin source
- creation timestamp
- trust lineage
- moderation lineage
- verification history
- suppression history

Signals require explainability.

---

# Immutable Lifecycle Rules

- Freshness always decays
- Stale truth must not appear live
- Trust cannot resurrect expired signals
- Momentum cannot override safety
- Hidden signals do not render publicly
- Quiet states are valid
- Moderation outranks amplification

---

# v1 Operational Defaults

Use:
- aggressive decay
- aggressive suppression
- conservative visibility
- conservative amplification
- rapid stale collapse

Optimize for:
- trust
- readability
- operational truth

NOT maximum activity perception
