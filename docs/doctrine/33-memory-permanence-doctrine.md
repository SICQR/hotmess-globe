# D33 — Memory & Permanence Doctrine

**Status:** canonical. Established 2026-05-31.
**Inherits from:** D08 (Visibility), D17 (Surface Layer), D22 (Temporal), D34 (Trajectory).
**Inherited by:** D21 (Payment & Payout — drafting), D31 (Venue & Partner Power — drafting), all future doctrines that require persistence.

---

## §0 Why this doctrine exists

Doctrine before this one defined how HOTMESS behaves at the user surface — how trajectory decays, how identity is symmetric, how presence is suppressed off-grid. Those are user-facing commitments.

This doctrine defines how HOTMESS behaves at the **storage layer**. Specifically: what HOTMESS is structurally incapable of remembering, regardless of whether anyone at HOTMESS wants to remember it.

The convergence slice (PRs 1-4) and the atmospheric write pipeline (#739, #740) are the first artefacts that fully embody this discipline. This doctrine names the pattern they established so every future persistence layer inherits the discipline by reference rather than re-derivation.

The single sentence that summarises the doctrine: **HOTMESS does not promise restraint. HOTMESS is structurally shaped around incapability.**

---

## §1 The substrate-incapability pattern

A persistence layer satisfies D33 when **the constitutional commitment is enforced by the shape of the substrate, not by the discipline of the code that touches it.**

Concretely, a D33-compliant persistence layer has all five of:

**§1.1 — Aggregate-only persistence.** The table stores deltas on counters, not events. No per-event row exists after a write. Reconstruction of the source event from the residue is mathematically impossible — the row representing that event was never created.

**§1.2 — Identifying columns physically absent.** Columns from which actor / target / source-entity / precise-time / precise-location could be reconstructed do not exist in the table definition. Adding them requires `ALTER TABLE` in a migration file. That migration file is the doctrinal audit point.

**§1.3 — Boundary-side bucketing.** Time is quantised, location is classified, identity is severed at the substrate boundary — inside the function body, before the write reaches the table. The raw inputs never appear in the persisted row. The function call site sends the raw value (because the function is the only authority that knows the bucketing rules); the function destroys it.

**§1.4 — Type-locked output domain.** Every classified column is constrained by a fixed enum at the type level, not a CHECK constraint at the column level. Adding a class to the domain is `ALTER TYPE` — a visible doctrinal act. The class **set** is the contract; the classifier function is the implementation. (See #740.)

**§1.5 — Single write path with exhaustive signature.** The substrate exposes exactly one function as the legal write path. Its parameter list is exhaustive — there are no other parameters by design. Adding an identifying parameter requires changing the function signature, which is a visible doctrinal change. Direct table writes are revoked from every client role. RLS is on, policies are zero, so even authenticated callers cannot bypass the function.

Each commitment is enforced at a different layer of the stack:
- §1.1 — table shape.
- §1.2 — column schema.
- §1.3 — function body.
- §1.4 — type system.
- §1.5 — grant + RLS model.

Removing any one of them requires editing a different layer of the substrate. The five commitments are not redundant — they are independently load-bearing.

---

## §2 Constitutional persistence primitive

A persistence layer that satisfies §1.1–§1.5 is a **constitutional persistence primitive.**

The atmospheric handoff substrate (#739, #740) is the canonical reference implementation. Specifically:

- §1.1 satisfied by `atmosphere.handoff_residue.(count integer)` — every write is an upsert that increments a counter; no event row exists.
- §1.2 satisfied by the absence of `actor_id`, `target_id`, `beacon_id`, `user_id`, `session_id` columns. Verified by query against `information_schema.columns`.
- §1.3 satisfied by `atmosphere.record_handoff` body — `date_trunc('hour', now())` and `_classify_venue(p_venue_label)` inside the function; raw timestamp and raw label never reach the INSERT.
- §1.4 satisfied by `atmosphere.venue_class_kind` enum — adding a class is `ALTER TYPE`.
- §1.5 satisfied by `SECURITY DEFINER` on both `atmosphere.record_handoff` and `public.record_handoff_atmosphere`, locked `search_path`, exhaustive 3-arg signature, RLS on, zero policies, direct writes revoked.

Every D33-compliant primitive must demonstrate each of these five properties in its acceptance test. The atmospheric handoff substrate is the template.

---

## §3 Memory tiers (inherited from D22)

D22 §3 established three tiers of memory:

- **Trajectory memory** — short-lived, individually-addressable, decays through `fresh → recent → gone`. Lives at the surface, not at the substrate (because by §1.1 the substrate has no individual rows).
- **Continuity memory** — medium-lived, per-party asymmetric view of shared interactions. Lives at the application layer where mutual consent permits, not at the substrate.
- **Atmospheric memory** — aggregate, irreversible, lives at the substrate.

D33 binds: **only the atmospheric tier persists.** Trajectory and continuity memory are operational state derived from current-session inputs; they do not write to a constitutional persistence primitive without explicit doctrinal review.

A trajectory or continuity feature that wants to persist anything must first justify why it cannot live in operational state, then design a D33-compliant primitive to hold what it must persist, then ship the primitive in a migration before the feature.

---

## §4 The recurring audit

Constitutional persistence does not protect itself. It requires recurring review at three points:

**§4.1 — The contributor instinct check.** Every proposal to add a field to a constitutional persistence primitive is a doctrinal review, not a maintenance task. The wording of the proposal almost never says "I want to reverse forgetting." It says one of:

- "Can we add `actor_id` for ranking?"
- "Can we add `beacon_id` for debugging?"
- "Can we keep `venue_label` a bit longer for attribution?"
- "Can we add a `precise_timestamp` for fraud detection?"
- "Can we cache the raw input for analytics?"
- "Can we just store it temporarily?"
- "Can we add a finer-grained class to the classifier?"

Each of these is the same question: **can we reverse constitutional forgetting?** The correct answer is no. The substrate paying its constitutional rent is the cost of the missing capability.

This check applies to every engineer, every time, including founder-Phil under business pressure, future-Phil under acquisition pressure, and any future operator inheriting the codebase. The substrate does not know who is asking.

**§4.2 — The schema-discipline check.** Every subsequent persistence PR must inherit the §1.1–§1.5 pattern. The acceptance test in the PR description must demonstrate the five commitments. If a PR ships a persistence layer without these commitments, the PR is constitutionally incompliant, regardless of how clean the code looks.

**§4.3 — The boundary-write check.** Atmospheric write pipelines must destroy identifying inputs **before** the INSERT. If a contributor refactors the call site to do the bucketing in JavaScript and pass a pre-classified value to the substrate, they have leaked the raw value across the substrate boundary. The function — not the call site — is the authority that performs the destruction.

---

## §5 What this doctrine forbids

D33 explicitly forbids:

- **Surveillance retention dressed as analytics.** Persisting actor / target / beacon / timestamp on a "we'll need this for analytics" basis. If a metric cannot be derived from atmospheric aggregates, the metric should not exist.
- **Convenience caches that hold identifying data past the boundary.** Including Redis, in-memory caches, edge-cached responses, denormalised columns on other tables, sentry breadcrumbs, debug logs, observability traces, OpenTelemetry spans, or any other channel.
- **Reverse-engineering capability "for moderation."** Moderation surfaces operate on live presence and live signal, not on reconstructed historical movement. D08 visibility + D34 trajectory decay already establish this; D33 makes it structural.
- **"Temporary" debugging persistence.** A column added "temporarily for debugging" violates §1.2 the instant it lands and remains a violation regardless of intent to remove it. Debugging happens through the function-side log channel, not through an extra column.
- **Schema drift through bypass paths.** Direct table writes, service-role inserts from edge functions, RPC bypass through unrelated functions. The constitutional primitive has one legal write path. Anything else is drift.

---

## §6 What this doctrine permits

D33 explicitly permits:

- **Atmospheric reads** through aggregate functions over windowed counters. These functions return aggregates, never raw rows. They are constitutional reads against constitutional persistence. (No atmospheric read surface ships before there is a renderer that requires it.)
- **Service-role observability into the substrate** for debugging and incident response. Service-role bypass of RLS is the legitimate escape hatch when the operator needs to see the system's state. It is not a feature surface — code paths that the user can reach must go through the constitutional write path.
- **Extending the substrate with new aggregate counters.** Adding a new D33-compliant persistence primitive for a different signal class (e.g., D21 payment settlement residue, D31 operator-handoff residue) is the correct way to grow. Each new primitive ships its own §1.1–§1.5 acceptance test.
- **Bucketing finer over time as the platform scales.** Adding a new `venue_class_kind` enum value for a coarse atmospheric texture that did not exist before (e.g., `'wellness'` distinct from `'care'`) is permitted if the new class does not narrow the existing classes such that individual venue identity becomes reconstructable. The doctrinal check is in §1.4: would the new class distinguish two specific venues inside the residue table? If yes, refuse.

---

## §7 Inherited application: D21 (Payment & Payout)

D21 will inherit D33. When D21 ships, it must establish a payment-settlement constitutional persistence primitive that satisfies §1.1–§1.5:

- §1.1 — Settlement residue is aggregate (e.g., `(settlement_window, currency, settlement_state) → count, sum`). Per-settlement event rows persist only where regulation mandates and only with the minimum identity regulation requires.
- §1.2 — Identifying columns exist only where regulation forces them. Every column requires a regulatory citation in its migration comment. No "convenience" identifying columns.
- §1.3 — Settlement timestamps quantise to the regulatory minimum window (e.g., day, not millisecond). Counterparty identifiers route through a separate, regulated identity-bound table; the residue table joins to that table only through the regulated function path.
- §1.4 — Settlement states are a locked enum.
- §1.5 — Single write path through a SECURITY DEFINER function whose signature captures only the regulatorily-mandated fields.

D21 acceptance test for D33 inheritance: a hostile future operator with full database access cannot reconstruct from the substrate alone which two parties transacted, when precisely, or for what specific item, beyond what regulation requires the platform to retain. Anything reconstructable beyond that is constitutional drift.

---

## §8 Inherited application: D31 (Venue & Partner Power)

D31 will inherit D33. The substrate-incapability pattern there governs what operators are structurally allowed to know about users, mirroring how this doctrine governs what HOTMESS is structurally allowed to know about users.

D31 acceptance test for D33 inheritance: an operator with maximum-privilege access through the operator-facing API cannot reconstruct from operator-side data which specific users converged at their venue, beyond what the user explicitly disclosed through identity-binding interaction.

---

## §9 Acceptance test for new persistence layers

Every PR that lands a new persistence layer must include an explicit D33 acceptance test in the description. The test is composed of seven questions:

1. Does the table store deltas on counters, or per-event rows? (§1.1)
2. List every column. Which of them could reconstruct actor / target / source-entity / precise-time / precise-location? Why does each one exist? (§1.2)
3. Where is the boundary-side bucketing performed? Show the function body. Where does the raw input get destroyed? (§1.3)
4. Are classified columns locked to enums at the type level? List the enum members. (§1.4)
5. What is the one legal write path? Show the GRANT and RLS state. (§1.5)
6. If a hostile future operator had read access to this table and nothing else, what could they reconstruct? Be specific. If anything beyond aggregates is reconstructable, the primitive is non-compliant. (§4 hostile-operator test)
7. What does the migration look like that a future contributor would have to write to reverse the forgetting? If the answer is "trivial," the primitive is non-compliant. (§4.2 schema-discipline check)

A persistence PR without these seven answers in the description does not ship.

---

## §10 The drift indicators

D33 violations rarely arrive labelled. They show up as:

- A new column added "for debugging" that survives one deployment.
- A SECURITY DEFINER function whose signature is wider than necessary.
- A classifier enum that gains a class which distinguishes two specific entities.
- A read function that joins a constitutional primitive to an identity-bound table.
- A service-role edge function that writes directly to a substrate table instead of through the function.
- A Sentry breadcrumb capturing a raw input that was supposed to be destroyed at the boundary.
- A new persistence layer that omits one or more of §1.1–§1.5 because "this case is simple."
- A migration that touches a constitutional primitive table without referencing D33.

Each of these is an audit moment. The correct response is to revert and refactor, not to "follow up later."

---

## §11 Relation to other doctrines

- **D08 (Visibility):** D33 makes the visibility state architecture irreversible at the storage layer. Off-grid users' beacons cannot leak presence through a forgotten field because the field does not exist.
- **D17 (Surface Layer):** D33 governs persistence; D17 governs visible chrome. Where they meet — e.g., on the off-grid presence guard in the hybrid sheet — the constitutional commitment is enforced at both layers.
- **D22 (Temporal):** D33 is the structural complement to D22's philosophical framing of memory. D22 says "memory blurs over time." D33 says "the substrate is shaped so the only thing it ever holds is the blurred form."
- **D34 (Trajectory):** D34 establishes shared trajectory as the canonical primitive at the social layer. D33 establishes that trajectory does not persist as individual data at the substrate layer.
- **D19 (Marketplace):** D33 makes D19 §6.10 (locked resolution vocabulary) structurally enforced — the vocabulary lives in TypeScript types, CHECK constraints, and SECURITY DEFINER validation, not in code review.

---

## §12 Forward secrecy framing

For engineers approaching D33 from a cryptography background:

D33 is forward secrecy for social presence. Forward secrecy in TLS means: once the session key is destroyed, no future party — including the operator of the server — can decrypt past traffic, because the key required to do so no longer exists. D33 means: once a handoff has been recorded into the constitutional persistence primitive, the inputs required to reconstruct it no longer exist anywhere in the substrate. Reconstruction is impossible by the same mechanism that makes forward secrecy work — the source material has been destroyed, not hidden.

This framing is offered because engineers already trust forward secrecy. Borrowing the discipline transfers the trust.

---

## §13 The boardroom test

For non-engineering stakeholders approaching D33:

D33 is the insurance policy that ratifies the platform's ethics. A queer-led platform with a recovery-advocacy founder cannot survive a single retention incident. The "we cannot have a 2014-Snapchat moment because the substrate is incapable of producing one" framing is the boardroom-credible defence of the policy. Founders who do not care about ethics still understand moats. The substrate's irreversibility is the moat.

This framing is offered because future business pressure will ask "why not just collect more data?" D33 is the answer that holds under acquisition diligence, under growth panic, under regulatory request, and under hostile-operator inheritance.

---

## §14 Naming and references

- **The pattern** is the **substrate-incapability pattern**. The platform is not choosing restraint; it is incapable of the abuse by construction.
- **A D33-compliant persistence layer** is a **constitutional persistence primitive.**
- **The audit moment** is the **boundary-write check**, the **schema-discipline check**, and the **contributor-instinct check** — §4.1, §4.2, §4.3 respectively.

Reference implementation: `supabase/migrations/20260531120000_atmosphere_handoff_substrate.sql` + `supabase/migrations/20260531130000_atmosphere_venue_class_lockdown.sql`. PR #739, #740.

Reference application code: `src/lib/atmospheric.ts`.

---

## §15 Closing

D33 is not a privacy policy. Privacy policies are promises. D33 is a constraint on what the substrate can express.

When the next persistence layer ships, it will inherit D33 by demonstrating the §9 acceptance test. When the next engineer asks for an identifying field on a constitutional primitive, the answer will be no, and the reason will be cited from this doctrine. When the next acquirer asks what the platform has retained, the answer will be: aggregate counters, indexed by time bucket and coarse class, with no path back to who.

That is the durability claim.
