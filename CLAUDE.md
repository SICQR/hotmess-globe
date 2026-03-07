# CLAUDE.md

This file provides guidance when working with code in this repository.

**Last updated:** 2026-03-07
**Design system:** `DESIGN_SYSTEM.md` — always read before touching any styling
**Design reference docs:** `~/Downloads/HOTMESS-Design-Reference.html`, `HOTMESS-HomeMode-Design.html`, `HOTMESS-Brand-Palette-v2.html`

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

## Active P1 Tasks (Running Agents)

1. **Radio Polish** — Radio mini player bar refinement
2. **Auth Visual Redesign** — Auth/AgeGate/OnboardingGate visual overhaul
3. **Unread Badge + Photo Sharing** — Badge on Ghosted tab, photo uploads in chat
4. **Persona Switcher** — Long-press avatar → PersonaSwitcherSheet
5. **XP Purge** — Remove all remaining XP references

---

## Pending P1 Tasks (Queued)

| # | Task | Ready? |
|---|------|--------|
| 17 | Filters drawer + Taps/Woofs | ✅ |
| 16 | Incoming call banner + read receipts + typing | ✅ |
| 20 | Full SOS flow polish | ✅ |
| 18 | Beacon creation UI | ✅ |
| 21 | Video call UI | ✅ |
| 22 | Profile views (Who viewed you) | ✅ |
| 23 | PWA push notifications | ⚠️ needs infra design |
| 27 | VaultMode scope definition | ❌ user to define |

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
```
HOTMESS-Design-Reference.html    - Full mode-by-mode design spec (87KB)
HOTMESS-HomeMode-Design.html     - Home screen mockup (implemented ✅)
HOTMESS-Brand-Palette-v2.html    - Full brand colour palette
HOTMESS-Gold-Rebrand-Mockup.html - Gold rebrand reference
HOTMESS-Live-Mockup.html         - Live mockup reference
HOTMESS-MasterBuildPlan.html     - Build plan
HOTMESS_DESIGN_SYSTEM_PROMPT.md  - Reusable audit prompt for Claude sessions
hotmess-os-granular-flows.md     - User flow mapping (E2E test reference)
```

# currentDate
Today's date is 2026-03-07.
