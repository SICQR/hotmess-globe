# D21 — Payment & Payout Doctrine

**Status:** canonical. Established 2026-05-31.
**Inherits from:** D08 (Visibility), D19 (Marketplace), D20 (Identity), D22 (Temporal), D33 (Memory & Permanence), D34 (Trajectory).
**Inherited by:** D28 (Refund & Cancellation — drafting), D31 (Venue & Partner Power — drafting).

---

## §0 Why this doctrine exists

HOTMESS already moves money. Stripe powers shop checkout; Shopify is the source of truth for product inventory; subscription tiers are honoured through the membership system. None of those flows is the territory of this doctrine.

D21 governs the **next layer** — peer-facing settlement. The convergence slice (D19 × D20 × D22 × D34) established the user surface where one user passes a thing to another: a ticket, a preloved item, a handover at a venue. The convergence surface deliberately does not carry price-forward UI (D19 §6.10); the resolution is "Passed on" / "Sorted" / "Going together", not "Sold". But money sometimes changes hands inside that handoff, and when it does, the substrate that records the settlement must obey the same constitutional discipline as the substrate that records the atmospheric handoff itself.

D21 is the doctrine that ensures peer settlement does not become the back door through which surveillance retention enters the platform. It defines what HOTMESS may persist about money flow, what it may not, and how the substrate is shaped to make the line structural rather than disciplinary.

The single sentence: **HOTMESS retains exactly what regulation forces and not one column more.**

---

## §1 The scope boundary

D21 governs:

- Peer-to-peer settlement initiated through a convergence handoff. (Money passing from one user to another for a ticket, preloved item, or other beacon-anchored exchange.)
- Operator-to-platform settlement flows for venues and partners. (Subset of D31 territory; the financial primitive lives here.)
- Refunds, cancellations, and reversal flows. (Drafted into D28 with D21 as inherited substrate.)

D21 does NOT govern:

- Shopify shop checkout (HOTMESS apparel, HNH MESS products). Stripe is the operator of record; product identity is intentional and persists through the merchant relationship. The shop is a normal commerce surface, not a convergence handoff.
- Subscription billing for membership tiers. Stripe subscriptions are continuous customer relationships, not peer handoffs. Existing tier-wiring PRs (#229–#233) govern that flow.
- SOS or care-suite financial flows (e.g., emergency funds, partner-sponsored aftercare credits). Those are recovery-domain flows and inherit D15 + D33 directly, not D21.

The territorial split matters because the constitutional commitment differs. Shop checkout is a normal commerce surface where the user has explicitly identified themselves to a merchant. Convergence settlement is a handoff between two users who may not have identified themselves to each other beyond Presence Identity (D20). The latter requires substrate-incapability discipline; the former does not.

---

## §2 The peer-settlement primitive

When money flows through a convergence handoff, the substrate persists exactly four kinds of data:

**§2.1 Regulatory minimum identity.** The two parties' platform user_ids, the settlement amount, the currency, the timestamp, and the Stripe / payment-processor reference id. These exist because tax law, anti-money-laundering law, and consumer-protection law require them. Every column in this minimum identity layer requires a regulatory citation in its migration comment. No "convenience" identifying columns.

**§2.2 Settlement state.** A locked enum. Initial states are `initiated`, `held`, `released`, `refunded`, `cancelled`, `disputed`, `failed`. Per D33 §1.4, adding a state is `ALTER TYPE`. The state set is the contract.

**§2.3 Beacon class lineage (not beacon identity).** When the settlement was anchored by a beacon, the substrate persists the beacon's `kind` (`ticket | preloved | other`) and the bucketed venue class (per D33 §1.4), not the beacon's id or the venue's exact label. This lets the platform answer "how much volume settled through ticket handoffs in nightlife last week" without ever joining settlement to specific beacons.

**§2.4 Time bucket for atmospheric aggregation.** A duplicate of the regulated timestamp, quantised to the day, persisted separately and indexed for the atmospheric reads. The regulated timestamp is kept precise because regulation demands it; the atmospheric bucket is kept coarse because D33 demands it. They live in different columns and are never queried together except through a function-side join that the application cannot reach.

Anything beyond these four categories is constitutional drift.

---

## §3 The substrate split: regulated vs atmospheric

Peer settlement has a problem the atmospheric handoff did not: **regulation requires identity persistence.** D33 says identifying columns must not exist. Both cannot be true simultaneously for the same row.

The resolution is to split the substrate.

**§3.1 The regulated settlement table** holds §2.1 + §2.2 + the precise regulated timestamp. It is in a `regulated` schema (parallel to `atmosphere`), locked to `service_role`, accessible only through a `SECURITY DEFINER` function chain. The function chain authenticates the caller, validates the settlement against the Stripe webhook signature, and writes the regulated row. This table is the system of record for tax, AML, dispute resolution, and chargeback handling. Its lifetime is the regulatory minimum retention window for the relevant jurisdiction.

**§3.2 The atmospheric settlement residue** holds §2.3 + §2.4 + an aggregate counter, in the `atmosphere` schema, following D33 §1.1–§1.5 exactly. No identifying columns. Adding any is `ALTER TABLE`. This table is the system of record for **everything the platform itself needs to know** about money flow at the platform level — volume, mix, trend, district atmosphere. Nothing about specific parties or specific transactions ever crosses into this table.

**§3.3 The split is irreversible.** The atmospheric residue cannot be joined back to the regulated row. The regulated row has no `atmospheric_residue_id` column. The atmospheric row has no `regulated_settlement_id` column. The bucketed timestamp in the atmospheric row is the day; the precise timestamp in the regulated row is the second. Even if a hostile operator obtained both tables and tried to join on the time bucket, the atmospheric row aggregates multiple regulated rows into one counter increment — the join is many-to-many with no disambiguating column. Reconstruction is not just hard; it is mathematically degraded by the aggregation step.

**§3.4 What the application can read.** Application code reads from neither table directly. Atmospheric reads go through a function in the `atmosphere` schema that returns aggregates over windowed counters (per D33 §6). Regulated reads exist for exactly one purpose: dispute resolution. They go through a function in the `regulated` schema that is gated by an operator-role grant and is logged in an audit table that the operator cannot rewrite. No application surface ever sees a regulated settlement row.

---

## §4 The Stripe boundary

HOTMESS is not a money-transmitter. Stripe is. The platform's relationship to the money flow is that of a Stripe-Connect platform — facilitating settlement between two Stripe accounts (the two users, where each has been onboarded to a Stripe Express account or equivalent at the moment they first need to receive money).

**§4.1 Money does not pass through HOTMESS.** At no point does the platform hold user funds. Settlement is Stripe-to-Stripe. The platform's role is the orchestration of the Stripe API calls. The substrate persists the metadata about what happened; it does not persist the funds themselves. This is a structural commitment, not a UX one: a future engineer cannot introduce "platform-held escrow" without changing the Stripe-Connect configuration AND landing a new persistence primitive, both of which are visible doctrinal acts.

**§4.2 Stripe is the source of truth.** When the regulated settlement table and Stripe disagree, Stripe wins. Reconciliation cron jobs query Stripe and amend the regulated table; they never amend Stripe based on the regulated table. The platform table is a denormalised view of Stripe state, kept for performance and for the regulatory audit trail; it is not authoritative.

**§4.3 The webhook is the only legal write path into the regulated settlement table.** Stripe's signed webhook delivers the events that trigger writes. The webhook signature is validated; the event id is dedup-keyed; the write is upsert-by-event-id. No other code path writes to the regulated table. (Service-role bypass exists for operator-led correction but is logged in the audit table per §3.4.)

**§4.4 The atmospheric residue write is downstream of the regulated write.** When the regulated write succeeds, the same webhook handler emits a call to the atmospheric residue's record function (via the public wrapper pattern from #739). The atmospheric write is fire-and-forget; if it fails, the regulated row remains authoritative and the atmospheric counter undercounts. D22 §4 binds: atmospheric signals never throw to user surface, and they never block the regulated truth.

---

## §5 Payouts

Payouts are settlement releases from Stripe-held balances to user bank accounts. They follow Stripe's payout schedule, not the platform's. The platform's role in payouts is purely informational: a user can ask "what's pending and what's been released" through a function-gated surface that queries Stripe directly (with caching).

**§5.1 No persisted payout ledger.** The platform does not maintain a parallel ledger of payouts. Stripe's ledger is authoritative; the platform reads from Stripe on demand. The only platform-side persistence is the regulated settlement table's `state` column reflecting `released` once Stripe confirms.

**§5.2 No "wallet" abstraction.** HOTMESS does not present a balance, a wallet, or a withdraw button. Stripe Express dashboards do that. Surfacing a balance inside the HOTMESS app would imply HOTMESS holds funds, which it does not (§4.1), and would create a UX expectation that pulls toward a wallet abstraction over time. The structural commitment is: no balance UI inside the app, ever.

**§5.3 First-time payout onboarding.** When a user first qualifies for a payout (i.e., is on the receiving side of a settlement), Stripe Express onboarding is triggered as a redirect flow. The platform persists `stripe_account_id` against the user record after onboarding completes; it persists nothing else from the Stripe Express dashboard.

---

## §6 The peer-settlement state machine

§6.1 — `initiated` — a beacon-anchored handoff has named a settlement intent. Either party may name the amount; the other may accept or counter. This state lives in operational application memory; it is not persisted to the regulated table.

§6.2 — `held` — both parties have agreed; Stripe has authorised a hold on the paying user's payment method. The regulated row is created at this transition. The atmospheric residue is NOT incremented yet — held funds are not settled volume.

§6.3 — `released` — the receiving user has confirmed delivery (via the convergence handoff resolution surface). Stripe captures and routes to the receiving user's Stripe account. The regulated row state flips to `released`. The atmospheric residue is incremented at THIS transition — released is the only state that counts as platform volume.

§6.4 — `refunded` — either party has invoked refund. Per D28 territory; the regulated row state flips. The atmospheric residue is decremented by an explicit refund counter (separate column from `count`) rather than mutated, so the original release record remains accurate in aggregate.

§6.5 — `cancelled` — neither party captured. The hold expires per Stripe's window. The regulated row state flips. The atmospheric residue is unaffected (cancelled holds are not platform volume).

§6.6 — `disputed` — Stripe has flagged a dispute. The regulated row enters a dispute sub-flow; operator intervention via §3.4 audit-logged path. The atmospheric residue is unaffected at the moment of dispute; if the dispute resolves to refund, follow §6.4.

§6.7 — `failed` — Stripe rejected the hold or release. The regulated row records the failure for audit. The atmospheric residue is unaffected.

The state machine is locked. Adding a state is `ALTER TYPE` per D33 §1.4. Transition logic lives in the webhook handler; user-facing application code reads state from the function-gated path, never mutates it.

---

## §7 Identity and the receiving side

Per D20, sellers on convergence surfaces render symmetrically regardless of whether they are pseudonymous or have disclosed legal identity. Money flow imposes a constraint D20 does not: Stripe requires the receiving user to satisfy Stripe Express identity verification. The platform cannot waive this.

**§7.1 The Stripe identity boundary is downstream of D20.** A pseudonymous user can list a beacon on a convergence surface and remain pseudonymous to other users. The moment they accept a settlement and qualify for payout, they identify themselves to Stripe, not to HOTMESS, and not to the paying user. The paying user sees the same Presence Identity throughout; the receiving user does not gain a verification badge on their profile (per D20 §5.3 — no verification chrome on convergence surfaces).

**§7.2 The platform does not store Stripe verification documents.** Stripe holds the identity documents in Stripe's vault. The platform holds only the Stripe `account_id` and a boolean `payouts_enabled`. The documents themselves do not exist in HOTMESS's substrate.

**§7.3 The paying user does not learn the receiving user's legal identity.** Stripe's payment flow does not require the payer to see the recipient's verified name; the merchant of record from the payer's perspective is the platform (HOTMESS) via the Stripe Connect arrangement. This is a constitutional commitment that survives the entire receive-side identification process: D20's identity symmetry is preserved on the paying side even when the receiving side has crossed the Stripe identity boundary.

---

## §8 Pricing on convergence surfaces

Per D19 §6.10, the convergence surface (`L2HybridExchangeSheet`) does not carry price-forward UI. D21 binds the same rule with reference to settlement specifically:

**§8.1 No price on the hybrid sheet.** The beacon title may name the item ("2 spare Fold tickets tonight"). The settlement amount, if any, is negotiated inside the chat surface that the convergence affordance opens into (PR 2). The price never appears on the convergence sheet itself.

**§8.2 The settlement amount is set during the chat, not the listing.** Either party may propose; the other accepts. The amount lives in operational chat state until the `held` transition crystallises it into the regulated row.

**§8.3 "Free" handoffs are first-class.** Many convergence handoffs will be free (a spare ticket passed to a friend, a preloved item handed over without expectation of payment). The state machine accepts `held` → `released` with `amount = 0`; the regulated row is still created (so the handoff is audit-trail-visible if disputed later), and the atmospheric residue increments normally. The substrate does not distinguish "free handoff" from "paid handoff" at the volume level — both are platform-attested resolutions of a beacon.

**§8.4 No tipping, no "support the host" buttons.** Tipping flows recreate the same hustler-economy pressure D19 §4.5 forbids. Settlement is one number, set between two parties for a specific handoff. If the receiver wants to receive an additional amount post-handoff, they raise a new beacon.

---

## §9 Platform fees

HOTMESS may take a platform fee on peer settlements. The doctrinal constraint is that the fee structure is **legible** at the moment of settlement, not hidden in a footnote.

**§9.1 The fee is shown at the agree-to-amount moment.** Both parties see the gross amount, the platform fee (named), and the net to the receiver, before either confirms. There is no "we'll explain the fee later" surface.

**§9.2 The fee structure is a published rule, not a per-user-secret.** Whatever the fee rule is (percentage, flat, capped, free under a threshold), it is documented at a public URL referenced from the convergence chat surface. Changing the fee structure is a published rule change with notice, not a silent per-user adjustment.

**§9.3 Fee revenue is not the optimisation target.** D19 §4.5 binds: the platform's incentive cannot be to maximise transaction volume × fee rate. Volume is a downstream signal of the social surface working, not an upstream target. Any future proposal to "boost convergence to drive fee revenue" is the same constitutional drift as "add `actor_id` for ranking" — refuse it.

---

## §10 Refunds (preview of D28)

D28 will fully define refund and cancellation flows. The D21 inheritance:

- Refunds are user-initiated by either party. The chat surface where the settlement was negotiated is also where refunds are negotiated.
- Operator-side refunds exist for safety reasons (e.g., the receiving party has been flagged for harm in a separate flow) but are audit-logged per §3.4.
- Refund-related atmospheric residue is a separate counter (`refund_count`), not a mutation of the original release row. This preserves the at-the-time truth that a release occurred.
- D34 §4.5 trajectory decay applies to refund-related convergence trajectory the same as any other: after the decay window, the trajectory line on the original beacon is gone, and the refund flow runs entirely through the regulated table.

D28 inherits D21 in full and adds the user-surface contract for refund initiation.

---

## §11 Acceptance test for any D21 implementation PR

When the first peer-settlement infrastructure PR ships, it must answer the D33 §9 seven-question acceptance test for **both** substrate tables (regulated + atmospheric), plus these D21-specific questions:

§11.1 — What is the regulatory citation for every column in the regulated settlement table? If a column has no citation, it does not belong.

§11.2 — Is the regulated table joinable to the atmospheric residue? Show the absence of foreign keys, the absence of a shared primary key, the granularity mismatch on the time column.

§11.3 — Is the Stripe webhook the only write path into the regulated table? Show the GRANT and the webhook signature validation.

§11.4 — Does the application surface ever read a regulated row directly? If yes, refuse the PR — application reads go through the operator-audit-logged function path only.

§11.5 — Is the price absent from `L2HybridExchangeSheet`? Verify via grep on the component file.

§11.6 — Does the platform balance UI exist anywhere in the codebase? If yes, refuse the PR — §5.2 binds.

§11.7 — Does the fee structure URL render before the agree-to-amount confirmation? Verify in the chat-side settlement flow.

A D21 implementation PR without all seven answers in the description does not ship.

---

## §12 Drift indicators specific to D21

In addition to D33 §10:

- A "Connect with another platform fee model" experiment that adds per-user variable fees. (Violates §9.2.)
- A "wallet" or "balance" surface, however small. (Violates §5.2.)
- A "tip the host" or "support the seller" button. (Violates §8.4.)
- A platform-held escrow flow. (Violates §4.1.)
- A column on the regulated settlement table without a regulatory citation. (Violates §2.1.)
- A foreign-key relationship between the regulated and atmospheric substrates. (Violates §3.3.)
- An "analytics export" that joins regulated to user profiles. (Violates §3.4 + D33 §5.)
- A "verified seller" badge appearing on a convergence surface as a side-effect of having a Stripe account. (Violates D20 §5.3 + §7.1.)

Each is an audit moment. Revert and refactor.

---

## §13 Boardroom test framing

For non-engineering stakeholders considering D21 under business pressure:

- "Can we take a higher fee?" — Yes, with public notice (§9.2). No, not as a per-user secret.
- "Can we see what's flowing through the platform?" — Yes, in aggregate via the atmospheric residue. No, not per-transaction per-user.
- "Can we sell anonymised transaction data?" — There is no per-transaction-per-user data to sell. The atmospheric residue is already aggregate and contains no identifying columns. The regulated table is locked to operator audit-logged access only.
- "Can we offer 'instant payout' for a higher fee?" — Possibly, as a Stripe feature. The fee structure must be published per §9.2. The substrate does not change.
- "Can we hold funds for a few days to earn float?" — No, §4.1 binds. Stripe holds funds; HOTMESS does not. Becoming a money-transmitter is a multi-year regulatory undertaking and a constitutional change that requires a new doctrine version, not a feature flag.
- "Can we have a leaderboard of top sellers?" — No. D19 §4.5 + D34 anti-gamification bind. Public ranking of users by transaction volume creates the hustler-economy pressure the doctrine forbids.

---

## §14 Naming and references

- **The regulated settlement table** lives in the `regulated` schema (to ship). Locked to service_role, function-gated reads.
- **The atmospheric settlement residue** lives in the `atmosphere` schema alongside `handoff_residue`. Same shape, same locks, same five D33 commitments.
- **The Stripe webhook handler** is the only writer to the regulated table.
- **The reconciliation cron job** reads Stripe and amends the regulated table, never the reverse.
- **The operator audit table** is the authoritative log of all operator-led writes/reads of the regulated table.

Reference for D33 inheritance:
- `supabase/migrations/20260531120000_atmosphere_handoff_substrate.sql`
- `supabase/migrations/20260531130000_atmosphere_venue_class_lockdown.sql`
- `docs/doctrine/33-memory-permanence-doctrine.md`

---

## §15 What ships next

D21 is now a written constitutional commitment. No peer-settlement code lands without inheriting it.

The first implementation work, when scoped, will likely be a slice along these lines:

1. **Slice 1 — Stripe Connect onboarding scaffold.** Receiving-side Stripe Express onboarding redirect. Persist `stripe_account_id` + `payouts_enabled` against the user record. No settlement flow yet.
2. **Slice 2 — Regulated settlement table substrate.** Migration establishing the `regulated` schema, the settlement table, the webhook handler skeleton. No UI.
3. **Slice 3 — Atmospheric settlement residue.** Migration establishing the `atmosphere.settlement_residue` table per D33. No UI.
4. **Slice 4 — Convergence chat settlement flow.** Amount negotiation surface inside the existing convergence chat; agree-to-amount → Stripe hold; release on convergence resolution. No price on the hybrid sheet (§8.1).
5. **Slice 5 — Refund flow (inheritance into D28).** D28 doctrine ships alongside or before this slice.

Slices 1-5 ship one at a time under the slice format from `EXECUTION.md`. Each PR's description answers the D33 + D21 acceptance test in full. No slice ships without doctrinal review.

---

## §16 Closing

HOTMESS will move money between users. The substrate that records that movement will be incapable of becoming a surveillance tool by accident, by drift, by acquisition pressure, or by future operator hostility. That incapability is the moat. Without it, peer settlement would be the back door through which everything D33 just locked down would be quietly undone.

The substrate-incapability pattern applies twice on the financial layer: once to the atmospheric residue (which is forbidden from holding identity by D33), and once to the regulated table (which is forbidden from holding anything beyond regulatory minimum by D21 §2.1). The split between them is the doctrine.

Money flow is the test where most platforms fail their privacy promise. HOTMESS passes it by not making the promise — by shaping the substrate so the promise cannot be broken.
