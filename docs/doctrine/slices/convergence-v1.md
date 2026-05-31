# Slice — Beacon-Contextualised Exchange (Convergence v1)

**Format:** HOTMESS Slice Execution Format (per EXECUTION §4)
**Author:** Phil
**Date:** 2026-05-31
**Status:** Draft for sign-off; implementation gated on approval.

---

## §0. Governing Doctrines

- D08 Visibility
- D17 Surface Layer
- D19 Marketplace
- D20 Identity
- D22 Temporal
- D34 Trajectory

Discussion that leaves these six doctrines is out of scope for this slice.

---

## §1. Surface Being Changed

The beacon → hybrid sheet → temporary exchange chat → handoff → decay path, where a ticket-resale beacon dropped in Pulse becomes a contextual exchange flow that pressure-tests all four constitutional doctrines.

---

## §2. Behavioural Thesis

The exchange should feel **contextual, temporary, and socially grounded** rather than transactional. A user tapping a ticket beacon should feel like they crossed a stranger's trajectory at the same venue, not like they opened a classifieds listing. The interaction should be quieter than competitor flows and should leave less behind.

---

## §3. Sacred Invariants

- No seller rankings, no verification badges, no "trusted seller" pips (D20 §5.3)
- No urgency gamification — no "3 others interested," no countdown, no "best offer" framing (D19 §4.5, D19 §6.10 §10.5)
- "Passed on" not "Sold" in resolution copy (D19 §6.10, D34 §4.7)
- No permanent exchange memory — the temporary chat decays per D22 (§9.7 / D25 future)
- No route reconstruction — the trajectory context softens over time (D22 §3, D34 §4.5)
- No identity extraction — no "complete your profile to message" gating (D20 §10.1)
- Off-grid sellers' listings remain discoverable but emit no presence signals (D08 + D19 §1)
- Mutual paths take priority over anonymous paths (D34 §4.2)
- Buy chrome / contact CTA always visible (D18 §1)
- Price never appears on the globe surface (D19 §6.10)

---

## §4. Failure Modes

The slice fails if it produces any of these feelings:

- Feels like Facebook Marketplace or Sniffies classifieds.
- Feels like Grindr "tap then negotiate."
- The exchange chat persists and becomes a permanent thread the user has to manage.
- The buyer can infer the seller's presence from listing activity.
- The flow surfaces a "Buy Now" or "Best Price" affordance anywhere.
- The trajectory context (e.g. "Right here at Eagle") persists after relevance.
- Identity verification state becomes visible to any other user at any point.
- The hybrid sheet renders differently for "verified" vs pseudonymous sellers.
- Off-grid sellers leak presence through the listing surface.
- The completed exchange leaves searchable history beyond the retention window.
- Social pressure loops appear ("X others viewed," "trending listing").

---

## §5. Acceptance Tests

Observable pass/fail conditions, doctrine-bound:

1. **D20 §15:** A pseudonymous seller and a legal-name-disclosed seller render identically in the hybrid sheet — same chrome, same affordances, same trust-signal presentation (none). Test: visual diff between two seller profiles must show no badge / rank / tier difference.
2. **D22 §12.1:** A completed exchange thread is not retrievable in any UI surface 30 days after handoff acknowledgement. Test: archived account export query returns no thread payload for exchanges past the decay window.
3. **D22 §4.1:** No atmospheric aggregate surface exposes individual exchange data. Test: city-mood Pulse layer must not surface "X tickets passed on tonight" with identifiable participants.
4. **D34 §6:** The hybrid sheet on first open shows the trajectory context ("Right here at Eagle"). 24 hours later, the same beacon (if still active) shows "Crossed recently." 7 days later, the context line is absent. Test: render the sheet at three timestamps and confirm the context-decay progression.
5. **D19 §6.10:** No surface in the flow uses the words "Sold," "Buyer," "Seller completed," "Order," or "Transaction." Test: text scan of all UI strings in the flow against the prohibited-word list.
6. **D08 + D19 §1:** An off-grid seller's beacon is discoverable through event-page surfacing but does not appear in nearby/Pulse presence. Test: with seller in off-grid state, beacon must satisfy `discoverable=true AND presence_emitted=false` in the visibility snapshot.
7. **D34 §3.2:** The first message in the temporary chat defaults to a context-aware opener ("Still available?" / "Heading there too?"), never "hey." Test: chat surface must not present a blank input as the first affordance; a structured-opener row appears above the input.
8. **D34 §3.5:** The chat surface offers a "headed there" / route-share affordance more prominently than continued chat. Test: in the chat composer, the route/convergence affordance is visible without scroll; chat input is the secondary affordance.

If any of these eight tests fail at any PR merge gate, the slice does not ship.

---

## §6. Retention Classification

Per D22 §2 memory kinds:

| Data Created | Memory Class | Decay |
|---|---|---|
| Beacon emission | Trajectory | Aggressive — beacon expires per D12 lifecycle; tail decays within 24h post-expiry |
| Hybrid sheet view | Trajectory | Operational only — not persisted as user history |
| Contact request / BOO | Convergence | Per D22 §9.5 — 30 days for the pair |
| Temporary exchange chat | Convergence (special: ephemeral by default) | Thread decays 7 days after handoff acknowledgement; full message destruction at 30 days. Off-grid creators get 7-day default with no opt-in to persistence |
| Handoff completion event | Continuity (for the pair) + Atmospheric (aggregate) | Continuity per §9.6 asymmetric mutual rules. Atmospheric per §4 irreversibility |
| "Passed on" resolution | Continuity (asymmetric) | Stored per user view; either side may prune |
| Care escalation (if invoked mid-exchange) | Care | Per D22 §5 — quarantined; never social |

What aggregates: handoff success counts at venue-and-time grain (no per-user reconstruction). What survives indefinitely: only the atmospheric aggregate of "exchanges happened at this venue this period." What is destroyed: thread content, message attachments, route share artefacts, all per-user trajectory of the exchange.

---

## §7. Instrumentation

Allowed observations (aggregate only):

- Aggregate flow completion rate (beacon-tap → contact → handoff acknowledged)
- Aggregate abandonment by stage (beacon-tap → no contact / contact → no handoff)
- Trust-tier friction delta — the timing difference between mutual-path and anonymous-path completion, **aggregate per cohort, never per user**
- Care invocation rate during exchange flow (aggregate; supports §5 protection by showing whether the surface itself is causing distress)
- Off-grid completion rate vs visible completion rate (aggregate; tests dignity preservation)

Forbidden observations:

- Per-user replayable timelines of any exchange
- Reconstructive analytics that join individual beacons to individual users to individual handoffs
- Persistent movement trails
- Any dashboard that surfaces "active users in this flow right now" with identity
- AI/ML training inputs derived from any of the above

Per D22 §10.5: persistent behavioural replay of this flow is prohibited regardless of debugging utility.

---

## §8. PR Sequence

Maximum 4 PRs. Each: one behavioural change, one acceptance test (from §5), one rollback path.

**PR 1 — Hybrid Sheet Contract**
- New component: `L2HybridExchangeSheet.jsx` (sits between L2ProfileSheet and L2ShopSheet)
- Renders identically for pseudonymous and disclosed sellers (Acceptance Test 1)
- No verification chrome anywhere in the component
- Static trajectory context line (decay logic ships in PR 4)
- Rollback: feature-flag the component; default off
- Acceptance test binding: §5.1, §5.6

**PR 2 — Contact Paths Wired to D34 Escalation Ladder**
- BOO / mutual / request / temporary-chat affordances per D34 §2 ladder
- Structured-opener row in chat (Acceptance Test 7)
- Route-share / "headed there" affordance above chat input (Acceptance Test 8)
- Rollback: revert chat surface to pre-PR-2 layout
- Acceptance test binding: §5.7, §5.8

**PR 3 — Handoff Completion + Resolution Language**
- "Passed on" / "Sorted" / "Going together" copy locked
- Text scan in CI against prohibited word list (Acceptance Test 5)
- Aggregate atmospheric write on handoff acknowledgement
- Rollback: gate the atmospheric write behind a flag; resolution copy is the default
- Acceptance test binding: §5.3, §5.5

**PR 4 — Retention Enforcement + Context Decay**
- Trajectory context decay schedule for the hybrid sheet (Acceptance Test 4)
- Thread-decay scheduled job for temporary exchange chats
- Off-grid seller hardening per D08 + D19 §1 (Acceptance Test 6)
- Care-event quarantine binding (D22 §5)
- Archive export check confirms 30-day destruction (Acceptance Test 2)
- Rollback: extend decay windows; cannot rollback to "no decay" — that violates D22

If any PR cannot fit its description on one screen, it is too large.

---

## §9. Observation Window

The slice's purpose is learning. Four weeks post-PR-4 production deploy, the following five questions resolve as observed yes/no:

1. **Does contextual trust feel different?** Measured via aggregate completion-rate delta between flows that surface trajectory context and a control flow that doesn't.
2. **Does asymmetric memory reduce creepiness?** Measured via aggregate Care invocation rate during exchange flow versus comparable non-asymmetric platforms (baseline from prior PRs).
3. **Does off-grid preserve dignity?** Measured via the off-grid-vs-visible completion delta and via direct Phil feel-check (the qualitative gold standard).
4. **Does "shared trajectory" feel human or gimmicky?** Measured via Phil feel-check and via aggregate use of the "headed there" affordance.
5. **Does the OS feel quieter and smarter than competitors?** Measured via Phil feel-check.

If any of the five resolves "no" at the four-week mark, the slice enters adjustment review and the next slice does not ship until the doctrine boundary that failed is renegotiated.

If all five resolve "yes," D21 (Payment & Payout) drafting begins, informed by the observed behaviour.

---

## End of Slice

The convergence slice is the first instance of the HOTMESS Slice Execution Format. The format itself ships in the same PR (EXECUTION.md). Both the format and this slice are doctrine-only commits — no code yet. PR sequence in §8 begins after sign-off.
