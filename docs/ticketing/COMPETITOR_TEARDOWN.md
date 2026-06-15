# HOTMESS Ticketing — Competitor Teardown & Design Principles

**Document type:** Specification (no code)  
**Branch:** `docs/ticketing-spec`  
**Sign-off required:** Phil Gizzie before any build brief is issued  
**Cross-reference:** Every principle below must be traceable to a section in `LIFECYCLE_SPEC.md`.

---

## Purpose

This document maps ten documented, sourced failures from incumbent ticketing platforms (DICE,
Eventbrite, OutSavvy, Resident Advisor) to the concrete HOTMESS behaviours that neutralise them.
It is not a feature wishlist. Each principle is a constraint the lifecycle state machine must uphold.
If a principle cannot be traced to the spec, it is not done.

---

## The Ten

### 1 — Fee opacity (DICE: ~10% commission absorbed by organiser; fees negotiated/opaque)

**HOTMESS principle: Published flat take. 0% for founding venues (Stripe pass-through only); 2–3% standard. Fee shown on the beacon at setup, no negotiation.**

The fee is a field on the ticket inventory pool, set once at beacon creation, visible to the
venue dashboard before they go live. There is no negotiation surface, no onboarding call, no
hidden tier unlocked by volume. Stripe processing costs are passed through at cost. Net-to-venue
is the headline number on every dashboard view (see principle 5).

*Lifecycle trace:* § 2.6 (Money + ledger) — `fee_amount` is a first-class column, not derived
metadata; net-to-venue = `price_paid − fee_amount` and is the dashboard default figure.

---

### 2 — Gatekeeping (DICE: curated gatekeeping — organisers rejected or wait weeks to list)

**HOTMESS principle: No gatekeeping. A verified venue drops a beacon and is live instantly.**

A profiles row with `tier = 'venue'` or `tier = 'promoter'` writes a beacon to `right_now_posts`
with `price` and `inventory_cap` set. That is a ticketed event. No approval queue. No curation
gate. Venue identity is already verified at onboarding; ticketing is a flag on the beacon, not a
separate permission.

*Lifecycle trace:* § 2.7 (The one gesture) — beacon drop is the single action; ticketing extends
it by two fields, not a new concept.

---

### 3 — Forced app install (DICE: mobile-app-only tickets; buyers forced to install another app)

**HOTMESS principle: Buyer is already a HOTMESS member — no new app, no new account. QR lives where they already are.**

Every ticket is issued to a `profiles` row. The member opens the app they already have, sees the
QR in the ticket state rendered from `ticket_orders.ticket_state = 'valid'`. No PDF. No email
attachment. No third-party wallet integration required. The QR is authoritative in-app and always
renders on the issued or valid state.

*Lifecycle trace:* § 2.1 (State machine) — `issued → valid` is the state on successful payment;
the QR is rendered from `qr_token` which is set at issuance and never null. § 2.2 (Member-identity
link) — the ticket binds to `profiles`, not to an email string.

---

### 4 — Platform owns the fan (DICE / RA: organiser gets limited/no customer data; platform owns the fan)

**HOTMESS principle: Venue sees ticket-holders as members (tier, history, +1 lineage, scan status), scoped. The relationship is the venue's, mediated by HOTMESS, never taken from them.**

Scoped visibility (§ 2.3) is the exact mechanism. A promoter/venue role may see: member tier at
purchase, whether the member has attended this venue before, who brought them (+1 lineage), and
door scan status. They see nothing else. The member's broader profile, vault, location, and
cross-venue history remain private. The venue knows their crowd without us becoming the gatekeeper
of that knowledge.

*Lifecycle trace:* § 2.3 (Scoped visibility) — field-by-field definition of what is and is not
visible to the venue role.

---

### 5 — Gross-only dashboard (Eventbrite Organizer: sales shown only as GROSS; must go to website to see take-home)

**HOTMESS principle: Dashboard shows net to venue by default, live. Gross is secondary.**

The revenue dashboard primary figure is `SUM(price_paid − fee_amount)` across all `ticket_state IN
('valid', 'scanned')` for the event. Gross is available as a secondary drill-down. This is not a
cosmetic decision — it directly addresses the sourced complaint that organisers have to leave the
app to understand what they're actually earning.

*Lifecycle trace:* § 2.6 (Money + ledger) — `fee_amount` as a stored column makes this
computation trivial and live.

---

### 6 — Navigation maze (Eventbrite: quirky navigation, "closed the app trying to get back to my event")

**HOTMESS principle: One gesture: the beacon. No nested event-selection maze. The pin IS the event.**

A promoter who wants to manage their event taps their beacon on the globe. That pin is the event.
There is no separate event-selection screen, no list of past events to scroll, no hamburger menu
leading to a sub-menu. All actions (see sales, message holders, open door scanner) are anchored to
the beacon pin. The venue's mental model never changes.

*Lifecycle trace:* § 2.7 (The one gesture) — confirmed in writing that beacon = event across all
phases.

---

### 7 — Ticket visibility failure (OutSavvy Trustpilot: tickets don't appear in app/site after purchase; broken PDF; no visible ticket)

**HOTMESS principle: Ticket state is authoritative in-app and always renders. No PDF dependency. `issued` means visible, immediately.**

On successful Stripe payment confirmation (webhook → `ticket_state = 'issued'`), the ticket renders
in the member's app. There is no PDF generation step, no email delivery dependency, no async job
that can silently fail. The QR is generated at issuance and stored as `qr_token`. If the member
opens the app, the ticket is there.

*Lifecycle trace:* § 2.1 (State machine) — `issued` is the first stable state post-payment; the
transition is driven by Stripe webhook, not by a secondary async process. § 2.5 — all ticket types
resolve to the same `issued` entry point.

---

### 8 — Resale dead end (OutSavvy: buyer wanted to resell into a sold-out waitlist and couldn't)

**HOTMESS principle: Resale is first-class and waitlist-aware. `valid → resold/void → reissued` routes to the waitlist automatically.**

Resale is a legal state transition on the machine, not a separate feature or a support ticket.
When a member initiates resale, their `qr_token` is voided (moved to `qr_token_voided`), their
`ticket_state` becomes `resold_void`, and the system issues a new ticket (`ticket_state = 'issued'`)
to the first member on the resale waitlist at a price capped by the original face value. The old QR
is dead. The new QR is live. The waitlist match is automatic.

*Lifecycle trace:* § 2.1 (State machine) — `valid → resold_void → reissued` transition with
explicit illegality of `scanned → resold`. § 2.5 — Resale is a ticket type configuration flag, not
a subsystem.

---

### 9 — Support-ticket refunds (DICE / OutSavvy: support delays when money/tickets go wrong)

**HOTMESS principle: Because we are issuer + Stripe system-of-record, refund/reissue is a first-class dashboard action, not a support ticket.**

Refund is a button in the venue/promoter dashboard that triggers a Stripe refund via the Smash Daddys
Ltd account and sets `ticket_state = 'refunded_void'`. Reissue is a button that voids the current
QR and issues a new one. No support queue. No intermediary. The promoter has the authority; the
platform executes it.

*Lifecycle trace:* § 2.6 (Money + ledger) — refund-as-dashboard-action is a specified behaviour.
§ 2.1 — `valid → refunded_void` is a legal transition.

---

### 10 — No owned channel / no real-time throttle (All: no owned real-time channel to ticket-holders; no live pre-sale throttle)

**HOTMESS principle: Venue can reach the notifiable segment via the existing push/Telegram/WhatsApp stack, rate-shaped, and watch velocity move live.**

The `notifiable_segment(event_id)` is the set of members holding `ticket_state = 'valid'` for that
event. This segment is queryable at any point and wires directly into the existing notification
priority taxonomy (CRITICAL / HIGH / AMBIENT / SILENT). Rate-shaping caps per-venue outbound volume
to prevent channel abuse. The venue sees live sales velocity on the dashboard. Pre-sale "last 20
tickets" pushes are a first-class use of this segment, not a hack.

*Lifecycle trace:* § 2.4 (Notifiable segment) — full definition, priority wiring, and rate caps.

---

## Traceability Matrix

| # | Principle | LIFECYCLE_SPEC section |
|---|-----------|------------------------|
| 1 | Published flat take | § 2.6 Money + ledger |
| 2 | No gatekeeping | § 2.7 The one gesture |
| 3 | No new app | § 2.1 State machine, § 2.2 Member-identity link |
| 4 | Venue owns the relationship | § 2.3 Scoped visibility |
| 5 | Net-to-venue by default | § 2.6 Money + ledger |
| 6 | One gesture | § 2.7 The one gesture |
| 7 | `issued` means visible | § 2.1 State machine, § 2.5 Ticket types |
| 8 | Resale is first-class | § 2.1 State machine, § 2.5 Ticket types |
| 9 | Refund is a dashboard action | § 2.6 Money + ledger, § 2.1 State machine |
| 10 | Owned channel + rate shaping | § 2.4 Notifiable segment |

---

*Every principle in this document has a lifecycle counterpart. If any principle cannot be traced to
a section in `LIFECYCLE_SPEC.md`, the spec is incomplete. This document and the lifecycle spec are
co-dependent; neither is done without the other.*
