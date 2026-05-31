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

---

## §9. Constitutional Inheritance Gate (amendment, 2026-05-31)

The doctrine layer is no longer a pile of restrictions — it is a **governing geometry** that future implementation must inherit by reference. The substrate-incapability work (D33) and the four-doctrine substrate layer (D33 + D21 + D31 + D32 + D24) plus the messaging transport (D25 + §20) plus the reversal contract (D28) plus the D31 §17 scoped-continuity amendment now collectively constitute the constitutional substrate of HOTMESS. They share a single architectural shape.

### §9.1 The governing geometry

Every constitutional doctrine in the stack obeys the same compression pattern: **[human reality preserved, extractive mutation forbidden].** The substrate is shape-preserving, not restrictive.

| Doctrine | Human reality preserved | Mutation forbidden |
|---|---|---|
| **D33** Memory & Permanence | Memory | Exploitability |
| **D24** Contextual Trust Weighting | Trust contextual | Hierarchy |
| **D25** In-App Messaging | Continuity (per-mode) | Entitlement |
| **D31** Venue & Partner Power (§17 amended) | Stewardship | Ownership / export |
| **D21** Payment & Payout | Settlement legibility | Extractive financial hierarchy |
| **D32** AI & Automation | Useful assistance | Implicit reconstruction |
| **D28** Refund & Cancellation | Reversal as right | Reputation tax |

Same shape recurs at each layer. The substrate's coherence comes from this symmetry, not from any single doctrine's prohibitions.

### §9.2 The generative principle

The pair compression is **not just descriptive** — it is the template every new constitutional doctrine produces. When D23, D26, D27, D29, D30 are written (and any future constitutional doctrine after them), they must name their pair explicitly:

- The **X** column is the human reality the doctrine exists to protect — memory, trust, belonging, stewardship, settlement, conversation, care, presence, etc.
- The **Y** column is the extractive mutation X drifts into without architectural resistance — exploitability, hierarchy, entitlement, ownership, extraction, surveillance, manipulation, etc.

If a draft doctrine cannot answer "what are we preserving, and what are we preventing it from becoming," the doctrine is still fuzzy and not ready to ship.

### §9.3 The contributor test (per-PR)

Every implementation PR that touches a surface, substrate, or behaviour governed by a constitutional doctrine must answer this question in its description, in one sentence:

> **Does this stay inside the [doctrine §]constitutional boundary, and what mutation is it defending against?**

The PR author identifies (a) the active doctrine(s) the PR operates inside, (b) the X-Y pair from §9.1 that governs this surface, and (c) one sentence stating which side of the X-Y line each change in the PR lands on.

This question is **mandatory** for any PR that:

- Adds, removes, or modifies a column on any user-bearing or operator-bearing table.
- Introduces a model invocation that consumes user-bearing content.
- Adds a surface that consumes trust positions, settlement state, presence state, or membership state.
- Adds an export, sync, or integration with any off-platform service.
- Introduces a new persistent cache keyed by user-identifying data.
- Changes a gate condition on any user-mediated affordance.
- Adds a notification path, dispatch surface, or broadcast affordance.
- Modifies operator dashboard categories, surfaces, or read paths.
- Adds a new doctrine artefact or amends an existing one.

PRs not touching constitutional territory (e.g., a typo fix, a CSS adjustment that doesn't change behaviour, a dev-tooling improvement) may skip §9.3 — the slice format's existing §1 Scope question already names whether constitutional territory is engaged.

### §9.4 The unresisted-mutation framing

The reason §9.3 matters is that most platform failures are not malicious. They are **unresisted mutation**. A platform that wants to preserve memory accumulates exploitability because no one named the boundary at the mutation point. A platform that wants to support trust accumulates hierarchy because no one stopped the inference from drifting into a score. A platform that wants stewardship accumulates ownership because no one held the line on portability.

The constitutional substrate's job is to apply **architectural resistance at the mutation boundary**. The contributor test in §9.3 is how that resistance shows up in everyday PR review. Every PR that goes through the gate has identified what it is preserving and what it is preventing. PRs that cannot answer the question are surfacing their own constitutional ambiguity, which is the doctrinal review moment.

### §9.5 Slice format extension

The slice format's nine sections (per the original execution rule above) are extended by §9.3 as a **mandatory tenth section** for any slice operating in constitutional territory:

> **§10 — Constitutional Inheritance**
> - **Active doctrines:** [list the doctrines this slice operates inside]
> - **Active X-Y pair(s):** [name the human reality preserved and the mutation forbidden]
> - **Boundary check:** [one sentence per material change in the slice, stating which side of the X-Y line it lands on]
> - **Mutation risk:** [one sentence naming the specific drift this slice is defending against, even if obviously addressed]

A slice that operates in constitutional territory and does not include §10 is incomplete and should not pass slice review.

### §9.6 The downstream-readability commitment

The pair compression in §9.1 is **cognitively portable**. It can be held in working memory by a tired founder, a new contributor, an external operator, a growth team, or an eventual successor. That portability is the architectural property that makes the substrate scale.

Future doctrine writing must preserve this property. A new doctrine that requires three reads to extract its X-Y pair has failed the downstream-readability test. The pair should be statable in one sentence; the doctrine body should justify the pair across whatever sections it needs; the contributor test in §9.3 should be answerable in one sentence per change.

If a doctrine drafter cannot compress their work to fit §9.1's pattern, the doctrine is still finding its shape and is not yet ready to ship.

### §9.7 The pressure-test commitment

Good constitutional systems are stress-tested **before** inheritance. Today's session demonstrated this in real time:

- The D31 §17 amendment landed because the original D31 was pressure-tested against the question "does this break venue economics?" and the answer surfaced an over-rotation that needed fixing.
- The D25 §20 amendment landed because D25 was pressure-tested against the question "is messaging really one mode?" and surfaced the constitutional-modes framing.

The governance pattern is: **doctrines that look complete still need pressure-test review before they calcify into inheritance.** Future doctrine PRs should explicitly invite pressure-test reviewers — a second opinion on architectural framing, even from outside the platform engineering team — before merge. The pressure test is the workflow equivalent of the substrate's anti-mutation discipline applied to the doctrine itself.

### §9.8 The closing operational sentence (extending §8)

The §8 sentence — *"HOTMESS is built by preserving behavioural coherence across every surface"* — is the user-facing compression. The constitutional-substrate equivalent is:

> **HOTMESS is built by preserving the human reality each surface exists to protect, while applying architectural resistance at every point where that reality naturally mutates into something extractive.**

That sentence is what §9 compresses into the contributor test. Every PR answers it implicitly by naming its X-Y pair and its boundary check. Every doctrine answers it explicitly by producing a new pair the geometry inherits.

The substrate is shape-preserving, not restrictive. Future implementation inherits the geometry by saying so in writing.
