# Copilot instructions (hotmess-globe)

> **Stability-first:** This is a live Supabase-backed SPA/PWA. Follow **Explore → Plan → Execute → Test**.

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
| L0 | 0 | UnifiedGlobe (Three.js, persistent) |
| L1 | 50 | HUD (TopHUD, BottomDock) |
| L2 | 80 | Sheets (SheetRouter, URL-synced via `?sheet=`) |
| L3 | 100 | Interrupts (SOS, modals) |

## Boot State Machine

```
LOADING → UNAUTHENTICATED → PublicShell
        → NEEDS_AGE → AgeGate (bypass: localStorage hm_age_confirmed_v1)
        → NEEDS_ONBOARDING → OnboardingGate
        → READY → Full app
```

## Dev workflows

- Dev server: `npm run dev` (Vite on :5173). Preview: `npm run preview`. Seed data: `npm run seed:mock-profiles`.
- Tests: `npm test` / `npm run test:run` / `npm run test:ui` / `npm run test:coverage` (Vitest).
- E2E: `npm run test:e2e` / `npm run test:e2e:headed` (Playwright).
- Lint: `npm run lint` (quiet). Typecheck: `npm run typecheck`.
- Single test: `npx vitest run src/path/to/file.test.ts`

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

## Approval Required Before

- Changing root provider mount order
- Moving SheetProvider across trees
- Consolidating/removing auth listeners
- Modifying Supabase client instantiation
- Major navigation architecture rewrites
- Deleting files / renaming routes
