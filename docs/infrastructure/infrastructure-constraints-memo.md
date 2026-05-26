# Infrastructure Constraints Memo

> **Canonical, 2026-05-26 (Phil).** Tier-3 runtime operations.
> The operational and architectural limits the product must respect.

## Purpose

Define the operational and architectural limits the product must respect.

## Core principle

**The system should be built to preserve governance, not to bypass it.**

## Constraints

### 1. Governance is not optional
All infrastructure decisions must preserve safety, truth, trust, freshness, readability, and bounded amplification. Performance work may not weaken enforcement.

### 2. Readability has a cost
The system must support controlled density. Infrastructure should favour consistent state updates over noisy overproduction.

### 3. Real-time integrity matters
Freshness-sensitive systems need low-latency updates. Stale state must not be treated as live state. Propagation delays should be explicit and measurable.

### 4. Quiet states are valid
Low activity is not a failure. Infrastructure must handle sparse districts cleanly without forcing false activity.

### 5. Trust and moderation need observability
The platform must surface source trajectories, dispute events, suppression events, and correction latency. If enforcement cannot be observed, it cannot be trusted.

### 6. Saturation must be controlled
Infrastructure should support caps, throttles, collapse behaviour, and bounded amplification. Systems should degrade gracefully under overload, not fail loudly into clutter.

### 7. Separation of concerns
Ranking, trust, moderation, payments, privacy, and rendering should not silently overwrite each other. Each subsystem needs clear ownership and explicit interfaces.

### 8. Default conservatism
When state is uncertain, prefer suppression, decay, or review over amplification. **Conservative defaults are safer than optimistic ones.**

### 9. Idempotency and reversibility
Updates should be safe to retry. Enforcement actions should be reversible when appropriate. Corrections should propagate cleanly.

### 10. No hidden coupling
Infrastructure should not rely on undocumented side effects between services. Any dependency that can affect ranking, trust, or moderation must be explicit.

### 11. Storage and schema discipline
Schemas should distinguish:
- verified truth
- reported claims
- stale claims
- moderation state
- trust state
- boost state
- payment state

**Do not collapse different states into one generic record.**

### 12. Auditability
Important state transitions must be logged. The system should be able to answer:
- who changed it
- when it changed
- why it changed
- what it affected

### 13. Privacy constraints
Location and user data must be minimised. Use only the data needed for the product function. Retention and visibility should be scoped by policy.

### 14. Launch safety
Early districts should have stronger manual oversight. Rollout should be throttled if trust or truth signals are weak. Infrastructure should support rollback and containment.

### 15. Failure tolerance
If ranking fails, safety and moderation must still function. If observability degrades, the system should fail conservatively. If updates lag, stale items should decay rather than persist.

## Implementation notes

- Prefer **explicit state machines** over implicit behaviour.
- Prefer **bounded queues** over unbounded growth.
- Prefer **measurable transitions** over silent mutation.
- Prefer **district-aware controls** over global-only controls.

## Acceptance criteria

Infrastructure is acceptable only if it can support:
- freshness decay
- trust decay and recovery
- moderation actions
- boost limits
- readability controls
- district-specific rollout
- audit trails
- conservative failure modes

## Final rule

**If infrastructure makes governance harder to enforce, it is the wrong infrastructure.**

## What this enforces

This memo is the architectural substrate for the governance layer. Every constraint above traces to a rule in one of:

- [`sacred-invariants.md`](../doctrine/sacred-invariants.md) — the 18 rules that cannot be relaxed; constraints 1, 2, 8, 14, 15 directly enforce them.
- [`ranking-constitution.md`](../governance/ranking-constitution.md) — visibility law; constraints 2, 6, 7 (separation of ranking from other subsystems), 10 enforce its readability and bounded-amplification rules.
- [`signal-economics-spec.md`](../governance/signal-economics-spec.md) — scarcity, lifecycle, decay; constraints 3 (real-time integrity), 8 (conservative defaults), 11 (state discipline), 15 (failure-tolerance via decay) enforce the lifecycle and saturation rules.
- [`trust-system-spec.md`](../governance/trust-system-spec.md) — credibility model; constraints 5 (trust+moderation observability), 9 (reversibility of enforcement actions), 12 (auditability of trust transitions) enforce trust accumulation/decay/recovery.
- [`metrics-and-instrumentation-spec.md`](../operations/metrics-and-instrumentation-spec.md) and [`observability-and-alerting-spec.md`](../operations/observability-and-alerting-spec.md) — what must be measured + how alerts route; constraints 5, 12, 15 make those measurements possible.

If any of the 15 constraints above weakens an enforcement path defined in those docs, the constraint is wrong, not the spec.


---

## Doctrine + invariants

This spec inherits from the canonical roots:

- [`../doctrine/product-doctrine.md`](../doctrine/product-doctrine.md) — the constitutional root narrative + operational loops.
- [`../doctrine/sacred-invariants.md`](../doctrine/sacred-invariants.md) — the 18 rules that cannot be relaxed + the canonical 8-layer decision hierarchy.

If this spec conflicts with either, **the root wins.**
