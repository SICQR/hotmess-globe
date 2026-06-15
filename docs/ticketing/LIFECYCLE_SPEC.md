# HOTMESS Ticketing — Lifecycle Specification

**Document type:** Specification (no code, no migrations)  
**Branch:** `docs/ticketing-spec`  
**Sign-off required:** Phil Gizzie before any build brief is issued  
**Cross-reference:** `COMPETITOR_TEARDOWN.md` (every principle there maps to a section here)

---

## Scope

This document specifies the ticket lifecycle state machine, the member-identity binding, scoped
visibility rules, the notifiable segment, ticket-type configuration, the money/ledger model, and
the one-gesture venue mental model.

It does **not** contain application code, migration SQL, API routes, or UI components. Schema
changes are proposed as a delta section at the end (§ 2.6.4). Nothing is applied to the database
until Phil signs off and a build brief is issued.

---

## 2.1 State Machine

### States

| State | Meaning |
|---|---|
| `issued` | Payment confirmed. QR generated. Ticket visible in member app. Not yet valid for entry (event hasn't started or door not open). |
| `valid` | Ticket is live and accepted at the door. Event is active. |
| `scanned` | QR presented and accepted at the door. Member is in. |
| `resold_void` | Member initiated resale. This ticket's QR is dead. A new ticket has been or is being issued to the waitlist buyer. |
| `reissued` | A ticket that was created to replace a `resold_void` ticket. Functionally identical to `issued` on creation, then transitions to `valid` when the event opens. |
| `refunded_void` | Refund processed via Stripe dashboard action. QR is dead. Stripe payment reversed. |
| `expired` | Event ended (`beacon.ends_at` passed). Ticket was never scanned. Terminal state. |

### Legal Transitions

```
issued       → valid          (event opens / door activated by venue)
issued       → expired        (beacon.ends_at passes, ticket was never scanned)
issued       → refunded_void  (promoter triggers refund before event opens)
valid        → scanned        (QR presented and validated at door)
valid        → resold_void    (member initiates resale)
valid        → refunded_void  (promoter triggers refund while event is live — edge case)
scanned      → valid          (re-entry: member leaves and re-presents QR)
resold_void  → (no further transitions on this row; reissued ticket is a new row)
reissued     → valid          (same as issued → valid)
reissued     → expired        (same as issued → expired)
reissued     → refunded_void  (same as issued → refunded_void)
refunded_void → (terminal)
expired      → (terminal)
```

### Illegal Transitions (explicitly forbidden)

These must be enforced at the application layer, not left to convention:

| Illegal transition | Why |
|---|---|
| `scanned → resold` | The anti-tout rule. A used ticket cannot be sold. |
| `scanned → refunded_void` | A member who attended cannot be refunded post-entry without promoter dispute resolution (separate process). |
| `resold_void → valid` | A voided ticket cannot be reactivated. A new row is created. |
| `refunded_void → any` | Terminal. |
| `expired → any` | Terminal. |
| `issued → scanned` (skipping valid) | Door scan requires the event to be open (state = valid). |

### Re-entry Handling

`scanned → valid` is the only reverse transition permitted. It is used when a venue operates a
re-entry policy (member leaves and comes back). The door scanner records both the outbound and
inbound timestamps in `metadata`. The number of re-entries may be capped by the venue at inventory
pool level. A re-entry cap of 0 means `scanned` is terminal for that event.

### Anti-tout Guarantee

When `valid → resold_void` fires:
1. `qr_token` is moved to `qr_token_voided` on the current row.
2. `qr_token` on the current row is set to null.
3. A new `ticket_orders` row is created with `ticket_state = 'issued'` (or `'reissued'` to
   preserve lineage), `parent_ticket_id` pointing to the voided row, and a fresh `qr_token`.
4. The old QR code is dead at the point the door scanner checks it — it will not match any live
   `qr_token` in the system.

This means there is no window in which both the old and new QR are simultaneously valid.

---

## 2.2 Member-Identity Link

Every ticket binds to a `profiles.id` (uuid), not to an email address or an anonymous string.
This is a hard constraint. The `user_id` column on `ticket_orders` is a foreign key to `profiles.id`
and is `NOT NULL`.

What this binding unlocks at the door:

| Signal | Source | Used for |
|---|---|---|
| Membership tier | `memberships.tier` at purchase (snapshotted as `tier_at_purchase`) | VIP access gate, tier-gated ticket types |
| First-visit flag | `COUNT(ticket_orders) WHERE user_id = X AND beacon.venue_id = Y` | "Welcome back" vs "first timer" signal for venue |
| +1 lineage | `plus_one_of` column — the `profiles.id` who invited this member | Social graph; venue understands who drives attendance |
| Age-verified guarantee | `age_verification_snapshot` JSONB — snapshot of `{age_verified_at, age_verification_method}` at purchase time | OSA compliance; venue does not need to re-check if this is present and complete |

### OSA Dependency (non-negotiable flag)

Ticket purchase **must** be blocked if the buyer's profile has `age_verified_at IS NULL` OR
`age_verification_method IS NULL`. An age-verified timestamp with a null method is not a valid
verification record. The check must happen at purchase time, not at the door.

The `age_verification_snapshot` on the ticket row is a point-in-time copy. It is immutable after
issuance. It proves the member was verified at the moment of purchase, which is the legally
relevant moment.

Do not rely on `age_verified_at` alone. `age_verification_method IS NULL` renders the record
incomplete and the purchase gate must reject it.

---

## 2.3 Scoped Visibility (Privacy Doctrine)

This section is non-negotiable. The safety win and the privacy duty are the same feature.

### What a promoter/venue role MAY see about a ticket-holder

| Field | Source |
|---|---|
| Membership tier at purchase | `tier_at_purchase` on the ticket row |
| Whether this member has attended this venue before | Derived: `COUNT(*)` of past scanned tickets where `beacon.venue_id = current venue` |
| +1 lineage: who brought them | `plus_one_of` → `profiles.display_name` only (not profile link, not UID) |
| Door scan status | `ticket_state` (scanned / valid / not-arrived) |
| Age-verified guarantee | Boolean derived from `age_verification_snapshot` completeness |

### What a promoter/venue role MAY NOT see

| Field | Reason |
|---|---|
| Member's full profile | Private unless member shares |
| Vault items | Private by definition |
| Live location | Private by definition |
| Cross-venue attendance history | Belongs to the member, not the venue |
| DMs or social graph beyond +1 lineage | Unrelated to the event |
| Safety checkins | Private safety data |
| `profiles.public_attributes` beyond display name | Not scoped to the venue relationship |

### Enforcement

Scoped visibility is implemented as a database-level view or RPC available only to sessions with a
`venue` or `promoter` role claim. The application never returns raw `ticket_orders` joined to
`profiles` to the venue — it returns the scoped fields only. This constraint must be in the build
brief as a security requirement, not a nice-to-have.

---

## 2.4 Notifiable Segment

### Definition

```
notifiable_segment(event_id) = {
  member m |
  ticket_orders.beacon_id = event_id
  AND ticket_orders.ticket_state IN ('issued', 'valid', 'scanned')
  AND ticket_orders.user_id = m.id
}
```

This is a live query, not a materialised list. It expands and contracts as tickets are issued,
refunded, or voided. The query is cheap because `ticket_orders.beacon_id` and `ticket_state` are
indexed.

### What it powers

| Use | Priority level | Trigger |
|---|---|---|
| Pre-sale countdown ("last 20 left") | AMBIENT | Automated: inventory threshold |
| Door-time updates (venue change, delay) | HIGH | Promoter: manual push |
| Safety communication during event | CRITICAL | Safety operator or auto-trigger |
| Post-event nudge (e.g., leave a rating) | SILENT | Automated: beacon.ends_at + 1h |
| Drop alerts to waitlist (resale available) | HIGH | Automated: resold_void transition |

### Priority Taxonomy

| Level | Behaviour |
|---|---|
| CRITICAL | Delivered immediately, all channels (push + Telegram + WhatsApp). No rate cap. Safety use only. |
| HIGH | Push + preferred channel. Rate cap: max 3 per event per 24h. |
| AMBIENT | Push only. Rate cap: max 2 per event per 24h. |
| SILENT | In-app notification only. No push. No cap. |

### Rate-shaping Rules (anti-spam doctrine)

These caps exist because an abused channel is a dead channel. They are hard limits, not guidelines.

- **Per-venue cap:** No venue may send more than 5 HIGH/AMBIENT notifications per event across its
  entire lifecycle (excluding CRITICAL safety alerts).
- **Per-member cap:** No member may receive more than 3 AMBIENT notifications per 24h across all
  events combined (not per event).
- **Cooldown after resale push:** After a "tickets available" push fires to the waitlist, a 30-minute
  cooldown applies before another resale push can fire for the same event.
- **CRITICAL overrides all caps.** Safety communications are never rate-limited.

Promoters are shown their remaining send budget on the dashboard. They cannot exceed it.

---

## 2.5 Ticket Types as Configuration

All ticket types are rows or flag combinations on the single `ticket_orders` machine. They are not
separate subsystems, tables, or code paths. The type is set at issuance via the `ticket_type` field
and controls which transitions are available and which validations apply.

### Type definitions

**Paid GA (General Admission)**
- `ticket_type = 'paid_ga'`
- `price_paid > 0`, `inventory_cap` set on the pool
- Standard machine: issued → valid → scanned
- No tier gate

**Quick-action Drop**
- `ticket_type = 'quick_drop'`
- `released_at` timestamp on the inventory pool — inventory becomes purchasable at that moment
- Hard cap: pool closes when inventory_cap is reached or `released_at + window` passes
- Optionally auto-fires a HIGH notification to the notifiable segment of a prior event by the same
  venue at `released_at`
- Otherwise identical to Paid GA after issuance

**Guest / Comp**
- `ticket_type = 'guest_comp'`
- `price_paid = 0`, `fee_amount = 0`
- `issued_by` = the `profiles.id` of the promoter or staff member who issued it
- `redemption_limit` = 1 (default) — a comp ticket is for one person
- Cannot be resold (resale transition is blocked for this type)

**VIP**
- `ticket_type = 'vip'`
- `price_paid > 0` (typically higher than GA)
- Purchase gated by `memberships.tier IN ('hotmess', 'connected', 'promoter', 'venue')` at time of
  purchase
- `tier_at_purchase` is snapshotted; if the member's tier lapses before the event, the ticket is
  still valid (the gate was at purchase time, not at the door)
- Otherwise identical to Paid GA after issuance

**Guestlist**
- `ticket_type = 'guestlist'`
- A named allocation managed by the promoter pre-event
- `price_paid = 0` (or reduced), `issued_by` = promoter
- Promoter can append names after the initial allocation up to a cap set on the pool
- Not resaleable
- Transitions to `valid` when the event opens, same as any issued ticket

**Resale**
- Not a ticket type — it is a transition on any `paid_ga`, `quick_drop`, or `vip` ticket
- `valid → resold_void` fires when the original holder initiates resale
- A new ticket row is created for the waitlist recipient with `ticket_type` inherited from the parent,
  `parent_ticket_id` set, and `resale_price ≤ original price_paid` (cap enforced)
- `guest_comp` and `guestlist` types cannot be resold

### What is blocked per type

| Type | Resale | Refund | Re-entry |
|---|---|---|---|
| paid_ga | ✅ | ✅ | venue config |
| quick_drop | ✅ | ✅ | venue config |
| guest_comp | ❌ | ❌ (comp, no payment) | venue config |
| vip | ✅ | ✅ | venue config |
| guestlist | ❌ | ❌ | venue config |

---

## 2.6 Money + Ledger

### System of record

Stripe, operating under Smash Daddys Ltd, is the sole payment system of record. No ticket purchase
is valid without a corresponding Stripe payment intent. The `external_ref` column on `ticket_orders`
stores the Stripe `payment_intent_id` or `checkout_session_id`.

### Payout intent (vs OutSavvy's 5-day model)

Payout to venue is triggered immediately upon event completion (i.e., `beacon.ends_at` passes and
total `ticket_state = 'scanned'` count is stable). The mechanism is a Stripe transfer from the
Smash Daddys platform account to the venue's connected Stripe account. The `payout_intent_id`
column stores the transfer ID for reconciliation.

Founding venues receive 0% platform fee — the Stripe processing fee (typically 1.4% + 20p for UK
cards) is the only deduction, and is passed through at cost. Standard venues pay 2–3% platform fee
(set at beacon creation, stored on the inventory pool, never renegotiated).

### Refund as dashboard action

A refund is a first-class action in the venue/promoter dashboard. It:
1. Calls Stripe `refunds.create` against the `payment_intent_id`
2. Sets `ticket_state = 'refunded_void'` and `refunded_at = now()`
3. Voids `qr_token` (set to null, moved to `qr_token_voided`)
4. Adjusts `inventory_cap` (one slot reopens)

The promoter does this. No support ticket. No delay.

### Chargeback handling surface

When Stripe fires a `charge.dispute.created` webhook, the system:
1. Sets `ticket_state = 'refunded_void'` (conservatively — the money is already held by Stripe)
2. Logs the dispute on `stripe_events_log`
3. Surfaces a dashboard alert to the venue: "Chargeback in progress — ticket voided pending resolution"
4. On `charge.dispute.closed` (won), ticket can optionally be reissued (promoter action)
5. On `charge.dispute.closed` (lost), no further action — row remains `refunded_void`

### VAT treatment

The platform fee is subject to UK VAT at 20%. The ticket face value is treated as the venue's
revenue and is not subject to platform VAT (the venue handles their own VAT obligations). Smash
Daddys Ltd invoices the fee + VAT to the venue. VAT is calculated as `fee_amount * 0.20` and
stored in `metadata.vat_amount` on the ticket row (for now; this may move to a dedicated ledger
table in a future phase).

### Net-to-venue headline

```
net_to_venue = price_paid - fee_amount - stripe_processing_cost
```

This is the default figure shown on the venue dashboard, aggregated across all tickets for the event.
Gross and fee breakdown are available as secondary views but are never the primary figure.

### 2.6.4 Schema Delta Proposal (DO NOT APPLY — sign-off required)

#### Existing `ticket_orders` table (as of 2026-06-15)

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `user_id` | uuid | NO | — | FK → profiles.id |
| `event_id` | uuid | YES | — | Currently loose; no FK enforced |
| `provider` | text | NO | 'stripe' | Payment provider |
| `external_ref` | text | YES | — | Stripe payment_intent_id or session_id |
| `amount` | numeric | YES | — | Gross amount |
| `currency` | text | YES | 'gbp' | — |
| `status` | text | NO | 'pending' | Generic payment status |
| `metadata` | jsonb | YES | '{}' | Catch-all |
| `created_at` | timestamptz | NO | now() | — |
| `updated_at` | timestamptz | NO | now() | — |

#### Proposed additions to `ticket_orders`

| New column | Type | Nullable | Default | Reason |
|---|---|---|---|---|
| `beacon_id` | uuid | NO | — | FK → beacons.id; replaces loose event_id for ticketed beacons |
| `ticket_state` | text | NO | 'issued' | The lifecycle state machine (replaces generic `status` for tickets) |
| `ticket_type` | text | NO | 'paid_ga' | paid_ga / quick_drop / guest_comp / vip / guestlist |
| `issued_by` | uuid | YES | — | FK → profiles.id; for guest_comp and guestlist |
| `qr_token` | text | YES | — | Live scannable token; null when voided |
| `qr_token_voided` | text | YES | — | Prior token, kept for door-scanner rejection |
| `scanned_at` | timestamptz | YES | — | Timestamp of door validation |
| `scanned_by` | uuid | YES | — | FK → profiles.id of door operator |
| `parent_ticket_id` | uuid | YES | — | Self-FK → ticket_orders.id; for reissued/resale lineage |
| `plus_one_of` | uuid | YES | — | FK → profiles.id; who invited this member |
| `price_paid` | numeric | YES | — | Face value at purchase (distinct from gross `amount`) |
| `fee_amount` | numeric | YES | 0 | Platform fee; 0 for founding venues |
| `stripe_processing_cost` | numeric | YES | — | Stripe fee passed through |
| `payout_intent_id` | text | YES | — | Stripe transfer ID for venue payout |
| `resale_price` | numeric | YES | — | Price at resale (≤ price_paid) |
| `age_verification_snapshot` | jsonb | YES | — | {age_verified_at, age_verification_method} at purchase |
| `tier_at_purchase` | text | YES | — | memberships.tier snapshot at purchase |
| `redemption_limit` | integer | YES | 1 | For guest_comp; max entries on this ticket |
| `inventory_pool_id` | uuid | YES | — | FK → ticket_inventory_pools.id (new table, see below) |
| `released_at` | timestamptz | YES | — | For quick_drop: when inventory opened |
| `scanned_at_out` | timestamptz | YES | — | For re-entry tracking: outbound scan time |
| `refunded_at` | timestamptz | YES | — | Timestamp of refund |
| `resold_at` | timestamptz | YES | — | Timestamp of resale initiation |
| `expired_at` | timestamptz | YES | — | Timestamp of expiry |

#### Proposed new table: `ticket_inventory_pools`

This table holds the per-event, per-ticket-type configuration. A beacon can have multiple pools
(e.g., GA + VIP + Guestlist). A ticket_order draws from one pool.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `beacon_id` | uuid | NO | — | FK → beacons.id |
| `ticket_type` | text | NO | — | Mirrors ticket_orders.ticket_type |
| `label` | text | NO | — | Display name (e.g., "Early Bird", "VIP") |
| `price` | numeric | NO | — | Face value; 0 for comp/guestlist |
| `fee_rate` | numeric | NO | 0 | 0.00 for founding venues; 0.02–0.03 standard |
| `inventory_cap` | integer | YES | — | Null = unlimited (rare) |
| `inventory_sold` | integer | NO | 0 | Incremented on issuance; decremented on refund/void |
| `released_at` | timestamptz | YES | — | For quick_drop |
| `closes_at` | timestamptz | YES | — | When the pool stops accepting purchases |
| `tier_gate` | text | YES | — | For VIP: minimum tier required |
| `resale_allowed` | boolean | NO | true | Whether resale is permitted for this pool |
| `re_entry_cap` | integer | YES | — | Null = unlimited re-entries |
| `max_notifications` | integer | NO | 5 | Rate-shape budget for this event |
| `metadata` | jsonb | YES | '{}' | — |
| `created_at` | timestamptz | NO | now() | — |
| `updated_at` | timestamptz | NO | now() | — |

#### Proposed new table: `ticket_resale_queue`

Waitlist for resale matching. One row per waiting member per pool.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `pool_id` | uuid | NO | — | FK → ticket_inventory_pools.id |
| `user_id` | uuid | NO | — | FK → profiles.id |
| `queued_at` | timestamptz | NO | now() | FIFO ordering |
| `notified_at` | timestamptz | YES | — | When the HIGH push fired to this member |
| `accepted_at` | timestamptz | YES | — | When they completed purchase (ticket issued) |
| `expired_at` | timestamptz | YES | — | If they didn't respond within the window |

#### Migration notes (not a migration — for build brief reference)

- `ticket_orders.status` (generic payment status) should be renamed or aliased. For new rows,
  `ticket_state` carries the lifecycle; `status` retains the Stripe payment status
  (pending / paid / refunded / disputed). These are different concepts and should not be conflated.
- `ticket_orders.event_id` is nullable and has no enforced FK. `beacon_id` will replace it for
  ticketed events. `event_id` can remain for backward compat (existing rows) but new inserts use
  `beacon_id`.
- `qr_token` must have a unique constraint. The door scanner matches on this column.
- `ticket_state` should be constrained to the seven legal values via a CHECK constraint.
- Indexes required (not specified here — for build brief): `(beacon_id, ticket_state)`,
  `(user_id, ticket_state)`, `(qr_token)` unique, `(pool_id)` on resale_queue.

---

## 2.7 The One Gesture

This section confirms in writing that the venue's mental model never changes, across all phases of
ticketing.

**The gesture is: drop a beacon.**

A beacon on the HOTMESS globe is how a venue announces presence. Today a beacon can:
- Link out (redirect_url)
- Host a chat room (chat_room_id)
- Trigger a check-in (scan_count)

A ticketed beacon is a beacon with two additional fields on its inventory pool:
- `price` (face value)
- `inventory_cap` (how many tickets)

That is the entire conceptual delta for the venue. The beacon pin on the Mapbox globe is still
how they start. The beacon's `ends_at` is still how it expires. The beacon's `right_now_posts`
write path is still how it renders. There is no new object to teach, no new screen to navigate to,
no new concept to explain.

The beacon evolves into three operating modes as the event progresses:

| Phase | Beacon does | Venue action |
|---|---|---|
| Pre-event | Links out / sells tickets | Drop the beacon; set price + inventory |
| Day-of | Sells remaining tickets; door scanner activates | Open door via beacon tap |
| Live event | Notifiable segment active; capacity visible | Push updates from beacon dashboard |

The promoter's mental model at each phase is identical: **tap the beacon, manage the event**.
No separate "Events" section. No nested navigation. The pin IS the event.

### Implication for the build

Any implementation that adds a separate events management screen, a separate ticket management
screen, or any navigation structure that requires the promoter to leave the beacon context to
manage their ticketed event violates this principle. The build brief must specify that all
ticketing management actions (view sales, message holders, open door, issue refund, manage
guestlist) are accessible from within the beacon's own sheet or panel.

---

## Doctrine Guardrails (reaffirmed)

These apply to everything above and must be enforced in any build brief that follows:

- **Safety doctrine overrides all feature convenience.** If a feature makes the platform
  less safe, it does not ship. OSA age-verification completeness is a purchase gate, not
  a door-level check.
- **No gamification.** Tiers are access and ticket gates. No XP, no points, no leaderboards.
  `beacons.xp_amount` is a legacy column and must not be surfaced in any ticketing UI.
- **Trust over fake scarcity.** "Last 20 tickets" is real inventory data. Artificial urgency
  signals are not permitted in any notification copy or dashboard display.
- **Brand:** dark background `#050507`, gold `#C8962C`. Never light mode. Never in ticketing UI.
- **DB truth:** write to `profiles` (not User), write to `right_now_posts` (view is read-only),
  use `beacons.ends_at` (not `end_at`), use `trusted_contacts` (not `emergency_contacts`).
- **Surgical scope.** The build brief will specify exact files and columns. No refactoring outside
  scope.

---

*This document and `COMPETITOR_TEARDOWN.md` are co-dependent. Neither is complete without the
other. Phil signs off on both before any build brief is issued or any code is written.*
