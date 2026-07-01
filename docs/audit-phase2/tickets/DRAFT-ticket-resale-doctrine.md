# D-J (DRAFT) — Ticket & Resale Doctrine

**Status:** DRAFT for Phil's sign-off. Proposed number TBD (sits beside D19 Marketplace).
**Inherits from:** D19 (Marketplace), D20 (Identity), D21 (Payment & Payout), D28 (Refund & Cancellation), D22 (Temporal), D33 (Memory & Permanence), sacred-invariants.
**Inherited by:** any future event-ticketing, guestlist, or preloved-resale surface.
**Written:** 2026-06-30
**Why now:** Resale queue, reissue, and platform-fee (7% / 0%-founding) logic shipped to production governed *only by DB comments*. This doctrine retro-fits the constitutional layer the shipped code skipped, and names the divergences that must be reconciled.

---

## §0 Why this doctrine exists

HOTMESS issues, transfers, and reissues tickets, and takes a platform fee on resale. That is peer-to-peer settlement anchored by a beacon — squarely D21 territory — but it shipped as a flat `ticket_orders` events table with no `regulated`/`atmosphere` split, no FIFO fairness on the resale queue, no founding-fee implementation, and no refund path. The single sentence:

> **A ticket is a face-value entitlement that may pass between members at most once per holder, under a fair queue, at a published fee, with the money trail honest and the substrate forgetful beyond regulatory minimum.**

---

## §1 Principle

**§1.1 — Face value is the contract.** A resale transfers an entitlement at (or below) the face price set by the issuing pool. Resale above face is touting and is refused at the substrate, not merely discouraged in UI. (Inherits D19 §4.5 anti-hustle, D21 §8 pricing.)

**§1.2 — The queue is fair or it is not a queue.** If a `ticket_resale_queue` exists, allocation is first-in-first-out among notified, still-eligible members within an honoured hold window. Allocation by "who completes Stripe fastest" is a covert auction and is forbidden.

**§1.3 — The fee is published and legible.** Standard fee is the pool's `fee_rate`; the founding-seller exemption (0%) is a real, data-backed status, not a narrative. Both parties see gross / fee / net before confirming (D21 §9.1).

**§1.4 — Reissue voids exactly one credential and mints exactly one.** When a ticket is resold, the seller's QR is revoked atomically with the buyer's QR being minted. No window in which both are valid; no window in which neither is.

**§1.5 — Reversal is a right (D28 inheritance).** Every settlement — primary or resale — has a reversal path. A buyer whose paid session cannot be fulfilled (sold-out race, missing age snapshot) is refunded automatically, not silently dropped.

**§1.6 — The substrate forgets (D21 §3 / D33 §7).** Per-ticket identity persists only at the regulatory minimum and never as the platform's analytics source. Volume/mix/trend read from a non-joinable atmospheric residue, not from `ticket_orders` joined to `profiles`.

---

## §2 Invariants

- **INV-J1 (FIFO):** A resale is allocated to the head-of-queue eligible member for that pool, selected `FOR UPDATE SKIP LOCKED`, within the hold window granted at `notified_at`. Outside any active queue, first-paid is acceptable only for pools with no queue.
- **INV-J2 (face cap):** `resale_price <= ticket_inventory_pools.price` for the pool. Enforced in `resale-checkout` AND re-checked inside `match_resale_ticket`. A resale priced above face is refused.
- **INV-J3 (money trail):** The amount Stripe collected equals what the substrate records as `gross`; `fee = gross * effective_fee_rate`; `net = gross - fee`; payout `gross/net` derive from the *actual collected amount*, never a substituted face value.
- **INV-J4 (effective fee):** `effective_fee_rate = 0` iff the seller holds a verified founding status; else `= pool.fee_rate`. Founding status is a column/flag on `market_sellers`, set by an audited grant, never inferred.
- **INV-J5 (atomic reissue):** Voiding the seller QR (`qr_token -> qr_token_voided`, `ticket_state='resold_void'`) and minting the buyer QR happen in one transaction; the RPC already holds `FOR UPDATE` — keep it that way.
- **INV-J6 (one transfer per payment):** At most one `payouts` row and one Stripe Transfer per `source_payment_ref`. Enforced by a **partial unique index** on `payouts(source_payment_ref) WHERE source_payment_ref IS NOT NULL`, which must exist (not just `ON CONFLICT` text).
- **INV-J7 (age gate persists):** Every issued/reissued ticket carries an `age_verification_snapshot`; no ticket exists without one. (OSA.)
- **INV-J8 (payout visibility):** A seller can read their own payout state. RLS must match on the seller's identity, not a NULL `user_id`.
- **INV-J9 (regulatory-only persistence):** Every identifying column on the regulated ticket/settlement table carries a regulatory citation in its migration comment (D21 §2.1). Atmospheric ticket volume lives in a separate, non-joinable residue (D33 §7).
- **INV-J10 (single credential model):** One token system gates entry. If both DB-opaque and HMAC tokens coexist, one is authoritative for `ticket_orders` redemption and the other is scoped away from paid tickets.

---

## §3 Enforcement

- **FIFO (INV-J1):** Rewrite `match_resale_ticket` to select the queue head (`SELECT … FROM ticket_resale_queue WHERE pool_id=… AND accepted_at IS NULL AND (expired_at IS NULL OR expired_at>now()) ORDER BY queued_at FOR UPDATE SKIP LOCKED LIMIT 1`) and bind the buyer to that row; reject a checkout whose buyer is not the current head within the hold window.
- **Face cap (INV-J2):** Add `CHECK`/guard in `resale-checkout.js` and a `RAISE EXCEPTION` in the RPC when `resale_price > face`.
- **Money trail (INV-J3):** RPC must take the *collected* amount (from the Stripe session) as `gross`, not pool face; derive fee/net/payout from it.
- **Effective fee (INV-J4):** Add `is_founding boolean` (or `fee_exempt`) to `market_sellers`; compute `effective_fee_rate` in the RPC as `CASE WHEN seller.is_founding THEN 0 ELSE pool.fee_rate END`.
- **Idempotent payout (INV-J6):** Ship the partial unique index in a migration; verify in `pg_indexes`.
- **Refund (INV-J5/D28):** Replace the two `// TODO Phase 2` refund stubs in `webhook-handler.js` with a real Stripe refund + `ticket_orders.refunded_at` write; add a resale-buyer dispute path.
- **Substrate split (INV-J9):** New tickets ride D21's `regulated` settlement table + `atmosphere` residue; `ticket_orders` migrates toward regulatory-minimum columns; analytics reads move off the joinable table.
- **Role gate (cross-ref TK-9):** `has_event_access` must actually consult `p_min_role`; the CSV export's email/QR columns are a privileged operation.
- **Acceptance test:** Every resale/ticket PR answers — (a) is the head-of-queue selected under a lock? (b) is `resale_price<=face`? (c) does payout gross == Stripe-collected? (d) does a founding seller yield 0%? (e) is there exactly one Transfer per payment_ref (index shown)? (f) is there a refund path? (g) which token gates entry?

---

## §4 Failure modes (current production)

| Mode | Doctrine breached | Current state |
|---|---|---|
| Queue-jumping by fast checkout | INV-J1 | `match_resale_ticket` matches first-paid, only stamps `accepted_at`. **Live.** |
| Touting above face | INV-J2 | `resale_price` uncapped. **Live.** |
| Markup collected, recorded nowhere | INV-J3 | Payout/`price_paid` use face `v_face`; buyer paid `resale_price`. **Live.** |
| Founding 0% fee doesn't exist | INV-J4 | Only `fee_rate=0.07` in prod; no founding flag. **Live.** |
| Paid-but-undelivered session silently dropped | INV-J5 / D28 | Two `// TODO Phase 2` refund stubs return without refunding. **Live.** |
| Possible double payout | INV-J6 | `ON CONFLICT` relies on an index not confirmed in `pg_constraint`. **At risk.** |
| Seller can't see own earnings | INV-J8 | `payouts` RLS keys on `user_id` (NULL for resale). **Live.** |
| Operator can reconstruct buyer/seller/amount/time | INV-J9 / D33 §7 | Flat `ticket_orders` joinable to `profiles`. **Live.** |
| Scanner-only vendor exports attendee emails + QRs | INV-J10 / cross-ref | `has_event_access` ignores `p_min_role`. **Live.** |
| Leaked HMAC ticket valid 30d, unrevocable | INV-J10 | Two token systems; reissue only touches DB token. **Live.** |

---

## §5 Companion references
- `docs/doctrine/19-marketplace-doctrine.md`
- `docs/doctrine/21-payment-payout-doctrine.md`
- `docs/doctrine/28-refund-cancellation-doctrine.md`
- `docs/doctrine/22-temporal-doctrine.md`
- `docs/doctrine/33-memory-permanence-doctrine.md`
- `docs/doctrine/sacred-invariants.md`
- Conformance: `CONFORMANCE.md` (this directory) — findings TK-1…TK-12.
- Code: `api/tickets/*`, `api/scan/*`, RPC `match_resale_ticket`, `get_ticket_listings`, `has_event_access`.
