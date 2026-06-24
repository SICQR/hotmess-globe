# COCKPIT DISCOVERY REPORT
**Repo:** `SICQR/hotmess-globe` (branch `production`, the live trunk) · **Supabase:** `rfoftonnlwudilafhfkl` · **Date:** 2026-06-23
**Type:** read-only reconnaissance. No code, DB, or deploy changes were made in producing this. Every claim cites a file path or table; unverifiable items are marked **UNKNOWN**.

---

## 1. Executive Summary

**What the cockpit IS today.** There is exactly one live, reachable operator surface: `OperatorPanel.jsx` at route `/operator` (`src/App.jsx:488`, gated by `src/routes/OperatorRoute.jsx`). It is a genuine live "run-the-night" console — tabs LIVE / SIGNALS / ZONES / EVENTS / MONEY / CONTROL, driven by real `/api/operator/*` endpoints, real-time beacon subscriptions, and `safety_switches` kill-switches. Around it sit **ten-plus other "dashboard" surfaces that are almost all dead**: not routed, orphaned sheets, or — tellingly — querying tables that **do not exist in the database** (`business_profiles`, `seller_payouts`, `beacon_check_ins`, `creator_profiles`, `beacon_tiers`, `moderation_actions`). The role model is fragmented across three different columns and two lookup keys, and there are **two unlinked venue identities** (`venues` vs `pulse_places`).

**What the cockpit SHOULD be.** One role-adaptive operator cockpit (`/operator`) that is the single home for any business account — venue or promoter — surfacing, at a glance, the live state of their night (presence, check-ins, active beacons, momentum), their events/tickets, their money (sales + payouts + Stripe Connect), and their controls (zones, kill-switches, SOS). Everything else gets absorbed or deleted. To make it whole, two foundational fixes are required first: **(a) unify the venue identity** so a venue's globe presence (`pulse_places`) and its operator record (`venues`/`operator_venues`) are the same entity, and **(b) unify the role model** onto one vendor axis (`operator_venues` + `memberships.tier`), retiring the `profiles.subscription_tier` / `profiles.membership_tier` drift for business gating.

---

## 2. Dashboard Surface Inventory

Legend: **LIVE** = reachable + functional; **DEAD** = not routed / no entry point; **BROKEN** = code reads a table that does not exist.

| File | Lines | Purpose | Role | Reads (tables / APIs) | Tabs/Sections | Routed? | Verdict |
|---|---|---|---|---|---|---|---|
| `src/pages/OperatorPanel.jsx` | 774 | Operator cockpit — live night ops | venue / promoter (admin override) | `beacons`, `operator_venues`, `profiles`, `safety_switches`; `/api/operator/{status,momentum,beacon/drop,beacon/expire,incentive-beacon,zone/update,end-event,kill-switch,sos,audit}` | LIVE · SIGNALS · ZONES (venue-only) · EVENTS · MONEY · CONTROL | **YES** `/operator` (App.jsx:488 → OperatorRoute) | **LIVE.** EVENTS tab = placeholder (`PlaceholderPanel`, lines 109-111/750). MONEY = real `MoneyTab`. |
| `src/components/operator/MoneyTab.jsx` | ~395 | Cockpit MONEY tab — Connect, payouts, sales | venue/promoter | `market_sellers`, `payouts`, `ticket_orders`, `orders`, `beacons`; `/api/stripe/connect-onboard` | sub-panel | embedded in OperatorPanel | **LIVE** (wired to real schema). |
| `src/pages/AdminDashboard.jsx` | 281 | Admin hub (9 tabs, embeds sub-components) | admin | sub-components; `/api/admin/notifications/dispatch` | analytics/users/moderation/curation/events/support/shopify/verification/advanced | **YES** `/AdminDashboard` (via `PAGES` map, pages.config.js:30) | **LIVE.** Client-side-only `role==='admin'` gate, self-documented insecure (line ~52). |
| `src/pages/admin/RevenueDashboard.jsx` | 365 | Revenue analytics | admin/superadmin | `/api/admin/revenue` | KPI cards | **YES** `/admin/revenue` (App.jsx:531) | **LIVE.** Inline gate `useUserContext().profile.role in [admin,superadmin]` (line 95). |
| `src/pages/admin/FunnelPage.jsx` | 232 | Funnel analytics | admin | `analytics_events` | dashboard | **YES** `/admin/funnel` (App.jsx:529) | **LIVE.** Page-level gate UNKNOWN (relies on API). |
| `src/pages/admin/ModerationPage.jsx` | 938 | Moderation queue | admin | `market_listings`, **`moderation_actions`** ❌, `preloved_listing_reports`, `profiles`, `seller_restrictions` | reports/actions | lazy-imported (App.jsx:86), **no `<Route>`** | **DEAD route + BROKEN** (`moderation_actions` does not exist). |
| `src/pages/SellerDashboard.jsx` | 502 | P2P/preloved seller console | seller | `market_listings`, `orders`, `order_items`, `promotions`, **`seller_payouts`** ❌, `profiles` | products/orders/offers/payouts/analytics | lazy-imported (App.jsx:107), **no `<Route>`** | **DEAD + BROKEN** (`seller_payouts` does not exist; real table is `payouts`). |
| `src/pages/CreatorDashboard.jsx` | 485 | Creator Studio | creator | `creator_content`, **`creator_profiles`** ❌, **`custom_content_requests`** ❌ | overview/content/requests | **NO** (only in dead `bizRoutes.jsx`) | **DEAD + BROKEN.** Buttons target `/creator/settings|upload` → no route → `PageNotFound`. |
| `src/pages/OrganizerDashboard.jsx` | 200 | Organizer view | promoter/organizer | `beacons`, **`beacon_check_ins`** ❌, `user_interactions` | single page | **NO** | **DEAD + BROKEN** (`beacon_check_ins` does not exist). Also `.eq({created_by: email})` bug (~line 29). |
| `src/pages/biz/PromoterDashboard.jsx` | 338 | Promoter beacons + pricing | promoter | `beacons`, **`beacon_tiers`** ❌ | create / my beacons | **NO** (only dead `bizRoutes.jsx` `/biz`) | **DEAD + BROKEN** (`beacon_tiers` does not exist). |
| `src/pages/biz/BusinessDashboard.jsx` | 345 | Business/venue home | venue | `beacons`, `event_rsvps`, **`business_profiles`** ❌ | sections | **NO** | **DEAD + BROKEN** (`business_profiles` does not exist). |
| `src/pages/biz/BusinessAnalytics.jsx` | 290 | Business analytics | venue | `beacons`, `event_rsvps` | — | **NO** | DEAD (no entry; only cross-linked from dead BusinessDashboard). |
| `src/pages/biz/BusinessSettings.jsx` | 376 | Business profile settings | venue | **`business_profiles`** ❌ | — | **NO** | DEAD + BROKEN. |
| `src/pages/biz/BusinessOnboarding.jsx` | 331 | Business onboarding | venue | `profiles` | flow | **NO** | DEAD. |
| `src/pages/biz/BusinessVenue.jsx` | 330 | Venue editor | venue | **`business_profiles`** ❌ | — | **NO** | DEAD + BROKEN. |
| `src/pages/biz/BusinessBilling.jsx` | 263 | Business billing | venue | **`business_profiles`** ❌ | — | **NO** | DEAD + BROKEN. |
| `src/components/sheets/L2VendorDashboardSheet.jsx` | 406 | Vendor home (L2 sheet) | vendor/promoter | `beacons`, `market_sellers`, `ticket_inventory_pools`, `vendor_event_access`; **`/api/stripe/connect/onboard`** ❌ (wrong path) | seller row + Connect + events | registered `'vendor-dashboard'` (SheetRouter:263), **no `openSheet` caller** | **ORPHANED.** Calls a non-existent endpoint path (real is `/api/stripe/connect-onboard`). |
| `src/components/sheets/L2VendorEventSheet.jsx` | 559 | Per-event ticket editor | vendor | `ticket_inventory_pools`; `/api/tickets/export` | event editor | sheet `'vendor-event'` (SheetRouter:264) | LIVE code; reachable only via opener — UNKNOWN if any live caller. |
| `src/components/sheets/L2AdminSheet.tsx` | 871 | Admin "City Ops" sheet | admin | `profiles`, `beacons` | city ops | sheet `'admin'` (SheetRouter:253) | LIVE code; opener UNKNOWN. |
| `src/pages/RightNowDashboard.jsx` | 108 | "Right Now" explainer + manager | consumer | (delegates to `RightNowManager`) | info + manager | **NO**, no inbound links | DEAD. |
| `src/pages/SellerOnboarding.jsx` | 365 | Seller onboarding | seller | — | flow | lazy-imported (App.jsx:108), **no `<Route>`** | DEAD. |
| `src/pages/VenueCheckin.tsx` | 399 | Venue check-in (timed/safety) | consumer-at-venue | `venue_checkins`, `timed_checkins`, `pulse_places`, `place_intensity`, `trusted_contacts`; `/api/push/send` | check-in flow | lazy-imported (App.jsx:105), **no `<Route>`** | DEAD route (live code). |
| `src/pages/MyEvents.jsx` | 244 | User's events | consumer/organizer | `beacons`, `event_rsvps` | — | **NO** (linked from `Events.jsx`, which redirects `/events`→`/pulse`) | Likely DEAD. |

**Other operator-relevant code (not standalone dashboards):** `src/pages/EditBeacon.jsx` (533, routed via legacy allowlist), `src/pages/BeaconDetail.jsx` (358, routed via `PAGES`), embedded admin components under `src/components/admin/*`, `src/components/seller/SalesAnalytics.jsx` (embedded in SellerDashboard).

**`src/routes/bizRoutes.jsx` is entirely dead** — `grep -rn bizRoutes src/` returns only the file itself; never imported. All its routes/redirects (`/biz`, `/creator/*`, `/biz/beacon/:id` → `/operator`) never execute.

---

## 3. Role & Access Model

### Tiers (`src/lib/revenue.js`)
- `TIER` const (line 8): `{ FREE:'mess', PLUS:'hotmess', CHROME:'connected', PROMOTER:'promoter', VENUE:'venue' }` — the canonical 5-tier ladder.
- `MEMBERSHIP_TIERS` object (lines 14-99) defines **only FREE/PLUS/CHROME** with pricing. **`promoter` and `venue` have NO config entry** — gap between the ladder and the config.

| DB tier value | Facing | Notes |
|---|---|---|
| `mess` (free) | consumer | |
| `hotmess` (plus) | consumer | price drift: revenue.js says £9.99, `useUserContext.js` comment says £7.99 |
| `connected` (chrome) | consumer→prosumer | adds seller/creator |
| `promoter` | **business** | events/ticketing (£44.99) — no config object |
| `venue` | **business** | globe + door app (£99.99) — no config object |

### Runtime resolution — **fragmented (3 columns, 2 keys)**
| Mechanism | Reads | Used by |
|---|---|---|
| `src/hooks/useUserContext.js` | `profiles.subscription_tier`, **keyed by email** (~line 94); exposes `isVenue/isPromoter` (lines 161-166) | consumer gating, RevenueDashboard |
| `src/lib/AuthContext.jsx` | `profiles.*` **by id** (line 68); `currentUser.role` | OperatorRoute, AdminDashboard |
| `src/contexts/BootGuardContext.jsx` | `profiles.*` by id (line 294) — boot/onboarding only, not dashboard gating |
| `src/routes/OperatorRoute.jsx` | **3 sources:** `profiles.role==='admin'` OR `operator_venues` rows OR `memberships.tier ∈ (venue,promoter)` (lines 36-44) | `/operator` only |
| `src/App.jsx:411-424` | on Stripe success writes BOTH `profiles.membership_tier` **and** `memberships.tier` | a **third** column name (`membership_tier`) |

**Three drifts, cite-able:** (1) consumer gate uses `profiles.subscription_tier`; operator gate uses `memberships.tier` + `operator_venues`; Stripe writes `profiles.membership_tier` — three columns. (2) `useUserContext` keys `profiles` by **email**, everything else by **id**. (3) admin = `profiles.role`; vendor = `memberships`/`operator_venues`; consumer = `profiles.subscription_tier` — no single source of truth.

### Per-dashboard gate
| Surface | Gate |
|---|---|
| `/operator` | Route guard (`OperatorRoute`: admin OR operator_venues OR membership venue/promoter) **+** internal re-check in panel (`getUser` → `profiles.role`/`operator_venues`, lines 631-643) |
| `/AdminDashboard` | inline client-side `role==='admin'` (insecure, self-noted line ~52) |
| `/admin/revenue` | inline `profile.role ∈ [admin,superadmin]` → redirect (line 95) |
| `/admin/funnel` | none visible in page; UNKNOWN API enforcement |
| Seller/Creator/Organizer/Promoter/Business* | **no tier/role gate** — just `getUser()` to load own data. None gated by venue/promoter tier. |
| L2 sheets | gated only by whoever opens the sheet |

---

## 4. Data Layer — Authoritative vs Dead (verified row counts)

**Live row counts (service-role read, 2026-06-23):**
`beacons` **76** · `pulse_events` **101** · `events` **0** · `pulse_places(active)` **207** · `venues` **8** · `operator_venues` **1** · `memberships` **304** · `market_sellers` **11** · `orders` **114** · `order_items` **68** · `ticket_orders` **2** · `ticket_inventory_pools` **1** · `payouts` **0** · `venue_checkins` **1** · `right_now_posts` **0**.

### Cluster verdicts
**Check-ins:** `venue_checkins` (EXISTS, 1 row) + `timed_checkins` (EXISTS) are **authoritative**. `beacon_check_ins` and `beacon_checkins` **do not exist** → **DEAD vocabulary** (referenced only by the dead `OrganizerDashboard.jsx`).

**Tickets / commerce:** `ticket_orders` (EXISTS, 2 rows) = **authoritative ticket sales**; `ticket_inventory_pools` (EXISTS, 1) = inventory. `orders` (114) + `order_items` (68) = the **separate market/preloved commerce** domain (not tickets). `ticket_purchases` and `ticket_listings` **do not exist** → DEAD vocabulary.

**Events:** `pulse_events` (EXISTS, **101**) is **authoritative**; `events` (EXISTS but **0 rows**) is **empty scaffolding / DEAD**.

**Venues — two unlinked live identities (the core issue):**
- `venues` (8) = canonical **operator** venue table. `operator_venues.venue_id` and `beacons.venue_id` FK here. This is the operator/door-app side.
- `pulse_places` (207 active) = the **globe display + events** anchor. `pulse_events.place_id` / `place_slug` point here; `beacon_category` lives here.
- `operator_venues` (1) = the vendor↔venue link (`user_id`↔`venue_id` → venues).
- **They are not joined.** A venue's globe presence (`pulse_places`) and its operator record (`venues`) are different rows in different tables with no FK between them. *(Verified: `pulse_events` has `place_id`/`outout_venue_id`; `beacons` has `venue_id`/`active_event_venue_id` → `venues`.)*

**Payouts:** `payouts` (EXISTS, **0 rows** — empty but live) is **authoritative**; `seller_payouts` **does not exist** → DEAD (referenced by dead `SellerDashboard.jsx`).

**Ownership chain (FKs, verified):**
- Operator → venue: `operator_venues.user_id → venues.id`. ✅ wired.
- Venue → beacons: `beacons.venue_id → venues.id` (+ `owner_id` user, `active_event_venue_id`). ✅ wired.
- Beacon → tickets: `ticket_orders.beacon_id` + `inventory_pool_id`; `ticket_inventory_pools.beacon_id`. ✅ wired (tickets roll up to a venue **via beacon**).
- Event → place: `pulse_events.place_id → pulse_places` (NOT `venues`). ⚠️ events roll up to `pulse_places`, beacons/tickets roll up to `venues` — **two chains that never meet.**
- Payout → seller: `payouts.seller_id` / `user_id` → `market_sellers`/`profiles`. ✅ wired, but 0 rows.

---

## 5. Money Path — what works, what's stubbed

Flow an operator should see: **ticket sale → ticket_order → inventory pool → payout → Stripe Connect.**
- **Ticket sale → order:** `ticket_orders` (2 rows) ✅ exists, sparse real data.
- **Inventory pool:** `ticket_inventory_pools` (1 row), `ticket_orders.inventory_pool_id` ✅.
- **Payout:** `payouts` table exists but **0 rows** — nothing has been paid out; pipeline untested with real data.
- **Stripe Connect:** `market_sellers` (11) carries `stripe_account_id`/`stripe_onboarding_complete`. The **working endpoint is `/api/stripe/connect-onboard`** (used by `PayoutManager` and the cockpit `MoneyTab`). The orphaned `L2VendorDashboardSheet.jsx` references **`/api/stripe/connect/onboard`** (subfolder path) which does **not** exist — a dead reference, not a real gap. **No Stripe dashboard action is blocked** for the cockpit path.
- **What an operator can see today:** only via the cockpit **MONEY tab** — Connect status, payouts (0), and a simple sales summary (ticket_orders + market orders). `/admin/revenue` is admin-wide, not per-operator. There is **no per-venue self-serve revenue view** outside the cockpit MONEY tab.

---

## 6. Gap Analysis — what a unified cockpit needs that doesn't exist

1. **Unified venue identity.** `venues` (operator) and `pulse_places` (globe/events) are unlinked. Until a venue's globe pin = its operator record, the cockpit can't show "your events" (pulse_events→pulse_places) and "your beacons/tickets" (beacons→venues) as one venue. **Foundational.**
2. **Unified role axis.** Collapse `profiles.subscription_tier` / `profiles.membership_tier` / `memberships.tier` for business gating onto one source (recommend `operator_venues` + `memberships.tier`), and one lookup key (`id`, not email).
3. **Operator↔venue linkage at scale.** `operator_venues` has **1 row** (hand-created). Onboarding does not create operator_venues links — real venues have no way to become operators yet. **Substrate gap.**
4. **EVENTS tab.** Cockpit EVENTS is a placeholder; the data exists (`pulse_events` 101, `ticket_orders`, `ticket_inventory_pools`) but isn't surfaced per-venue.
5. **Cold-load / deep-link robustness.** `/operator` survives in-app navigation but a cold URL load redirects during boot (boot-sequence race) — needs a fix for deep links and refresh.
6. **Payout pipeline unproven.** `payouts` is empty; the sale→payout path has never run end-to-end with real money.
7. **Promoter vs venue data parity.** Promoters have no fixed `venues` row; their events live in `pulse_events`/`beacons` by `owner_id`. The cockpit's venue-centric `venue_id` model doesn't cleanly serve a promoter without a venue. Role adaptation needs a promoter data path.

---

## 7. Recommended Cockpit Definition (for Phil to ratify)

**One cockpit, `/operator`, role-adaptive. Proposed tabs:**

| Tab | Venue | Promoter | Source (live) |
|---|---|---|---|
| **LIVE** | ✅ in-room, RSVPs, scanned, beacons, momentum | ✅ (event-scoped) | `/api/operator/status`, beacons realtime, `venue_checkins`/`timed_checkins`, `place_intensity` |
| **SIGNALS** | ✅ drop/expire/incentive beacons | ✅ | `/api/operator/beacon/*`, `beacons` |
| **ZONES** | ✅ | ❌ hidden (no fixed geography) | `/api/operator/zone/update` |
| **EVENTS** | ✅ your events + ticket inventory | ✅ | `pulse_events`, `ticket_inventory_pools`, `ticket_orders` *(needs build)* |
| **MONEY** | ✅ Connect, payouts, sales | ✅ | `market_sellers`, `payouts`, `ticket_orders`, `orders` *(live)* |
| **CONTROL** | ✅ kill-switches, SOS, end-event, audit | ✅ | `/api/operator/{kill-switch,sos,end-event,audit}`, `safety_switches` |

**Keep / absorb / kill:**
- **KEEP (the spine):** `OperatorPanel.jsx` + `MoneyTab.jsx`.
- **ABSORB into cockpit then delete source:** SellerDashboard (commerce → MONEY, after fixing `seller_payouts`→`payouts`), L2VendorEventSheet (ticket inventory → EVENTS), the live bits of BusinessAnalytics (→ LIVE/EVENTS).
- **KILL (dead + mostly BROKEN, after ratification — Brief C):** OrganizerDashboard, CreatorDashboard, PromoterDashboard, BusinessDashboard, BusinessAnalytics, BusinessSettings, BusinessOnboarding, BusinessVenue, BusinessBilling, RightNowDashboard, MyEvents, SellerOnboarding, L2VendorDashboardSheet, ModerationPage (or re-route if admin still wants it), and the entire `src/routes/bizRoutes.jsx`.
- **SEPARATE surface, leave alone:** the admin cluster (`AdminDashboard`, `/admin/revenue`, `/admin/funnel`) — different audience; only fix its insecure client-side gate as a separate security task.

**Sequencing recommendation:** (0) unify venue identity + operator_venues onboarding (foundational), (1) fix the role axis, (2) build EVENTS tab, (3) absorb commerce, (4) Brief C deletions, (5) cold-load fix + the `/portal` vendor door.

---

## 8. Open Questions (need Phil or further investigation)

1. **Venue identity:** should `venues` and `pulse_places` merge, or should one FK to the other? Which is the system of record for a venue going forward? *(Blocks the EVENTS tab and any "your venue" rollup.)*
2. **Promoter data model:** a promoter has no `venues` row — do we create a `venues` row per promoter, or give the cockpit a promoter path keyed on `beacons.owner_id` / `pulse_events`? UNKNOWN today.
3. **Operator onboarding:** how does a real venue/promoter get an `operator_venues` link (currently only 1, hand-made)? Self-serve, admin-granted, or via the `venue`/`promoter` Stripe subscription?
4. **ModerationPage:** keep (re-route for admin) or kill? It's broken (`moderation_actions` missing) and unrouted.
5. **Admin gate security:** `/AdminDashboard` is client-side-only gated (self-documented insecure). Separate hardening task — confirm priority.
6. **`/admin/funnel` enforcement:** page has no visible gate; backend enforcement UNKNOWN — verify the API checks role.
7. **Price source of truth:** `revenue.js` vs `useUserContext.js` comments disagree on PLUS price (£9.99 vs £7.99). Which is correct?

---

*Read-only recon. Nothing in the repo or database was modified to produce this report. Verdicts of "does not exist" are from `to_regclass` checks against the live database; "DEAD route" / "no caller" are from `grep` over `src/`.*
