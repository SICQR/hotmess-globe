# CLAUDE.md

This file provides guidance when working with code in this repository.

**Last updated:** 2026-03-25 (session 6)
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
- Supabase project (production): `axxwdjmbwkvqhcpwters` (supabase-purple-queen, East US)
- Supabase project (dev/staging): `klsywpvncqqglhnhrjbh` (HOTMESS BASE44, ap-northeast-1)
- Repo: `SICQR/hotmess-globe`, live at `hotmessldn.com`
- Vercel project: `prj_xdS5EoLRDpGhj4GOIbtSLSrCmvJO`, team: `team_ctjjRDRV1EpYKYaO9wQSwRyv`
- You have write access. Use it.

---

## 🔴 PICK UP HERE (Last session: 2026-03-25 session 6)

### What shipped this session (2026-03-25):

**Product plan execution (P0–P6):**
- ✅ Ghost profiles filtered from Ghosted grid — api/profiles.js filters @hotmess.app, @hotmess.test, demo, admin, e2e
- ✅ Honest empty state on Ghosted grid when <1 real user — invite card with Web Share API
- ✅ SOS button added to Ghosted header + Pulse Shield icon → /safety
- ✅ SOSButton visibility improved (brighter idle state) + first-load tooltip
- ✅ Safety.jsx fully migrated from base44 → Supabase + SOS/Fake Call buttons added
- ✅ Email templates rebranded pink → gold (api/email/templates.js + send-email Edge Function)
- ✅ Post-onboarding "What now?" screen added (step 8 after community attestation)
- ✅ Invite deep link handler — `?invite=CODE` URL param capture + referral_code storage on signup
- ✅ Profile tab → More tab in bottom nav (MorePage hub: Safety, Care, Profile, Personas, Vault, Settings, Help)
- ✅ /care route — Hand N Hand wellbeing page (aftercare tips, crisis resources, breathing exercise)
- ✅ Personas WIRED — More page entry point + long-press More tab opens PersonaSwitcherSheet

**base44 → Supabase migration (COMPLETE):**
- ✅ Auth layer: 84 files migrated (base44.auth.me/isAuthenticated/logout/updateMe → supabase.auth.*)
- ✅ Entity reads: filter/list/get across 23 core user-facing files → supabase.from().select()
- ✅ Entity writes: create/update/delete migrated alongside reads
- ✅ Remaining 115+ files: all base44.entities.* calls replaced with direct Supabase queries
- ✅ Final 15 files cleaned up — integrations stubbed (InvokeLLM → TODO, UploadFile → supabase.storage)
- ✅ **ZERO base44 imports remain** — `grep -rl "from.*base44Client" src/` returns only base44Client.js itself
- ✅ 3 files still mention "base44" in comments only (GhostedMode.tsx, supabaseClient.jsx, SellerProfileView.jsx)

**Commits (unpushed — need `cd ~/hotmess-globe && git push origin main`):**
- `f583a35` refactor: migrate base44.auth.* → supabase.auth across 80+ files
- `b6fc6c4` docs: update JSDoc comment referencing migrated base44.auth.me()
- `aa34442` refactor: migrate base44 entity reads → supabase.from().select() in core user components
- `7ac23a9` refactor: migrate base44.entities → supabase queries across 14 files
- `040e7e9` refactor: fix test mocks for cartStorage migration
- `e281060` refactor: complete base44 → supabase migration — remove base44 dependency
- `f882c4d` refactor: final base44 cleanup — last 15 files migrated

**Already pushed + deployed to hotmessldn.com (dpl_8gxZRcxV96JxaRwsRnZr1LfSttJb):**
- `1576578` feat(ghosted): filter ghost profiles + honest empty state + SOS button
- `6b0a78e` migrate(Safety): base44 → Supabase + SOS/Fake Call buttons
- `1c78416` fix(pulse): amber beacon FAB + navigate Shield to /safety, improve SOSButton visibility
- `e82cc53` style(email): rebrand templates from pink to gold
- `277cd1d` feat(onboarding): post-onboarding 'What now?' action picker
- `d631d32` feat(invite): deep link handler + referral capture on onboarding
- `e2d3dac` feat(personas): wire persona entry points — More page item + long-press More tab

### What still needs doing:

**IMMEDIATE — push base44 migration:**
```bash
cd ~/hotmess-globe && git push origin main
```
This deploys 7 commits (162 files changed, 1408+/1496-) completing the full base44 removal.

**Blocked on Phil:**
- ❌ VITE_SUPABASE_ANON_KEY not yet set as GitHub repo secret (e2e-smoke CI runs but Supabase calls fail)
- ❌ Stripe Connect redirect (one-line uncomment in PayoutManager.jsx when Stripe is live)
- ❌ Brand visibility toggles — flip `visible: true` in `src/config/brands.ts` for: hung, high, hungmess

**Next engineering priorities (in order):**
1. **Delete `src/api/base44Client.js`** — the shim file itself. Now that zero files import it, safe to remove.
2. **AI feature stubs** — InvokeLLM calls were replaced with `console.warn('[TODO]')`. Decide: remove AI features entirely, or wire to a real Claude/OpenAI endpoint.
3. **UploadFile migration** — 18 call sites stubbed with supabase.storage. Need to create 'uploads' bucket in Supabase and test the upload flow end-to-end.
4. **Read receipts server-side** — markRead() partially writes to localStorage. DB trigger on chat_threads.unread_count exists but full sync incomplete.
5. **VaultMode scope** — VaultMode.tsx exists but no defined content. Phil to define: tickets, orders, archive?
6. **PWA push notifications** — VAPID keys set, notify-push Edge Function deployed, but service worker handler not wired to display notifications in browser.

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

Production (axxwdjmbwkvqhcpwters): same schema, access restricted.

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
