# CLAUDE.md

This file provides guidance when working with code in this repository.

**Last updated:** 2026-03-28 (session 9)
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
feat(ghosted): boo button + amber ring on cards, red badge in OSBottomNav
```

### When Phil says "go" or "yes" or similar
That is full authorisation. Start immediately. No recap of the plan.

### When Phil sends a task with no detail
Use your product judgment. You know the stack, the brand, the DB schema. Make a decision and ship it.

### What you know
- Full stack: React + Vite + TypeScript + Tailwind + Supabase + Framer Motion + Vercel
- Brand: `#C8962C` gold, `#050507` bg, dark only, no pink, no XP
- All 45 sheets, the boot state machine, sheet policy, persona system, SOS system
- Supabase project (production): `rfoftonnlwudilafhfkl`
- Supabase project (dev/staging): `klsywpvncqqglhnhrjbh`
- Supabase edge functions host only (notify-push endpoint lives here): `axxwdjmbwkvqhcpwters`
- Repo: `SICQR/hotmess-globe`, live at `hotmessldn.com`
- Vercel project: `prj_xdS5EoLRDpGhj4GOIbtSLSrCmvJO`, team: `team_ctjjRDRV1EpYKYaO9wQSwRyv`
- You have write access. Use it.

---

## 🔴 PICK UP HERE (Last session: 2026-03-28 session 9)

### What shipped sessions 8+9 (2026-03-28):

**Session 8 — `bad1be6`:**
- ✅ **HotmessWordmark** — `src/components/brand/HotmessWordmark.tsx`, letter-stagger, SS pulse, shimmer underline, 5 size variants
- ✅ **SplashScreen redesign** — dark luxury, gold rules, wordmark hero, fast-path 900ms CTA reveal
- ✅ **CSS design tokens** — `--hm-black`, `--hm-gold`, `--hm-amber` etc. + `.hm-btn-primary`, `.hm-card` utilities in index.css
- ✅ **HNH MESS Hero + Strip** — `HNHMessHero.tsx` (320px, floating bottle, radial glow, £10/£15 prices) + `HNHMessStrip.tsx` (46px persistent, "from £10") wired into HomeMode
- ✅ **HNHMarketHero** — 2-col product grid in MarketMode (£10 50ml / £15 250ml featured)
- ✅ **GlobalTicker** — fixed to exactly 36px
- ✅ **Apple Sign In blocked in WebViews** — `APPLE_ENABLED = false` flag + isInWebView() UA check in SignUpScreen
- ✅ **Magic link confirmation screen** — gold icon, 60s countdown, resend button, "wrong email" escape
- ✅ **uploadToStorage BUCKET_MAP** — code names → prod bucket names (audio→records-audio, event-images→records-covers, etc.)
- ✅ **SW push notificationclick** — posts `NOTIFICATION_CLICK` message; App.jsx navigates via `useNavigate`
- ✅ **markRead() DB-first** — L2ChatSheet zeroes `chat_threads.unread_count` in Supabase before localStorage
- ✅ **IndexedDB session hint** — `writeIDBHint()` in BootGuardContext on SIGNED_IN, prevents Safari localStorage purge

**Session 9 QA emergency — `95decb0` (pushed, pending deploy):**
- ✅ **Onboarding re-loop FIXED** — removed `!display_name` gate in BootGuardContext; `onboarding_completed === true` is now the ONLY returning-user gate
- ✅ **Canvas bleed fixed** — UnifiedGlobe returns null on all non-/pulse routes (AmbientGlobe removed)
- ✅ **Music tab scroll fixed** — `h-full overflow-y-auto overscroll-contain` (was min-h-screen)
- ✅ **Auth callback routing** — returning users → `/ghosted`, new users → `/`, bot 400s → `/` gracefully
- ✅ **E2E matrix** — `e2e/11-full-qa-matrix.spec.ts`: auth flows, tab canvas bleed, HNH prices, sheet system, onboarding regression

**Current prod commit:** `95decb0` (pending push/deploy) | prev deployed: `bad1be6`

### What shipped this session (2026-03-28):

**Production fix pass — `7ad858d` → deployed dpl_2Y9f1hr17X2VZ3adZ9DF1hbTUnRU:**
- ✅ **Auth flood fixed** — BootGuardContext reads Supabase token from localStorage synchronously at boot; returning users hit READY state instantly with zero network calls
- ✅ **getUser() → getSession()** across useNotifCount, useUnreadCount, usePresenceHeartbeat — eliminates 14× auth calls per 30s
- ✅ **Beacon DB 400s fixed** — `lat`/`lng`/`kind` → `latitude`/`longitude`/`type` in HomeMode, PulseMode, useGlobeBeacons
- ✅ **right_now_status 400s fixed** — `.eq('active', true)` → `.gte('expires_at', now)` across 8 files (HomeMode, PulseMode, ProfileMode, Profile.jsx, L2GhostedSheet, L2ProfileSheet, NearbyGrid, SOSOverlay)
- ✅ **Presence writes fixed** — core/presence.ts, QuickSetupScreen, LocationPermissionScreen redirected to `user_presence` TABLE (presence VIEW is read-only)
- ✅ **Pull-to-refresh killed** — `position: fixed; overflow: hidden` on html/body/root in index.css
- ✅ **SW navigate intercept** — sw.js serves cached index.html on all navigate requests (PWA route 404s fixed)
- ✅ **Instant tab switching** — 6 core OS modes statically imported in App.jsx (no lazy-load on first visit)
- ✅ **Three.js nav theft fixed** — UnifiedGlobe canvas constrained to `bottom: 83px`; nav taps no longer swallowed
- ✅ **Android back button** — popstate handler in OSArchitecture closes top sheet before navigating back
- ✅ **Realtime reconnect** — CHANNEL_ERROR/TIMED_OUT → exponential backoff reconnect in useUnreadCount, useNotifCount, useGlobeBeacons

**Also shipped (earlier in session 7, pulled from GitHub on push):**
- ✅ base44Client.js deleted — zero imports, safe removal done
- ✅ UploadFile migration — 18 stubs → uploadToStorage.ts utility, bucket RLS policies applied
- ✅ Storage consolidation — 6 remaining direct storage calls migrated
- ✅ Demo seed — 10 demo profiles + presence for Ghosted grid
- ✅ Full onboarding router rewrite — unified OnboardingRouter (Splash → Age → Auth → Profile → Vibe → Safety → Location)
- ✅ Music tab — MusicTab.jsx, MusicMiniPlayer, MusicPlayerContext, GhostedAmbientToggle
- ✅ Phase 1+2+3 UX polish — haptics, spring sheets, skeleton loaders, iOS swipe-back, filter chips, blur-up images, read receipts, mini player drag
- ✅ PWA polish — haptics.ts, safeExit.ts, PullToRefreshIndicator, useSwipeBack

**Current prod commit:** `7ad858d` | **Deployment:** `dpl_2Y9f1hr17X2VZ3adZ9DF1hbTUnRU` | **State:** READY ✅

### What still needs doing:

**Blocked on Phil:**
- ❌ VITE_SUPABASE_ANON_KEY not yet set as GitHub repo secret (e2e-smoke CI runs but Supabase calls fail)
- ❌ Stripe Connect redirect (one-line uncomment in PayoutManager.jsx when Stripe is live)
- ❌ Brand visibility toggles — flip `visible: true` in `src/config/brands.ts` for: hung, high, hungmess

**Next engineering priorities (in order):**
1. **AI feature stubs** — 13 components have `console.warn('[TODO] LLM endpoint needed')`. Wire to Claude API or strip entirely.
2. **Read receipts server-side** — markRead() partially writes to localStorage. DB trigger on chat_threads.unread_count exists but full sync incomplete.
3. **VaultMode scope** — VaultMode.tsx exists but no defined content. Phil to define: tickets, orders, archive?
4. **PWA push notifications** — VAPID keys set, notify-push Edge Function deployed, SW registered, but service worker `push` event handler not yet wired to display notifications in browser.
5. **Supabase storage `uploads` bucket** — doesn't exist yet; file upload features will fail until created in prod (rfoftonnlwudilafhfkl).

---

## 🔍 PLATFORM AUDIT — USER JOURNEY STATUS (2026-03-25 session 6)

| User Type | Status | Remaining gaps |
|-----------|--------|----------------|
| New user (first arrival) | ✅ | 8-step onboarding → "What now?" action picker → profile on grid immediately |
| Ghosted social user | ✅ | Grid (ghost-filtered), taps, boos, chat, video call, filters all wired |
| Seller | ⚠️ | ✅ List, view, earnings. ❌ Preloved payment = no Stripe (arrange via chat) |
| Buyer | ⚠️ | ✅ Shopify checkout real. ❌ Preloved = order record only |
| Radio listener | ✅ | Stream live, mini player, show cards, Full Schedule |
| Music listener | ✅ | /music tab, artist pages, inline HTML5 audio, release grid |
| Event organiser | ✅ | Create event → beacons |
| Event attendee | ✅ | RSVP → ticket in Vault → QR |
| Invite referral | ✅ | ?invite=CODE → stored in localStorage → written to profiles.referral_code on signup |
| Telegram entry | ⚠️ | ✅ Bot server-side + TelegramPanel rewrite. ❌ ?tg_token= URL handling basic |
| Safety user | ✅ | SOS, fake call, emergency contacts, live location, push, /care wellbeing page |
| Persona user | ✅ | Create up to 5 personas, switch via long-press More tab or ProfileMode avatar |

### Navigation structure (current):
```
Bottom nav (6 tabs): Home | Pulse | Ghosted | Market | Music | More
More page: Safety → /safety
            Care → /care
            My Profile → /profile
            Personas → /profile?action=manage-personas
            Vault → /more/vault
            Settings → /more/settings
            Help → /help
```

### Brand visibility (`src/config/brands.ts`)
| Brand | Status | Action |
|-------|--------|--------|
| hotmess | ✅ live | — |
| hotmessRadio | ✅ live | — |
| raw | ✅ live | — |
| messmarket | ✅ live | — |
| hung | ❌ hidden | Phil: 1-line `visible: true` |
| high | ❌ hidden | Phil: 1-line `visible: true` |
| superhung / superraw | ✅ config | No Shopify products yet |
| hungmess | ❌ hidden | Phil: 1-line `visible: true` |
| rawConvictRecords / smashDaddys / hnhMess | ✅ config | Confirm Shopify collections |

---

## DB STATE SNAPSHOT (dev/staging: klsywpvncqqglhnhrjbh)

Key tables with data:
```
profiles:           23 rows
beacons:             0 rows (VIEW over events with metadata)
products:            8 rows
community_posts:     8 rows
chat_threads:        3 rows
messages:            4 rows
right_now_status:    9 rows
preloved_listings:   5 rows
label_artists:       7 rows
label_releases:     16 rows
tracks:              6 rows
app_banners:        29 rows
shows:               5 rows (radio)
djs:                 2 rows
taps:                1 row
personas:            0 rows (table exists, persona system wired)
trusted_contacts:    0 rows (onboarding captures them)
badges:              9 rows
venues:              7 rows
cities:             13 rows
```

Production (rfoftonnlwudilafhfkl): same schema, access restricted. Edge functions hosted on axxwdjmbwkvqhcpwters.

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
                                       └─ PersonaProvider
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

### 6-Mode OS structure + More hub

| Route | Mode | Status |
|-------|------|--------|
| `/` | Home — 12-section feed | ✅ Active |
| `/pulse` | Pulse — globe + events + beacon FAB | ✅ Active |
| `/ghosted` | Ghosted — 3-col proximity grid (ghost-filtered) | ✅ Active |
| `/market` | Market — Shopify headless + preloved | ✅ Active |
| `/music` | Music — label releases, artists, tracks | ✅ Active |
| `/more` | More — hub to Safety, Care, Profile, Personas, Vault, Settings, Help | ✅ Active |
| `/profile` | Profile — persona switcher, edit, settings | ✅ Active (accessed via More) |
| `/radio` | Radio — full-screen player (mini player persists above nav) | ✅ Active |
| `/safety` | Safety — SOS, check-ins, trusted contacts, live location | ✅ Active (accessed via More) |
| `/care` | Care — Hand N Hand wellbeing (aftercare, crisis resources, breathing) | ✅ Active (accessed via More) |

Mode components are lazy-loaded. Route-to-mode mapping is in `src/App.jsx`.

### Boot state machine (`BootGuardContext`)

```
LOADING → UNAUTHENTICATED    → /auth
        → NEEDS_AGE          → AgeGate
        → NEEDS_ONBOARDING   → OnboardingGate (7 steps + "What now?" step 8)
        → NEEDS_COMMUNITY_GATE
        → READY
```

Onboarding steps: 1-Age → 2-Terms → 3-Permissions → 4-Profile+PIN → 5-Vibe(age/position/looking_for) → 6-Photo → 7-Community attestation → 8-"What now?" action picker (Go Live / Explore / Set Up Safety)

`localStorage` key `hm_age_confirmed_v1` can bypass age/onboarding gates even if DB sync fails.

### Sheet system

Open sheets with `openSheet(type, props)` from `useSheet()`. Stack is LIFO — back button pops top sheet before navigating. Active sheet syncs to `?sheet=<type>` URL param for deep-linking.

**Gated sheets** (`chat`, `video`, `travel`) only open from `/ghosted` or when a `profile` sheet is already in the stack. Other callers get a toast and are blocked. See `src/lib/sheetPolicy.ts`.

New sheets: register the type in `src/lib/sheetSystem.ts` first, then add the component (named `L2[Name]Sheet.jsx`) and wire it into `src/components/sheets/SheetRouter.jsx`.

### Persona system

`personas` table stores up to 5 profiles per user (types: MAIN, TRAVEL, WEEKEND, custom). Each persona is a full independent profile. `switch_persona(persona_id)` RPC swaps the active persona. `PersonaContext` tracks it globally.

Entry points:
- Long-press avatar in ProfileMode → PersonaSwitcherSheet
- Long-press More tab in OSBottomNav → PersonaSwitcherSheet
- More page → Personas item → /profile?action=manage-personas
- "Add persona" button in switcher → openSheet('create-persona')

### Data layer — ALL SUPABASE (base44 eliminated)

As of session 6, **every data call** in the app goes directly to Supabase. The old `base44Client.js` shim file still exists but has **zero imports**. Safe to delete.

```js
// The only import pattern in the codebase:
import { supabase } from '@/components/utils/supabaseClient';

// Auth
const { data: { user } } = await supabase.auth.getUser();
const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

// Reads
const { data, error } = await supabase.from('table').select('*').eq('field', value);

// Writes
const { data, error } = await supabase.from('table').insert(payload).select().single();
const { data, error } = await supabase.from('table').update(payload).eq('id', id).select().single();
const { error } = await supabase.from('table').delete().eq('id', id);
```

**Stubbed integrations (need real implementation):**
- `InvokeLLM` → 13 call sites now `console.warn('[TODO] LLM endpoint needed')`
- `UploadFile` → 18 call sites point to `supabase.storage.from('uploads').upload()` but bucket doesn't exist yet
- `SendEmail` → 2 call sites now `fetch('/api/email/send', ...)`

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
11. Your Profile      — completion % progress card (wired to useProfileCompletion)
12. Safety Strip      — SOS reminder
```

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
| Import from `@/components/utils/supabaseClient` | Import from `@/api/base44Client` (DEAD — zero consumers) |
| Gate chat/video/travel sheets with `canOpenSheet()` | Open chat/video/travel sheets without policy check |
| Write to `right_now_status` **TABLE** | Write to `profiles.right_now_status` JSONB (column does not exist) |
| Return `null` from `UnifiedGlobe` on non-`/pulse` routes | Render the globe outside `/pulse` |
| Use `SOSContext.triggerSOS()` for SOS activation | Bypass the SOS context |
| Keep sheets at z-100/z-150, interrupts at z-180+ | Mix interrupt z-indices with sheet z-indices |
| Keep XP DB columns intact | Add any XP/gamification UI |
| Use `owner_id` and `starts_at`/`ends_at` on beacons | Use `user_id`, `start_time`, `end_time` (don't exist) |
| Keep brand channel content isolated in queries | Let AI auto-merge RAW/HUNG/HIGH/RADIO/LABEL content |
| Use intent colours (`#FF5500`, `#00C2E0`, `#A899D8`) for RN rings only | Use intent colours as CTA buttons |
| Filter ghost profiles in /api/profiles.js | Show @hotmess.app / @hotmess.test / demo / admin / e2e accounts on grid |

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
- **base44Client.js still exists** as a file but has ZERO imports — safe to delete
- **InvokeLLM stubs**: 13 components have `console.warn('[TODO] LLM endpoint needed')` — these are non-functional AI features

---

## Known issues

- `right_now_status` split-brain: some older code writes to `profiles.right_now_status` JSONB — fix any occurrence by writing to the `right_now_status` TABLE instead
- `20260214010000` migration has `IF EXISTS IF EXISTS` syntax error (low priority cosmetic)
- `profile_overrides` RLS uses wrong FK (medium severity, not yet fixed)
- Realtime subscriptions multiply on Vite hot-reload (dev-only, not a production issue)
- Supabase storage bucket 'uploads' does not exist — file upload features will fail until bucket is created
- Node.js deprecation warning DEP0169 on /api/profiles endpoint (cosmetic, no impact)

---

## Key Files Reference

### Contexts
```
src/contexts/BootGuardContext.jsx    - Auth state machine
src/contexts/SheetContext.jsx        - Sheet management
src/contexts/SOSContext.tsx          - SOS global state
src/contexts/PersonaContext.jsx      - Multi-persona (CRUD + switch_persona RPC)
src/contexts/RadioContext.jsx        - Radio player
src/contexts/LocationContext.jsx     - Geolocation
```

### Modes (6 nav tabs + sub-routes)
```
src/modes/HomeMode.tsx       - Home feed (12-section)
src/modes/PulseMode.tsx      - Globe + events
src/modes/GhostedMode.tsx    - Proximity grid (ghost-filtered)
src/modes/MarketMode.tsx     - Commerce
src/modes/ProfileMode.tsx    - Settings hub + persona switcher
src/modes/RadioMode.tsx      - Full player
src/modes/VaultMode.tsx      - Tickets + orders (scope TBD)
src/modes/OSBottomNav.tsx    - 6-tab nav (Home/Pulse/Ghosted/Market/Music/More)
```

### Pages (accessed via More hub)
```
src/pages/MorePage.tsx           - Hub: Safety, Care, Profile, Personas, Vault, Settings, Help
src/pages/CarePage.tsx           - Hand N Hand wellbeing
src/pages/Safety.jsx             - Safety hub (Supabase-native)
```

### Boot Flow
```
src/pages/Auth.jsx               - Login/signup (luxury noir-gold design)
src/pages/AgeGate.jsx            - Age confirmation
src/pages/OnboardingGate.jsx     - 8-step onboarding (7 gates + "What now?" picker)
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
