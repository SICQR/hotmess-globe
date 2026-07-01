# Tickets / Resale (Surface J) — Conformance Report

**Surface:** Tickets, resale queue, reissue, platform-fee (7% standard / 0% founding)
**Repo:** SICQR/hotmess-globe (sparse checkout `/tmp/p2`)
**DB:** Supabase `rfoftonnlwudilafhfkl` (read-only SELECTs)
**Date:** 2026-06-30
**Governing doctrine that *should* apply:** D21 (Payment & Payout), D28 (Refund & Cancellation), D33 (Memory & Permanence), sacred-invariants
**Doctrine that actually governs the shipped code:** DB comments + inline JSDoc only. No `docs/doctrine/` doc names tickets or resale.

---

## 1. Entry points (what shipped)

| Path | Method | Auth | Behaviour |
|---|---|---|---|
| `api/tickets/create-checkout.js` | POST | Supabase JWT | Primary purchase. Loads pool, open/inventory/age/tier gates, creates Stripe Checkout `type:'ticket'`. Issuance deferred to webhook. |
| `api/tickets/webhook-handler.js` -> `handleTicketCheckout` | (Stripe) | webhook | On `checkout.session.completed`: idempotent on `external_ref`, concurrency-safe inventory decrement, generates 32-char hex `qr_token`, inserts `ticket_orders` `ticket_state='issued'`, computes `fee_amount = amount * fee_rate`, queues AMBIENT notification. |
| `api/tickets/resale-checkout.js` | POST | Supabase JWT | Resale buy. Loads seller `ticket_orders`, validates `ticket_state in (issued,valid)`, `resale_price>0`, pool `resale_allowed`, blocks self-purchase, age-gates buyer, creates Stripe Checkout `type:'resale'`. |
| `api/tickets/webhook-handler.js` -> `handleResaleCheckout` | (Stripe) | webhook | On completion: idempotent on `ticket_state='resold_void'`, calls `match_resale_ticket` RPC, notifies buyer+seller. **Primary resale settlement path.** |
| `api/tickets/resale-matcher.js` | GET/POST | CRON_SECRET | Hourly safety-net. Sweeps `stripe_events_log` (then Stripe API) for missed resale sessions, replays `match_resale_ticket`. Idempotent. |
| `api/tickets/payouts-worker.js` | GET/POST | CRON_SECRET | Every 6h. Reads `payouts WHERE status='pending'`, joins `market_sellers` for `stripe_account_id`, creates Stripe Transfer, marks paid/failed. |
| `api/tickets/listings.js` | GET | optional JWT | Wraps `get_ticket_listings` RPC (public browse, age-gated tiers). |
| `api/tickets/export.js` | GET | JWT + `has_event_access` | CSV of `ticket_orders` for a beacon — **includes display_name, email, qr_token**. |
| `api/tickets/qr.js` / `api/scan/redeem.js` | GET / POST | JWT (admin for redeem) | HMAC-signed `event_rsvp` ticket tokens (`hm1.<payload>.<sig>`), 30-day exp; redeem checks in RSVP and awards XP. **Separate token system from `ticket_orders.qr_token`.** |
| `api/scan/check-in.js` | POST | JWT | Beacon scan check-in + XP; dedupe 12h. Not the ticket-gate path. |

**Core RPC:** `match_resale_ticket(p_seller_ticket_id, p_buyer_id, p_payment_ref)` — `SECURITY DEFINER`. Locks seller ticket `FOR UPDATE`, requires non-null payment proof (payment-first), voids seller ticket (`resold_void`, moves `qr_token`->`qr_token_voided`), mints new ticket for buyer with fresh `qr_token`, re-snapshots age, stamps `ticket_resale_queue.accepted_at`, inserts `payouts` row keyed on `source_payment_ref` (`ON CONFLICT DO NOTHING`).

---

## 2. DB facts (read-only)

### `ticket_orders` (flat events table)
PII / money columns present: `user_id`, `amount`, `price_paid`, `fee_amount`, `stripe_processing_cost`, `resale_price`, `qr_token`, `qr_token_voided`, `age_verification_snapshot` (jsonb), `external_ref`, `payout_intent_id`, `parent_ticket_id`, `scanned_by`. State: `ticket_state` default `issued` (text, not enum); lifecycle stamps `released_at/refunded_at/resold_at/expired_at`.

**RLS:** `Users can read own tickets` (`auth.uid()=user_id`); `Service can manage tickets` INSERT `with_check true`; `Service can update tickets` UPDATE `qual true`. The two "Service" policies are `{public}` role with unconditional predicates — **any role satisfying them can write/update arbitrary tickets** (mitigated in practice because writes happen via service_role, but the policy itself is not role-scoped to `service_role`).

### `ticket_inventory_pools`
`fee_rate numeric default 0`, `resale_allowed bool default true`, `inventory_cap` nullable, `inventory_sold default 0`, `tier_gate`, `is_active`. **`fee_rate` distinct values in production = `{0.07}` only.** No 0% (founding) pool exists.

### `payouts`
`amount numeric NOT NULL`, `gross_pence/platform_fee_pence/net_pence int`, `seller_id -> market_sellers(id) ON DELETE SET NULL`, `source_payment_ref`, `status default pending`, `stripe_transfer_id`, `paid_at`. **No unique constraint on `source_payment_ref` is visible in `pg_constraint`** (only `payouts_pkey` + the FK) — see FM/TK-6.
**RLS:** `Users view their payouts` (`auth.uid()=user_id`) — but payouts are written with `seller_id`, and `user_id` is left NULL by `match_resale_ticket`. **Sellers cannot see their own resale payouts via RLS** (TK-7).

### `market_sellers`
Founding-relevant columns: `commission_rate numeric default 0.12`, `membership_tier text default 'member'`, `verified`, `featured`, `seller_type default 'community'`, `stripe_account_id`, `stripe_onboarding_complete`. **No `founding`/`is_founding`/`fee_exempt` flag. No column wiring `commission_rate` into resale fee math** (resale fee comes from `pool.fee_rate`, not the seller).
**RLS:** select only `status='approved'`; insert/update/delete own (`owner_id`).

### `ticket_resale_queue` — **EXISTS** but unused for ordering
Columns: `id, pool_id, user_id, queued_at, notified_at, accepted_at, expired_at`. FIFO scaffolding is present, but `match_resale_ticket` never SELECTs the head of the queue — it only `UPDATE … SET accepted_at=now() WHERE pool_id=… AND user_id=p_buyer_id`. Ordering is decided by **who completes Stripe Checkout first**, not by queue position.

---

## 3. Conformance findings (severity-ranked)

| ID | Sev | Finding |
|---|---|---|
| **TK-1** | **HIGH** | **Resale FIFO is not enforced.** Task brief and the `ticket_resale_queue` table imply first-in-first-out allocation. The RPC matches whoever pays first and merely stamps that buyer's queue row `accepted_at`. A queued member at position 1 can be beaten by anyone who hits `resale-checkout` and completes Stripe faster. No `FOR UPDATE SKIP LOCKED` head-of-queue selection, no notify->hold window honoured. Governance is by DB comment only. |
| **TK-2** | **HIGH** | **Founding-seller 0% fee is not implemented anywhere.** Only `fee_rate=0.07` exists in production; `market_sellers` has no founding flag; resale fee math reads `pool.fee_rate`, ignoring the seller entirely. The "7% standard / 0% founding" rule lives only in narrative — there is no code path, column, or data that yields 0%. |
| **TK-3** | **HIGH** | **Resale markup is unaccounted / leaks value.** Buyer pays seller-set `resale_price` (uncapped — no check vs face `price`). But `match_resale_ticket` computes payout and buyer's `price_paid` from pool **face** `v_face`, not the resale amount. Result: (a) ticket touting is possible (no face-value cap, violating the spirit of D19/D21 anti-hustle), and (b) `payout.gross_pence = face*100` while Stripe actually collected `resale_price` — the delta between `resale_price` and `face` is collected by the platform but recorded nowhere as fee or remitted to the seller. Money-trail integrity broken. |
| **TK-4** | **HIGH** | **Refund/cancellation doctrine (D28) is unhonoured on the resale path.** When a seller ticket is voided (`resold_void`) the original purchase is never refunded, and there is no reversal flow if the resale buyer disputes. `ticket_orders` has `refunded_at` but no code sets it on resale. D28 §2 ("reversal is a right") has zero enforcement here. The primary-purchase webhook even has two `// TODO Phase 2: trigger automatic Stripe refund` stubs (inventory-race and missing-age-snapshot) that silently drop the buyer's paid session with no refund. |
| **TK-5** | **HIGH** | **D21/D33 substrate split entirely absent.** D21 §3 + D33 §7 mandate a `regulated` schema (locked, function-gated, regulatory-citation-per-column) and a non-joinable `atmosphere` aggregate residue. Shipped `ticket_orders`/`payouts` are flat public-schema tables, fully joinable to `profiles`, holding precise timestamps, amounts, QR tokens and age snapshots. A hostile operator can reconstruct exactly who bought/resold what, when, for how much — the precise failure D33 §7 forbids. No atmospheric residue exists for ticket volume. |
| **TK-6** | **MED** | **`payouts.source_payment_ref` idempotency relies on a unique index that may be absent.** The RPC uses `ON CONFLICT (source_payment_ref) WHERE source_payment_ref IS NOT NULL DO NOTHING`, but `pg_constraint` shows only `payouts_pkey` + the seller FK. If the partial unique index is missing, the safety-net matcher + webhook double-firing can insert duplicate payout rows -> double Stripe Transfer (double-pay). A partial unique *index* would not appear in `pg_constraint`; confirm `pg_indexes` before relying on it. |
| **TK-7** | **MED** | **`payouts` RLS hides resale payouts from the seller.** RLS predicate is `auth.uid()=user_id`, but resale payout rows are inserted with `seller_id` set and `user_id` NULL. Sellers cannot read their own earnings through the client; only service-role/worker sees them. Inconsistent with D21 §5 informational-surface intent. |
| **TK-8** | **MED** | **`get_ticket_listings` is overloaded (two signatures).** A 6-arg `(p_city_slug,…)` and a 9-arg `(p_user_id,…)` both exist. `listings.js` calls the 9-arg form by name with named params, so PostgREST resolves it, but the overload is an ambiguity/foot-gun. Consolidate. |
| **TK-9** | **MED** | **`has_event_access` ignores `p_min_role`.** `export.js` passes `p_min_role:'scanner-only'`, but the SQL body never references `p_min_role` — it returns true for beacon owner OR any `vendor_event_access` row. So a "scanner-only" vendor gets the **full CSV including attendee emails + live QR tokens**. Role-gating is illusory; PII/credential exposure path. |
| **TK-10** | **MED** | **Two parallel ticket-token systems with divergent trust models.** `ticket_orders.qr_token` is a 32-char DB-stored opaque random (checked by lookup), while `api/tickets/qr.js`+`scan/redeem.js` use HMAC-signed `hm1` tokens over `event_rsvps`. The scan/redeem path validates *RSVP* check-in, not `ticket_orders` state. Reissue (`resold_void` nulls `qr_token`) is only meaningful for the DB-token path; nothing revokes a leaked HMAC token before its 30-day exp. |
| **TK-11** | **LOW** | **Stripe processing cost is hard-coded** (`amount*0.014 + 0.20`) in the webhook rather than read from Stripe — drifts from true UK card rates; affects net accounting only. |
| **TK-12** | **LOW** | **`stripe_events_log` shape mismatch.** `resale-matcher.js` reads `raw_payload`, but the column is `payload`. The log-driven sweep (Strategy 1) silently finds nothing and always falls through to the Stripe API sweep (Strategy 2), which only lists the most recent 20 sessions — older missed resales are never recovered. |

---

## 4. What conforms

- **Payment-first guarantee** is real: `match_resale_ticket` raises if `p_payment_ref` is null; webhook only calls it post-`checkout.session.completed`. (D21 §6.2/§6.3 spirit.)
- **Idempotency** on the happy path: ticket insert dedup on `external_ref`; resale dedup on `resold_void`; matcher replays are no-ops via `not_resellable`.
- **Age-gate (OSA)** enforced at primary purchase, resale purchase, and inside the RPC for `%18%` tier-gated pools; snapshot persisted.
- **Concurrency-safe inventory** decrement with conditional update + rows-affected check.
- **Fee legibility at face level** partially satisfies D21 §9.1, though resale markup (TK-3) breaks the "gross/fee/net shown" guarantee.

---

## 5. Companion references
- `docs/doctrine/21-payment-payout-doctrine.md` (regulated/atmosphere split, §5 payouts, §9 fees, §10 refund preview)
- `docs/doctrine/28-refund-cancellation-doctrine.md` (reversal-is-a-right, §2)
- `docs/doctrine/33-memory-permanence-doctrine.md` (§1 substrate-incapability, §7 payment inheritance)
- `docs/doctrine/sacred-invariants.md`
- DRAFT: `DRAFT-ticket-resale-doctrine.md` (this directory)
