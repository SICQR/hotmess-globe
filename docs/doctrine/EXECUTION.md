# HOTMESS Execution Rule

**The doctrine-to-product transformation rule. Operational meta-doctrine.**
**Governs how every numbered doctrine becomes shippable behaviour.**

**Status:** Locked
**Written:** 2026-05-31
**Author:** Phil
**Position:** Above the numbered doctrine stack. Every D-doctrine inherits this execution discipline.

---

## §0. The Completion Rule

A doctrine is not complete when it sounds correct.

A doctrine is complete when:

1. It changes a production decision.
2. It creates or forbids a UI behaviour.
3. It creates an enforceable data rule.
4. It survives edge cases.
5. It can be verified through an acceptance test.

If a doctrine cannot produce:

- a schema consequence
- a UI consequence
- a behavioural consequence
- and a moderation consequence

…then it is still philosophy, not architecture.

Every doctrine proposal must therefore include:

- the sacred sentence
- the anti-pattern it forbids
- the surfaces it governs
- the schema impact
- the retention impact
- the moderation impact
- the acceptance test
- the failure mode if violated

---

## §1. The Execution Order

Always:

> **Doctrine → Contract → Surface → Behaviour → Observation → Adjustment**

Never:

> Feature → Growth → Rationalisation

HOTMESS is not built by accumulating features. HOTMESS is built by preserving behavioural coherence across every surface.

---

## §2. The Coherence Test

If a proposed feature increases engagement while weakening:

- dignity
- ambiguity
- continuity
- quiet trust
- pseudonymity
- emotional realism

…the feature fails regardless of metrics.

The system should feel:

- socially intelligent
- emotionally quiet
- sexually honest
- infrastructurally trustworthy
- resistant to surveillance gravity

…without ever needing to explain those qualities explicitly.

**The OS should feel right before it feels addictive.**

---

## §3. The Operational Shift

You already have enough doctrine to ship multiple quarters of work. The acceleration move is:

> **Stop asking "what should HOTMESS be?" Start asking "which locked doctrine does this surface violate?"**

That single reframing changes everything operationally. The doctrines are the contracts. The slice format below is how contracts become code.

---

## §4. HOTMESS Slice Execution Format

Every scope doc, PR description, and implementation plan from this point forward uses this format. The format is mandatory. Sections are not optional.

### §4.0 Governing Doctrines
List only the doctrines this slice is allowed to touch. If a discussion leaves these boundaries, it is out of scope.

### §4.1 Surface Being Changed
Single sentence.

### §4.2 Behavioural Thesis
What emotional / social behaviour should this create?

### §4.3 Sacred Invariants
Non-negotiable rules. Bullet list.

### §4.4 Failure Modes
What would make this feel wrong? Bullet list.

### §4.5 Acceptance Tests
Observable pass/fail conditions. Not "works correctly" — instead behaviourally specific assertions tied to doctrine bindings.

### §4.6 Retention Classification
Required for every slice now. What memory classes are created (trajectory / continuity / atmosphere / evidentiary / care)? What decays? When? What survives? What aggregates? No slice ships without this section.

### §4.7 Instrumentation
Aggregate-only observation. Allowed: aggregate flow completion, aggregate abandonment, trust-tier friction delta. Forbidden: replayable behavioural timelines, reconstructive analytics, permanent movement trails.

### §4.8 PR Sequence
Maximum 4 PRs. Each PR: one behavioural change, one doctrinal acceptance test, one rollback path. If the PR description cannot fit on one screen, the slice is too large.

### §4.9 Observation Window
What specifically are we trying to learn from production? If the slice has no learning goal, it should not exist.

---

## §5. What This Format Kills

- Philosophical loops mid-implementation.
- Re-scoping spirals.
- "Interesting ideas" that don't pass §0.
- Slow PR reviews because the doctrine binding is unclear.
- Contributors freelancing product philosophy.
- Doctrine violations that ship and have to be undone later.

What this format protects:

- The behavioural coherence of the OS across surfaces.
- The speed at which correct slices ship.
- The clarity of every code review against doctrine binding.

---

## §6. The Bottleneck

The bottleneck is no longer "what should HOTMESS be?" — the doctrines have answered that question for the foreseeable future.

The bottleneck is **operational clarity**: turning locked doctrine into shipped behaviour without philosophical drift between scope and merge.

This document is the operational anchor that prevents drift.

---

## §7. Application

Every slice scope doc from this date forward uses §4's format. Every PR description references §4's acceptance test (§4.5) explicitly. Every code review checks doctrine binding (§4.0) before reviewing implementation. Every observation window (§4.9) reports back to the slice that produced it.

If a slice does not produce all nine sections, the slice does not ship.

If a PR cannot point at a §4.5 acceptance test it satisfies, the PR is not merged.

If an observation window expires without learning, the slice is reviewed for waste.

---

## §8. Final Operating Sentence

> **HOTMESS is built by preserving behavioural coherence across every surface.**

That sentence is the entire execution rule compressed. Every other rule above is the operational scaffolding around it.

The OS should feel right before it feels addictive.
