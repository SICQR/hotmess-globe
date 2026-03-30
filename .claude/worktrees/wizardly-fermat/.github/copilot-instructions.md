# Copilot instructions (hotmess-globe)

> **Stability-first:** This is a live Supabase-backed SPA/PWA. Follow **Explore → Plan → Execute → Test**.

## Commands

```bash
# Development
npm run dev              # Vite dev server (:5173)
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

# Single file tests
npx vitest run src/path/to/file.test.ts
npx playwright test e2e/specific.spec.ts
```

## Critical Rules

1. **Do not refactor blindly.** Understand the provider mount order before changes.
2. **Do not log or expose secrets.** Never print env values. Audit usage safely.
3. **Stabilization edits must be file-by-file.** After each change, verify no provider remount risk, no auth regression, no realtime listener multiplication.
4. **Run validation:** `npm run lint && npm run typecheck && npm run build`
5. **Safety features must not regress:** SOS, fake call, check-in, location share in `/src/components/safety/`

## Big picture

- Vite + React 18 SPA with Supabase backend. Canonical navigation in [docs/HOTMESS-LONDON-OS-BIBLE-v1.5.md](../docs/HOTMESS-LONDON-OS-BIBLE-v1.5.md).
- Routing is React Router 6 in [src/App.jsx](../src/App.jsx): "Bible" routes (e.g. `/events`, `/market`) plus backward-compatible `/${PageName}` routes.
- Pages registered in [src/pages.config.js](../src/pages.config.js).
- Backend is Vercel Serverless Functions in `api/`.
- `functions/` is deprecated; use `api/*` instead.

## Provider Mount Order

Understanding this is critical for stability:

```
main.jsx
└─ Sentry.ErrorBoundary
   └─ ErrorBoundary
      └─ OSProvider
         └─ App.jsx
            └─ I18nProvider
               └─ AuthProvider
                  └─ BootGuardProvider (state machine: LOADING→READY)
                     └─ QueryClientProvider
                        └─ WorldPulseProvider
                           └─ ShopCartProvider
                              └─ Router (BrowserRouter)
                                 └─ BootRouter (gates)
                                    └─ Layout.jsx
                                       └─ SheetProvider (L2 sheets)
                                       └─ RadioProvider
```

**Key insight:** SheetProvider is inside Layout, so sheets may remount on route changes.

## Overlay Architecture (L0-L3)

| Layer | Z-Index | Purpose |
|-------|---------|---------|
| L0 | 0 | UnifiedGlobe (Three.js — **only renders on `/pulse`**, null elsewhere) |
| L1 | 50 | OSBottomNav, RadioMiniPlayer |
| L2 | 80-100 | Sheets (SheetRouter, URL-synced via `?sheet=`) |
| L3 | 140-150 | Higher sheets: persona switcher, filters |
| Interrupts | 180-200 | SOS, modals, PinLockOverlay (above all) |

## 5-Mode OS Structure

| Route | Mode |
|-------|------|
| `/` | Home — globe hero + feed |
| `/pulse` | Pulse — globe + events + beacon FAB |
| `/ghosted` | Ghosted — 3-col proximity grid |
| `/market` | Market — Shopify headless + preloved |
| `/profile` | Profile — persona switcher, settings |
| `/radio` | Radio (no nav tab; mini player persists above nav) |

## Boot State Machine

```
LOADING → UNAUTHENTICATED → PublicShell
        → NEEDS_AGE → AgeGate (bypass: localStorage hm_age_confirmed_v1)
        → NEEDS_ONBOARDING → OnboardingGate
        → READY → Full app
```

## Env + secrets

- Never commit secrets (`.env.local` is gitignored).
- Client-exposed env vars must be prefixed `VITE_`; server-only must NOT be `VITE_`.
- Server routes need: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## Supabase + auth conventions

- Client singleton: [src/components/utils/supabaseClient.jsx](../src/components/utils/supabaseClient.jsx)
- **Auth listeners exist in 6 files** (potential multiplication risk):
  - `BootGuardContext.jsx`, `NowSignalContext.jsx`, `viewerState.ts`, `bootGuard.ts`, `Auth.jsx`, `supabaseClient.jsx`
- Frontend auth: [src/lib/AuthContext.jsx](../src/lib/AuthContext.jsx)
- For authenticated API calls, send Supabase access token as Bearer token.

## Serverless handler patterns (`api/*`)

- Shared helpers: `json()`, `getEnv()`, `getBearerToken()`, `readJsonBody()` from [api/shopify/_utils.js](../api/shopify/_utils.js)
- Supabase server clients from [api/routing/_utils.js](../api/routing/_utils.js)

## Logging

- Use structured logger: [src/utils/logger.js](../src/utils/logger.js)
- Avoid noisy `console.*` in client code.

## Imports + UI

- Path alias `@` maps to `src/`.
- UI is Tailwind + shadcn/Radix; reuse `src/components/ui/*`.

## Sheet System

Open sheets with `openSheet(type, props)` from `useSheet()`. Stack is LIFO — back button pops top sheet before navigating. Active sheet syncs to `?sheet=<type>` URL param for deep-linking.

**Gated sheets** (`chat`, `video`, `travel`) only open from `/ghosted` or when a `profile` sheet is already in the stack. See `src/lib/sheetPolicy.ts`.

New sheets: register in `src/lib/sheetSystem.ts` → add `L2[Name]Sheet.jsx` → wire into `SheetRouter.jsx`.

## Approval Required Before

- Changing root provider mount order
- Moving SheetProvider across trees
- Consolidating/removing auth listeners
- Modifying Supabase client instantiation
- Major navigation architecture rewrites
- Deleting files / renaming routes

## DO / DON'T

| DO | DON'T |
|----|-------|
| Use `#C8962C` gold for all CTAs and accents | Use pink (`#FF1493`) anywhere |
| Gate chat/video/travel sheets with `canOpenSheet()` | Open chat/video/travel without policy check |
| Write to `right_now_status` **TABLE** | Write to `profiles.right_now_status` JSONB (doesn't exist) |
| Return `null` from `UnifiedGlobe` on non-`/pulse` routes | Render the globe outside `/pulse` |
| Use `SOSContext.triggerSOS()` for SOS activation | Bypass the SOS context |
| Use `owner_id` and `starts_at`/`ends_at` on beacons | Use `user_id`, `start_time`, `end_time` (don't exist) |

## Key Constants

- Brand primary: `#C8962C` (antique gold)
- Card bg: `#1C1C1E`, nav bg: `#0D0D0D`, OS root bg: `#050507`
- Text muted: `#8E8E93` — dark theme only, no light mode

## Known Gotchas

- `beacons` is a **VIEW** — `ALTER TABLE` will fail; use `metadata` JSONB for title/description/address/image_url
- Auth listeners exist in 6 files — do not add more without auditing for listener multiplication
- XP system: DB columns kept, **UI display fully removed**
- `right_now_status` split-brain: fix any code writing to `profiles.right_now_status` — use the TABLE instead
