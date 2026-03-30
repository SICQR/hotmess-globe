# HOTMESS Globe — Copilot Instructions

You are operating on a **live Supabase-backed SPA/PWA**. Follow **Explore → Plan → Execute → Test**.

## Critical Rules

1. **Do not refactor until `/docs/ARCHITECTURE_TRUTH_REPORT.md` is complete.**
2. **Do not log or expose secrets.** Never print env values. Audit only.
3. **Stabilization edits must be file-by-file.** After each file change:
   - Explain why
   - Confirm no provider remount risk introduced
   - Confirm no auth regression risk introduced
   - Confirm no realtime listener multiplication
   - Update `/docs/STABILIZATION_EXECUTION_PLAN.md`
4. **Run validation:** `npm run lint && npm run typecheck && npm run build`
5. **Add/Run Playwright E2E** for critical flows before marking done.
6. **If work is interrupted** (sleep/network): resume from latest commit + docs, do not guess.

## Architecture Overview

- **Framework:** Vite + React 18 + React Router 6 SPA
- **Backend:** Supabase (auth, realtime, Postgres)
- **Deployment:** Vercel
- **UI:** Tailwind CSS + Radix UI primitives + Framer Motion

### Provider Mount Order (from `main.jsx`)

```
Sentry.ErrorBoundary
└─ ErrorBoundary
   └─ OSProvider (OS-grade runtime)
      └─ App
         └─ I18nProvider
            └─ AuthProvider (auth state)
               └─ BootGuardProvider (boot state machine)
                  └─ QueryClientProvider (TanStack Query)
                     └─ WorldPulseProvider
                        └─ ShopCartProvider
                           └─ Router (BrowserRouter)
                              └─ BootRouter (gates: age/onboarding)
                                 └─ OSArchitecture
                                    └─ UnifiedGlobe (persistent L0)
                                    └─ AuthenticatedApp (routes)
```

**Key Insight:** `SheetProvider` and `RadioProvider` are mounted **inside Layout**, not at the root. This means sheets remount on route changes in current architecture.

### Navigation Authority

- **Primary:** React Router (`react-router-dom@6.30`)
- **Secondary:** `SheetContext` for L2 sheets (URL-synced via `?sheet=` param)
- **Risk Areas:** Multiple `window.location.href =` assignments found in Layout.jsx and page components (gating redirects)

### Overlay System (L0-L3 Layers)

| Layer | Z-Index | Purpose | Mount Location |
|-------|---------|---------|----------------|
| L0 | Z-0 | UnifiedGlobe (Three.js) | App.jsx (never unmounts) |
| L1 | Z-50 | HUD/Navigation (TopHUD, BottomDock) | Layout.jsx |
| L2 | Z-80 | Sheets (slide-up content) | SheetRouter in Layout.jsx |
| L3 | Z-100 | Interrupts (SOS, modals) | Various (not unified) |

### Supabase Integration

- **Client Singleton:** `/src/components/utils/supabaseClient.jsx`
- **Auth Listeners:** Found in 6 files (potential multiplication risk):
  - `BootGuardContext.jsx`
  - `NowSignalContext.jsx`
  - `viewerState.ts`
  - `bootGuard.ts`
  - `Auth.jsx`
  - `supabaseClient.jsx`
- **Service Key:** Never in frontend bundle (confirmed via env var naming)

### Boot State Machine

```
LOADING → UNAUTHENTICATED (valid, public shell)
        → NEEDS_AGE → AgeGate
        → NEEDS_ONBOARDING → OnboardingGate
        → READY → Full app
```

**Bypass:** localStorage `hm_age_confirmed_v1` can bypass gates even if DB sync fails.

## Commands

```bash
# Development
npm run dev              # Start Vite dev server
npm run dev:lan          # Dev server accessible on LAN

# Quality
npm run lint             # ESLint (quiet mode)
npm run typecheck        # TypeScript check
npm run build            # Production build

# Testing
npm run test             # Vitest watch mode
npm run test:run         # Single test run
npm run test:e2e         # Playwright E2E
npm run test:e2e:headed  # E2E with browser visible

# Single test file
npx vitest run src/path/to/file.test.ts
npx playwright test e2e/specific.spec.ts
```

## Safety Features (DO NOT REGRESS)

Located in `/src/components/safety/`:
- `SafetyFAB.jsx` — Floating action button for quick access
- `PanicButton.jsx` — SOS activation
- `FakeCallGenerator.jsx` — Fake incoming call
- `SafetyCheckinModal.jsx` — Timed check-in
- `LiveLocationShare.jsx` — Share location with trusted contacts

## Import Conventions

```javascript
// Path aliases (from vite.config.js)
import X from '@/components/...'  // src/components
import X from '@/lib/...'         // src/lib
import X from '@/contexts/...'    // src/contexts
import X from '@/hooks/...'       // src/hooks
import X from '@/pages/...'       // src/pages
import X from '@/os'              // src/os
```

## Approval Required Before

- Changing root provider mount order
- Moving overlay provider roots / SheetProvider across trees
- Consolidating/removing auth listeners
- Modifying Supabase client instantiation patterns
- Major rewrite of navigation architecture
- Deleting files / renaming routes

## Session Reliability

- After each meaningful step, commit to the stabilization branch
- Maintain `/docs/RUNLOG.md` with timestamps and status
- Keep changes small and incremental
