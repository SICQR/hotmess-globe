# HOTMESS Globe — Stabilization Execution Plan

> **Status:** AUTHORITY MODEL — code-free definition only.
> This document is the single source of truth for the desired architecture.
> No production code should diverge from the shapes defined here.

---

## 1 · Desired Navigation Tree

The canonical navigation model is locked in **V1.5** of the OS Bible
(`docs/HOTMESS-LONDON-OS-BIBLE-v1.5.md`).
The table below maps every primary and secondary destination to its canonical URL.

### 1.1 Primary tabs (bottom dock)

| Tab | Canonical route | Page key | Notes |
|-----|-----------------|----------|-------|
| **HOME** | `/` | `Home` | Launcher / dashboard |
| **PULSE** | `/pulse` | `Pulse` | Map + layers |
| **EVENTS** | `/events` | `Events` | List + detail |
| **MARKET** | `/market` | _(Shopify shell)_ | Headless Shopify |
| **SOCIAL** | `/social` | `Social` | Connect + Messages merged |
| **MUSIC** | `/music` | `Music` | Radio + Records merged |
| **MORE** | `/more` | `More` | Tools + legal + settings |

### 1.2 Tab sub-routes

#### EVENTS
| Route | Resolves to |
|-------|-------------|
| `/events/:id` | Beacon/event detail redirect |

#### MARKET
| Route | Resolves to |
|-------|-------------|
| `/market/:collection` | `ShopCollection` |
| `/market/p/:handle` | `ShopProduct` |
| `/market/creators` | P2P Marketplace |
| `/market/creators/p/:id` | Creator product |
| `/market/creators/cart` | Creators cart |
| `/market/creators/checkout` | Creators checkout |
| `/orders` | `OrderHistory` |
| `/orders/:id` | `OrderHistory` (no detail yet) |
| `/orders/:id/tracking` | `OrderHistory` (no detail yet) |
| `/returns` | `OrderHistory` (no detail yet) |
| `/cart` | `ShopCart` |
| `/checkout/start` | `CheckoutStart` |

#### SOCIAL
| Route | Resolves to |
|-------|-------------|
| `/social/discover` | Redirect → `/social` |
| `/social/inbox` | `Messages` |
| `/social/u/:id` | `Profile` (by UID) |
| `/social/t/:threadId` | `Messages` (with thread) |

#### MUSIC
| Route | Resolves to |
|-------|-------------|
| `/music/live` | `Radio` |
| `/music/shows` | `RadioSchedule` |
| `/music/schedule` | `RadioSchedule` |
| `/music/shows/:slug` | Show hero redirect |
| `/music/releases` | `Music` |
| `/music/releases/:slug` | `MusicRelease` |
| `/music/tracks`, `/music/tracks/:id` | Redirect → `Music` |
| `/music/playlists`, `/music/playlists/:id` | Redirect → `Music` |
| `/music/artists`, `/music/artists/:id` | Redirect → `Music` |
| `/music/clips/:id` | Redirect → `Music` |

#### MORE (tools)
| Route | Page key |
|-------|----------|
| `/more/beacons` | `Beacons` |
| `/more/beacons/new` | `CreateBeacon` |
| `/more/beacons/:id` | Beacon detail redirect |
| `/more/beacons/:id/edit` | `EditBeacon` |
| `/more/stats` | `Stats` |
| `/more/challenges` | `Challenges` |
| `/more/settings` | `Settings` |
| `/more/care` | `Care` |
| `/more/vault` | `Vault` |
| `/safety/*` | `Safety` |
| `/safety/resources` | `Care` |
| `/calendar/*` | `Calendar` |
| `/scan/*` | `Scan` |
| `/community/*` | `Community` |
| `/leaderboard/*` | `Leaderboard` |

### 1.3 System / auth routes
| Route | Page key |
|-------|----------|
| `/age` | `AgeGate` |
| `/auth`, `/auth/*` | `Auth` |
| `/onboarding`, `/onboarding/*` | `OnboardingGate` |
| `/_/go/:type/:id` | Deep-link resolver |
| `/_/offline`, `/_/maintenance`, `/_/404`, `/_/500` | System shells |

### 1.4 Account & billing
| Route | Resolves to |
|-------|-------------|
| `/account` | `Settings` |
| `/account/profile` | `EditProfile` |
| `/account/membership` | `MembershipUpgrade` |
| `/account/upgrade` | `MembershipUpgrade` |
| `/account/billing` | `MembershipUpgrade` |
| `/account/delete` | `AccountDeletion` |
| `/account/export` | `DataExport` |
| `/account/consents` | `AccountConsents` |
| `/account/data`, `/account/data/*` | `AccountConsents` |
| `/notifications`, `/notifications/*` | `Settings` |

### 1.5 Business & admin
| Route | Page key |
|-------|----------|
| `/biz` | `BusinessDashboard` |
| `/biz/analytics` | `BusinessAnalytics` |
| `/biz/onboarding` | `BusinessOnboarding` |
| `/admin`, `/admin/*` | `AdminDashboard` |

### 1.6 Legal & misc
| Route | Resolves to |
|-------|-------------|
| `/legal/privacy` | `Privacy` (legal component) |
| `/legal/terms` | `Terms` (legal component) |
| `/legal/privacy-hub` | `PrivacyHub` |
| `/privacy` | `PrivacyPolicy` |
| `/terms` | `TermsOfService` |
| `/guidelines` | `CommunityGuidelines` |
| `/contact` | `Contact` |
| `/help` | `HelpCenter` |
| `/support` | `Contact` |
| `/membership` | `MembershipUpgrade` |
| `/pricing` | `Pricing` |
| `/saved` | `Bookmarks` |

### 1.7 Legacy / backward-compat redirects
These routes MUST NOT be removed (deep links in the wild).

| Legacy route | Canonical destination |
|--------------|-----------------------|
| `/radio` | `Radio` page |
| `/radio/schedule` | `RadioSchedule` |
| `/connect`, `/connect/*` | `/social` |
| `/marketplace` | `/market` |
| `/shop` | `/market` |
| `/p/:handle` | `/market/p/:handle` |
| `/Marketplace` | `/market` |

---

## 2 · Desired Provider Stack

The provider tree is composed of **four rings**:

```
main.jsx (root)
└── Sentry.ErrorBoundary          # outer crash catcher
    └── ErrorBoundary             # inner React error boundary
        └── OSProvider            # OS finite-state machine (boot/idle/sheet/thread/interrupt)
            └── App.jsx
                └── I18nProvider      # locale + copy tokens
                    └── AuthProvider  # Supabase session + user state
                        └── BootGuardProvider   # boot FSM: LOADING → UNAUTH → NEEDS_AGE → NEEDS_ONBOARDING → READY
                            └── QueryClientProvider  # React Query (TanStack)
                                └── WorldPulseProvider  # ambient globe signal feed
                                    └── ShopCartProvider  # Shopify headless cart state
                                        └── BrowserRouter
                                            └── NavigationTracker
                                            └── BootRouter     # gate: spinner | PublicShell | full app
                                                └── OSArchitecture
                                                    ├── UnifiedGlobe (L0, z-0)
                                                    └── AuthenticatedApp
                                                        └── PageTransition
                                                            └── Routes …
```

### Ring descriptions

| Ring | Provider | Responsibility | Singleton? |
|------|----------|---------------|-----------|
| **0 – Error** | `Sentry.ErrorBoundary` + `ErrorBoundary` | Catch render crashes; report to Sentry | Yes |
| **0 – OS FSM** | `OSProvider` (`src/os/store.tsx`) | Manages `mode`: boot → idle → sheet → thread → interrupt. Single ground-truth state machine. | Yes |
| **1 – i18n** | `I18nProvider` | Locale, translations, RTL flag | Yes |
| **2 – Auth** | `AuthProvider` | Supabase session, `user`, `isAuthenticated`, `logout`, `navigateToLogin` | Yes |
| **3 – Boot guard** | `BootGuardProvider` | `LOADING → UNAUTHENTICATED → NEEDS_AGE → NEEDS_ONBOARDING → READY` | Yes |
| **4 – Data** | `QueryClientProvider` | TanStack React Query cache (shared `queryClientInstance`) | Yes |
| **5 – Globe signal** | `WorldPulseProvider` | Ambient world-pulse signal feed for globe atmosphere | Yes |
| **6 – Commerce** | `ShopCartProvider` | Guest + authenticated Shopify cart, line items, draft-order ID | Yes |
| **7 – Router** | `BrowserRouter` | URL history; `NavigationTracker` fires analytics on every route change | Yes |
| **8 – Boot gate** | `BootRouter` | Maps `bootState` → spinner / `PublicShell` / children | Once |

### Context providers that live inside the route tree

These are mounted on demand (not globally):

| Provider | Location | Responsibility |
|----------|----------|----------------|
| `SheetContext` | Sheet surface consumers | L2 sheet open/close/stack |
| `GlobeProvider` | Globe feature | Globe display mode |
| `NowSignalProvider` | Pulse/map surface | Local, actionable signals |
| `PersonaProvider` | Profile/Social surface | Presentation persona switching |
| `SafetyGateProvider` | Social + Messaging | Consent enforcement gates |
| `RadioContext` | `PersistentRadioPlayer` | Now-playing, playback state |

### Rules

1. **No provider lives below the `Router`** except those explicitly listed above.
2. Providers in ring 0–3 are independent of authentication state; they must not block on a user session.
3. `WorldPulseProvider` and `ShopCartProvider` may be moved inside `BootRouter`'s READY branch if cold-start performance demands it.
4. `SheetContext` must not be hoisted above `BrowserRouter` — it depends on `useSearchParams`.

---

## 3 · Desired Overlay Root

The overlay system uses a **four-layer Z-axis model** (L0–L3).
All layers render inside a single `<div className="hotmess-os relative h-dvh w-full overflow-hidden bg-[#050507]">` root mounted once in `OSArchitecture`.

### Layer definitions

| Layer | Z-index | Name | What lives here | Mount condition |
|-------|---------|------|-----------------|-----------------|
| **L0** | z-0 | Globe | `UnifiedGlobe` — persistent 3-D globe canvas; never unmounts | Always |
| **L1** | z-10 to z-50 | HUD | `TopHUD`, `RadioBar`, `BottomDock` — always visible chrome | Always (post-boot) |
| **L2** | z-20 to z-30 | Sheets | Slide-up content panels (`sheet` and `thread` OS modes) | On demand |
| **L3** | z-50+ | Interrupts | Full-screen blocking overlays (`interrupt` OS mode): SOS, safety, age-gate, onboarding, auth, verification | On demand |

### OS FSM → overlay mapping

```
OS mode    Visible layers
──────────────────────────
boot       L0 only (boot spinner)
idle       L0 + L1
sheet      L0 + L1 + L2 (sheet)
thread     L0 + L1 + L2 (sheet, dimmed) + L2 (thread panel on top)
interrupt  L0 + L3 (L1/L2 covered or hidden)
```

### Z-index constants (authoritative)

```ts
Z_LAYERS = {
  GLOBE:     0,   // L0
  HUD:      10,   // L1
  SHEET:    20,   // L2
  THREAD:   30,   // L2 (above sheet)
  INTERRUPT: 50,  // L3
}
```

Any component that needs to appear above normal content MUST use a value from `Z_LAYERS`.
Hard-coded z-index values outside this set are a stabilization defect.

### Interrupt types and their trigger sources

| Interrupt | Trigger | Dismiss |
|-----------|---------|---------|
| `age-gate` | `BootGuardProvider` when `NEEDS_AGE` | Age confirmation stored in `localStorage (hm_age_confirmed_v1)` |
| `onboarding` | `BootGuardProvider` when `NEEDS_ONBOARDING` | Onboarding completion flag on `profiles` row |
| `auth` | Unauthenticated access to a protected route | Login / magic link |
| `sos` | User triggers SOS action anywhere | PIN or explicit "I'm safe" action |
| `safety` | Moderation system or admin action | Admin unlock / acknowledged |
| `verification` | Account verification required | Email / ID verification flow |

### Overlay root rules

1. **One root**: there is exactly one `<div class="hotmess-os">` in the DOM. Creating additional fixed/absolute roots (e.g., custom modals not using `OSProvider.openInterrupt`) is prohibited.
2. **Globe never unmounts**: `UnifiedGlobe` must be a sibling of the content tree, not a parent or child of any sheet/interrupt.
3. **Sheets use `useOSSheet()`**: Any slide-up content panel that is not a system interrupt MUST call `openSheet(type, props)` and render inside the `sheet` layer.
4. **Interrupts use `useOSInterrupt()`**: Blocking full-screen overlays MUST call `openInterrupt(type, props)`.
5. **React portals**: If a component needs to render outside the normal DOM flow (e.g., a toast, a tooltip), it must portal into `#modal-root` (a dedicated `<div>` appended to `<body>`) not into a new stacking context.
6. **`Toaster` (Sonner)**: Lives at `QueryClientProvider` level in `App.jsx` — no other toast root should be introduced.

---

## 4 · Desired Supabase Topology

### 4.1 Project topology

```
┌─────────────────────────────────────────────────────────────────┐
│  Supabase Project: hotmess-globe (VITE_SUPABASE_URL)            │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  Auth        │  │  PostgreSQL  │  │  Storage              │ │
│  │  (Supabase)  │  │  (public     │  │  - uploads bucket     │ │
│  │              │  │   schema)    │  │    (RLS: auth user)   │ │
│  └──────────────┘  └──────────────┘  └───────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Edge Functions (Supabase)  /  Vercel Serverless (api/)  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Credential rules:**

| Variable | Scope | Use |
|----------|-------|-----|
| `VITE_SUPABASE_URL` | Client (public) | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Client (public) | RLS-scoped anon JWT |
| `SUPABASE_URL` | Server only (`api/*`) | Supabase project URL |
| `SUPABASE_ANON_KEY` | Server only | Anon key for unauthenticated reads |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Admin access — **never expose to client** |

### 4.2 Core domain tables

#### Identity & Auth
| Table | Key columns | Notes |
|-------|-------------|-------|
| `profiles` | `id` (= `auth.uid()`), `email`, `username`, `age_verified`, `onboarding_complete`, `role` | Primary user record; RLS: `auth.uid() = id` |
| `age_verifications` | `user_id`, `verified_at`, `method` | Audit trail for 18+ gate |
| `gdpr_consents` | `user_id`, `consent_type`, `granted_at`, `withdrawn_at` | GDPR consent ledger |
| `user_roles` | `user_id`, `role` | Admin / moderator / business role grants |
| `user_badges` | `user_id`, `badge_type`, `awarded_at` | Gamification badges |

#### Social
| Table | Key columns | Notes |
|-------|-------------|-------|
| `presence` | `user_id`, `last_seen`, `status` | Real-time availability |
| `profile_blocklist_users` | `user_id`, `blocked_user_id` | Block list |
| `profile_allowlist_users` | `user_id`, `allowed_user_id` | Allow list / close friends |
| `profile_viewer_filters` | `user_id`, `filter_config` | Visibility rules |
| `profile_visibility_rules` | `user_id`, `rule_type`, `config` | Granular visibility |
| `profile_embeddings` | `user_id`, `embedding` (pgvector) | Semantic match embeddings |
| `match_score_cache` | `user_a`, `user_b`, `score` | Cached compatibility scores |
| `match_explanations` | `user_a`, `user_b`, `explanation` | Human-readable match reasons |

#### Messaging
| Table | Key columns | Notes |
|-------|-------------|-------|
| `ticket_chat_threads` | `id`, `participant_ids`, `consent_state` | DM thread + consent gate |
| `ticket_chat_messages` | `thread_id`, `sender_id`, `body`, `created_at` | Messages inside threads |
| `ticket_responses` | `thread_id`, `responder_id` | Response tracking |

#### Beacons & Events
| Table | Key columns | Notes |
|-------|-------------|-------|
| `beacons` | `id`, `created_by`, `type`, `lat`, `lon`, `expires_at`, `tier` | User + business beacons |
| `beacon_tiers` | `tier`, `duration_minutes`, `max_per_day` | Tier config |
| `beacon_purchases` | `user_id`, `beacon_id`, `purchased_at` | Commerce for beacons |
| `events` | `id`, `title`, `promoter_id`, `venue_id`, `start_at`, `ticket_url` | Scraped + manually entered events |
| `event_rsvps` | `event_id`, `user_id`, `status` | RSVP records |
| `event_scraper_sources` | `id`, `url`, `scraper_type` | Automated event ingestion |
| `event_scraper_runs` | `source_id`, `run_at`, `events_found` | Scraper audit log |
| `official_ticket_inventory` | `event_id`, `tier`, `qty_available`, `price` | First-party ticket stock |
| `ticket_listings` | `id`, `seller_id`, `event_id`, `price`, `qty` | P2P resale listings |
| `ticket_purchases` | `listing_id`, `buyer_id`, `purchased_at` | Resale purchases |
| `ticket_fraud_signals` | `listing_id`, `signal_type`, `flagged_at` | Fraud detection |

#### Market / Commerce
| Table | Key columns | Notes |
|-------|-------------|-------|
| `products` | `id`, `seller_email`, `title`, `details` (JSONB), `price` | Marketplace + Shopify mirror |
| `product_orders` | `id`, `buyer_id`, `product_id`, `status`, `shopify_order_id` | Order records |
| `product_reviews` | `product_id`, `reviewer_id`, `rating` | Reviews |
| `product_saves` | `product_id`, `user_id` | Wishlist / saves |
| `cart_items` | `user_id`, `variant_id`, `qty`, `shopify_cart_id` | Unified cart (guest → user) |
| `sellers` | `id`, `user_id`, `stripe_account_id` | Seller profiles |
| `creator_products` | `id`, `creator_id`, `title`, `price` | P2P creator inventory |
| `creator_earnings` | `creator_id`, `amount`, `status` | Creator payout ledger |
| `creator_payouts` | `id`, `creator_id`, `amount`, `paid_at` | Payout records |

#### Radio / Music
| Table | Key columns | Notes |
|-------|-------------|-------|
| `radio_sessions` | `user_id`, `show_id`, `started_at`, `ended_at` | Listening sessions |
| `radio_signals` | `show_id`, `type`, `payload`, `created_at` | Real-time show signals |
| `radio_city_minute_agg` | `city`, `show_id`, `minute`, `listener_count` | Aggregated minute-level stats |
| `radio_show_city_hour_agg` | `show_id`, `city`, `hour`, `listener_count` | Aggregated hour-level stats |

#### Safety & Moderation
| Table | Key columns | Notes |
|-------|-------------|-------|
| `safety_incidents` | `id`, `reporter_id`, `subject_id`, `type`, `status` | Safety reports |
| `content_moderation_queue` | `content_id`, `content_type`, `flags`, `status` | Moderation queue |
| `content_flags` | `content_id`, `flagger_id`, `flag_type` | Individual flags |
| `anomaly_events` | `user_id`, `event_type`, `detected_at` | Automated anomaly log |
| `cadence_escalation_log` | `user_id`, `escalation_type`, `created_at` | Escalation history |

#### Trust & Scoring
| Table | Key columns | Notes |
|-------|-------------|-------|
| `scoring_config` | `metric`, `weight`, `config` | Tunable trust weights |
| `xp_balances` | `user_id`, `balance` | XP / gamification balance |
| `xp_transactions` | `user_id`, `delta`, `reason`, `created_at` | XP ledger |
| `referrals` | `referrer_id`, `referred_id`, `status` | Referral program |
| `subscriptions` | `user_id`, `tier`, `status`, `expires_at` | Membership tiers |

#### Business
| Table | Key columns | Notes |
|-------|-------------|-------|
| `business_profiles` | `id`, `owner_id`, `name`, `tier` | Business account record |
| `businesses` | `id`, `business_profile_id`, `verified` | Verification linkage |
| `business_analytics_daily` | `business_id`, `date`, `metrics` (JSONB) | Daily analytics roll-up |
| `business_presence` | `business_id`, `lat`, `lon`, `status` | Business map presence |
| `business_signals` | `business_id`, `type`, `payload` | Business-side signals |
| `business_verifications` | `business_id`, `method`, `verified_at` | Verification audit |
| `venues` | `id`, `business_id`, `name`, `lat`, `lon` | Venue records |
| `promoter_analytics` | `promoter_id`, `date`, `metrics` (JSONB) | Promoter stats |

#### System
| Table | Key columns | Notes |
|-------|-------------|-------|
| `system_settings` | `key`, `value` | Env-level feature flags |
| `audit_log` | `actor_id`, `action`, `target`, `created_at` | Security audit trail |
| `security_audit_log` | `actor_id`, `event`, `created_at` | Low-level security events |
| `client_errors` | `user_id`, `error`, `stack`, `created_at` | Client-side error telemetry |
| `analytics_events` | `user_id`, `event`, `properties`, `created_at` | Product analytics |
| `rate_limits` | `key`, `count`, `window_start` | Sliding-window rate limits |
| `support_tickets` | `id`, `user_id`, `subject`, `status` | User support queue |

### 4.3 Row-Level Security model

Every table that contains user data MUST have RLS enabled.
The desired policy patterns are:

| Pattern | When to use | Example |
|---------|-------------|---------|
| **Owner read/write** | User owns the row | `profiles`, `cart_items`, `beacon_purchases` |
| **Public read, owner write** | Content visible to all | `beacons`, `events`, `products` |
| **No direct client access** | Sensitive system tables | `security_audit_log`, `scoring_config` |
| **Service role only** | Admin/moderation writes | `content_moderation_queue`, `user_roles` |
| **Blocked-user filter** | Social safety | Any profile/signal query must exclude `profile_blocklist_users` rows |

### 4.4 Real-time channels

| Channel | Purpose | Subscribers |
|---------|---------|-------------|
| `presence:{userId}` | Online status broadcast | Social/Discover, globe dots |
| `beacons` | New/expired beacon events | `WorldPulseProvider`, PULSE map |
| `chat:{threadId}` | Incoming messages in a thread | `SheetContext` chat sheet |
| `radio_signals:{showId}` | Live show events | `RadioContext` / `RadioBar` |
| `safety_incidents` | Admin moderation queue | Admin dashboard only (service role) |

### 4.5 Serverless API conventions (`api/*`)

- All handlers are **ESM**: `export default async function handler(req, res) { … }`
- All handlers use shared helpers from `api/shopify/_utils.js` (`json`, `getEnv`, `getBearerToken`, `readJsonBody`) and `api/routing/_utils.js` (`getSupabaseServerClients`, `getAuthedUser`).
- Authenticated routes call `getAuthedUser(req, supabase)` and return `401` if null.
- The **service role client** is only used for admin/moderation operations; the **anon client** is used for public reads.
- Cron: `GET /api/events/cron` — triggered by Vercel cron per `vercel.json`.

---

## 5 · Stabilization Rules (non-negotiables)

1. **Navigation is the Bible.** Any route not in §1 is a defect or a deliberate extension (requires a Bible amendment).
2. **Provider order is fixed.** Reordering providers in `main.jsx` or `App.jsx` requires an explicit ADR (Architecture Decision Record).
3. **One overlay root.** No component may create a new fixed/absolute stacking context at viewport level outside `OSArchitecture`.
4. **RLS is mandatory.** Every new table must have an RLS policy PR attached. Tables without RLS will be blocked at review.
5. **Service role key is server-only.** Any code path that could expose `SUPABASE_SERVICE_ROLE_KEY` to the browser is a critical security defect.
6. **`base44` wrapper is the client SDK.** Direct `supabase.from(...)` calls in UI components are discouraged; use `base44.entities.*` helpers or a dedicated API route.
7. **Z-index from `Z_LAYERS`.** Hard-coded `z-` values not sourced from `Z_LAYERS` constants are a defect.
