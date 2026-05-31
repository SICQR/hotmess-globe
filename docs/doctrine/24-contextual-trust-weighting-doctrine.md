# D24 — Contextual Trust Weighting Doctrine

**Status:** canonical. Established 2026-05-31.
**Inherits from:** D08 (Visibility), D15 (Care Language), D17 (Surface Layer), D19 (Marketplace), D20 (Identity), D21 (Payment & Payout), D22 (Temporal), D32 (AI & Automation), D33 (Memory & Permanence), D34 (Trajectory), D31 (Venue & Partner Power).
**Inherited by:** D25 (In-App Messaging), D28 (Refund & Cancellation), all future doctrines that gate behaviour on relationship state.

---

## §0 Why this doctrine exists

The constitutional substrate (D33 + D21 + D31 + D32) defines what HOTMESS is structurally incapable of becoming. D34 establishes that connection between users escalates through a ladder of states (Ambient → Contextual → Coordinated → Converged → Trusted → Care). What the doctrine layer has not yet defined is **how the system knows what rung two users are on, without that knowledge mutating into a score, a caste, or a surveillance instrument.**

The collision is severe. The platform must be able to gate behaviour on relationship state — the boo-first chat gate reads it, the care-suite escalation surface reads it, the dispute flow reads it. If those gates consume a model-derived trust score, D32 is violated. If they consume a denormalised per-user trust column, D33 is violated. If they consume a portable trust profile, D31 §2.1 is violated. If they produce a public ranking, D19 §4.5 anti-hustler-economy is violated. If they encode trust as a property of one user (rather than the relationship between two specific users), D20 identity symmetry is violated. If safety flags feed back into trust as a score-reducer, the doctrine becomes a punishment system.

D24 resolves the collision with one architectural move: **trust primitives are events, not scores.** Each rung on the D34 ladder is constituted by a specific user-witnessed event. The trust position between two users is the literal, observable sequence of those events as they affect that specific pair. The system "knows" the position the same way it knows a user's handle — because the user explicitly produced the underlying event and the substrate recorded it under D33-compliant shape. There is no score, no embedding, no inference layer between the event and the consequence.

The single sentence: **the platform produces confidence without producing hierarchy.**

---

## §1 Scope

D24 governs:

- The relationship state between any two users, and how the platform reads it.
- The events that constitute progression along the D34 connection ladder.
- The surfaces that gate behaviour on relationship state (chat gate, care escalation, dispute flow, etc.).
- The decay behaviour of trust events (D22 inheritance).
- The user-visibility contract for the basis of any trust-mediated consequence.

D24 does NOT govern:

- D20 identity verification chrome — there is none on user surfaces, and D24 does not reintroduce any.
- D32-style model-derived inferences — those are forbidden.
- Operator-side trust toward an operator, which is governed by D31's operator-verification surface attestation rather than the user-pair primitives below.
- Platform-wide moderation decisions — those are operator-audit-logged per D33 §3.4 and human-reviewed per D32 §5.6, not trust-position-mediated.

---

## §2 Core principle: trust is event sequence, not score

**§2.1 — A user's trust position is per-relationship, not per-user.** There is no "user A's trust level" as a property of user A. There is only "the relationship state between user A and user B," derived at query time from the event sequence shared by that pair. User A may be at `converged` with user B and at `ambient` with user C simultaneously, and neither position has any consequence for user A's position with any third party.

**§2.2 — A trust position is reconstructed at query time from the event sequence.** No denormalised "trust state" column exists on the user table, the relationship table, or anywhere else. The position is a function over the (pair, event-sequence, current-time) tuple. Persisting the position is per-se forbidden because doing so would make the position survive the decay of its constituent events (violating D22 §4 + D33 §3.4).

**§2.3 — Every constituent event is a user-witnessed primitive.** No event is derived, inferred, predicted, or synthesised. Either the user explicitly produced the event (sent a boo, confirmed a handoff resolution, accepted a care-role pairing), or the user is the witness to a counterparty-produced event with explicit consent (received a mutual boo, was confirmed by counterparty in a handoff). The model layer (D32) has no role in event production.

**§2.4 — The position function is deterministic and reviewable.** Given the same event sequence and the same query time, the function returns the same position every time. The function is committed to source code, version-controlled, and changes go through doctrinal review. There is no "machine-learned trust function."

**§2.5 — Position consumption is gate-shaped, not score-shaped.** Surfaces that read a trust position read it as "does the (this user, that user) pair satisfy the threshold for this gate?" — a boolean, evaluated per-gate, against a per-rung threshold. No surface receives a numeric trust value, a percentile, or a comparative ranking. Each gate is its own contract.

---

## §3 The trust primitives (the events that count)

The full set of events that constitute trust progression. Adding an event to this set is a doctrinal review, not a maintenance task — the set is the contract.

**§3.1 — Mutual boo.** User A boos user B, user B boos user A back, both within a 7-day window. The atomic event is the second boo; the first is operational state until the second arrives. Mutual boo opens the chat gate (per the existing boo-first chat doctrine).

**§3.2 — Completed handoff.** A beacon-anchored convergence handoff in which both parties confirm a resolution from the D19 §6.10 locked vocabulary (Passed on / Sorted / Covered / Claimed / Going together / Heading there / Picked up / Handed over). The atomic event is the second-party confirmation; the first is operational state until then.

**§3.3 — Consented care-role pairing.** Two users explicitly enter a care relationship through the care-suite surface — typically one as the supporter, one as the supported, with both parties confirming the pairing through a two-sided consent flow. The atomic event is the second-party confirmation.

**§3.4 — Safety contact pairing.** A user adds another user as a Telegram SOS trusted contact and the receiving user confirms. The atomic event is the second-party confirmation. This is the most privileged primitive — it grants the receiving user the right to receive SOS routing about the originating user, with all the responsibilities that implies.

**§3.5 — Disputed-handoff reversal.** A previously-recorded completed handoff (§3.2) is reversed through D21's dispute resolution flow with the operator-audit-logged path. The atomic event is the audit-logged reversal record. This primitive has consequence: it removes a prior completed handoff from the trust event sequence for that pair, returning the pair's position to what it was before that handoff occurred.

**§3.6 — User-initiated retraction.** A user can retract their own contribution to a prior primitive event (e.g., un-boo, withdraw from a care pairing, remove a safety contact) at any time. The retraction is itself an event in the sequence and the trust position re-derives accordingly. Retractions are unilateral and do not require the counterparty's consent — D08 visibility patterns inherit here: the user always has the right to walk back their own disclosure.

**§3.7 — Decay events.** Per §6, events decay through a state machine over time and become non-contributing to the current trust position. Decay is not a stored event; it is implicit in the position function's reading of event timestamps against the current query time.

These six event classes are the complete trust primitive set. Anything not in this list does not constitute trust progression. Specifically: chat message count, time-in-app, beacon drops, profile views, app opens, music plays, listing creations, search queries, follow-style relations, "friend" requests, public attestations from third parties, model-inferred patterns, and any other behavioural metric do not contribute to trust position. Each of those would be a back-door score; the substrate refuses to compute it.

---

## §4 The D34 ladder rungs (threshold events per rung)

D34 §3 names the ladder. D24 fixes the threshold events:

**§4.1 — Ambient.** Default state between any two users. No threshold event required. The user is on the platform; the other user can see what D08 visibility makes available. No constitutional consequence beyond the baseline visibility contract.

**§4.2 — Contextual.** The pair has been in a shared signal context — both surfaced in the same beacon's Ghosted thread, both viewed the same care beacon's resource page, both attended an operator's event (per D31 — attendance is not stored, so this rung's contextual signal is operational not persistent). Contextual is operational state, not a persisted trust position. It opens no gates by itself.

**§4.3 — Coordinated.** The pair has explicitly engaged a shared signal — for instance, both have indicated intent on the same beacon (one as host, one as responder). The threshold event is the responder's intent. Coordinated opens the chat opener affordance from D34 §3.5 but not the chat itself.

**§4.4 — Converged.** Either §3.1 mutual boo OR §3.2 completed handoff has occurred between the pair, with the constituent events still within their non-decayed window per §6. Converged opens the chat gate (per boo-first doctrine) and unlocks the convergence affordance on the hybrid sheet.

**§4.5 — Trusted.** Two or more completed handoffs (§3.2) within a 90-day window OR an active care-role pairing (§3.3). Trusted opens the directional follow-up affordances (e.g., "send a quiet check-in" outside of an active handoff) and unlocks the care-suite recommendation surface for that pair.

**§4.6 — Care.** Active §3.3 care-role pairing OR active §3.4 safety contact pairing. Care opens the highest-consequence affordances — SOS routing, direct unsolicited contact, care-resource synchronisation. Care requires explicit consent and explicit termination through the care-suite surface; it does not arrive through accumulation of lesser primitives.

Each rung's threshold is the doctrinal contract. Lowering a threshold (e.g., "one completed handoff = Trusted") is doctrinal drift, not configuration. Raising a threshold for a safety reason (e.g., a user-facing setting "require two safety pairings for Care") is permitted because it makes the gate stricter, not looser.

---

## §5 Trust consumption (where in the platform positions are read)

The complete list of surfaces and flows that may consume a (pair, position) read. New consumers require doctrinal review.

**§5.1 — Boo-first chat gate.** Reads the (paying user, receiving user) pair's position. Opens chat when position is at least `converged`. No other read is required; the gate is binary against the threshold.

**§5.2 — Care-suite recommendation surface.** Reads the pair's position to surface care resources at the resolution of a beacon when both parties are at `trusted` or higher. Surfacing care resources at lower rungs is permitted but the recommendation is generic (D15 care language patterns) rather than pair-personalised.

**§5.3 — SOS routing dispatcher.** Reads the (user-in-distress, trusted-contact-list) one-to-many position set, where each pair must be at `care`. The dispatcher does not derive trust; it consumes the explicit §3.4 safety pairing.

**§5.4 — Dispute flow (D21 inheritance).** Reads the pair's prior §3.2 completed handoff events to validate that the disputed transaction occurred. Does not derive blame; the dispute flow's resolution is operator-audit-logged per D21 §3.4.

**§5.5 — Convergence affordance on hybrid sheet.** Reads the pair's position to choose whether to render the convergence opener as `Heading there too?` (per D34 §4.5 when at converged) or as the softer `Still available?` (at lower rungs). The render distinction is small and within D15 tone constraints.

**§5.6 — Refund flow (D28 inheritance, when shipped).** Reads §3.5 disputed-handoff-reversal history to validate the refund request. Does not produce a per-user "refund risk score."

That is the complete consumer set as of D24's establishment. Adding a consumer requires the consumer be named in this section by amendment.

---

## §6 Decay (D22 inheritance for trust events)

D22 §3 establishes that memory decays. D24 binds the same discipline to trust events:

**§6.1 — Mutual boo (§3.1) decays through fresh → recent → gone with the same thresholds as D22 §3.1 trajectory.** A mutual boo from over 30 days ago no longer contributes to a converged position. The chat gate must re-open with a new boo cycle.

**§6.2 — Completed handoff (§3.2) decays through a 90-day window for `converged` contribution and a 180-day window for `trusted` contribution.** After 180 days, the handoff is no longer contributing to the trust position. The substrate retains the regulated settlement row per D21 for regulatory minimum; the trust event derived from the settlement is decay-bound.

**§6.3 — Care pairing (§3.3) does not decay automatically.** It persists until either party terminates via the explicit care-suite surface. This is intentional: care relationships are explicitly maintained and explicitly ended, not allowed to fade.

**§6.4 — Safety pairing (§3.4) does not decay automatically.** Same reasoning. SOS routing depends on the explicit ongoing consent; passive decay would create silent gaps in safety coverage.

**§6.5 — Disputed reversal (§3.5) does not decay.** A reversal permanently removes the contributing event from the trust event sequence; the reversal itself is the absence-of-prior-event marker.

**§6.6 — Retraction (§3.6) is immediate and permanent.** A retracted event is removed from the contributing sequence immediately and does not re-emerge.

§6 makes the (pair, position) function time-dependent. The same event sequence read at different times produces different positions. This is how the system "forgets" trust without persisting a faded score: the source events fall out of the contributing window, and the position function reads accordingly.

---

## §7 Surface visibility (user sees the basis)

D24 binds that any consequence the system applies to a user must be explicable to the user in terms of the underlying primitive event.

**§7.1 — A gated surface tells the user what's missing.** When a chat is closed because the pair is below `converged`, the surface says (in D15 tone): "boo back and the chat opens." It names the primitive event that would resolve the gate. It does not say "trust score too low" or "we don't think you're ready."

**§7.2 — A user can see their own trust events.** A user has a per-relationship view available for any user they have at least one primitive event with: the list of events constituting that relationship, with timestamps and decay state. This is the user's relationship history with the other user. It is not a score, it is a log.

**§7.3 — A user cannot see another user's events with third parties.** User A cannot see user B's trust position with user C. The substrate refuses the query because it would create a public-reputation surface, which §8 forbids.

**§7.4 — A user can see the basis for a consequence at the moment it applies.** If the dispute flow surfaces a reversal review, the user sees which prior handoff is being reversed and the operator-audit-logged decision basis. If SOS routing fans out to a trusted contact, the contact sees the user named and the time of escalation. Transparency is at the moment of consequence; not earlier (would amount to scorekeeping), not later (would be incomprehensible).

**§7.5 — The retraction button is co-located with the visibility surface.** Anywhere a user can see their own contributed primitive event, they can retract it (§3.6). Co-location is the affordance discipline; retraction is not hidden in a settings page.

---

## §8 Anti-caste protections

These are the absences that prevent the doctrine from mutating into a status system.

**§8.1 — No public ranking.** No leaderboard, no "top users," no "most trusted in your area." Per D19 §4.5 anti-hustler-economy. The pair-shape of trust (per §2.1) makes this structurally hard but not impossible; §8.1 explicitly forbids it at the surface layer.

**§8.2 — No visible badges that aggregate trust.** No "verified," no "trusted member," no "host since 2024," no "gold-tier resolver." Per D20 §5.3 identity symmetry inheritance. Single-event affordances are permitted (e.g., a small marker on a per-handoff card showing both parties confirmed); pattern-aggregating badges across handoffs are not.

**§8.3 — No model-derived trust.** Per D32 §8. The position function is deterministic. Models do not contribute to it.

**§8.4 — No portable trust profile.** Per D31 §2.5 + D33 §3.4. Trust does not export. A user cannot "take their trust to a partner platform." Operators cannot request a "trusted users in our district" report — the per-pair shape of trust makes the report incoherent, but the absence is also doctrinal.

**§8.5 — No fee or visibility differential based on trust position.** Per D19 + D21 §9. A "trusted" user does not pay a lower platform fee. A "converged" user's beacons do not surface higher in ranking. Trust opens specific gates (§5); it does not provide preferential platform treatment.

**§8.6 — No publicly visible trust ladder progress.** A user does not see "you are 1 handoff away from Trusted with this person." The surfaces use trust positions to gate behaviour and to label affordances in tone-appropriate language, but they do not produce a progress bar or a "level up" surface. Per D34 anti-gamification.

---

## §9 Anti-portability (trust does not leave the substrate)

Per D31 §2.1 + §2.5 inheritance, with additional D24 specifics:

**§9.1 — No "export your trust history" feature.** A user has the per-relationship visibility surface (§7.2) inside the app; they do not have a download. The events are platform-internal observable state, not portable assets.

**§9.2 — No API for third-party trust readers.** Partner platforms cannot query "is user X trusted on HOTMESS." The platform does not provide such an API; the per-pair shape makes the query incoherent, but the absence is also doctrinal.

**§9.3 — No data sale of trust patterns.** Per D33 §5 inheritance — but worth restating because trust patterns are exactly the kind of data a future acquirer would offer to license. The aggregate atmospheric residue (D33) holds no per-user trust; per-pair trust is reconstructable only from inside the platform's substrate at query time. There is no asset to sell.

**§9.4 — No "look up someone's reputation" surface.** A user cannot enter a handle and see "this user has completed X handoffs platform-wide." That would reduce to a hidden score per §2.1. The surfaces show the requesting user's own relationship state with the target user, never the target's aggregate behaviour.

---

## §10 Safety vs trust (the dangerous collision)

This deserves its own section because conflating safety with trust is the single most common drift pattern in platforms attempting D24-shaped systems.

**§10.1 — Safety flags do not reduce trust position.** A user who has been the subject of a safety report does not see their trust positions decrease as a consequence. Safety actions are platform-internal moderation per D32 §5.6, audit-logged, human-reviewed. They do not feed back into the trust event sequence.

**§10.2 — Trust position does not reduce safety obligation.** A `trusted` user can still be the subject of an SOS event involving them. A `care`-position user can still be subject to a safety report. Trust does not earn exemption from safety surfaces.

**§10.3 — Safety events are a separate event class with separate substrate.** Safety reports, SOS dispatches, moderation actions persist in their own substrate (locked to operator-audit-logged paths per D33 §3.4). They do not write into the trust event sequence. They do not derive from it.

**§10.4 — Reciprocal safety pairing is not trust.** A user adding a Telegram SOS trusted contact (§3.4) is granting that contact a specific safety-routing right. The grant is consequential and explicit; the receiving contact gains the SOS routing right, nothing else. The pairing places the pair at `care` rung for the purpose of §5.3 SOS consumption — it does not transmute into a "this user is a safe user" platform-wide attestation.

**§10.5 — Safety review does not consume trust position.** When the platform reviews a flagged user (e.g., multiple safety reports), the reviewer does not see the user's trust positions with other users. The review proceeds on the safety-event substrate alone. Trust does not exonerate; it is structurally invisible to the review.

§10 is the section that protects the doctrine from becoming a punishment system. The substrate's trust events and the substrate's safety events are different schemas, written by different paths, read by different surfaces. They do not bleed into each other.

---

## §11 What D24 forbids

In addition to inherited prohibitions:

**§11.1 — A persisted "trust_score" or "reputation" column anywhere.** Not on `users`, not on `relationships`, not on `safety`, not in any cache. The position is reconstructed at query time per §2.2.

**§11.2 — A "predicted progression" surface or function.** No "you are likely to reach Trusted with this user within 30 days." No model-derived prediction of relationship trajectory.

**§11.3 — Cross-pair aggregation.** "How many Converged relationships does this user have?" is per-se forbidden as a query because it produces a single-number reputation per §11.1.

**§11.4 — Operator-side trust visibility.** An operator cannot see "which of your venue's attendees have high mutual trust." Per D31 §2.1 + §4.5 inheritance.

**§11.5 — Trust-mediated surface ranking.** Beacons from `trusted` users do not surface preferentially. Listings from `converged` users do not float to the top. Ranking is per surface's own doctrine, with no per-user trust input.

**§11.6 — Trust as a paywall.** No "upgrade to skip the boo gate." Boo is the primitive; payment cannot substitute. Per D21 §9 + §11.

**§11.7 — Synthetic trust events.** A user cannot purchase a primitive event. Operators cannot "vouch" a user into a higher rung. Platform-generated convenience trust events (e.g., "you both have HNH MESS subscriptions") are forbidden — the primitives are user-pair-produced, not contextually-inherited.

**§11.8 — Trust as a moderation signal.** Per §10, safety review does not consume trust positions. Restating because the inverse temptation — using high trust as "innocent until proven guilty" — is also a violation.

---

## §12 What D24 permits

**§12.1 — Per-pair relationship history surface.** The user-visible log of primitive events for a relationship the user has (§7.2).

**§12.2 — Gate-shape consumption per §5.** Each surface that needs to gate behaviour reads the pair's position against a threshold.

**§12.3 — Retraction at any time via §3.6.** Users can always walk back their own contribution.

**§12.4 — Tone-appropriate gate labelling per §7.1.** Surfaces label gates in D15-compliant language naming the primitive needed.

**§12.5 — Decay-aware position computation per §6.** The position function reads event timestamps against current time.

**§12.6 — User-controlled stricter gates.** A user can configure their own gate thresholds upward (e.g., "require Trusted before someone can boo me"). Lower is forbidden (would weaken the contract).

**§12.7 — Surface-level affordance language per §5.5.** Convergence affordance text adapts within D15 tone constraints to the rung.

**§12.8 — Auditable position function source.** The function lives in source code, version-controlled, and is part of the doctrine inheritance.

---

## §13 Acceptance test

D33 §9 + D32 §11 + D24 specific:

§13.1 — Show the position function source. Confirm it is deterministic over (pair, event-sequence, time).

§13.2 — List the trust primitive events the implementation persists. Confirm exact match with §3.

§13.3 — Confirm no `trust_score`, `reputation`, `level`, or equivalent column exists on any user-shaped table.

§13.4 — Show every gate that reads a position. Confirm each is boolean against a per-rung threshold per §5.

§13.5 — Show the per-relationship history surface (§7.2). Confirm a user can retract any primitive they contributed.

§13.6 — Confirm no cross-pair aggregation query exists (no "count converged relationships per user").

§13.7 — Show the safety event substrate. Confirm it has no foreign key into the trust event substrate and the trust event substrate has no foreign key into safety.

§13.8 — Confirm the user-visible gate copy names the primitive needed (e.g., "boo back and the chat opens") not the rung label or score.

§13.9 — Confirm no model invocation reads trust positions or contributes to position derivation. Per D32 inheritance.

A PR introducing trust-mediated behaviour without all nine answers does not ship.

---

## §14 Drift indicators

In addition to inherited drift indicators:

- A `trust_score`, `level`, `xp`, `tier`, or `rep` column proposed on any user-bearing table.
- A "you're 2 handoffs from Trusted" surface.
- A "top hosts in your area" leaderboard.
- A "verified user" badge appearing on profiles.
- An operator dashboard listing per-user trust positions.
- A model invocation that consumes trust event history as context.
- A "trust portability" or "trust export" feature.
- A "platform trust API" for partner integrations.
- A safety flag implementation that decreases trust positions.
- A trust position implementation that decreases safety scrutiny.
- A paid upgrade to "skip the boo gate."
- A purchased or operator-granted primitive event.
- A "people you might trust" recommendation surface.
- A trust-position-based ranking on any user-facing surface.

Each is an audit moment. Revert and refactor.

---

## §15 Boardroom test framing

- "Can we show top trusted hosts in each district?" — No. §8.1 + §11.3 bind.
- "Can we offer 'verified host' status as a premium tier?" — No. §8.2 + §11.7 bind.
- "Can the operator see which attendees are high-trust users?" — No. §11.4 + D31 §2.1 bind.
- "Can we use trust history for fraud prevention?" — Dispute flow (§5.4) consumes the explicit reversal history; not a derived score. AML / fraud goes through Stripe's models per D21 §4.2, not through HOTMESS's substrate.
- "Can we offer a 'trusted user' badge that unlocks features?" — Trust opens specific gates. It does not produce a badge or unlock cosmetic features. §8.2 + §11.7 bind.
- "Can we sell trust pattern data?" — No data exists in a sellable form. §9.3 binds. The per-pair shape makes the data category incoherent.
- "Can we let users pay to skip the boo gate?" — No. §11.6 binds.
- "Can we recommend users to each other based on trust patterns?" — Per-pair shape forbids it; model inference forbids it. Aggregate atmospheric surfaces (D33 §6) may suggest atmospheric texture; not specific users.
- "Can users export their trust profile to a new platform?" — No. §9.1. There is no profile; there is a per-relationship log inside the app.
- "Can we use AI to predict abuse based on trust patterns?" — No. §11.8 + D32 §8 bind. Safety review is human and audit-logged.

---

## §16 Forward inheritance

**§16.1 — D25 (In-App Messaging).** The messaging substrate inherits D24's gate consumption pattern for the boo-first chat gate, post-mutual-boo per-pair chat substrate, and the typed-content boundary D32 §6.3 binds. Messages do not contribute trust events directly; only mutual boo (§3.1) and the convergence handoff resolution (§3.2) do.

**§16.2 — D28 (Refund & Cancellation).** Refund flow inherits §5.4 + §3.5 — disputed-handoff reversal is the trust-event consequence of a successful refund/dispute resolution. The refund flow itself does not produce a trust-relevant event beyond §3.5; "user has been disputed N times" is not a position-bearing surface.

**§16.3 — Future agent-shaped features.** Per D32 §14.1 — agents may surface affordances based on the requesting user's own per-pair trust positions for which the user has the relationship history surface (§7.2). Agents may not synthesise across pairs or invent trust-mediated affordances.

**§16.4 — Future operator-care-partner roles.** Operator-care-partner roles (§D31 §13) granted SOS routing for handoffs at their venue inherit §3.4 safety pairing semantics, with operator-side consent constituted by the role configuration and per-event user consent per D31 §6.4.

---

## §17 Naming and references

- **The trust primitive set** is the six event classes in §3.
- **The position function** is the deterministic (pair, event-sequence, time) → rung map in §4.
- **The gate-shape consumption pattern** is the §5 contract.
- **The decay-aware position computation** is the §6 binding.
- **The user-visible basis-of-consequence** is the §7 contract.

Reference for inheritance:
- `docs/doctrine/33-memory-permanence-doctrine.md`
- `docs/doctrine/22-temporal-doctrine.md`
- `docs/doctrine/20-identity-doctrine.md`
- `docs/doctrine/34-trajectory-doctrine.md`
- `docs/doctrine/15-care-language-doctrine.md`
- `docs/doctrine/32-ai-automation-doctrine.md`
- `docs/doctrine/19-marketplace-doctrine.md`

---

## §18 What ships next

D24 is now a written constitutional commitment. No trust-mediated behaviour ships without inheriting it.

The first implementation work, when scoped:

1. **Slice 1 — Trust primitive event substrate.** Migration establishing the per-primitive event tables (one table per primitive class, each in a D33-compliant shape: aggregate where the contributing-pair is the only addressable identity; regulated-style where the event has financial or safety consequence). No UI.
2. **Slice 2 — Position function.** Deterministic source-code function over the event sequence. Unit tested against §3 + §4 fixtures. No UI.
3. **Slice 3 — Per-relationship history surface (§7.2).** User-facing log of own primitive events with retraction affordance (§3.6).
4. **Slice 4 — Migration of existing gates to the position function.** The existing boo-first chat gate, SOS routing, dispute flow, convergence affordance all migrate to read the position function. Visible behaviour does not change; the architecture underneath becomes D24-compliant.
5. **Slice 5 — Decay enforcement and audit.** Scheduled job that audits the position-function reads against the §6 decay windows. No persistence; just monitoring for implementation drift.

Each slice ships independently under the slice format. Each PR answers D33 §9 + D24 §13 acceptance tests.

---

## §19 Closing

HOTMESS will gate behaviour on relationship state, because the platform's social surface depends on it. The gating will not become a score, a caste, or a surveillance instrument.

The single architectural move that prevents the collapse is **trust is event sequence, not score.** Each rung is constituted by a specific user-witnessed event. The position is reconstructed at query time from the events themselves, not derived from a model and not denormalised into a column. The events decay. The user sees the basis for any consequence. The user can retract any event they contributed.

The boundary between safety and trust (§10) is the second architectural move. Safety lives in its own substrate, is its own event class, and is read by its own surfaces. The two do not bleed into each other. Conflating them would produce either a punishment system (safety reduces trust) or an immunity system (trust exempts from safety review). Both are forbidden.

The platform produces confidence without producing hierarchy. That is the durability claim.

D24 is the last constitutional substrate doctrine. With it, HOTMESS's reconstruction-resistance is complete across persistence (D33), settlement (D21), operators (D31), models (D32), and now relationships (D24). The remaining doctrines — D25, D28, D23/D26/D27/D29/D30 — inherit this layer rather than extend it.
