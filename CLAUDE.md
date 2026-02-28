# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
| L0 | 0 | `UnifiedGlobe` — **persistent on ALL routes**: full 3D `GlobePage` on `/pulse`, lightweight 2D `AmbientGlobe` canvas elsewhere |
| L1 | 50 | `OSBottomNav`, `RadioMiniPlayer` |
| L2 | 100 | Content sheets (`SheetRouter`) |
| L3 | 150 | Higher sheets: persona switcher, filters |
| Interrupts | 180–200 | `IncomingCallBanner` (180), `SOSButton` (190), `SOSOverlay` (200), `PinLockOverlay` (above all) |

### 5-Mode OS structure

| Route | Mode |
|-------|------|
| `/` | Home — globe hero + feed |
| `/pulse` | Pulse — globe + events + beacon FAB |
| `/ghosted` | Ghosted — 3-col proximity grid |
| `/market` | Market — Shopify headless + preloved |
| `/profile` | Profile — persona switcher, settings |
| `/radio` | Radio (no nav tab; mini player persists above nav on all other routes) |

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

## Rules

**Require approval before:**
- Changing root provider mount order
- Moving `SheetProvider` or `RadioProvider` in the tree
- Adding/removing Supabase `onAuthStateChange` listeners
- Modifying Supabase client instantiation
- Renaming routes or deleting files
- Rewriting navigation architecture

**Validation gate:** Always run `npm run lint && npm run typecheck && npm run build` before marking any change done.

## BRAND CHANNEL RULES — NEVER BREAK THESE

Each brand/channel is sovereign. They share an OS but they do NOT merge unless a human (Phil) makes that editorial decision.

**The channels:**
- `HOTMESS` — the social OS and platform
- `RAW` — clothing sub-brand (bold basics)
- `HUNG` — clothing sub-brand (statement pieces)
- `HIGH` — clothing sub-brand (elevated essentials)
- `SUPERHUNG` / `SUPERRAW` — ultra-limited drops
- `HUNGMESS` — editorial fashion line
- `RAW CONVICT RECORDS` — the record label
- `HOTMESS RADIO` — broadcast (Wake The Mess, Dial A Daddy, Hand N Hand)
- `SMASH DADDYS` — in-house music production
- `HNH MESS` — lube brand

**Rules:**
- **NEVER** let AI auto-cross-promote between brands (e.g. don't show RAW products in a HUNG event context)
- **NEVER** merge label artists into the social/community feed algorithmically
- **NEVER** let scene scout, wingman, or matchmaker blend channel content without an explicit `channel` tag match
- **Cross-brand moments** (e.g. RAW × ANAL collab) are **human editorial decisions only** — created via admin, never generated by AI
- Each brand has its own Shopify product tags, its own beacon types, its own content category — **keep them separated in queries**
- AI features may only surface content **within** the channel the user is currently in, or content explicitly tagged for cross-promotion by an admin

**Internal only exception:** Admin dashboard, analytics, and ops tools may aggregate across all channels for reporting purposes.

## DO / DON'T

| DO | DON'T |
|----|-------|
| Use `#C8962C` gold for all CTAs and accents | Use pink (`#FF1493`) anywhere |
| Gate chat/video/travel sheets with `canOpenSheet()` | Open chat/video/travel sheets without policy check |
| Write to `right_now_status` **TABLE** | Write to `profiles.right_now_status` JSONB (column does not exist — split-brain bug) |
| Render `AmbientGlobe` (2D canvas) on non-`/pulse` routes, full `GlobePage` on `/pulse` | Remove the globe from any route — it's the persistent OS backbone |
| Use `SOSContext.triggerSOS()` for SOS activation | Bypass the SOS context |
| Keep sheets at z-100/z-150, interrupts at z-180+ | Mix interrupt z-indices with sheet z-indices |
| Keep XP DB columns intact | Add any XP/gamification UI |
| Use `owner_id` and `starts_at`/`ends_at` on beacons | Use `user_id`, `start_time`, `end_time` (don't exist) |
| Keep brand channel content isolated in queries | Let AI auto-merge RAW/HUNG/HIGH/RADIO/LABEL content |
| Cross-brand collabs via admin editorial only | Auto-generate cross-brand promotions algorithmically |

## Key constants & gotchas

- Brand primary: `#C8962C` (antique gold)
- Card bg: `#1C1C1E`, nav bg: `#0D0D0D`, OS root bg: `#050507`
- Text muted: `#8E8E93` — dark theme only, no light mode
- XP system: DB columns kept, **UI display fully removed**
- `beacons` is a **VIEW** — `ALTER TABLE` will fail; `title`/`description`/`address`/`image_url` are stored in `metadata` JSONB
- **Safety features** in `src/components/safety/` and `src/components/sos/` are safety-critical and must not regress

## Known issues

- `right_now_status` split-brain: some older code writes to `profiles.right_now_status` JSONB — fix any occurrence found by writing to the `right_now_status` TABLE instead
- `20260214010000` migration has `IF EXISTS IF EXISTS` syntax error (low priority cosmetic)
- `profile_overrides` RLS uses wrong FK (medium severity, not yet fixed)
- Realtime subscriptions multiply on Vite hot-reload (dev-only, not a production issue)
