# CLAUDE.md

This file provides guidance when working with code in this repository.

**Last updated:** 2026-03-08 (session 4)
**Design system:** `DESIGN_SYSTEM.md` — always read before touching any styling
**Design reference docs:** `~/Downloads/HOTMESS-PROJECT/01-ACTIVE-REFERENCE/` — all dated design reference files live here

---

## 🧠 HOW TO WORK — CO-FOUNDER MODE

You are the head of engineering and a co-founder of HOTMESS. Phil is the product owner. Act accordingly.

### Default behaviour
- **Just build it.** When a task is clear, start coding immediately. No preamble, no "here's what I'm going to do", no asking for permission.
- **Lint → typecheck → build → commit → push** on every task. Don't report back asking if you should push. Push.
- **One message per task** when done: what you built, the commit hash. Nothing else.
- **If something is ambiguous**, make the best product decision and note the call in the commit message. Don't ask.
- **No narration.** Never explain that you're "going to" do something. Do it, then report the result.
- **No bullet-pointed explanations** of what files you changed. The diff is the explanation.
- **No "you'll need to..."** instructions to Phil. If you can do it, do it. If you genuinely can't (e.g. needs a browser, needs a secret Phil holds), say so in one sentence and move on.

### Commit style
Short, imperative, specific. No co-author lines unless it's a meaningful collaboration. Example:
```
feat(ghosted): woof button + amber ring on cards, red badge in OSBottomNav
```

### When Phil says "go" or "yes" or similar
That is full authorisation. Start immediately. No recap of the plan.

### When Phil sends a task with no detail
Use your product judgment. You know the stack, the brand, the DB schema. Make a decision and ship it.

### What you know
- Full stack: React + Vite + TypeScript + Tailwind + Supabase + Framer Motion + Vercel
- Brand: `#C8962C` gold, `#050507` bg, dark only, no pink, no XP
- All 45 sheets, the boot state machine, sheet policy, persona system, SOS system
- Supabase project: `klsywpvncqqglhnhrjbh`
- Repo: `SICQR/hotmess-globe`, live at `hotmessldn.com`
- You have write access. Use it.

---

## 🔴 PICK UP HERE (Last session: 2026-03-08 session 4)

**What's done this sprint:**
- ✅ hotmessldn.com domain fixed
- ✅ RLS security hardening complete (all 7 holes + profile_overrides fixed)
- ✅ All 5 P1 agents shipped (Radio, Auth, Unread badge, Persona, XP purge)
- ✅ HomeMode 12-section redesign live
- ✅ IncomingCallBanner (platform-adaptive iOS/Android)
- ✅ SOSOverlay full rewrite — 2-phase fake call, iOS+Android, "Exit & clear data"
- ✅ LiveLocationShare wired into L2SafetySheet — "Live" tab in Safety Centre
- ✅ L2LiveLocationWatcherSheet — receiver map view for live location
- ✅ notifyContacts() writes to notifications table
- ✅ L2NotificationInboxSheet + useNotifCount — full notification feed, amber badge on Profile tab
- ✅ GitHub Actions CI — real e2e-smoke job (smoke.a, smoke.b, navigation specs, Chromium)
- ✅ Co-founder mode behaviour written into CLAUDE.md
- ✅ Profile completion card wired to real data (useProfileCompletion hook) — 32f95f1
- ✅ profile_overrides RLS wrong FK fixed (applied to production DB)
- ✅ notify-push Edge Function deployed — JWT-authenticated, emails→user_ids, web-push via VAPID
- ✅ LiveLocationShare.notifyContacts() fires push + in-app notification — 41c305e
- ✅ VaultMode: OS bg, correct green, nav padding, unused imports removed — 17d0378
- ✅ Read receipts server-side: fixed RPC call (mark_messages_read), removed duplicate manual reset — 03c15ef
  → DB trigger increments unread_count on INSERT; RPC clears it + stamps read_by[] atomically
- ✅ PersonaSwitcherSheet: "Add persona" now navigates to /profile?action=manage-personas — 17a37f6
- ✅ OnboardingGate Vibe step (step 5): captures age, position, looking_for → profiles.public_attributes — c510ee5
- ✅ api/profiles.js: now joins profiles.public_attributes so age/position/looking_for reach Ghosted grid — c510ee5
- ✅ SimpleProfileCard + ProfileCard: now show age + position — c510ee5
- ✅ Profile → My Earnings entry point → L2PayoutsSheet (seller balance + payout request) — c4224d1
- ✅ RadioMode: Full Schedule button in Up Next strip → L2ScheduleSheet — c4224d1

**What still needs doing (blocked on Phil):**
- ❌ VAPID keys not yet set in Supabase Edge Function secrets (notify-push will return 500 until set)
  → Dashboard: Settings → Edge Functions → notify-push → Add VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
  → Public key: `BFWgyAvJsZf4wZavZ-6X6c934k13RiYwjeEEIgQeOK0PyrBbvcJrqLL9llzV2Phee9GDOLpSVPSvGIja5eyr5WY`
  → Private key: held by Phil (generated 2026-03-07 alongside public key)
- ❌ VITE_SUPABASE_ANON_KEY not yet set as GitHub repo secret (e2e-smoke will run but Supabase calls fail)
- ❌ Stripe Connect redirect (one-line uncomment in PayoutManager.jsx when Stripe is live)

**Next task:** Awaiting Phil's direction. See platform audit below for gaps.

---

## 🔍 PLATFORM AUDIT — USER JOURNEY STATUS (2026-03-08 session 4)

| User Type | Status | Remaining gaps |
|-----------|--------|----------------|
| New user (first arrival) | ✅ | — 7-step onboarding → profile with age/position/looking_for on grid immediately |
| Ghosted social user | ✅ | — Grid, taps, woofs, chat, video call, filters all wired |
| Seller | ⚠️ | ✅ List, view listings, view earnings (payouts sheet). ❌ Preloved payment = no Stripe (arrange via chat) |
| Buyer | ⚠️ | ✅ Shopify checkout real. ❌ Preloved = order record only, payment not moved |
| Radio listener | ✅ | — Stream live, mini player persists, show cards, Full Schedule button → L2ScheduleSheet |
| Event organiser | ✅ | — Create event in EventsMode → beacons |
| Event attendee | ✅ | — RSVP → ticket in Vault → QR |
| Telegram entry user | ❌ | ✅ Bot server-side. ❌ TelegramPanel is placeholder. No ?tg_token= URL handling frontend |
| Safety user | ✅ | — SOS, fake call, emergency contacts, live location share, push notifications |

### Brand visibility (`src/config/brands.ts` — flip `visible: true` when ready)
| Brand | Now | Action needed |
|-------|-----|---------------|
| hotmess | ✅ live | — |
| hotmessRadio | ✅ live | — |
| raw | ✅ live | — |
| messmarket | ✅ live | — |
| hung | ❌ hidden | Phil to confirm → 1-line change |
| high | ❌ hidden | Phil to confirm → 1-line change |
| superhung / superraw | ✅ config | No Shopify products yet |
| hungmess | ❌ hidden | Phil to confirm |
| rawConvictRecords / smashDaddys / hnhMess | ✅ config | Confirm Shopify collections exist |

### Known code gaps (not blocking core journeys)
- `TelegramPanel` frontend = placeholder — needs telebot repo wired
- Preloved checkout = "arrange via chat" — needs Stripe Connect (blocked on Phil)
- VAPID keys not set → push notifications fail silently
- Dev orphan sheets: `admin`, `ghosted`, `marketplace`, `order`, `ticket-market` — registered but harmless

---

---

## Commands

```bash
# Development
npm run dev              # Start Vite dev server (localhost only)
npm run dev:lan          # Dev server on LAN (0.0.0.0:5173)

# Quality — run all three before any PR
npm run lint             # ESLint (quiet mode)
npm run typecheck        # TypeScript check (no emit)
npm run build            # Production build

# Testing
npm run test             # Vitest watch mode
npm run test:run         # Single run (no watch)
npm run test:e2e         # Playwright E2E
npm run test:e2e:headed  # E2E with visible browser

# Single file
npx vitest run src/path/to/file.test.ts
npx playwright test e2e/specific.spec.ts

# Bundle analysis
ANALYZE=true npm run build   # Generates dist/stats.html
```

---

## Architecture

### Provider hierarchy (outer → inner)

```
Sentry.ErrorBoundary → ErrorBoundary → OSProvider
└─ App
   └─ I18nProvider
      └─ AuthProvider          ← Supabase auth state
         └─ PinLockProvider
            └─ BootGuardProvider   ← Boot state machine
               └─ QueryClientProvider (TanStack Query)
                  └─ WorldPulseProvider
                     └─ ShopCartProvider
                        └─ BrowserRouter
                           └─ SOSProvider
                              └─ SheetProvider   ← sheet state
                                 └─ BootRouter
                                    └─ RadioProvider
                                       └─ OSArchitecture
```

`SheetRouter` is rendered as a sibling to `BootRouter` (inside `SheetProvider` but outside the route tree), so sheets never unmount on route changes.

### OS Layer model

| Layer | Z-index | What lives here |
|-------|---------|-----------------|
| L0 | 0 | `UnifiedGlobe` (Three.js — **only renders on `/pulse`**, null elsewhere) |
| L1 | 50 | `OSBottomNav`, `RadioMiniPlayer` |
| L2 | 100 | Content sheets (`SheetRouter`) |
| L3 | 150 | Higher sheets: persona switcher, filters |
| Interrupts | 180–200 | `IncomingCallBanner` (180), `SOSButton` (190), `SOSOverlay` (200), `PinLockOverlay` (above all) |

### 5-Mode OS structure

| Route | Mode | Status |
|-------|------|--------|
| `/` | Home — 12-section feed | ✅ Redesigned 2026-03-07 |
| `/pulse` | Pulse — globe + events + beacon FAB | ✅ Active |
| `/ghosted` | Ghosted — 3-col proximity grid | ✅ Active |
| `/market` | Market — Shopify headless + preloved | ✅ Active |
| `/profile` | Profile — persona switcher, settings | ✅ Active |
| `/radio` | Radio — full-screen player (mini player persists above nav) | ✅ Active |
| `/vault` | Vault — tickets, orders, archive | ⚠️ Scope TBD |

Mode components are lazy-loaded. Route-to-mode mapping is in `src/App.jsx`.

### Boot state machine (`BootGuardContext`)

```
LOADING → UNAUTHENTICATED    → /auth
        → NEEDS_AGE          → AgeGate
        → NEEDS_ONBOARDING   → OnboardingGate (6 steps, step 6 = community attestation)
        → NEEDS_COMMUNITY_GATE
        → READY
```

`localStorage` key `hm_age_confirmed_v1` can bypass age/onboarding gates even if DB sync fails.

### Sheet system

Open sheets with `openSheet(type, props)` from `useSheet()`. Stack is LIFO — back button pops top sheet before navigating. Active sheet syncs to `?sheet=<type>` URL param for deep-linking.

**Gated sheets** (`chat`, `video`, `travel`) only open from `/ghosted` or when a `profile` sheet is already in the stack. Other callers get a toast and are blocked. See `src/lib/sheetPolicy.ts`.

New sheets: register the type in `src/lib/sheetSystem.ts` first, then add the component (named `L2[Name]Sheet.jsx`) and wire it into `src/components/sheets/SheetRouter.jsx`.

### Persona system

`personas` table stores up to 5 profiles per user (types: MAIN, TRAVEL, WEEKEND, custom). Each persona is a full independent profile. `switch_persona(persona_id)` RPC swaps the active persona. `PersonaContext` tracks it globally. Entry points: long-press avatar in ProfileMode, long-press Profile tab in `OSBottomNav`.

### Marketplace (three commerce streams)

1. **Shop** — Shopify headless (`/api/shopify/*` handlers)
2. **Preloved** — user-to-user listings via `preloved_listings` table
3. **Creator drops** — radio host merch (tagged listings)

Market tab colours: Shop `#C8962C` · Preloved `#9E7D47` · Creator `#CF3A10`

### API routes

`vite.config.js` wires `api/**/*.js` files as local dev middleware (Vercel-style). In production these are Vercel serverless functions. Adding `/api/foo` requires both the handler file and a route entry in the `localApiRoutes()` plugin in `vite.config.js`.

### Supabase client

Singleton at `src/components/utils/supabaseClient.jsx`. Auth listeners exist in 6 files (BootGuardContext, NowSignalContext, viewerState.ts, bootGuard.ts, Auth.jsx, supabaseClient.jsx) — do not add more without auditing for listener multiplication.

### Import aliases

`@/` maps to `src/`. Always use alias imports.

```js
import X from '@/components/...'
import X from '@/contexts/...'
import X from '@/hooks/...'
import X from '@/lib/...'
import X from '@/pages/...'
import X from '@/modes/...'
```

---

## Design System Summary

> Full spec in `DESIGN_SYSTEM.md`. Quick reference below.

| Token | Value |
|-------|-------|
| Gold (CTA/accent) | `#C8962C` |
| Gold dim (bg) | `rgba(200,150,44,0.15)` |
| OS root bg | `#050507` ← deep space (NOT `#000`) |
| Card | `#1C1C1E` |
| Nav/surface | `#0D0D0D` |
| Text muted | `#8E8E93` |
| Danger | `#FF3B30` |
| Online dot | `#30D158` |
| Radio channel | `#00C2E0` |
| RN Hookup | `#FF5500` (semantic only — not CTA) |
| RN Hang | `#00C2E0` (semantic only — not CTA) |
| RN Explore | `#A899D8` (semantic only — not CTA) |
| HUNG brand | `#C41230` |
| Nav height | `83px` immutable |
| Radio player | `56px` above nav |

---

## HomeMode — 12-Section Layout (redesigned 2026-03-07)

`src/modes/HomeMode.tsx` implements the full spec from `HOTMESS-HomeMode-Design.html`:

```
01. Intention Bar     — Hookup/Hang/Explore intent picker → writes right_now_status TABLE
02. Globe Teaser      — static orb hero → navigate /pulse
03. Who's Out RN      — avatar row, conic-gradient intent rings
04. Tonight's Events  — horizontal scroll 200px event cards → L2EventSheet
05. Live Radio        — teal #00C2E0 banner → navigate /radio
06. Nearby (Ghosted)  — 4-col teaser grid → navigate /ghosted
07. Market Picks      — horizontal scroll 140px product cards → L2ProductSheet
08. Active Beacons    — list view → L2BeaconSheet
09. Venue Kings       — horizontal scroll (shown when data exists)
10. Creator Drop      — HUNG #C41230 banner
11. Your Profile      — completion % progress card
12. Safety Strip      — SOS reminder
```

Removed sections (no longer in HomeMode): hero banner, community section, scene scout/tonight's picks.

---

## Completed P0 Tasks

### P0a: SOS Global Mount ✅
- `SOSContext` created
- `SOSButton` mounted globally (z-190, bottom-right, long-press trigger)
- `SOSOverlay` (z-200, PIN-protected, no close button)
- Fixed: location_shares table name, split-brain status writes

### P0b: Community Gate ✅
- Migration: `community_attested_at` column added to profiles
- OnboardingGate step 6: community attestation
- BootGuardContext: NEEDS_COMMUNITY_GATE state

### P0c: UI Policy Guard ✅
- `sheetPolicy.ts`: canOpenSheet() blocks chat/video/travel outside /ghosted
- SheetContext: openSheet() gated with toast on block
- Fixed 3 rogue callsites

### P0f: Domain Fix ✅ (2026-03-08)
- Removed broken `vercel.json` redirects sending hotmessldn.com → hotmess.app (dead domain)
- Added correct www.hotmessldn.com → hotmessldn.com canonical redirect
- hotmessldn.com now serves the app correctly (HTTP 200)
- Committed: `20df177`

### P0g: RLS Security Hardening ✅ (2026-03-08)
- All 7 fixes from `20260226000080_rls_critical_fixes.sql` confirmed live in production
- Dropped stale `emergency_locations: authenticated upsert` ALL=true override policy
- Applied `rls_remaining_security_fixes` migration:
  - Dropped `notifications_write_authenticated` (spam vector — any user could notify anyone)
  - Enabled RLS on `routing_cache`, `routing_rate_limits`, `platform_knowledge`
- Security posture: blocking issues resolved, safe to proceed to smoke test before launch

### P0d: Gold Rebrand ✅
- All pink (#FF1493) replaced with gold (#C8962C)
- Auth page luxury noir-gold redesign
- Cyan audit — accidental cyan CTAs fixed

### P0e: HomeMode Redesign ✅ (2026-03-07)
- Full 12-section layout from HOTMESS-HomeMode-Design.html
- New intent colour system (hookup/hang/explore rings)
- Teal radio banner, 4-col ghost teaser, horizontal market scroll
- Venue kings, creator drop banner, profile completion card, safety strip

### Other P0 Fixes ✅
- UnifiedGlobe: returns null on non-Pulse routes (GPU optimization)
- XP purge: removed ALL XP from UI (no profile levels, no point displays)

---

## Active P1 Tasks — TRUE STATE (audited 2026-03-08)

**No agents currently running.**

| # | Task | Status | Notes |
|---|------|--------|-------|
| 17 | Filters drawer + Taps/Woofs | ✅ **SHIPPED** | L2FiltersSheet wired in GhostedMode (openSheet('filters'), active count badge, localStorage). useTaps + woof button + amber ring on cards. L2TapsSheet registered. Red badge in OSBottomNav opens taps sheet. |
| 16 | IncomingCallBanner | ✅ **SHIPPED** | Platform-adaptive iOS/Android, committed ab56469 |
| 16 | Typing indicators | ✅ **SHIPPED** | TypingIndicator.jsx + useTypingIndicator already live in L2ChatSheet |
| 16 | Read receipts | ⚠️ **PARTIAL** | markRead() writes to localStorage; DB-level unread_count field on chat_threads used by useUnreadCount but not fully synced server-side |
| 20 | SOS flow polish | ✅ **SHIPPED** | 2-phase fake call (ringing→connected), iOS+Android, exit button, committed b5e6794 |
| 18 | Beacon creation UI | ✅ **SHIPPED** | L2BeaconSheet has both viewer + full multi-step BeaconCreator. BeaconFAB in PulseMode calls openSheet('beacon', { mode: 'create' }) |
| 21 | Video call UI | ✅ **SHIPPED** | L2VideoCallSheet — full WebRTC signaling via rtc_signals table, offer/answer/ICE flow |
| 22 | Profile views | ✅ **SHIPPED** | L2ProfileViewsSheet.tsx exists; profile_views tracking in L2ProfileSheet on open; ProfileMode links to sheet |
| Live Location | Wire LiveLocationShare | ✅ **SHIPPED** | Added as "Live" tab in L2SafetySheet — trusted contacts from table, watchPosition, realtime broadcast |
| 23 | PWA push notifications | ❌ **TODO** | notifyContacts() stub in LiveLocationShare still console.log. Needs: VAPID keys, Supabase Edge Function, service worker handler |
| 27 | VaultMode scope | ❌ **TODO** | VaultMode.tsx exists but scope undefined — tickets, orders, archive? Phil to define |

---

## Travel & Location Micro-flows (full audit 2026-03-08)

**Built and wired:**
- `InAppDirections.jsx` — Leaflet map, walk/bike/drive/Uber routing, wired in ProfileHeader
- `TravelModal.jsx` — ✈️ button in chat, sends `meetpoint` message type with OSM map preview
- `L2ChatMeetupSheet.tsx` — meetup suggestion in chat thread
- `L2LocationSheet` — city/precision/radius settings, registered as 'location' in SheetRouter
- `LiveLocationShare.jsx` — duration picker, contact selector, watchPosition, Supabase realtime ✅ NOW wired into L2SafetySheet
- `useRealtimeLocations.ts`, `useLiveViewerLocation.js` — hooks for consuming shared locations

**Still missing:**
- Receiver/watcher view — a trusted contact seeing a live location pin on a map
- `notifyContacts()` real push (blocked by #23 infra)

---

## Rules

**Require approval before:**
- Changing root provider mount order
- Moving `SheetProvider` or `RadioProvider` in the tree
- Adding/removing Supabase `onAuthStateChange` listeners
- Modifying Supabase client instantiation
- Renaming routes or deleting files
- Rewriting navigation architecture

**Validation gate:** Always run `npm run lint && npm run typecheck && npm run build` before marking any change done.

---

## BRAND CHANNEL RULES — NEVER BREAK THESE

Each brand/channel is sovereign. They share an OS but they do NOT merge unless a human (Phil) makes that editorial decision.

**The channels:**
- `HOTMESS` — the social OS and platform
- `RAW` — clothing sub-brand (bold basics)
- `HUNG` — clothing sub-brand (statement pieces) · colour `#C41230`
- `HIGH` — clothing sub-brand (elevated essentials)
- `SUPERHUNG` / `SUPERRAW` — ultra-limited drops
- `HUNGMESS` — editorial fashion line
- `RAW CONVICT RECORDS` — the record label · colour `#9B1B2A`
- `HOTMESS RADIO` — broadcast (Wake The Mess, Dial A Daddy, Hand N Hand) · colour `#00C2E0`
- `SMASH DADDYS` — in-house music production
- `HNH MESS` — lube brand

**Rules:**
- **NEVER** let AI auto-cross-promote between brands
- **NEVER** merge label artists into the social/community feed algorithmically
- **Cross-brand moments** are **human editorial decisions only** — created via admin
- Each brand has its own Shopify product tags, beacon types, content category — **keep separated in queries**
- AI features may only surface content **within** the channel the user is currently in

**Internal only exception:** Admin dashboard, analytics, and ops tools may aggregate across all channels for reporting purposes.

---

## DO / DON'T

| DO | DON'T |
|----|-------|
| Use `#C8962C` gold for all CTAs and accents | Use pink (`#FF1493`) anywhere |
| Use `#050507` as root OS background | Use `#000000` as root bg (too flat) |
| Gate chat/video/travel sheets with `canOpenSheet()` | Open chat/video/travel sheets without policy check |
| Write to `right_now_status` **TABLE** | Write to `profiles.right_now_status` JSONB (column does not exist) |
| Return `null` from `UnifiedGlobe` on non-`/pulse` routes | Render the globe outside `/pulse` |
| Use `SOSContext.triggerSOS()` for SOS activation | Bypass the SOS context |
| Keep sheets at z-100/z-150, interrupts at z-180+ | Mix interrupt z-indices with sheet z-indices |
| Keep XP DB columns intact | Add any XP/gamification UI |
| Use `owner_id` and `starts_at`/`ends_at` on beacons | Use `user_id`, `start_time`, `end_time` (don't exist) |
| Keep brand channel content isolated in queries | Let AI auto-merge RAW/HUNG/HIGH/RADIO/LABEL content |
| Use intent colours (`#FF5500`, `#00C2E0`, `#A899D8`) for RN rings only | Use intent colours as CTA buttons |

---

## Key constants & gotchas

- Brand primary: `#C8962C` (antique gold)
- OS root bg: `#050507` (deep space — NOT `#000000`)
- Card bg: `#1C1C1E`, nav bg: `#0D0D0D`
- Text muted: `#8E8E93` — dark theme only, no light mode
- XP system: DB columns kept, **UI display fully removed**
- `beacons` is a **VIEW** — `ALTER TABLE` will fail; `title`/`description`/`address`/`image_url` are stored in `metadata` JSONB
- **Safety features** in `src/components/safety/` and `src/components/sos/` are safety-critical and must not regress
- Radio channel colour `#00C2E0` is intentional — it's the HOTMESS RADIO brand colour, not an accidental cyan CTA

---

## Known issues

- `right_now_status` split-brain: some older code writes to `profiles.right_now_status` JSONB — fix any occurrence by writing to the `right_now_status` TABLE instead
- `20260214010000` migration has `IF EXISTS IF EXISTS` syntax error (low priority cosmetic)
- `profile_overrides` RLS uses wrong FK (medium severity, not yet fixed)
- Realtime subscriptions multiply on Vite hot-reload (dev-only, not a production issue)
- HomeMode profile card (section 11) shows hardcoded completion — wire to real profile data when implementing profile completion tracking

---

## Key Files Reference

### Contexts
```
src/contexts/BootGuardContext.jsx    - Auth state machine
src/contexts/SheetContext.jsx        - Sheet management
src/contexts/SOSContext.tsx          - SOS global state
src/contexts/PersonaContext.jsx      - Multi-persona
src/contexts/RadioContext.jsx        - Radio player
src/contexts/LocationContext.jsx     - Geolocation
```

### Modes (5 main screens)
```
src/modes/HomeMode.tsx       - Home feed (12-section, redesigned 2026-03-07)
src/modes/PulseMode.tsx      - Globe + events
src/modes/GhostedMode.tsx    - Proximity grid
src/modes/MarketMode.tsx     - Commerce
src/modes/ProfileMode.tsx    - Settings hub
src/modes/RadioMode.tsx      - Full player
src/modes/VaultMode.tsx      - Tickets + orders (scope TBD)
```

### Boot Flow
```
src/pages/Auth.jsx               - Login/signup (luxury noir-gold design)
src/pages/AgeGate.jsx            - Age confirmation
src/pages/OnboardingGate.jsx     - 6-step onboarding
src/components/shell/BootRouter.jsx - Route orchestration
```

### Design Documents (Downloads)
All files now organised in `~/Downloads/HOTMESS-PROJECT/`
```
01-ACTIVE-REFERENCE/
  2026-03-HOTMESS-Design-Reference.html    - Full mode-by-mode design spec (87KB)
  2026-03-HOTMESS-HomeMode-Design.html     - Home screen mockup (implemented ✅)
  2026-03-HOTMESS-Brand-Palette-v2.html    - Full brand colour palette
  2026-02-HOTMESS-Gold-Rebrand-Mockup.html - Gold rebrand reference
  2026-02-HOTMESS-Live-Mockup.html         - Live mockup reference
  2026-02-HOTMESS-MasterBuildPlan.html     - Build plan
  2026-03-HOTMESS_DESIGN_SYSTEM_PROMPT.md  - Reusable audit prompt for Claude sessions
  2026-02-hotmess-os-granular-flows.md     - User flow mapping (E2E test reference)

02-DOCS-AND-PLANS/  - Execution plans, audits, deployment docs
03-ASSETS/          - Images, CSVs, JSONs, brand assets
04-ARCHIVE-CODE/    - Old code zips + old extracted folders (safe to ignore)
```

# currentDate
Today's date is 2026-03-07.
