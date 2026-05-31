# D28 — HOTMESS Refund & Cancellation Doctrine

**The HOTMESS theory of reversibility. Governs refunds, cancellations, disputes, reversals, failed handoffs, ticket invalidation, no-shows, venue cancellations, and commerce recovery flows.**

**Status:** Locked
**Written:** 2026-05-31
**Author:** Phil
**Inherited from:** D08, D15, D19, D20, D22, D24, D25, D34, EXECUTION
**Inherited by:** D31, D32, property doctrines, commerce slices, ticketing slices, convergence flows.

---

## §0. Sacred Reversal Rule

**A failed exchange must not become a humiliation ritual.**

Refunds, cancellations, disputes, and reversals are operational recovery flows — not punishment theatre, public credibility systems, or extraction opportunities.

The goal is:

- restore safety
- restore fairness
- preserve dignity
- minimise fraud
- preserve continuity where possible
- end harmful ambiguity quickly

Not:

- maximise platform leverage
- manufacture pressure
- create seller prestige systems
- socially rank reliability
- force escalation through shame

---

## §1. Core Thesis

Nightlife commerce is messy, temporal, proximity-bound, and human.

People:

- arrive late
- disappear
- lose signal
- change plans
- panic
- misread timing
- get unsafe vibes
- oversell
- cancel events
- get denied entry
- become intoxicated
- hand off to friends
- recover the next day

A doctrine built for sterile e-commerce will fail culturally and behaviourally.

HOTMESS therefore treats reversals as:

- contextual
- temporary
- evidence-aware
- human-first
- anti-surveillance
- bounded by dignity

The system should recover situations, not criminalise awkwardness.

---

## §2. Exchange Classes

Every reversible flow must declare its class.

| Class | Example | Reversal style |
|---|---|---|
| **Ticket transfer** | resale / guestlist handoff | time-sensitive verification |
| **Preloved exchange** | item pickup or meetup | coordination-first |
| **Drop commerce** | HOTMESS-owned commerce | operational fulfilment |
| **Venue cancellation** | event cancelled / denied | venue responsibility flow |
| **Care-linked exchange** | recovery or safety handoff | safety-first reversal |
| **Digital access** | unlocks / archives / stems | entitlement reversal |
| **Donation/support** | community support surface | explicit non-refundable rules |

Each class defines:

- evidence envelope
- reversal window
- payout hold behaviour
- moderation path
- decay schedule
- escalation route

No universal dispute blob.

---

## §3. Resolution Language

User-facing language must remain human and non-corporate.

Allowed:

- “Did this get sorted?”
- “Looks like this didn’t happen.”
- “Need help resolving this?”
- “This handoff expired.”
- “The event changed.”
- “This exchange was reversed.”
- “This payout is paused while we check what happened.”

Forbidden:

- “Buyer protection claim opened”
- “Seller penalty”
- “Customer dispute escalation”
- “Transaction failure severity”
- “Trust score impact”
- “Non-compliant seller event”
- “Chargeback risk profile” in user-facing copy

The tone must feel operationally calm, not financially punitive.

---

## §4. Cancellation Rules

Cancellation is allowed. Abuse is not.

Rules:

- users may back out before handoff
- users may abort unsafe exchanges
- venues may cancel events
- weather/travel disruption is recognised as real
- no-show is contextual, not automatically malicious
- users may choose safety over completion without social penalty
- repeated exploitative cancellation patterns may trigger D24 friction

The platform distinguishes:

- human unpredictability
- from extractive manipulation

without turning cancellation into public stigma.

---

## §5. Ticketing Rules

Ticket flows are uniquely time-sensitive.

Requirements:

- transfer state must be explicit
- expired tickets auto-decay from active surfaces
- duplicate transfer attempts trigger temporary holds
- unresolved ticket conflicts freeze payout until resolution
- venue invalidation events must propagate quickly
- handoff completion should require lightweight confirmation where possible

Forbidden:

- public “bad seller” lists
- visible cancellation rates
- venue-controlled trust ranking
- public dispute history

Ticketing remains pseudonymous under D20.

---

## §6. Payout Holds and Reversals

The platform may delay payout when:

- fraud indicators exist
- duplicate claims exist
- event invalidation occurs
- handoff evidence conflicts
- moderation review is active
- payment processor reversal is active

But:

- holds must be bounded
- users must receive plain-language explanation
- holds must not become silent confiscation
- partner pressure does not override evidence review
- a payout hold is not a public reputation event

Legal Identity remains isolated under D20.

---

## §7. Evidence Doctrine

Evidence exists only to resolve the situation.

Allowed evidence:

- handoff confirmation
- ticket transfer state
- time-bounded message excerpts
- payment processor status
- venue invalidation events
- user-submitted screenshots
- moderation notes
- limited location confirmation where explicitly required

Forbidden evidence behaviour:

- permanent behavioural dossiers
- replayable nightlife timelines
- indefinite storage of coordination context
- partner scraping of dispute data
- public dispute history
- using disputes as recommendation inputs outside D24 context

Evidence is temporary infrastructure, not permanent memory.

---

## §8. Care and Safety Overrides

Care and safety override commerce completion.

Examples:

- user feels unsafe at meetup
- intoxication risk
- coercive behaviour
- harassment in thread
- stalking indicators
- unsafe venue escalation
- SOS activation

In these cases:

- exchange may be aborted
- payout may pause
- moderation may intervene
- care surfaces may activate
- trajectory continuity may stop

No user should feel forced to complete a handoff because “the system expects completion.”

---

## §9. Venue and Partner Boundaries

Venues and partners may provide:

- event state
- ticket validity state
- cancellation state
- queue state
- venue policy updates

They may not:

- assign trust
- access private disputes broadly
- view Safety Identity
- see Recovery Identity
- penalise users socially inside HOTMESS
- create blacklist portability across properties
- override platform moderation

D31 governs operator power in full.

---

## §10. Refund Logic by Surface

### §10.1 HOTMESS-owned commerce

HOTMESS-controlled drops and direct commerce may:

- issue refunds
- issue partial refunds
- issue replacement fulfilment
- issue store credit where explicitly stated

Rules must be visible before purchase.

### §10.2 Peer-to-peer exchanges

HOTMESS facilitates coordination and bounded protection.

The platform may:

- freeze payout
- mediate evidence
- reverse transfer state
- suspend abusive accounts

The platform does not guarantee every outcome.

### §10.3 Care-linked support surfaces

Care support is not treated as commercial entitlement.

No punitive reversal logic around care access.

---

## §11. Schema Consequence

Refund and cancellation flows require explicit lifecycle state.

Required fields:

- `exchange_class`
- `exchange_state`
- `handoff_state`
- `resolution_state`
- `refund_state`
- `payout_hold_state`
- `evidence_window_expires_at`
- `venue_invalidation_state`
- `care_override_state`
- `moderation_lock_state`
- `resolution_copy_variant`

Forbidden schema patterns:

- one permanent dispute history blob
- publicly queryable cancellation metrics
- user-facing reliability score tables
- unbounded evidence retention
- partner-readable moderation trails

---

## §12. Retention Impact

D28 inherits D22.

Retention classes:

- **Trajectory:** active handoff coordination; short-lived.
- **Continuity:** lightweight exchange history; enough for user continuity.
- **Evidentiary:** disputes, fraud, payout conflicts; bounded by legal/moderation need.
- **Care:** safety-linked reversals; minimised and access-controlled.
- **Atmosphere:** aggregate event cancellation/weather/travel conditions only.

Resolved exchanges must decay out of reconstructive visibility.

A completed nightlife handoff should not become a permanent behavioural archive.

---

## §13. Instrumentation

Allowed aggregate instrumentation:

- reversal rate by exchange class
- cancellation completion paths
- payout hold duration aggregate
- dispute resolution duration
- ticket invalidation frequency
- moderation intervention aggregate
- care override aggregate

Forbidden instrumentation:

- ranking users by refund frequency publicly
- using reversals as desirability metrics
- venue access to dispute analytics tied to identity
- permanent behavioural risk timelines
- recommendation penalties based on ordinary cancellations

Observation exists to reduce harm and operational confusion — not to optimise extraction.

---

## §14. Acceptance Test

A build fails D28 if:

1. refund/dispute systems publicly shame or rank users;
2. cancellation automatically becomes social penalty;
3. care/safety exits are treated as suspicious behaviour;
4. evidence is stored indefinitely without doctrinal reason;
5. venue operators can override platform dispute outcomes;
6. payout holds occur without bounded explanation;
7. users cannot abort unsafe handoffs;
8. ticket invalidation fails to propagate;
9. reversal systems expose Legal, Safety, or Recovery identity;
10. user-facing language becomes corporate punishment theatre.

---

## §15. Failure Mode If Violated

If D28 is violated, HOTMESS becomes a punitive marketplace pretending to be community infrastructure.

Users will feel trapped into unsafe completion, disputes will become status damage, and nightlife ambiguity will harden into surveillance records.

That destroys the behavioural trust the OS depends on.

---

## §16. Final Operating Sentence

**The system should resolve the situation without permanently defining the person.**

That is the entire reversal doctrine compressed.