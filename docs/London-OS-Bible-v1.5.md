# London OS Bible v1.5 (HOTMESS Globe)

**Repo:** `hotmess-globe` (React 18 + Vite 6 + Tailwind/shadcn)  
**Backend:** Supabase (Auth + Postgres + Storage + Edge Functions)  
**Migration note:** Legacy call sites still use `base44.*`, backed by a Supabase compatibility layer.

This document is intentionally grounded in shipped code paths and repo structure as of 2026-01-04.

**Doc location:** This spec lives in `docs/` to keep the repo root clean. If you want higher discoverability, add a short link from the root README.

---

## 1) Canonical Routing Model

**Rule:** Every page route is the PageKey: `/${PageKey}`.  
Source of truth: `PAGES` in [src/pages.config.js](../src/pages.config.js)

- Landing page is `pagesConfig.mainPage` → currently `Home`.
- The app registers routes for **every** PageKey in `PAGES`.

---

## 2) Navigation (Tabs) — Naming Map

Source of truth: `PRIMARY_NAV` and `SECONDARY_NAV` in [src/Layout.jsx](../src/Layout.jsx)

### Primary tabs

| UI label | PageKey | Notes |
|---|---|---|
| Home | `Home` | Landing + highlights |
| Pulse | `Globe` | Label “Pulse” maps to `Globe` |
| Events | `Events` | |
| Market | `Marketplace` | |
| Connect | `Connect` | Discovery + Right Now |
| Messages | `Messages` | Login required; may be read-only if profile incomplete |
| Feed | `Feed` | |

### Secondary tabs (More)

| UI label | PageKey |
|---|---|
| Beacons | `Beacons` |
| Stats | `Stats` |
| Challenges | `Challenges` |
| Safety | `Safety` |
| Radio | `Radio` |
| Calendar | `Calendar` |
| Scan | `Scan` |
| Community | `Community` |
| Leaderboard | `Leaderboard` |

---

## 3) Access Model (Guest vs Member) — What’s Actually Enforced

### 3.1 Guest browsing allowlist

Source of truth: `publicRoutes` in [src/App.jsx](../src/App.jsx)

Guests are not forced to `/Login` when visiting:
- `/` and `/Login`
- `/${mainPageKey}` (currently `/Home`)
- Explicit guest-browsable pages:
  - `/Home`, `/Globe`, `/Events`, `/Marketplace`, `/ProductDetail`

Everything else is treated as “protected”: if auth is required, the router layer redirects to login **only when** a protected route is visited.

### 3.2 Logged-in member gates (two layers)

#### Layer A: Boot-time Gatekeeper (overlay)

Source of truth: [src/components/auth/Gatekeeper.jsx](../src/components/auth/Gatekeeper.jsx)

- **AgeGate** is shown if the session is not age-verified.
  - Uses session storage + cookie: `hm_age_verified=1`.
- If logged in and `consent_accepted !== true`, Gatekeeper shows `ConsentForm` (overlay).

#### Layer B: Layout enforcement (redirects)

Source of truth: [src/Layout.jsx](../src/Layout.jsx)

For authenticated users:
- If not `consent_accepted`, redirect to `AccountConsents`.
- If onboarding flags are incomplete (`has_agreed_terms`, `has_consented_data`, `has_consented_gps`), redirect to `OnboardingGate`.
- If profile is incomplete (`full_name` or `avatar_url` missing), redirect to:
  - `Profile?returnUrl=<current_url>`
  - **Exception:** a set of “profile optional” pages are allowed (browsing core surfaces).

**Important nuance (as shipped):** profile completeness is required before *interactions* (DMs, Right Now, beacon creation, etc.), but not required to simply browse core surfaces.

### 3.3 Page gating matrix (derived from code)

This table is derived from:
- Guest allowlist: `publicRoutes` in [src/App.jsx](../src/App.jsx)
- Profile-optional pages: `profileOptionalPages` in [src/Layout.jsx](../src/Layout.jsx)

Definitions:
- **Guest allowlisted** = the route `/${PageKey}` is in the guest allowlist (no forced login redirect).
- **Login required** = not guest-allowlisted (AuthProvider may redirect on visit).
- **Profile required** = Layout will redirect to Profile if `full_name`/`avatar_url` missing (unless page is profile-optional).

Important: this is **page-access** gating. Many *actions inside pages* are additionally gated by `base44.auth.requireProfile()`.

| PageKey | Guest allowlisted | Login required | Profile required |
|---|:---:|:---:|:---:|
| `AccountConsents` | No | Yes | No |
| `AdminDashboard` | No | Yes | Yes |
| `BeaconDetail` | No | Yes | Yes |
| `Beacons` | No | Yes | Yes |
| `Bookmarks` | No | Yes | Yes |
| `Calendar` | No | Yes | Yes |
| `Care` | No | Yes | Yes |
| `Challenges` | No | Yes | Yes |
| `Chat` | No | Yes | Yes |
| `Checkout` | No | Yes | Yes |
| `Community` | No | Yes | Yes |
| `Connect` | No | Yes | Yes |
| `CreateBeacon` | No | Yes | Yes |
| `DialADaddy` | No | Yes | Yes |
| `EditBeacon` | No | Yes | Yes |
| `EditProfile` | No | Yes | No |
| `Events` | Yes | No | No |
| `Feed` | No | Yes | Yes |
| `Globe` | Yes | No | No |
| `HandNHand` | No | Yes | Yes |
| `Home` | Yes | No | No |
| `Leaderboard` | No | Yes | Yes |
| `Login` | Yes | No | No |
| `Marketplace` | Yes | No | No |
| `MembershipUpgrade` | No | Yes | No |
| `Messages` | No | Yes | Yes |
| `Onboarding` | No | Yes | Yes |
| `OnboardingGate` | No | Yes | No |
| `OrderHistory` | No | Yes | Yes |
| `OrganizerDashboard` | No | Yes | Yes |
| `ProductDetail` | Yes | No | No |
| `Profile` | No | Yes | No |
| `ProfileSetup` | No | Yes | No |
| `PromoteToAdmin` | No | Yes | Yes |
| `Radio` | No | Yes | Yes |
| `RadioSchedule` | No | Yes | Yes |
| `RecordManager` | No | Yes | Yes |
| `RightNowDashboard` | No | Yes | Yes |
| `Safety` | No | Yes | Yes |
| `Scan` | No | Yes | Yes |
| `SellerDashboard` | No | Yes | Yes |
| `Settings` | No | Yes | Yes |
| `SquadChat` | No | Yes | Yes |
| `Stats` | No | Yes | Yes |
| `TicketMarketplace` | No | Yes | Yes |
| `WakeTheMess` | No | Yes | Yes |

---

## 4) Compliance & Consent UX (Shipped)

### 4.1 AgeGate + cookie acknowledgment

Source: [src/components/auth/AgeGate.jsx](../src/components/auth/AgeGate.jsx)

- Full-screen glass overlay card.
- Entry button: “I AM 18+ // ENTER”.
- Cookie/session acknowledgment:
  - Uses session storage + cookie: `hm_cookie_accepted=1`.
  - Presented as a bottom-pinned glass bar with an `[ ACK ]` action.

### 4.2 Consent overlay (“System Initialization”)

Source: [src/components/auth/ConsentForm.jsx](../src/components/auth/ConsentForm.jsx)

- Gatekeeper displays the consent overlay if a logged-in user lacks `consent_accepted`.
- On accept, writes via `base44.auth.updateMe()`:
  - `consent_accepted: true`, `consent_version`, `consent_timestamp`, `is_18_plus: true`

**Doc posture:** the consent copy contains jurisdiction/compliance statements; treat those as product copy and ensure a real legal review if they’re meant to be authoritative.

---

## 5) “Interaction Requires Profile” Rule (Shipped Contract)

Source of truth: `base44.auth.requireProfile()` in [src/api/base44Client.js](../src/api/base44Client.js) plus its call sites.

**Rule:** if the user is not logged in, redirect to Login with `returnUrl`. If logged in but profile incomplete, redirect to Profile with `returnUrl`.

This gate is used to protect interaction entrypoints (examples):
- “Go Right Now” action in Connect.
- Beacon creation entrypoints.
- Messaging creation/composer actions.
- Follow/handshake + social actions.

---

## 6) Tech Inventory (Buildable)

- React Router routes are generated from `PAGES` (not file-based routing).
- Data layer during migration:
  - Preferred for new code: `supabase` from `src/api/supabaseClient.js`.
  - Legacy compatibility: `base44.*` from [src/api/base44Client.js](../src/api/base44Client.js).

---

## 6.2 Traffic-Light System (Status Semantics)

The UI uses a consistent high-contrast neon palette. v1.5 standardizes “status meaning” so the same colors communicate the same state across Pulse, Beacons, Market, and Messaging.

**Green** (e.g. `#39FF14`)
- Meaning: safe/active/live/verified/completed.
- Example: admin “Verify” tab uses green active state (see [src/pages/AdminDashboard.jsx](../src/pages/AdminDashboard.jsx)).

**Yellow** (e.g. `#FFEB3B`)
- Meaning: pending/attention/limited/timeboxed/needs review.

**Red** (e.g. red accents in Admin access denied)
- Meaning: blocked/unsafe/denied/critical.

**Pink / Purple / Cyan**
- Meaning: identity lanes / brand surfaces; do not use as “error” or “warning” states.
- Examples: Pink for HOTMESS core CTAs; Cyan for “chrome/tech” lane; Purple for “advanced/ops” lane.

### 6.1 Base44 compatibility layer (important constraints)

Source: [src/api/base44Client.js](../src/api/base44Client.js)

- `base44.entities.<Table>.list()` → `supabase.from('<Table>').select('*')`
- `base44.entities.<Table>.filter(where, sort?, limit?)`
  - Filters are equality-only (`.eq(k, v)`).
  - Sort supports `'-created_date'` (descending).
- `base44.entities.<Table>.create/update/delete` map to insert/update/delete.
- `base44.functions.<name>(body)` → `supabase.functions.invoke('<name>', { body })`
- `base44.integrations.Core.UploadFile({ file })` → Supabase Storage upload and returns `{ file_url }`.

---

## 7) Major Journeys (User-level)

### 7.1 Guest → Browse

- Guest browsable surfaces: Home, Pulse (Globe), Events, Market, ProductDetail.
- Any “interaction” that implies participation (chatting, going live, creating beacons) triggers auth/profile gating.

### 7.2 Logged-in member → First-time boot

Order of experience (as shipped):
1) AgeGate (session marker)
2) Consent overlay (if `consent_accepted` is false)
3) OnboardingGate redirect (Terms/Data/GPS flags)
4) Profile completion (full_name + avatar_url)

### 7.3 Member → Pulse (Globe) → Explore

Pulse merges two realtime primitives:
- Beacons from `Beacon` table.
- “Right Now” projected pins derived from `RightNowStatus` + `User` + `City`.

### 7.4 Member → Connect → Right Now

- Discovery + filters.
- “Go Right Now” is gated by profile completeness.

### 7.5 Member → Messages

- Messages page requires login.
- If profile incomplete: user can read threads but is blocked from creating/sending (redirect to Profile).

### 7.6 Member → Records (track drop) → Pulse

- Upload WAV to storage.
- Create a `Beacon` row with `kind='drop'`, `mode='radio'`, `audio_url`.

---

## 7.7 Member → Membership Upgrade

Source: [src/pages/MembershipUpgrade.jsx](../src/pages/MembershipUpgrade.jsx)

Membership is represented as a profile field:
- `membership_tier`: `'basic' | 'plus' | 'pro'` (shown as BASIC / PLUS / CHROME in UI)

Upgrade flow (as shipped):
- User selects tier.
- App writes `membership_tier` via `base44.auth.updateMe({ membership_tier: tierId })`.

Notes:
- UI copy references Stripe; current implementation only updates the tier field.
- Treat payment as a separate integration task (do not imply billing correctness until implemented server-side).

---

## 8) Microflows (UI → Reads/Writes)

This section references shipped call patterns; exact schemas and RLS must match your Supabase migrations.

### 8.1 Pulse (Globe) data + realtime

Source: [src/pages/Globe.jsx](../src/pages/Globe.jsx)

Reads:
- `Beacon.filter({ active: true, status: 'published' }, '-created_date')`
- `City.list()`
- `UserIntent.filter({ visible: true }, '-created_date', 100)`
- Right Now overlay:
  - `RightNowStatus.filter({ active: true })` then filter by `expires_at > now`
  - `User.list()` + `City.list()` to project each user to a pin

Realtime:
- `supabase.channel('beacons-realtime')` listens to `Beacon` INSERT/UPDATE/DELETE.
- `supabase.channel('user-activities-realtime')` listens to `UserActivity` INSERT.

### 8.2 Connect: Go Right Now (interaction gate)

Source: [src/pages/Connect.jsx](../src/pages/Connect.jsx)

- Button handler calls `await base44.auth.requireProfile(window.location.href)`.
- If permitted, opens `RightNowModal`.

### 8.3 Messages: read-only mode for incomplete profile

Source: [src/pages/Messages.jsx](../src/pages/Messages.jsx)

- On mount: `base44.auth.isAuthenticated()`; redirects to login if needed.
- `isProfileComplete = full_name && avatar_url`.
- Threads:
  - `ChatThread.filter({ active: true }, '-last_message_at')`
  - filtered client-side to threads including the current email.
- UI enforcement:
  - “NEW MESSAGE” redirects to Profile if incomplete.
  - ChatThread rendered with `readOnly={!isProfileComplete}`.

### 8.4 Records: Upload WAV + create drop beacon

Source: [src/pages/RecordManager.jsx](../src/pages/RecordManager.jsx)

- Reads current user via `base44.auth.me()`.
- Lists drops:
  - `Beacon.filter({ kind: 'drop', mode: 'radio', created_by: currentUser.email }, '-created_date')`
- Upload:
  1) `base44.integrations.Core.UploadFile({ file: wavFile })` → `file_url`
  2) `Beacon.create({ kind:'drop', mode:'radio', audio_url:file_url, xp_scan:200, ... })`

---

## 9) Music Spec (Radio + Records)

This section defines the shipped “music lane” and the minimum buildable contract for v1.5.

### 9.1 Surfaces

- `/Radio` (landing) — “Listen Live” + show cards  
  Source: [src/pages/Radio.jsx](../src/pages/Radio.jsx)
- `/RadioSchedule` — weekly grid derived from `schedule`  
  Source: [src/pages/RadioSchedule.jsx](../src/pages/RadioSchedule.jsx)
- `/RecordManager` — upload WAV and create a “drop beacon”  
  Source: [src/pages/RecordManager.jsx](../src/pages/RecordManager.jsx)

### 9.2 Live playback contract

- `Radio` uses `useRadio().openRadio()` to open the persistent player experience.
- `RadioSchedule` builds a weekly grid from `schedule` and links each show slot to a derived PageKey.

### 9.3 Records (drops) data contract

The shipped implementation treats a track as a beacon row:
- Table: `Beacon`
- `kind = 'drop'`
- `mode = 'radio'`
- `audio_url` is the public storage URL
- `xp_scan` is used as the listener reward baseline (currently set to 200 for drops)
- `status = 'published'`, `active = true`

### 9.4 Optional backend hooks (present in repo)

Edge functions exist for audio plumbing/metadata, but are not referenced by the UI today:
- `pushToSoundCloud`, `syncAudioMetadata` (see [functions/](../functions/))

---

## 10) Social Merge Spec (Pulse = Beacons + Right Now)

v1.5 treats “Pulse” (Globe) as a merged projection of multiple live primitives.

### 10.1 PulseObject (conceptual union)

Pulse renders a unified list of objects that come from:
- **Beacon** rows (`Beacon` table)
- **Right Now** projections derived from `RightNowStatus` joined with `User` + `City`

Source: Right Now pins are built client-side in [src/pages/Globe.jsx](../src/pages/Globe.jsx).

Recommended normalized fields (matches what Globe builds today):
- `id` (string)
- `title`, `description`
- `lat`, `lng`, `city`
- `kind`, `mode`
- `active` (boolean)
- `source = 'beacon' | 'rightnow'`

### 10.2 Right Now TTL / expiry

- `RightNowStatus` includes `expires_at`.
- Clients filter out expired statuses (`expires_at > now`).
- v1.5 backend recommendation (optional): also enforce expiry server-side by setting `active=false` when expired.

### 10.3 Interaction gating

- Starting “Right Now” is gated behind profile completeness via `base44.auth.requireProfile(returnUrl)`.
  Source: [src/pages/Connect.jsx](../src/pages/Connect.jsx)

---

## 11) Admin & Biz Consoles (Shipped Surfaces)

### 9.1 Admin Console

Source: [src/pages/AdminDashboard.jsx](../src/pages/AdminDashboard.jsx)

- Route: `/AdminDashboard`
- Visible in desktop sidebar only when `user.role === 'admin'` (Layout adds an ADMIN link).
- Tabs (as shipped): Analytics, Advanced, Curation, Verify, Users, Moderation, Events.

Security note (explicit in code): admin checks are **client-side only** and must be enforced by Supabase RLS and/or Edge Functions for any privileged operations.

### 9.2 Seller Console

Source: [src/pages/SellerDashboard.jsx](../src/pages/SellerDashboard.jsx)

- Route: `/SellerDashboard`
- Focus: products + orders + promotions + payouts.
- Data surfaces used:
  - Products: `Product` (scoped by `seller_email`)
  - Orders: `Order`, `OrderItem`
  - Promotions: `Promotion`
  - Payouts: `SellerPayout`

### 9.3 Organizer Console

Source: [src/pages/OrganizerDashboard.jsx](../src/pages/OrganizerDashboard.jsx)

- Route: `/OrganizerDashboard`
- Focus: event/beacon performance for the current creator.
- Reads:
  - `Beacon.filter({ created_by: email })`
  - `UserInteraction.list()` and filter to the creator’s beacons
  - `BeaconCheckIn.list()` and filter to the creator’s beacons

---

---

## 12) Edge Functions Inventory

These exist in [functions/](../functions/) and are invokable (via the shim) as `base44.functions.<name>(body)` if deployed:

- `beaconAnalytics`
- `calculateWarBonus`
- `calculateZoneBlobs`
- `cashoutKingEarnings`
- `checkInBeacon`
- `collectPassiveTax`
- `createPickupBeacon`
- `generateVibeTooltip`
- `getHeatmapData`
- `markMessagesRead`
- `muteConversation`
- `nearbyBeacons`
- `pushToSoundCloud`
- `scanBeaconQR`
- `scanPickupBeacon`
- `scheduleEventScraper`
- `scrapeEvents`
- `sweatCoinPurchase`
- `syncAudioMetadata`
- `synthesizeVibe`
- `telegramProxy`
- `toggleBookmark`
- `triggerWarMultiplier`
- `uploadMessageMedia`
- `verifyBeacon`

---

## 13) Repo Workflow Rules (Practical)

Source: [README.md](../README.md) and [package.json](../package.json)

- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`
- Lint: `npm run lint` / `npm run lint:fix`
- Typecheck: `npm run typecheck` (TypeScript compiler over `jsconfig.json`)

Supabase environment:
- Required env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Optional: `VITE_SUPABASE_STORAGE_BUCKET` (uploads)

RLS note:
- If RLS is enabled without policies, the app may authenticate but fail on reads/writes.
- See `supabase/policies.sql` referenced in the README.

---

## 13A) Monorepo-ready Rules (Guidance — not shipped)

This repo is currently a single Vite app. If/when we split into a monorepo, keep the separation rules strict to prevent coupling and accidental “shared code drift.”

Principle: share *tokens and contracts*, not UI or business logic.

- Shared: design tokens, types/contracts, analytics event schema, feature flags (as data), and test utilities.
- Not shared: React components, page flows, Supabase query logic, and router/navigation code.

Suggested boundaries:
- `apps/web` (this repo’s current shape): React UI, routes, gate logic, client data access.
- `packages/tokens`: Tailwind/shadcn theme primitives, spacing/radius tokens, semantic names.
- `packages/contracts`: TypeScript types for tables/events/edge-function payloads.

Deployment implications:
- Each app owns its runtime config (Vercel env vars, build output, rewrites).
- Shared packages must not import runtime env (`import.meta.env`) directly.

Testing implications:
- Prefer contract tests for critical payloads (tables + Edge Function bodies) rather than snapshot-heavy UI tests.
- Keep “guest browse vs interaction” gates tested at the route/action boundary.

---

## 14) Appendix A — Full Route Map (PageKeys grouped by domain)

Source of truth: [src/pages.config.js](../src/pages.config.js)

### Auth, Consent, Onboarding, Profile
- `Login`
- `AccountConsents`
- `Onboarding`
- `OnboardingGate`
- `Profile`
- `ProfileSetup`
- `EditProfile`
- `Settings`

### Core browse surfaces (guest-browsable allowlist includes these)
- `Home`
- `Globe`
- `Events`
- `Marketplace`
- `ProductDetail`

### Social / Discovery
- `Connect`
- `RightNowDashboard`
- `Feed`
- `Community`
- `Bookmarks`

### Beacons / IRL
- `Beacons`
- `BeaconDetail`
- `CreateBeacon`
- `EditBeacon`
- `Scan`
- `Calendar`

### Messaging
- `Messages`
- `Chat`
- `SquadChat`

### Commerce
- `Checkout`
- `OrderHistory`
- `TicketMarketplace`
- `SellerDashboard`
- `MembershipUpgrade`

### Music
- `Radio`
- `RadioSchedule`
- `RecordManager`

### Safety & Care
- `Safety`
- `Care`

### Gamification / Stats
- `Challenges`
- `Leaderboard`
- `Stats`

### Admin / Ops
- `AdminDashboard`
- `OrganizerDashboard`
- `PromoteToAdmin`

### Brand / Editorial pages
- `DialADaddy`
- `HandNHand`
- `WakeTheMess`

---

## 15) Open Questions / Known Duplications

- Consent gating exists in both Gatekeeper (overlay) and Layout (redirect to `AccountConsents`).
  - Canonical path (recommended): treat `AccountConsents` as the durable, auditable consent capture screen.
  - Gatekeeper’s `ConsentForm` is an optional fast-path that writes the same `consent_accepted` flag.
- Many pages assume Supabase tables exist (via `base44.entities.<Table>`). Ensure migrations + RLS policies cover the tables referenced by your top journeys (Pulse/Beacons/RightNow/Messages/Market).

---

## 16) Appendix B — Observed Tables in Use (from `base44.entities.*` call sites)

This list is extracted from frontend code usage (`src/**`) and represents **tables the UI expects to exist** in Supabase.

Notes:
- Each `base44.entities.<Table>` maps to `supabase.from('<Table>')` in the compatibility layer.
- Counts reflect **number of references in the codebase**, not traffic volume.
- Use this to cross-check Supabase migrations and RLS policies.

| References | Table |
|---:|---|
| 39 | `Beacon` |
| 26 | `User` |
| 24 | `Product` |
| 21 | `Notification` |
| 19 | `EventRSVP` |
| 16 | `Order` |
| 13 | `ChatThread` |
| 13 | `CommunityPost` |
| 13 | `RightNowStatus` |
| 12 | `UserFollow` |
| 10 | `Message` |
| 10 | `UserActivity` |
| 9 | `BeaconCheckIn` |
| 8 | `UserInteraction` |
| 8 | `UserTag` |
| 7 | `OrderItem` |
| 5 | `CartItem` |
| 5 | `ProductOffer` |
| 5 | `UserTribe` |
| 4 | `BeaconBookmark` |
| 4 | `BotSession` |
| 4 | `City` |
| 4 | `PostComment` |
| 4 | `Squad` |
| 4 | `SquadMember` |
| 3 | `PostLike` |
| 3 | `ProfileView` |
| 3 | `Promotion` |
| 3 | `Review` |
| 3 | `SafetyCheckIn` |
| 3 | `TrustedContact` |
| 3 | `UserBlock` |
| 3 | `UserHighlight` |
| 3 | `UserStreak` |
| 3 | `VenueKing` |
| 2 | `ActivityFeed` |
| 2 | `BeaconComment` |
| 2 | `ChallengeCompletion` |
| 2 | `ContentUnlock` |
| 2 | `MarketplaceReview` |
| 2 | `ProductFavorite` |
| 2 | `ProductView` |
| 2 | `SellerPayout` |
| 2 | `SquadChallenge` |
| 2 | `UserAchievement` |
| 2 | `UserIntent` |
| 1 | `Achievement` |
| 1 | `DailyChallenge` |
| 1 | `EventView` |
| 1 | `ProfileBadge` |
| 1 | `Report` |
| 1 | `UserVibe` |

---

## 17) Appendix C — Observed Edge Functions in Use (from `base44.functions.*` call sites)

This list is extracted from frontend usage (`src/**`). If these functions are not deployed in Supabase, the corresponding UI actions will fail.

| References | Edge Function | Used By |
|---:|---|---|
| 1 | `scrapeEvents` | Admin event scraper control ([src/components/admin/EventScraperControl.jsx](../src/components/admin/EventScraperControl.jsx)) |
| 1 | `synthesizeVibe` | Vibe synthesis card ([src/components/vibe/VibeSynthesisCard.jsx](../src/components/vibe/VibeSynthesisCard.jsx)) |
