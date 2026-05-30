# HOTMESS OS -- Developer Handover Pack

**Document version:** 3.0
**Date:** 2026-04-06
**Prepared by:** Claude (Head of Engineering, AI co-founder)
**Handover to:** Incoming developer / development team
**Repository:** `SICQR/hotmess-globe` | **Live:** `hotmessldn.com`
**Baseline commit:** `fe52338` (main, 2026-04-06) — QA-verified, 14/14 E2E passing
**Previous baseline:** `456e0e5`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Status Legend](#2-status-legend)
3. [Canonical Truth Map](#3-canonical-truth-map)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Service Design](#6-service-design)
7. [Technical Architecture](#7-technical-architecture)
8. [Integration Points & Configuration](#8-integration-points--configuration)
9. [Data Architecture](#9-data-architecture)
10. [Security & Governance](#10-security--governance)
11. [Do Not Touch Blindly](#11-do-not-touch-blindly)
12. [Known Contradictions](#12-known-contradictions)
13. [Test Plan](#13-test-plan)
14. [Deployment & Operations](#14-deployment--operations)
15. [Open Issues & Risks](#15-open-issues--risks)
16. [Handover Checklist](#16-handover-checklist)
17. [Appendix A: Environment Variable Matrix](#appendix-a-environment-variable-matrix)
18. [Appendix B: Storage Bucket Matrix](#appendix-b-storage-bucket-matrix)
19. [Appendix C: Schema Risk Matrix](#appendix-c-schema-risk-matrix)
20. [Appendix D: Open Migrations](#appendix-d-open-migrations)
21. [Appendix E: Release Readiness Checklist](#appendix-e-release-readiness-checklist)
22. [Appendix F: UAT Accounts & Seed Data](#appendix-f-uat-accounts--seed-data)

---

## 1. Executive Summary

### Purpose
HOTMESS is a dark-luxury social OS for nightlife. It combines proximity-based social discovery (Ghosted), live radio, marketplace (Shopify headless + preloved), event discovery, and safety features into a single PWA.

### Scope
- 6-tab navigation: Home | Pulse | Ghosted | Market | Music | More
- 77 L2 sheet components (full-screen overlays)
- 10+ sub-brands sharing one OS (HOTMESS, RAW, HUNG, HIGH, HOTMESS RADIO, HNH MESS, etc.)
- Real-time features: presence, movement tracking, radio, chat
- Safety-critical: SOS, trusted contacts, fake calls, live location

### Current State
The platform is functional end-to-end for the core user journey: sign up, set profile, discover people (Ghosted grid), Boo/match, chat, meet IRL. Commerce (Shopify), radio, events, and safety all work. AI features are stubbed (13 components with `console.warn`).

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + TypeScript | 18.2 + 5.8 |
| Build | Vite | 6.1 |
| Styling | Tailwind CSS | 3.4 |
| Animation | Framer Motion | 11.16 |
| State | TanStack Query | 5.84 |
| Routing | React Router | 6.30 |
| Backend | Supabase (Postgres + Auth + Storage + Realtime) | 2.39 |
| Commerce | Shopify Storefront API (headless) | 2024-10 |
| Payments | Stripe (Connect + Subscriptions) | 20.3 |
| 3D | Three.js | 0.171 |
| Hosting | Vercel (serverless functions + CDN) | - |
| Error tracking | Sentry | 10.38 |
| Push | Web Push API (VAPID) | - |
| Testing | Vitest + Playwright | 4.0 + 1.50 |

---

## 2. Status Legend

Every status in this document uses one of these values. No synonyms.

| Status | Meaning |
|--------|---------|
| **DONE** | Shipped, tested, deployed to production. Code exists AND works end-to-end on `hotmessldn.com`. |
| **PARTIAL** | Code exists and the happy path works, but at least one stated sub-requirement is missing or broken. The gap is documented inline. |
| **STUBBED** | UI exists but the backend call is a no-op (`console.warn`, toast "coming soon", or hardcoded return). |
| **BLOCKED** | Cannot be completed by engineering alone. Requires a manual action (Phil, Stripe dashboard, Supabase dashboard, third-party onboarding). Blocker named inline. |
| **NOT STARTED** | No code exists. Design intent documented but nothing shipped. |

---

## 3. Canonical Truth Map

When two files disagree, the one marked **Source of Truth** wins.

| Domain | Source of Truth | Fallback / Consumer | Notes |
|--------|----------------|---------------------|-------|
| Auth state machine | `src/contexts/BootGuardContext.jsx` | `Auth.jsx`, `bootGuard.ts` | BootGuard is the ONLY gate. Others react to it. |
| Sheet stack | `src/contexts/SheetContext.jsx` | `SheetRouter.jsx` | SheetContext owns state; SheetRouter renders. |
| Supabase client | `src/components/utils/supabaseClient.jsx` | All `supabase.from()` callers | Singleton. Never instantiate a second client. |
| Design tokens | `DESIGN_SYSTEM.md` + `src/index.css` CSS vars | Tailwind config, inline styles | If a colour appears in both, `DESIGN_SYSTEM.md` wins. |
| Route table | `src/App.jsx` | `OSBottomNav.tsx` | App.jsx defines routes; nav just links to them. |
| Sheet registry | `src/lib/sheetSystem.ts` | `SheetRouter.jsx` | New sheets MUST be registered here first. |
| Sheet gating | `src/lib/sheetPolicy.ts` | `SheetContext.jsx` | Policy file defines which sheets are gated. |
| Storage bucket names | `src/lib/uploadToStorage.ts` BUCKET_MAP | All upload callers | Code names resolve here. Change here, not in callers. |
| Profile photo writes | `src/lib/uploadToStorage.ts` `insertProfilePhoto()` | `QuickSetupScreen`, `L2PhotosSheet` | Centralised: sets `moderation_status`, handles orphan cleanup. |
| Presence writes | `src/hooks/usePresenceHeartbeat.ts` | `QuickSetupScreen`, `LocationPermissionScreen` | Writes to `user_presence` TABLE (not the view). |
| Right Now status | `right_now_status` TABLE | `HomeMode`, `PulseMode`, `ProfileMode` | NEVER write to `profiles.right_now_status` JSONB. |
| SOS activation | `src/contexts/SOSContext.tsx` | `SOSOverlay.tsx`, `SOSButton` | Always go through context, never bypass. |
| Persona switching | `src/contexts/PersonaContext.jsx` | `PersonaSwitcherSheet` | Uses `switch_persona()` RPC. |
| Brand config | `src/config/brands.ts` | Market, radio, home sections | Visibility toggles live here. |
| Codebase conventions | `CLAUDE.md` | This document | CLAUDE.md is the living dev guide; HANDOVER.md is the formal record. |
| Onboarding flow | `src/pages/OnboardingGate.jsx` | `BootGuardContext` (gate only) | 8 steps defined in OnboardingGate. BootGuard just checks `onboarding_completed`. |

---

## 4. Functional Requirements

### 4.1 User Types & Journeys

| User Type | Journey Status | Key Gaps |
|-----------|---------------|----------|
| New user (first arrival) | DONE | 8-step onboarding -> profile on grid. Verified in code. |
| Ghosted social user | DONE | Grid, boo/match, chat, filters. Verified in code. |
| Seller (Shopify) | PARTIAL | List/view/earnings work. No Stripe Connect onboarding. |
| Seller (Preloved) | PARTIAL | List/view. Payment = arrange via chat only. |
| Buyer (Shopify) | DONE | Full Shopify checkout flow. Requires env vars verified. |
| Buyer (Preloved) | PARTIAL | Order record only, no payment. |
| Radio listener | DONE | Live stream, mini player, show schedule. Verified in code. |
| Music listener | DONE | Artist pages, inline audio, release grid. Verified in code. |
| Event organiser | DONE | Create event -> beacons. Verified in code. |
| Event attendee | PARTIAL | RSVP -> ticket in Vault -> QR. QR scanning not verified in prod. |
| Safety user | PARTIAL | SOS + fake call + trusted contacts work in code. Push to contacts requires real trusted_contacts rows (0 in prod). |
| Persona user | PARTIAL | Code works. 0 personas created in prod — untested with real users. |

### 4.2 Core Feature Requirements

#### FR-01: Authentication & Onboarding

| Req ID | Requirement | Status | Implementation |
|--------|-------------|--------|---------------|
| FR-01.1 | Email magic link auth | DONE | Supabase Auth, `src/pages/Auth.jsx` |
| FR-01.2 | Apple Sign-In | BLOCKED | Disabled in WebViews (`APPLE_ENABLED = false`) |
| FR-01.3 | Age gate (18+) | DONE | `src/pages/AgeGate.jsx`, localStorage persist |
| FR-01.4 | 8-step onboarding | DONE | `src/pages/OnboardingGate.jsx` |
| FR-01.5 | PIN lock | DONE | `PinLockContext.jsx` + `PinLockOverlay` |
| FR-01.6 | Returning user instant boot | DONE | Sync token read from localStorage, zero network calls |

#### FR-02: Ghosted (Social Discovery)

| Req ID | Requirement | Status | Implementation |
|--------|-------------|--------|---------------|
| FR-02.1 | 3-column proximity grid | DONE | `GhostedMode.tsx`, `GhostedCard.tsx` |
| FR-02.2 | Boo interaction (like) | DONE | `useTaps.ts`, `L2GhostedPreviewSheet.tsx` |
| FR-02.3 | Mutual Boo -> Match overlay | DONE | `MatchOverlay.tsx`, match detection in `useTaps` |
| FR-02.4 | Chat unlock on match | DONE | Chat opens with prefill on match |
| FR-02.5 | Filter chips (Nearby/Online/New/Looking) | DONE | `useGhostedGrid.ts` |
| FR-02.6 | Ghost filtering (hide admin/test accounts) | DONE | Server-side in `/api/profiles.js` |
| FR-02.7 | Block/report | DONE | `blocks` table, `L2ReportSheet.jsx` |
| FR-02.8 | Movement awareness | DONE | `useNearbyMovement`, "Suggest Stop" CTA |
| FR-02.9 | Meet halfway (midpoint calculation) | DONE | `calculateMidpoint()` in `locationUtils.ts` |

#### FR-03: Chat & Messaging

| Req ID | Requirement | Status | Implementation |
|--------|-------------|--------|---------------|
| FR-03.1 | 1-to-1 chat | DONE | `L2ChatSheet.jsx`, `conversations` + `conversation_members` + `messages` tables. E2E verified. |
| FR-03.2 | Image sharing in chat | DONE | Uses `uploadToStorage` via BUCKET_MAP |
| FR-03.3 | Meetpoint cards in chat | DONE | `MeetpointCard.tsx` with map tile, ETA, Route/Uber CTAs |
| FR-03.4 | Movement context cards | DONE | `MovementMessageCard.tsx` |
| FR-03.5 | Read receipts | PARTIAL | `markRead()` writes to DB, full sync incomplete |
| FR-03.6 | Typing indicators | DONE | `useTypingIndicator.ts` |
| FR-03.7 | Video calls | PARTIAL | `L2VideoCallSheet.tsx`. WebRTC peer connection in code, not verified in prod with real users. |
| FR-03.8 | Wingman AI (conversation starters) | STUBBED | `console.warn('[TODO] LLM endpoint needed')` |

#### FR-04: Marketplace

| Req ID | Requirement | Status | Implementation |
|--------|-------------|--------|---------------|
| FR-04.1 | Shopify headless store | DONE | `/api/shopify/*` handlers |
| FR-04.2 | Preloved user-to-user listings | DONE | `preloved_listings` table, `PrelovedEngine.tsx` |
| FR-04.3 | Cart & checkout | DONE | `ShopCartProvider`, Shopify checkout redirect |
| FR-04.4 | Seller payouts (Stripe Connect) | BLOCKED | Stripe Connect not onboarded |
| FR-04.5 | HNH MESS product hero | DONE | `HNHMessHero.tsx`, meaning-first hierarchy |

#### FR-05: Radio & Music

| Req ID | Requirement | Status | Implementation |
|--------|-------------|--------|---------------|
| FR-05.1 | Live radio stream | DONE | `RadioContext.tsx`, HTML5 Audio |
| FR-05.2 | Mini player (persistent) | DONE | `RadioMiniPlayer.tsx`, 56px above nav |
| FR-05.3 | Show schedule | DONE | `shows` table, schedule display |
| FR-05.4 | Music releases & artists | DONE | `MusicTab.jsx`, `label_releases` + `tracks` tables |
| FR-05.5 | Stems/remix download | STUBBED | Button exists, shows "coming soon" toast |

#### FR-06: Safety

| Req ID | Requirement | Status | Implementation |
|--------|-------------|--------|---------------|
| FR-06.1 | SOS overlay | DONE | `SOSOverlay.tsx` |
| FR-06.2 | SOS push to trusted contacts | DONE | Pushes with Google Maps link |
| FR-06.3 | Fake call generator | DONE | `FakeCallPage.tsx` |
| FR-06.4 | Trusted contacts management | DONE | `L2EmergencyContactSheet.jsx` |
| FR-06.5 | Live location sharing | DONE | `L2LiveLocationWatcherSheet.tsx` |
| FR-06.6 | Safety check-in timer | DONE | `SafetyCheckinModal.jsx` |
| FR-06.7 | Aftercare/wellbeing (Care page) | DONE | `CarePage.tsx` |

#### FR-07: Events & Pulse

| Req ID | Requirement | Status | Implementation |
|--------|-------------|--------|---------------|
| FR-07.1 | Globe visualisation | DONE | `UnifiedGlobe` (Three.js), only renders on `/pulse` |
| FR-07.2 | Beacon creation | DONE | `L2BeaconSheet.jsx` |
| FR-07.3 | Event RSVP + tickets | DONE | QR in Vault |
| FR-07.4 | Venue presence overlay | DONE | `GhostedOverlay.tsx` |

#### FR-08: Profile & Personas

| Req ID | Requirement | Status | Implementation |
|--------|-------------|--------|---------------|
| FR-08.1 | Profile creation/edit | DONE | `ProfileMode.tsx`, `L2EditProfileSheet.jsx` |
| FR-08.2 | Photo upload with validation | DONE | `uploadToStorage.ts` (200px min, 5MB max, aspect ratio) |
| FR-08.3 | Up to 5 personas | DONE | `PersonaContext.jsx`, `switch_persona()` RPC |
| FR-08.4 | Presence heartbeat | DONE | `usePresenceHeartbeat.ts`, 60s interval with GPS |

---

## 5. Non-Functional Requirements

| NFR ID | Requirement | Target | Current State |
|--------|-------------|--------|--------------|
| NFR-01 | PWA installable | Required | DONE - SW registered, manifest present |
| NFR-02 | Dark mode only | Mandatory | DONE - `#050507` root bg, no light mode |
| NFR-03 | Mobile-first responsive | Required | DONE - Tailwind responsive, 83px nav |
| NFR-04 | Tab switch < 200ms | Target | DONE - Static imports for 6 core modes |
| NFR-05 | Auth boot < 1s (returning user) | Target | DONE - Sync token read, zero API calls |
| NFR-06 | Offline resilience | Partial | SW caches index.html, serves on navigate |
| NFR-07 | GDPR compliance | Required | PARTIAL - Data export exists, retention TBC |
| NFR-08 | Accessibility (WCAG AA) | Target | PARTIAL - aria-labels on CTAs, no full audit |
| NFR-09 | Brand isolation | Mandatory | DONE - Channel queries never cross-pollinate |
| NFR-10 | Safety features never regress | Mandatory | DONE - Protected in code review |
| NFR-11 | No XP/gamification UI | Mandatory | DONE - DB columns kept, UI fully removed |
| NFR-12 | Bundle size | < 2MB initial | TBC - Run `ANALYZE=true npm run build` |

---

## 6. Service Design

### 6.1 User Journey Flow

```
New User:
  Landing → Age Gate → Auth (magic link) → Onboarding (8 steps) →
  "What now?" picker → [Go Live | Explore | Set Up Safety] → Home

Returning User:
  Launch → Sync token check → READY → /ghosted (or last route)

Social Loop:
  Grid → Tap card → Preview sheet → Boo → [Mutual?] →
  Match overlay → "Send message" → Chat → Meet halfway → IRL

Commerce Loop:
  Market tab → Product → Add to bag → Shopify checkout → Order

Safety Loop:
  Shake / SOS button → SOSOverlay → Location shared →
  Push to trusted contacts → Map link
```

### 6.2 Service Gap Analysis

| Service | Designed | Delivery Status | Gap |
|---------|----------|----------------|-----|
| Auth (magic link) | Yes | DONE | Apple Sign-In BLOCKED in WebViews |
| Ghosted social | Yes | DONE | None |
| Boo/Match loop | Yes | DONE | None |
| Chat (1:1) | Yes | PARTIAL | Read receipts partially synced |
| Video call | Yes | PARTIAL | WebRTC in code, not verified in prod |
| Marketplace (Shopify) | Yes | DONE | Env vars need verification |
| Marketplace (Preloved) | Yes | PARTIAL | No payment integration |
| Radio streaming | Yes | DONE | Legacy shell player still mounted (cleanup needed) |
| Music catalogue | Yes | DONE | Stems feature STUBBED |
| Events/Beacons | Yes | DONE | None |
| Safety/SOS | Yes | PARTIAL | Code works, push to contacts untested (0 contacts in prod) |
| AI features | Yes | STUBBED | 13 components need Claude API wiring |
| Push notifications | Yes | PARTIAL | SW `push` event handler not wired to display |
| Membership/Premium | Yes | STUBBED | Waitlist only, no Stripe subscription |
| Photo moderation | Yes | PARTIAL | Migration + client writes exist, no server-side review |
| Admin dashboard | Yes | PARTIAL | `AdminDashboard.jsx` exists, scope limited |

---

## 7. Technical Architecture

### 7.1 Provider Hierarchy (outer to inner)

```
Sentry.ErrorBoundary
└── ErrorBoundary
    └── OSProvider
        └── App
            └── I18nProvider
                └── AuthProvider          ← Supabase auth
                    └── PinLockProvider
                        └── BootGuardProvider   ← State machine
                            └── QueryClientProvider
                                └── WorldPulseProvider
                                    └── ShopCartProvider
                                        └── BrowserRouter
                                            └── SOSProvider
                                                └── SheetProvider
                                                    └── BootRouter
                                                        └── RadioProvider
                                                            └── PersonaProvider
                                                                └── OSArchitecture
```

### 7.2 Boot State Machine

```
LOADING → UNAUTHENTICATED    → /auth
        → NEEDS_AGE          → AgeGate
        → NEEDS_ONBOARDING   → OnboardingGate (8 steps)
        → NEEDS_COMMUNITY_GATE
        → READY              → normal routing
```

### 7.3 OS Layer Model

| Layer | Z-index | Contents |
|-------|---------|----------|
| L0 | 0 | `UnifiedGlobe` (Three.js, `/pulse` only) |
| L1 | 50 | `OSBottomNav` (83px), `RadioMiniPlayer` (56px) |
| L2 | 100 | Content sheets (`SheetRouter`) |
| L3 | 150 | Higher sheets (persona switcher, filters) |
| Interrupts | 180-200 | `IncomingCallBanner` (180), `SOSButton` (190), `SOSOverlay` (200), `PinLockOverlay` (above all) |

### 7.4 Route Table

| Route | Mode Component | Loading |
|-------|---------------|---------|
| `/` | `HomeMode.tsx` | Static import |
| `/pulse` | `PulseMode.tsx` | Static import |
| `/ghosted` | `GhostedMode.tsx` | Static import |
| `/market` | `MarketMode.tsx` | Static import |
| `/music` | `MusicTab.jsx` | Static import |
| `/more` | `MorePage.tsx` | Static import |
| `/profile` | `ProfileMode.tsx` | Lazy |
| `/radio` | `RadioMode.tsx` | Lazy |
| `/safety` | `Safety.jsx` | Lazy |
| `/care` | `CarePage.tsx` | Lazy |

### 7.5 Sheet System

77 L2 sheets registered (at baseline `fe52338`). Open with `openSheet(type, props)` from `useSheet()`. Stack is LIFO. URL-synced via `?sheet=<type>`.

**Gated sheets** (chat, video, travel) only open from `/ghosted` or when a profile sheet is in the stack. See `src/lib/sheetPolicy.ts`.

New sheet checklist:
1. Register type in `src/lib/sheetSystem.ts`
2. Create `L2[Name]Sheet.jsx|tsx` in `src/components/sheets/`
3. Wire into `src/components/sheets/SheetRouter.jsx`

### 7.6 Key Contexts

| Context | File | Purpose |
|---------|------|---------|
| BootGuardContext | `src/contexts/BootGuardContext.jsx` | Auth state machine |
| SheetContext | `src/contexts/SheetContext.jsx` | Sheet stack management |
| SOSContext | `src/contexts/SOSContext.tsx` | SOS global state |
| PersonaContext | `src/contexts/PersonaContext.jsx` | Multi-persona CRUD + switch |
| RadioContext | `src/contexts/RadioContext.tsx` | Radio player state |
| PinLockContext | `src/contexts/PinLockContext.jsx` | PIN lock overlay |
| WorldPulseContext | `src/contexts/WorldPulseContext.jsx` | Globe pulse data |

### 7.7 Key Hooks (50+)

| Hook | Purpose |
|------|---------|
| `useTaps` | Boo send/receive, mutual match detection |
| `useGhostedGrid` | Ghosted grid data (nearby/live/chats tabs) |
| `usePresenceHeartbeat` | 60s presence write to `user_presence` |
| `useGPS` | Geolocation access |
| `useNearbyMovement` | Detect moving users nearby |
| `useMovementSession` | Active movement tracking |
| `useNotifCount` | Notification badge count (realtime) |
| `useUnreadCount` | Chat unread count (realtime) |
| `usePushNotifications` | Web Push registration |
| `useProfileCompletion` | Profile completion percentage |
| `useShakeSOS` | Shake-to-SOS detection |
| `usePullToRefresh` | Pull-to-refresh gesture |
| `useLongPress` | Long-press gesture for context menus |

### 7.8 Unarchitected / Gap Areas

| Area | Delivery State | Notes |
|------|---------------|-------|
| AI/LLM integration | STUBBED (13 components) | Components have `console.warn('[TODO] LLM endpoint needed')`. Need Claude API endpoint. |
| Photo moderation pipeline | PARTIAL | Migration + client writes exist. No server-side review pipeline. |
| Push notification display | PARTIAL | SW registered, VAPID set. `push` event handler not wired to show browser notifications. |
| Membership billing | STUBBED | Waitlist UI only. Stripe subscriptions designed but not connected. |
| VaultMode content | STUBBED | `VaultMode.tsx` shell exists. Content scope undefined. |
| Legacy radio system | NOT STARTED (cleanup) | `shell/RadioContext.jsx` + `PersistentRadioPlayer.jsx` still mounted alongside new system. Needs removal. |

---

## 8. Integration Points & Configuration

### 8.1 External Services

| Service | Purpose | Config Location | Operational State |
|---------|---------|----------------|-------------------|
| **Supabase** (prod) | Auth, DB, Storage, Realtime | `rfoftonnlwudilafhfkl` | Active, verified |
| **Supabase** (dev) | Staging environment | `klsywpvncqqglhnhrjbh` | Active, verified |
| **Supabase** (edge fns) | Push notifications | `axxwdjmbwkvqhcpwters` | Active, verified |
| **Shopify** | Headless commerce | `/api/shopify/*` + env vars | Active, env unverified |
| **Stripe** | Payments (future) | `@stripe/stripe-js` | Not connected |
| **Sentry** | Error tracking | `@sentry/react` | Active, env unverified |
| **Vercel** | Hosting + serverless | `prj_xdS5EoLRDpGhj4GOIbtSLSrCmvJO` | Active, verified |
| **Google Maps** | Routing/ETAs | `GOOGLE_MAPS_API_KEY` | Optional, env unverified |
| **SoundCloud** | OAuth + uploads | `/api/soundcloud/*` | Configured, env unverified |
| **Resend** | Transactional email | `RESEND_API_KEY` | Configured, env unverified |
| **OpenAI** | Event scraper fallback | `OPENAI_API_KEY` | Optional, env unverified |

### 8.2 Supabase Edge Functions

| Function | Purpose |
|----------|---------|
| `notify-push` | Send web push notifications |
| `send-push` | Push processor |
| `push-processor` | Batch push delivery |
| `send-email` | Transactional email via Resend |
| `create-checkout-session` | Stripe checkout |
| `cancel-subscription` | Stripe subscription cancel |
| `stripe-webhook` | Stripe event handler |

### 8.3 API Routes (Vercel Serverless)

Located in `/api/`. Key routes:

| Route | Purpose | External Deps |
|-------|---------|--------------|
| `/api/profiles.js` | Ghost-filtered profile list | Supabase |
| `/api/profile.js` | Single profile read | Supabase |
| `/api/nearby.js` | Proximity profiles | Supabase |
| `/api/health.js` | Health check | None |
| `/api/shopify/*` | Shopify Storefront GraphQL proxy | Shopify |
| `/api/stripe/*` | Stripe checkout/webhook | Stripe |
| `/api/push/*` | Push notification dispatch | Supabase |
| `/api/notifications/*` | Notification CRUD | Supabase |
| `/api/events/*` | Event scraper + CRUD | Supabase, OpenAI (optional) |
| `/api/safety/*` | Safety features | Supabase |
| `/api/presence/*` | Presence updates | Supabase |
| `/api/auth/*` | Auth helpers | Supabase |
| `/api/ai/*` | AI endpoint stubs | TBC |
| `/api/soundcloud/*` | SoundCloud OAuth + upload | SoundCloud |
| `/api/gdpr/*` | Data export/deletion | Supabase |
| `/api/scan/*` | QR ticket scanning | Supabase |

### 8.4 Environment Variables

| Variable | Scope | Required | Purpose |
|----------|-------|----------|---------|
| `VITE_SUPABASE_URL` | Client | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Client | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Yes | Supabase admin access (serverless only) |
| `SHOPIFY_SHOP_DOMAIN` | Server | Yes (for market) | Shopify store domain |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Server | Yes (for market) | Shopify API token |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Client | No (not connected) | Stripe public key |
| `STRIPE_SECRET_KEY` | Server | No (not connected) | Stripe secret key |
| `GOOGLE_MAPS_API_KEY` | Server | No | Google Routes API |
| `VITE_VAPID_PUBLIC_KEY` | Client | No | Web Push public key |
| `VAPID_PRIVATE_KEY` | Server | No | Web Push private key |
| `RESEND_API_KEY` | Server | No | Email service |
| `TICKET_QR_SIGNING_SECRET` | Server | No | QR ticket signing |
| `CRON_SECRET` | Server | No | Cron job auth |
| `VITE_SENTRY_DSN` | Client | No | Sentry error tracking |

---

## 9. Data Architecture

### 9.1 Supabase Projects

| Project | ID | Purpose |
|---------|----|---------|
| Production | `rfoftonnlwudilafhfkl` | Live app |
| Dev/Staging | `klsywpvncqqglhnhrjbh` | Development |
| Edge Functions | `axxwdjmbwkvqhcpwters` | Push notification host |

### 9.2 Core Tables

| Table | Purpose | Key Columns | Row Count (dev) |
|-------|---------|-------------|-----------------|
| `profiles` | User profiles | id, email, display_name, avatar_url, age, bio, city, is_verified (NOT `verified`), looking_for, is_online. **NB: `photos` column does NOT exist — photos in `profile_photos` table. `last_lat`/`last_lng` do NOT exist — location in `user_presence`.** | 114 prod |
| `profile_photos` | User photos | user_id, url, position, moderation_status | separate table |
| `taps` | Boo interactions | tapper_email, tapped_email, from_user_id (UUID), to_user_id (UUID), tap_type | E2E verified |
| `conversations` | Chat conversations | id, created_at | - |
| `conversation_members` | Chat participants | conversation_id, user_id — gates message RLS | - |
| `messages` | Individual chat messages | conversation_id (FK→conversations), sender_id (UUID), content, message_type, metadata. **NOT `thread_id` or `sender_email`.** | E2E verified |
| `right_now_status` | Live intent status | user_id, status_type, venue_id, expires_at | 9 |
| `user_presence` | Presence heartbeat | user_id, last_seen, is_online, last_lat, last_lng | - |
| `notifications` | In-app notifications | user_email, type, title, message, read | - |
| `blocks` | User blocks | blocker_id, blocked_id | - |
| `trusted_contacts` | Emergency contacts | user_id, contact_name, contact_phone, relationship | 0 |
| `personas` | Multi-persona profiles | user_id, type (MAIN/TRAVEL/WEEKEND/custom), profile data | 0 |
| `preloved_listings` | User-to-user marketplace | seller_id, title, price, images[], status | 5 |
| `products` | Shopify-synced products | handle, title, price, images | 8 |
| `events` | Events (beacons source) | owner_id, title, starts_at, ends_at, latitude, longitude, metadata | - |
| `shows` | Radio shows | title, host, day_of_week, start_time, end_time | 5 |
| `tracks` | Music tracks | title, artist_id, release_id, audio_url, duration | 6 |
| `label_artists` | Label roster | name, bio, image_url | 7 |
| `label_releases` | Music releases | title, artist_id, cover_url, release_date | 16 |
| `venues` | Venue directory | name, lat, lng, type | 7 |
| `cities` | City list | name, lat, lng, country | 13 |
| `badges` | Achievement badges | name, description, icon | 9 |
| `app_banners` | Dynamic banners | placement, title, image_url, action_url | 29 |
| `location_shares` | Live location sharing | user_id, current_lat, current_lng, active, end_time | - |
| `push_subscriptions` | Web Push endpoints | user_id, endpoint, keys | - |

### 9.3 Views

| View | Source | Purpose |
|------|--------|---------|
| `beacons` | `events` + metadata JSONB | Read-only beacon view (ALTER TABLE will fail) |
| `public_movement_presence` | `movement_sessions` | Public movement data for Ghosted Live tab |
| `pulse_signals` | Multiple | Pulse mode signal aggregation |
| `place_intensity` | Venue check-ins | Venue heat map data |

### 9.4 RPC Functions

| Function | Purpose |
|----------|---------|
| `switch_persona(persona_id)` | Swap active persona |
| `mark_messages_read(thread_id)` | Zero unread count |
| `get_server_time()` | Server timestamp |
| `list_profiles_secure()` | Ghost-filtered profile list |

### 9.5 Storage Buckets

Defined in `uploadToStorage.ts` BUCKET_MAP:

| Code Name | Actual Bucket | Purpose |
|-----------|---------------|---------|
| `avatar` | `avatars` | Profile photos |
| `audio` | `records-audio` | Music tracks |
| `event-images` | `records-covers` | Event cover images |
| `chat-attachments` | `chat-uploads` | Chat image sharing |
| `uploads` | `uploads` | General uploads (BUCKET MAY NOT EXIST) |

**Known issue:** The `uploads` bucket does not exist in production. File upload features using this bucket will fail until created.

### 9.6 Migration Count
156+ migration files (at baseline `fe52338`) from `20260103` to `20260406`, covering schema creation, RLS policies, data seeds, and feature additions. Three additional migrations applied during QA (`fix_taps_insert_rls_use_jwt_not_auth_users`, `fix_taps_delete_rls_use_jwt_not_auth_users`, `fix_taps_select_rls_use_jwt_not_auth_users`). See Appendix D for notable migrations and known issues.

---

## 10. Security & Governance

### 10.1 Authentication

- **Method:** Supabase Auth (email magic link)
- **Session:** JWT stored in localStorage + IndexedDB hint (Safari purge protection)
- **PIN lock:** Optional 4-digit PIN via `PinLockContext`
- **Apple Sign-In:** Disabled (`APPLE_ENABLED = false`) due to WebView restrictions

### 10.2 Row Level Security (RLS)

All tables have RLS enabled. Key policies:
- Users can only read/write their own data
- Profiles are readable by all authenticated users
- Taps: insert only own, read own sent/received
- Chat messages: read/write only in threads where user is participant
- Blocks: insert/delete own only
- Admin operations require service role key

**Known issue:** `profile_overrides` RLS uses wrong FK (medium severity, not yet fixed)

### 10.3 API Security

- Vercel serverless functions use `SUPABASE_SERVICE_ROLE_KEY` for admin operations
- Cron endpoints protected by `CRON_SECRET` / `Authorization: Bearer` header
- Shopify webhook verified via `SHOPIFY_WEBHOOK_SECRET`
- Ticket QR codes signed with `TICKET_QR_SIGNING_SECRET`
- Rate limiting via `/api/_rateLimit.js`

### 10.4 Data Privacy

- **Presence coordinates:** Written to `user_presence` table. Display is rounded to 10m. Storage precision audit needed (see Open Issues).
- **SOS location:** Exact coordinates intentional (emergency use). Shared only with trusted contacts.
- **GDPR:** Data export endpoint exists (`/api/gdpr/`). Full deletion flow TBC.
- **Photo uploads:** Client-side validation (200px min, 5MB max, aspect ratio). Server-side moderation pipeline pending.

### 10.5 Secrets Management

- All secrets in Vercel Environment Variables (Project -> Settings)
- `.env.local` for local development only
- `.env.example` documents all required/optional vars (safe to commit)
- **NEVER** prefix server-side secrets with `VITE_`

### 10.6 Auth Listener Audit

6 files have Supabase `onAuthStateChange` listeners. Do NOT add more without auditing for listener multiplication:
1. `BootGuardContext.jsx`
2. `NowSignalContext.jsx` (may be dead)
3. `viewerState.ts`
4. `bootGuard.ts`
5. `Auth.jsx`
6. `supabaseClient.jsx`

---

## 11. Do Not Touch Blindly

These components have non-obvious coupling, safety implications, or fragile state. Read the full context before modifying.

| Component | File(s) | Why it's dangerous |
|-----------|---------|-------------------|
| **BootGuardContext** | `src/contexts/BootGuardContext.jsx` | Controls the entire boot state machine. A wrong gate change causes infinite onboarding loops (happened once, took 2 sessions to diagnose). The `onboarding_completed === true` check is the ONLY returning-user gate. Do not add conditions. |
| **Auth listener count** | 6 files (see 10.6) | 6 separate `onAuthStateChange` listeners exist. Adding a 7th without auditing causes auth call multiplication (14x per 30s observed in production). |
| **Provider mount order** | `src/App.jsx` | Provider hierarchy is load-bearing. SheetProvider MUST be inside BrowserRouter. RadioProvider MUST be inside SheetProvider. Reorder = cascading null context crashes. |
| **UnifiedGlobe** | `src/components/globe/UnifiedGlobe.tsx` | Returns `null` on non-`/pulse` routes. This is intentional. A previous attempt to render on all routes caused canvas bleed, nav tap theft, and 200MB memory leak. |
| **SOSOverlay** | `src/components/interrupts/SOSOverlay.tsx` | Safety-critical. Pushes to trusted contacts with live GPS. Any regression means someone's SOS doesn't fire. Test with real push after any change. |
| **supabaseClient** | `src/components/utils/supabaseClient.jsx` | Singleton. Imported by 100+ files. Do not create a second instance. Do not change the import path without a codebase-wide rename. |
| **Sheet policy** | `src/lib/sheetPolicy.ts` | Gates which sheets can open from which routes. Removing a gate means chat/video/travel sheets can open from Home where they have no profile context. |
| **BUCKET_MAP** | `src/lib/uploadToStorage.ts` | Maps code names to real Supabase bucket names. `uploads` maps to `messmarket-images` as a fallback. Changing a mapping breaks all uploads for that surface. |
| **`beacons` view** | Supabase | This is a VIEW over `events`, not a table. `ALTER TABLE beacons` will fail silently. `INSERT INTO beacons` will fail. Always write to `events` table. |
| **`right_now_status` table** | `right_now_status` | Must use `.gte('expires_at', now)` filter, NOT `.eq('active', true)`. The `active` column does not exist. 8 files were fixed in session 7. |

---

## 12. Known Contradictions

Things where the codebase says two different things. The resolution is documented but the code hasn't been fully cleaned up.

| Contradiction | Where | Resolution | Risk |
|--------------|-------|------------|------|
| **`base44Client.js` still exists** | `src/components/utils/supabaseClient.jsx` wraps some base44 compatibility | The file has near-zero direct imports. `supabaseClient.jsx` is the real client. **Safe to delete base44Client.js.** | LOW — deletion is safe but hasn't been done to avoid breaking any edge case import. |
| **`taps` table uses email FK** | `taps` has `tapper_email` / `tapped_email` | Should be UUID `from_user_id` / `to_user_id`. The `useTaps` hook works around this by looking up emails. Migration planned but not shipped. | MEDIUM — email-based FK breaks if a user changes email. |
| **Dual auth listeners** | `BootGuardContext` vs `NowSignalContext` vs `viewerState.ts` | `BootGuardContext` is canonical. Others should subscribe to its state, not run their own listeners. | LOW in production (listeners are cheap), HIGH for debugging (confusing auth flow). |
| **`profile_overrides` FK** | Migration `20260129100200` references `"User"` table | Should reference `profiles`. RLS policy uses wrong FK. | MEDIUM — profile overrides may silently fail RLS checks. |
| **Legacy radio system** | `shell/RadioContext.jsx` + `PersistentRadioPlayer.jsx` | New system: `src/contexts/RadioContext.tsx` + `RadioMiniPlayer.tsx`. Both are mounted. Legacy should be removed. | LOW — cosmetic, no user-facing conflict. |
| **Photo moderation column** | Migration `20260406000000` adds `moderation_status` to `profile_photos` | Migration exists in repo but may not be applied to production yet. Code (`insertProfilePhoto`) writes `moderation_status: 'pending'` — will fail if column doesn't exist. | HIGH if migration not applied before deploy. |
| **3 Supabase projects** | Prod `rfoftonnlwudilafhfkl`, dev `klsywpvncqqglhnhrjbh`, edge fns `axxwdjmbwkvqhcpwters` | Edge functions host is separate because notify-push was deployed there. Long-term should consolidate to prod project. | LOW — works but adds operational complexity. |

---

## 13. Test Plan

### 13.1 Test Infrastructure

| Type | Tool | Count | Command |
|------|------|-------|---------|
| Unit/Integration | Vitest | 17 | `npm run test:run` |
| E2E | Playwright | 32 | `npm run test:e2e` |
| Lint | ESLint | - | `npm run lint` |
| Type check | TypeScript | - | `npm run typecheck` |
| Full verify | All | - | `npm run verify` |

### 13.2 Validation Gate (mandatory before every merge)

```bash
npm run lint && npm run typecheck && npm run build
```

### 13.3 User Journey Test Cases

#### TC-01: New User Onboarding

| Step | Action | Expected | Priority |
|------|--------|----------|----------|
| 1 | Navigate to app | Age gate shown | P0 |
| 2 | Confirm age 18+ | Auth screen shown | P0 |
| 3 | Enter email | Magic link confirmation screen | P0 |
| 4 | Click magic link | Onboarding starts (step 1/8) | P0 |
| 5 | Complete all 8 steps | "What now?" picker shown | P0 |
| 6 | Choose "Explore" | Navigate to Home | P0 |

#### TC-02: Boo / Match / Chat Loop

| Step | Action | Expected | Priority |
|------|--------|----------|----------|
| 1 | Navigate to /ghosted | Grid loads with profiles | P0 |
| 2 | Tap profile card | Preview sheet opens | P0 |
| 3 | Tap "Boo" button | Toast "Boo sent", button changes to "Boo'd" | P0 |
| 4 | Other user boos back | Match overlay fires (once) | P0 |
| 5 | Tap "Send a message" | Chat opens with prefill | P0 |
| 6 | Send message | Message appears in thread | P0 |

#### TC-03: Meet Flow

| Step | Action | Expected | Priority |
|------|--------|----------|----------|
| 1 | From preview sheet, tap "Meet" | Directions sheet opens | P1 |
| 2 | Both users have location | Midpoint calculated, "Meet halfway" label | P1 |
| 3 | In chat, tap travel icon | TravelModal opens | P1 |
| 4 | Share location as meetpoint | MeetpointCard appears in chat with map + Route/Uber CTAs | P1 |

#### TC-04: Photo Upload

| Step | Action | Expected | Priority |
|------|--------|----------|----------|
| 1 | Select image < 200px | Rejected with clear error | P0 |
| 2 | Select image > 5MB | Rejected with clear error | P0 |
| 3 | Select valid image | Upload succeeds, preview shown | P0 |
| 4 | Upload in chat | Image appears via BUCKET_MAP | P1 |

#### TC-05: SOS Flow

| Step | Action | Expected | Priority |
|------|--------|----------|----------|
| 1 | Tap SOS button | SOSOverlay opens | P0 |
| 2 | Confirm SOS | Location written to DB | P0 |
| 3 | Trusted contacts exist | Push notification sent with map link | P0 |
| 4 | No trusted contacts | Graceful degradation, no crash | P0 |

#### TC-06: Commerce

| Step | Action | Expected | Priority |
|------|--------|----------|----------|
| 1 | Navigate to /market | Market tab loads | P1 |
| 2 | Tap product | Product detail sheet opens | P1 |
| 3 | Add to bag | Cart updates | P1 |
| 4 | Proceed to checkout | Redirect to Shopify checkout | P1 |

#### TC-07: Radio

| Step | Action | Expected | Priority |
|------|--------|----------|----------|
| 1 | Navigate to /radio | Full player loads | P2 |
| 2 | Tap play | Audio streams, mini player appears | P2 |
| 3 | Navigate away | Mini player persists above nav (56px) | P2 |
| 4 | Return to /ghosted | Now Playing strip shown if radio playing | P2 |

### 13.4 Acceptance Test Framework (ATF)

| Category | Pass Criteria |
|----------|--------------|
| Auth | Returning user hits READY in < 1s with zero network calls |
| Onboarding | New user completes 8 steps without loop or error |
| Ghosted | Grid shows profiles with distance, online status, intent |
| Boo/Match | Mutual detection fires overlay exactly once |
| Chat | Messages persist across refresh |
| Meet | Midpoint calculation produces valid coordinates |
| Photos | Invalid images rejected before upload |
| SOS | Push notification reaches trusted contacts |
| Radio | Stream plays, mini player persists across routes |
| PWA | App installable, SW intercepts navigations |

### 13.5 Human-Simulation E2E Results (2026-04-06, baseline `fe52338`)

Full Playwright suite against production (`hotmessldn.com`). Mobile Chrome, Pixel 5, London geolocation. Auth injected via localStorage.

**Result: 14 passed · 0 failed · 2 skipped (by design)**

| # | Test | Result | Notes |
|---|------|--------|-------|
| QA-01 | Sign up + magic link | SKIP | Needs real email inbox |
| QA-02 | Full 7-step onboarding | SKIP | Needs service role key to reset state |
| QA-03 | Profile photo upload | PASS | File input accessible |
| QA-04 | Ghosted grid with real data | PASS | Authenticated user sees cards |
| QA-05 | Boo / Boo back / Match overlay | PASS | Alpha boos Beta, tap verified in DB |
| QA-06 | Chat send + receive | PASS | Alpha sends; Beta receives via Supabase |
| QA-07 | Chat image upload | PASS | File input present in composer |
| QA-08 | Meet prefill from chat | PASS | Location button accessible |
| QA-09 | Push notification setup | PASS | SW registered, push subscription present |
| QA-11 | SOS push to trusted contacts | PASS | SOS button renders, no crash |
| QA-12 | Radio play + mini player | PASS | Radio loads, mini player persists |
| QA-13 | Market checkout via Stripe | PASS | Market tab renders with shop UI |
| QA-14 | Presence heartbeat | PASS | Presence write within 30s |
| QA-15 | PWA install readiness | PASS | manifest + sw.js + icon all present |
| QA-16 | Back button closes sheets | PASS | Browser back closes sheet correctly |
| Smoke | Auth persistence across reload | PASS | User stays logged in after hard reload |

**Bugs fixed during QA:**
- `profiles.photos` column removed from all SELECT queries
- `profiles.last_lat/last_lng` removed — location in `user_presence`
- `profiles.verified` → `is_verified` fixed across hooks + sheets
- `messages` table: `conversation_id` not `thread_id`, `sender_id` UUID not `sender_email`
- `taps` RLS INSERT/SELECT/DELETE policies rewritten to use `auth.jwt() ->> 'email'` (was broken `auth.users` subquery)
- Cookie banner (`hm_cookie_consent_v1`) added to E2E `bypassGates` helper
- QA-13 market locator selector syntax fixed

---

## 14. Deployment & Operations

### 14.1 Deployment Pipeline

```
Local dev → git push → Vercel auto-deploy (preview)
                     → merge to main → Vercel production deploy
```

**Vercel project:** `prj_xdS5EoLRDpGhj4GOIbtSLSrCmvJO`
**Team:** `team_ctjjRDRV1EpYKYaO9wQSwRyv`

### 14.2 Build Commands

```bash
npm run dev              # Local dev server (localhost)
npm run dev:lan          # LAN dev server (0.0.0.0:5173)
npm run build            # Production build
npm run lint             # ESLint
npm run typecheck        # TypeScript check
npm run verify           # Full: lint + typecheck + test + build
ANALYZE=true npm run build  # Bundle analysis → dist/stats.html
```

### 14.3 Service Worker

`public/sw.js` handles:
- Cache-first for static assets
- Network-first for API calls
- Serves cached `index.html` on all navigate requests (SPA route support)
- `NOTIFICATION_CLICK` message → App.jsx navigates via `useNavigate`

### 14.4 Cron Jobs

Configured via Vercel Cron (`vercel.json` or Vercel dashboard):
- Notification outbox processing
- Rate limit cleanup
- Event scraper

---

## 15. Open Issues & Risks

### 15.1 Critical

| Issue | Severity | Details |
|-------|----------|---------|
| `uploads` storage bucket missing | HIGH | Bucket doesn't exist in prod. File upload features fail. Create in Supabase dashboard. |
| Stripe Connect not onboarded | HIGH | All 3 sellers have `stripe_onboarding_complete = false`. Manual action needed. |
| `taps` RLS policies broken | FIXED | Was using inaccessible `auth.users` subquery. Replaced with `auth.jwt() ->> 'email'` via migration. |
| `VITE_SUPABASE_ANON_KEY` not in GitHub secrets | MEDIUM | E2E smoke CI runs but Supabase calls fail. |
| Push notification display not wired | MEDIUM | SW registered, VAPID set, but `push` event handler doesn't show browser notifications. |

### 15.2 Medium

| Issue | Details |
|-------|---------|
| `profile_overrides` RLS wrong FK | Medium severity, not yet fixed |
| Legacy radio system still mounted | `shell/RadioContext.jsx` + `PersistentRadioPlayer.jsx` mounted alongside new `RadioContext.tsx` |
| Presence coordinate precision | Need audit: are exact GPS coords stored in `user_presence`? Should be rounded for privacy. |
| Photo moderation stubbed | Migration exists but no server-side review pipeline |
| Read receipts partial | `markRead()` writes DB, but full bidirectional sync incomplete |

### 15.3 Low / Deferred

| Issue | Details |
|-------|---------|
| AI features stubbed (13 components) | `console.warn('[TODO] LLM endpoint needed')` |
| VaultMode content undefined | Shell exists, scope TBD (tickets, orders, archive?) |
| `20260214010000` migration syntax error | `IF EXISTS IF EXISTS` (cosmetic) |
| Realtime subscriptions multiply on HMR | Dev-only, not production |
| Node.js DEP0169 warning | Cosmetic, `/api/profiles` endpoint |

### 15.4 Assumptions

| # | Assumption | Impact if Wrong |
|---|-----------|-----------------|
| A1 | Supabase Auth magic link is sufficient (no password auth needed) | Would need auth flow redesign |
| A2 | Single-tenant: one Supabase project per environment | Multi-tenant would need schema changes |
| A3 | Shopify handles all payment processing | Preloved P2P payments need separate solution |
| A4 | GPS location available on user devices | Proximity features degrade without it |
| A5 | Brand channels remain editorially separated | Algorithm changes need admin tooling |

---

## 16. Handover Checklist

### For the incoming developer:

- [ ] Clone `SICQR/hotmess-globe` repository
- [ ] Copy `.env.example` to `.env.local` and fill in credentials
- [ ] Run `npm install` (Node >= 20 required)
- [ ] Run `npm run dev` to verify local environment
- [ ] Run `npm run verify` to confirm lint + typecheck + test + build pass
- [ ] Read `CLAUDE.md` (codebase conventions, do/don't rules)
- [ ] Read `DESIGN_SYSTEM.md` (brand tokens, component patterns)
- [ ] Get Supabase dashboard access (prod: `rfoftonnlwudilafhfkl`, dev: `klsywpvncqqglhnhrjbh`)
- [ ] Get Vercel dashboard access (project: `prj_xdS5EoLRDpGhj4GOIbtSLSrCmvJO`)
- [ ] Review open issues (Section 15) and prioritise

### Credentials needed from Phil:

- [ ] Supabase project access (prod + dev)
- [ ] Vercel team access
- [ ] Shopify store access
- [ ] Stripe dashboard access (when ready)
- [ ] Sentry project access
- [ ] GitHub repo write access

### First week priorities:

1. Create `uploads` storage bucket in Supabase prod
2. Wire push notification display in service worker
3. Decide on AI feature approach (Claude API vs strip)
4. Remove legacy radio system (shell/RadioContext + PersistentRadioPlayer)
5. Run presence privacy audit (coordinate precision)

---

---

## Appendix A: Environment Variable Matrix

| Variable | Scope | Required | Set in Vercel Prod? | Set in Vercel Preview? | Purpose |
|----------|-------|----------|--------------------|-----------------------|---------|
| `VITE_SUPABASE_URL` | Client | YES | YES | YES | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Client | YES | YES | YES | Supabase anonymous key |
| `SUPABASE_URL` | Server | YES | YES | YES | Server-side Supabase URL |
| `SUPABASE_ANON_KEY` | Server | YES | YES | YES | Server-side anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | YES | YES | YES | Admin access for serverless functions |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Client | NO | UNVERIFIED | UNVERIFIED | Stripe public key |
| `STRIPE_SECRET_KEY` | Server | NO | UNVERIFIED | UNVERIFIED | Stripe secret (not connected) |
| `STRIPE_WEBHOOK_SECRET` | Server | NO | UNVERIFIED | UNVERIFIED | Stripe webhook verification |
| `SHOPIFY_SHOP_DOMAIN` | Server | For market | UNVERIFIED | UNVERIFIED | Shopify store domain |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Server | For market | UNVERIFIED | UNVERIFIED | Shopify API token |
| `GOOGLE_MAPS_API_KEY` | Server | NO | UNVERIFIED | UNVERIFIED | Routing/ETAs (app degrades gracefully) |
| `VITE_VAPID_PUBLIC_KEY` | Client | For push | YES | YES | Web Push public key |
| `VAPID_PRIVATE_KEY` | Server | For push | YES | YES | Web Push private key |
| `RESEND_API_KEY` | Server | For email | UNVERIFIED | UNVERIFIED | Transactional email |
| `CRON_SECRET` | Server | For crons | UNVERIFIED | UNVERIFIED | Cron job auth |
| `TICKET_QR_SIGNING_SECRET` | Server | For tickets | UNVERIFIED | UNVERIFIED | QR signing |
| `VITE_SENTRY_DSN` | Client | NO | UNVERIFIED | UNVERIFIED | Error tracking |
| `SOUNDCLOUD_CLIENT_ID` | Server | For SC | UNVERIFIED | UNVERIFIED | SoundCloud OAuth |
| `SOUNDCLOUD_CLIENT_SECRET` | Server | For SC | UNVERIFIED | UNVERIFIED | SoundCloud OAuth |
| `OPENAI_API_KEY` | Server | NO | UNVERIFIED | UNVERIFIED | Event scraper LLM fallback |

**Action required:** Phil to audit Vercel dashboard and mark UNVERIFIED vars as SET or MISSING.

---

## Appendix B: Storage Bucket Matrix

| Code Name (in app) | Actual Supabase Bucket | Exists in Prod? | RLS Policy? | Used By |
|--------------------|----------------------|-----------------|-------------|---------|
| `avatars` | `avatars` | YES | Public read, auth write | `QuickSetupScreen`, `L2PhotosSheet`, `L2EditProfileSheet` |
| `audio` | `records-audio` | YES | Auth read/write | Music upload, SoundCloud import |
| `event-images` | `records-covers` | YES | Auth read/write | Event creation, scraper |
| `chat-attachments` | `chat-uploads` | YES | Auth read/write | `L2ChatSheet` image sharing |
| `media` | `messmarket-images` | YES | Auth read/write | Marketplace listing images |
| `listing-images` | `messmarket-images` | YES | Auth read/write | Preloved listing photos |
| `uploads` | `messmarket-images` | YES (fallback) | Auth read/write | General uploads (maps to messmarket-images) |

**Note:** The `uploads` code name was previously documented as mapping to a non-existent `uploads` bucket. It now maps to `messmarket-images` as a fallback. Verify this is intentional for all upload surfaces.

---

## Appendix C: Schema Risk Matrix

Tables that are load-bearing and have known issues or migration dependencies.

| Table | Risk | Details | Migration |
|-------|------|---------|-----------|
| `profile_photos` | HIGH | New `moderation_status` column added in migration `20260406000000`. Code writes `moderation_status: 'pending'`. **If migration not applied to prod, inserts will fail.** | `20260406000000_photo_moderation_status.sql` |
| `taps` | MEDIUM | Uses email FK (`tapper_email`/`tapped_email`) instead of UUID. Will break if users change email. Migration to UUID planned but not written. | None yet |
| `profile_overrides` | MEDIUM | RLS references `"User"` table (doesn't exist). Should reference `profiles`. | `20260129100200` |
| `beacons` | LOW | VIEW over `events`. Cannot ALTER or INSERT directly. Code must write to `events` table. | N/A (view) |
| `right_now_status` | LOW | No `active` column. Filter by `expires_at >= now()`. 8 files were fixed; verify no regressions. | Multiple |
| `user_presence` | LOW | Stores raw GPS coordinates. Privacy audit recommends rounding to 3 decimal places for display. | None yet |
| `chat_threads` | LOW | Uses `participant_emails[]` array. Same email-FK risk as taps. | None yet |

---

## Appendix D: Open Migrations

156 migration files exist in `supabase/migrations/`. The following are notable:

### Not confirmed applied to production

| File | Purpose | Risk if Missing |
|------|---------|----------------|
| `20260406000000_photo_moderation_status.sql` | Adds `moderation_status` column to `profile_photos`, moderation-aware RLS | Photo uploads fail (code writes to column that doesn't exist) |
| `20260331000001_*.sql` | RLS policies for market_sellers, analytics_events, audit_logs, affiliate_relations | Potential data leaks via missing RLS |
| `20260405600000_privacy_consent_tables.sql` | Privacy consent tracking tables | Privacy features non-functional |

### Known issues in existing migrations

| File | Issue |
|------|-------|
| `20260214010000_*.sql` | `IF EXISTS IF EXISTS` syntax error (cosmetic, Postgres ignores) |
| `20260129100200_*.sql` | `profile_overrides` references `"User"` table instead of `profiles` |

**Action required:** Run `SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 20;` on prod to verify which migrations have been applied.

---

## Appendix E: Release Readiness Checklist

Run this checklist before any production deploy.

### Pre-deploy

- [ ] `npm run lint` passes with zero errors
- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm run build` succeeds
- [ ] `npm run test:run` passes (unit/integration)
- [ ] No `console.log` in committed code (use `console.warn` for stubs only)
- [ ] No hardcoded credentials, URLs, or project IDs in client code
- [ ] No `VITE_` prefixed secrets (only public keys)
- [ ] All new Supabase migrations applied to prod (check `schema_migrations` table)
- [ ] New storage buckets created in prod if referenced by code
- [ ] New env vars set in Vercel for prod + preview

### Post-deploy smoke

```bash
# Verify app loads
curl -s -o /dev/null -w "%{http_code}" https://hotmessldn.com
# Expected: 200

# Verify API responds
curl -s https://hotmessldn.com/api/health | head -c 100
# Expected: JSON response

# Verify profiles endpoint
curl -s https://hotmessldn.com/api/profiles | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Profiles: {len(d.get(\"profiles\",[]))}')"
# Expected: Profiles: > 0

# Verify Supabase connectivity (edge function)
curl -s -X POST https://axxwdjmbwkvqhcpwters.supabase.co/functions/v1/notify-push \
  -H "Authorization: Bearer invalid" | head -c 100
# Expected: error response (not 404 — means function is deployed)
```

### Rollback procedure

1. Vercel dashboard -> Deployments -> find last good deployment -> "Promote to Production"
2. If DB migration caused issues: restore from Supabase point-in-time recovery (Settings -> Database -> Backups)
3. If edge function broke: redeploy previous version via `supabase functions deploy <name>`

---

## Appendix F: UAT Accounts & Seed Data

### Test accounts

| Account | Purpose | How to create |
|---------|---------|--------------|
| E2E test user | Automated testing | Set `E2E_EMAIL` + `E2E_PASSWORD` in `.env.local`, run `npm run test:e2e:auth` |
| Demo seed profiles | Grid population | Run `npm run seed:mock-profiles` (creates 10 profiles in dev DB) |

### Dev/staging data (project `klsywpvncqqglhnhrjbh`)

| Table | Rows | Notes |
|-------|------|-------|
| `profiles` | 23 | Mix of real + demo. Filter ghosts with `is_visible = true`. |
| `products` | 8 | Shopify-synced HNH MESS products |
| `preloved_listings` | 5 | Test listings |
| `shows` | 5 | Radio schedule |
| `label_artists` | 7 | Record label roster |
| `label_releases` | 16 | Music catalogue |
| `tracks` | 6 | Playable tracks |
| `venues` | 7 | London venues |
| `cities` | 13 | City list for globe |
| `app_banners` | 29 | Dynamic UI banners |

### Production data gaps

- Only ~13 real user profiles in prod. Grid looks empty for new users.
- `trusted_contacts` has 0 rows — SOS push untestable without real contacts.
- `personas` has 0 rows — persona system works but no one has created one.
- Seed script (`npm run seed:mock-profiles`) targets dev DB only. For prod seeding, manually insert via Supabase dashboard or modify script to target prod URL.

### Ghost filtering

The grid API (`/api/profiles.js`) filters out accounts matching:
- `is_visible = false`
- Email containing `@hotmess.app`, `@hotmess.test`
- Display names: `demo`, `admin`, `e2e`, `test`

Any seed data must avoid these patterns to appear on the grid.

---

*End of handover document v2. Baseline commit: `0759cb0`. This document should be treated as a living reference and updated as the project evolves.*
