# D28 — Refund & Cancellation Doctrine

**Status:** canonical. Established 2026-05-31.
**Inherits from:** D15 (Care Language), D17 (Surface Layer), D19 (Marketplace), D20 (Identity), D21 (Payment & Payout), D22 (Temporal), D24 (Contextual Trust Weighting), D25 (In-App Messaging), D31 (Venue & Partner Power), D32 (AI & Automation), D33 (Memory & Permanence), D34 (Trajectory).

---

## §0 Why this doctrine exists

D21 §10 previewed refund and cancellation flows; D25 §16.1 named D28 as the doctrine governing dispute resolution that surfaces from the chat. The full doctrine has not yet been written.

D28 is the doctrine that ensures peer money flow can be reversed under user-friendly conditions without the reversal substrate becoming the surveillance back door that D21 + D33 + D24 spent constitutional capital closing. The temptation here is severe — a refund flow naturally asks for "user dispute history" as a feature, and that history is exactly the kind of per-user behavioural pattern D24 §11 forbids as a position-derived score.

The resolution is the same architectural move D24 used for trust: **dispute outcomes are events, not scores.** A reversal is an event that joins the regulated settlement table (D21 §3.1) and contributes to the D24 §3.5 disputed-handoff-reversal trust primitive. The substrate does not derive a "user is risky" inference; the substrate does not deny refund requests based on aggregate behaviour; the substrate does not produce a per-user dispute statistic visible anywhere.

The single sentence: **reversal is a right, not a privilege, and it does not produce reputation.**

---

## §1 Scope

D28 governs:

- Refund flows for peer-to-peer convergence handoffs that involved money flow (D21 §6).
- Cancellation flows for handoffs that did not yet complete (D21 §6.5 `cancelled` state).
- Dispute flows under D21 §6.6 `disputed` state, including operator-audit-logged intervention.
- The user-surface and chat-surface contracts for initiating, negotiating, and resolving reversals.

D28 does NOT govern:

- Shopify shop refunds. Per D21 §1, shop checkout is out of D21 scope; refunds inherit Shopify's standard merchant-side flow.
- Subscription refunds. Existing tier-wiring + Stripe subscription handling governs that flow.
- Care-suite emergency-fund disbursements (if introduced later). Those would be a recovery-domain flow with their own doctrine.
- SOS-related cost recovery. Out of scope; safety substrate operates independently.

---

## §2 Core principle: reversal is a right, not a privilege

**§2.1 — Any party to a settlement may initiate a reversal at any time before the irreversible substrate-deletion window closes (D22 §5.2 atmospheric pipeline equivalent for settlements).** No "earned" reversal right; no "trusted-user-only" reversal; no platform-fee differential for reversals.

**§2.2 — Reversal requests are not adjudicated by the platform.** Per D32 §8 + §4.9, no model decides who is right. Per D21 §3.4, operator audit-logged intervention is reserved for cases where Stripe's own dispute resolution does not produce a clean outcome and a human operator review is the regulatory backstop.

**§2.3 — Reversal does not produce a per-user reputation column.** Per D24 §11.1 + D33 §1.2. The dispute event joins the D24 §3.5 trust primitive set for the specific pair; it does not aggregate platform-wide into a "user has been refunded N times" surface.

**§2.4 — Reversal language uses D15 tone, not legal tone.** Per the locked resolution vocabulary D19 §6.10 + D34 §4.7. "Sorted differently" / "Passed back" / "Did not happen as planned" — never "Refund requested," "Dispute filed," "Chargeback initiated" (those are Stripe-side substrate language that does not surface on the HOTMESS user surface).

**§2.5 — Reversal does not gate future activity.** A user who has been on either side of a reversal does not lose access to convergence surfaces, does not see beacon-drop quotas reduced, does not face stricter gates on future handoffs. The substrate's per-pair shape (D24 §2.1) means a reversal between A and B has no implication for A's interactions with C.

---

## §3 The reversal substrate

**§3.1 — Reversal events live in the regulated settlement schema (D21 §3.1).** They are a transition on the existing state machine (D21 §6.4 `refunded`), not a new substrate. The reversal row inherits all of D21's substrate-incapability commitments: locked to operator-audit-logged read paths, no application-layer denormalisation, atmospheric-only summarisation.

**§3.2 — The trust event is per-pair, not per-user.** Per D24 §3.5. The disputed-handoff-reversal trust primitive lives in the trust event substrate for the specific (initiating-user, counterparty-user) pair only. Cross-pair aggregation is forbidden by D24 §11.3.

**§3.3 — No "dispute likelihood" column.** No model invocation derives a probability that a user will dispute. No A/B-tested copy variant for dispute-prone users. Per D32 §4.7 + D24 §11.2.

**§3.4 — Reversal language is locked.** Per §2.4. The user-surface enum of reversal-related labels lives in code under the same `RESOLUTION_COPY` table from `src/lib/atmospheric.ts` or its successor. Adding a label is doctrinal review. The CI scan from PR #737 (resolution-vocab guard) extends to D28 surfaces.

---

## §4 Initiating a reversal

**§4.1 — Reversal initiates from the chat surface where the settlement was negotiated.** Per D25 §16.1. The chat is the conversation; the reversal is a turn in that conversation. There is no dedicated "open a dispute" surface accessible from a nav-level affordance.

**§4.2 — Reversal request is a templated composer affordance.** A user taps "Sort it differently" from a fixed set of reversal openers in the composer. The opener inserts a templated message naming the issue ("didn't happen as planned," "different plan now") in D15 tone. The counterparty receives a normal chat message with an inline "Agree to sort" affordance.

**§4.3 — Either party may initiate.** Per §2.1. The substrate accepts the reversal request from whichever side. There is no "only the paying user can refund" surface.

**§4.4 — No fees on reversal initiation.** The platform does not charge a fee to initiate a reversal. Per D19 §4.5 anti-hustler-economy.

**§4.5 — Reversal initiation does not freeze the counterparty's other activity.** The counterparty's other beacons, chats, and handoffs continue normally. The reversal affects only the specific (pair, beacon, settlement) tuple.

---

## §5 Resolving a reversal

**§5.1 — Mutual agreement is the default path.** If both parties confirm the reversal through the chat affordance, the Stripe API call refunds the held or released funds, the regulated state machine transitions to `refunded`, the D24 §3.5 trust primitive is added to the per-pair event sequence, and the conversation continues if it has reasons to.

**§5.2 — Non-agreement enters Stripe's dispute flow.** If the parties do not agree through chat, the request escalates through Stripe's dispute resolution. The platform's role per D21 §4.2 is to surface Stripe's outcome through the regulated state machine; the platform does not adjudicate.

**§5.3 — Operator-audit-logged intervention is the regulatory backstop.** When Stripe's process produces a result that requires operator review (e.g., explicit Stripe dispute with platform notification), the operator intervenes via the D33 §3.4 / D21 §3.4 audit-logged path. The operator's decision becomes part of the regulated row; it does not propagate to a public surface or to the user's profile.

**§5.4 — Reversal of partial-settlement states.** A settlement in `initiated` or `held` state is cancellable (D21 §6.5) by either party with no Stripe-side dispute necessary — the hold expires or is voided. The chat-side affordance handles both states with the same templated opener; the state-machine transitions differ.

**§5.5 — No "negotiate partial refund."** The reversal is either confirmed or it is not. A user cannot offer "I'll refund 50%" inside the chat; that recreates marketplace bargaining surface that D19 §6.10 forbids. If parties want to settle for a different amount, they cancel the current settlement entirely and create a new beacon at the new amount per D21 §6.

---

## §6 The dispute trust event

**§6.1 — A successful reversal contributes one §3.5 trust primitive to the pair's event sequence.** Per D24 §3.5. The primitive marks the original §3.2 completed-handoff event as removed from the contributing sequence (D24 §3.5 binding); the reversal itself is the absence marker.

**§6.2 — A failed/disputed-decided reversal does not contribute a trust primitive against the user who lost the dispute.** Per §2.5 + D24 §11.8. The Stripe-side outcome lives in the regulated table for tax/AML purposes; the trust substrate sees only that the original handoff event has not been reversed (so it remains in the contributing sequence per D24 §3.2).

**§6.3 — Multiple reversals between the same pair compound only in the trust primitive sequence.** D24 §6.2 binds: completed handoffs decay through 90/180-day windows. Reversed handoffs are removed from the contributing window immediately per D24 §3.5. The pair's trust position re-derives at query time per D24 §2.2.

**§6.4 — Cross-pair compounding is forbidden.** Per D24 §11.3. A user who has been on the loss side of three reversals across three different counterparties does not see a single aggregate consequence. Each pair is independent.

---

## §7 User-surface contract

**§7.1 — User can see their own reversal history per relationship.** Per D24 §7.2. The per-relationship history surface shows the §3.5 trust primitive in the pair's event log, with timestamp and the locked-vocabulary state.

**§7.2 — User cannot see counterparty's reversal history with third parties.** Per D24 §7.3. The substrate refuses the cross-pair query.

**§7.3 — Counterparty receives explicit notification when a reversal is initiated.** Through the existing notification dispatcher per D22-compliant patterns. The notification carries the same D15 tone language as the chat opener; not "Refund request" but "[Name] wants to sort it differently."

**§7.4 — Resolution is announced inside the chat thread.** The system-emitted convergence-resolution-marker from D25 §6.4 expands to include reversal resolutions ("Sorted differently — passed back"). The marker is content under D25 §3.2 content-type rules.

**§7.5 — No "dispute received" notification surface.** Per D17 nav-as-pure-navigation + D25 §11. No badge counts disputes. No nav-level alert. The notification is per-event, per-pair.

---

## §8 Operator inheritance

**§8.1 — Operators may initiate reversals on handoffs at their own surface.** Per D31 §3.6 refusal-of-service inheritance. When an operator declines to honour a handoff (e.g., venue full, ticket invalid), the reversal flow initiates from the operator-side audit-logged path; the user receives the same chat-side notification and the reversal proceeds as if the operator were the counterparty.

**§8.2 — Operator-initiated reversals are logged in the operator audit table.** Per D31 §4.4. The operator's reason for the reversal is recorded (in audit-table-format, not user-visible). The user surface shows the locked-vocabulary reversal language only; the operator's reason does not propagate to a public surface.

**§8.3 — Operators do not see per-user reversal aggregates.** Per D31 §2.1 + D24 §11.4. An operator cannot see "this user has had N reversals against them platform-wide." The substrate refuses the query.

**§8.4 — Care-partner operators have no special dispute authority.** Per D31 §13 forward inheritance. A care-partner operator's reversal capability is the same as any operator's: per-handoff, audit-logged, per-pair.

---

## §9 What D28 forbids

In addition to inherited prohibitions:

- A `dispute_count`, `refund_count`, or `chargeback_history` column on any user-bearing table.
- A "users likely to dispute" or "dispute risk score" surface.
- A "reversal-restricted user" status that gates future activity.
- A platform-fee differential charged to "high-dispute users."
- A model-mediated dispute-likelihood inference.
- A "negotiate partial refund" surface inside chat.
- A reversal initiation fee.
- A "dispute history" public profile element.
- A nav-level dispute-pending badge.
- A platform-internal "adjudication" model that auto-decides disputes.
- A bulk-reversal admin tool (operators initiate per-handoff only).
- A "refund jail" / cooling-off period that blocks future settlements between the same pair.
- A model that drafts the reversal opener text.
- A leaderboard of "fairest hosts" or "most-trusted resolvers."

---

## §10 What D28 permits

- Either-side templated reversal initiation from chat (§4.2).
- Mutual-agreement resolution path (§5.1).
- Stripe-side dispute escalation for non-agreement (§5.2).
- Operator-audit-logged intervention for regulatory backstop (§5.3).
- Per-pair §3.5 trust primitive contribution (D24 §3.5).
- Per-relationship history visibility to the involved user (D24 §7.2).
- Counterparty notification through the existing dispatcher (§7.3).
- Operator-side reversal of handoffs at their own venue (§8.1) with audit log.
- Locked-vocabulary reversal language (§2.4) extending RESOLUTION_COPY.

---

## §11 Acceptance test

D33 §9 + D32 §11 + D24 §13 + D21 §11 + D28 specific:

§11.1 — Confirm no `dispute_count`, `refund_count`, or equivalent denormalised column exists on any user-bearing table.

§11.2 — Show the reversal-initiation path. Confirm both parties can initiate; confirm the affordance lives in chat, not a dedicated dispute surface.

§11.3 — Show the locked-vocabulary extension for reversal labels. Confirm CI scan (PR #737) covers the new labels.

§11.4 — Show the regulated-settlement state-machine transitions for §6 dispute states. Confirm no application-layer denormalisation.

§11.5 — Show the D24 §3.5 trust primitive insertion path. Confirm per-pair, no cross-pair aggregation.

§11.6 — Confirm no model invocation reads dispute history or derives dispute-likelihood. Per D32 §8 + §4.7.

§11.7 — Confirm operator-side reversal goes through the D31 §4.4 audit log; show the audit-row schema.

§11.8 — Confirm the chat-side reversal notification is rate-limited per existing dispatcher patterns, not pushed via a bespoke "dispute alert" channel.

§11.9 — Confirm no "negotiate partial refund" surface exists; reversal is binary (confirm/not-confirm).

A PR introducing reversal-flow behaviour without all nine answers does not ship.

---

## §12 Drift indicators

In addition to inherited drift indicators:

- A `disputes` table indexed by `user_id` rather than `pair_id`.
- A "refund quota" or "dispute throttle" surface visible to users.
- A "you may be disputed soon" predictive notification.
- A "best-resolving hosts" public ranking.
- A model invocation that drafts reversal-opener text.
- A bulk-reversal admin endpoint.
- A `last_dispute_at` column appearing on user records.
- A platform-fee differential for reversal-related transactions.
- An operator dashboard surfacing per-user dispute counts.
- A "trusted-user-only refund" tier.

Each is an audit moment. Revert and refactor.

---

## §13 Boardroom test framing

- "Can we charge a fee for issuing refunds?" — No. §2.1 + §4.4 bind.
- "Can we limit how many refunds a user can request?" — No. §2.5 bind. Substrate has no per-user dispute aggregate.
- "Can we use AI to detect dispute-prone users?" — No. §11.6 + D32 §4.7 + D24 §11.8 bind.
- "Can we surface a 'trustworthy seller' badge?" — No. D24 §11.7 + D20 §5.3 bind.
- "Can we publish a list of users who've never had a dispute?" — No. §11.4 + D24 §11.3 bind.
- "Can we let operators see attendee dispute histories?" — No. §8.3 + D31 §2.1 bind.
- "Can we offer 'protected settlement' as a paid tier?" — No. D21 §9 + D24 §11.6 bind. All settlements have the same reversal contract.
- "Can the model decide who's right in a dispute?" — No. §2.2 + D32 §4.9 + D32 §5.6 bind.
- "Can we hold a percentage of funds for 'dispute resolution'?" — No. D21 §4.1 binds. HOTMESS holds no funds.
- "Can we offer customer support that adjudicates disputes for a fee?" — No. §5.3 binds. Operator intervention is regulatory backstop, not a paid service.

---

## §14 Naming and references

- **The reversal initiation affordance** is the templated composer opener (§4.2).
- **The reversal trust primitive** is D24 §3.5 disputed-handoff-reversal.
- **The locked-vocabulary extension** adds reversal labels to `RESOLUTION_COPY` under CI scan.
- **The operator audit log** for operator-initiated reversals (§8.2) is the D31 §4.4 table.

Reference inheritance:
- `docs/doctrine/21-payment-payout-doctrine.md`
- `docs/doctrine/24-contextual-trust-weighting-doctrine.md`
- `docs/doctrine/25-in-app-messaging-doctrine.md`
- `docs/doctrine/31-venue-partner-power-doctrine.md`
- `docs/doctrine/32-ai-automation-doctrine.md`
- `docs/doctrine/33-memory-permanence-doctrine.md`
- `docs/doctrine/15-care-language-doctrine.md`
- `docs/doctrine/19-marketplace-doctrine.md`

---

## §15 What ships next

D28 is now a written constitutional commitment. No reversal-flow behaviour ships without inheriting it.

The implementation work (after D21 slices 1-3 land):

1. **Slice 1 — Reversal initiation affordance.** Templated composer openers + chat-side inline "Agree to sort" affordance per §4.2.
2. **Slice 2 — Mutual-agreement resolution path.** Stripe API integration for the agreed-reversal path; regulated state-machine transition.
3. **Slice 3 — Non-agreement Stripe dispute escalation.** Webhook handling for Stripe's dispute outcomes; regulated state-machine transitions.
4. **Slice 4 — Operator-side reversal flow.** Audit-logged operator-initiated reversal per §8.
5. **Slice 5 — Locked-vocabulary extension.** Append reversal labels to RESOLUTION_COPY; extend CI scan.

D28 slices follow D21 slices in implementation order — D21 slices 1-3 establish the settlement substrate; D28 inherits and reverses it.

---

## §16 Closing

HOTMESS users will sometimes need to reverse money flows that did not work out. The reversal will not become a punishment system, a reputation tax, or an adjudication surface.

The constitutional commitments here mirror D24's commitments on trust: reversal is a per-pair event, not a user-level score. It contributes to D24 §3.5 trust primitive and nothing else. It does not produce a per-user dispute aggregate. It does not gate future activity. It does not become operator-visible at the per-user layer.

The platform's role is mediation, not adjudication. Mutual agreement is the default path. Non-agreement defers to Stripe. Regulatory backstop is operator audit-logged.

The single most important sentence for the contributor reading this under support-team pressure: **reversal is a right, not a privilege, and it does not produce reputation.** A future PR introducing a "you've used too many reversals" surface is not solving a problem; it is creating a constitutional drift the doctrine forbids.

D28 closes the last named-but-unwritten doctrine that the constitutional substrate layer (D33 + D21 + D31 + D32 + D24 + D25) directly required as a forward-inheritance commitment. The remaining doctrines — D23, D26, D27, D29, D30 — are reactive fills for territories not yet pressed against. They ship as the territories arrive.
