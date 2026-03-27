# Agent Task: Ship HOTMESS OS to Production

> **Repo:** SICQR/hotmess-globe · **Target domain:** hotmessldn.com  
> **Base branch:** main · **Last updated:** 2026-02-20

---

## 1. Mission Statement & Definition of Done

**Mission:** Deploy HOTMESS at hotmessldn.com as a production-ready, mobile-first OS-style web application ("simple OS") with a single navigation authority, a single overlay authority, a single auth authority, a stable Globe lifecycle, and all E2E tests green.

### ✅ Definition of Done (DoD)

| # | Criterion | How to verify |
|---|-----------|---------------|
| 1 | **One navigation authority** — React Router 6 only (no `window.location` imperative jumps outside Router context) | `grep -r "window\.location" src/ --include="*.jsx" --include="*.tsx"` |
| 2 | **One overlay authority** — all sheets/modals go through `SheetContext` (`src/contexts/SheetContext.jsx`); no rogue `useState` overlay stacks | `grep -r "useState.*open" src/ --include="*.jsx" --include="*.tsx"` |
| 3 | **One auth authority** — `BootGuardContext` (`src/contexts/BootGuardContext.jsx`) is the single source of truth; other listeners are read-only | Review auth listener list below |
| 4 | **Stable Globe lifecycle** — `UnifiedGlobe` mounts once; no console errors on route change | Open DevTools, navigate between pages, confirm no Three.js disposal warnings |
| 5 | **Mobile app shell** — passes Lighthouse Mobile score ≥ 80; no horizontal scroll; bottom dock works | `npx lighthouse https://hotmessldn.com --form-factor=mobile` |
| 6 | **All 17 E2E tests passing** | `npm run test:e2e` |
| 7 | **Production deployed** with no console errors | Open https://hotmessldn.com in Chrome, DevTools → Console → zero red errors |

---

## 2. Week-in-Review Scrape Plan

Use this plan at the start of each agent session to get up to speed on recent changes.

### 2a. Enumerate commits & PRs (last 7 days)

```bash
# All commits on main in the last 7 days
git log --oneline --since="7 days ago" origin/main

# Merged PRs via GitHub CLI
gh pr list --state merged --base main --json number,title,mergedAt,author \
  | jq '.[] | select(.mergedAt > (now - 604800 | todate))'
```

Via GitHub MCP tools:
- `list_workflow_runs` → filter `status: completed`, last 7 days
- `list_commits` owner=SICQR repo=hotmess-globe, `perPage: 100`

### 2b. Identify doc changes

```bash
git diff --name-only HEAD~14 HEAD -- 'docs/*.md' '*.md'
```

Key doc locations:
- `docs/HOTMESS-LONDON-OS-BIBLE-v1.5.md` — canonical navigation authority
- `docs/HOTMESS-LONDON-OS-BIBLE++-v1.6.md` — v1.6 extensions
- `docs/AUTH_AUTHORITY.md` — auth listener ownership
- `docs/OVERLAY_AUTHORITY.md` — sheet/modal ownership
- `docs/DEPLOYMENT.md` — Vercel deployment notes
- `docs/ROUTING_COLLISION_REPORT.md` — routing conflict history
- `OS_RUNTIME_GUIDE.md` (root) — OS runtime decisions

### 2c. Extract architectural decisions from diffs

```bash
# Diffs for key architectural files only
git diff HEAD~14 HEAD -- \
  src/App.jsx \
  src/main.jsx \
  src/Layout.jsx \
  src/contexts/BootGuardContext.jsx \
  src/contexts/SheetContext.jsx \
  src/modes/index.ts \
  vercel.json \
  src/pages.config.js
```

Review output for:
- New/removed routes in `src/App.jsx`
- Provider order changes in `src/main.jsx`
- Sheet registration changes in `src/contexts/SheetContext.jsx`
- Auth state machine changes in `src/contexts/BootGuardContext.jsx`
- Cache-control or rewrite rule changes in `vercel.json`

---

## 3. Key Code Areas Map

### 3a. OS Modes — `src/modes/`

| File | What to look for |
|------|-----------------|
| `src/modes/OSShell.tsx` | Top-level shell; check that only one shell instance is mounted |
| `src/modes/OSBottomNav.tsx` | Bottom dock tab order matches Bible v1.5 (HOME · PULSE · EVENTS · MARKET · SOCIAL · MUSIC · MORE) |
| `src/modes/PulseMode.tsx` | Globe mount/unmount lifecycle; Three.js ref management |
| `src/modes/GhostedMode.tsx` | Unauthenticated view; should not mount protected contexts |
| `src/modes/MarketMode.tsx` | ShopCart context dependency |
| `src/modes/RadioMode.tsx` | RadioProvider dependency; persistent player state |
| `src/modes/ProfileMode.tsx` | Auth guard; Supabase profile query |
| `src/modes/index.ts` | Export barrel; no business logic |

### 3b. App entry & routing — `src/App.jsx`

- React Router 6 `<BrowserRouter>` → `<Routes>` hierarchy
- Verify "Bible" routes (`/events`, `/market`, `/pulse`, `/social`, `/music`) exist alongside backward-compatible `/${PageName}` routes
- `src/pages.config.js` — page registry; every route must have a matching entry
- No `<Redirect>` or `navigate()` calls outside Router tree

### 3c. Overlay authority — `src/contexts/SheetContext.jsx`

- All sheets registered here via `?sheet=` URL param sync
- Check: no component opens a full-screen panel without going through this context
- Confirm `SheetProvider` is inside `Layout.jsx` (correct) — it remounts on route change by design
- Related: `docs/OVERLAY_AUTHORITY.md`

### 3d. Navigation/routing setup

- `src/App.jsx` — route definitions
- `src/routes/` — route helpers/guards (if present)
- `src/Layout.jsx` — shell layout wrapping all routes
- `vercel.json` → `routes` array: SPA fallback rule `^/(?!assets/|data/).*` → `/index.html` (line 52)
- No hardcoded `/data/` serving (excluded from SPA fallback by design)

### 3e. Auth authority — `src/contexts/BootGuardContext.jsx` & Supabase client

**Auth listeners (known, 6 files — monitor for multiplication):**

| File | Role |
|------|------|
| `src/contexts/BootGuardContext.jsx` | **Owner** — drives boot state machine |
| `src/lib/AuthContext.jsx` | Read-only consumer |
| `src/components/utils/supabaseClient.jsx` | Supabase singleton; `onAuthStateChange` for session refresh only |
| `src/lib/bootGuard.ts` | Utility functions for boot guard |
| `src/core/viewerState.ts` | Viewer identity cache |
| `src/contexts/NowSignalContext.jsx` | Realtime signal; read-only auth consumption |

**Boot state machine:**
```
LOADING → UNAUTHENTICATED → PublicShell
        → NEEDS_AGE → AgeGate  (bypass: localStorage hm_age_confirmed_v1)
        → NEEDS_ONBOARDING → OnboardingGate
        → READY → Full app
```

Check: no component bypasses the LOADING→READY gate.

### 3f. E2E tests — `e2e/`

| File | Coverage |
|------|----------|
| `e2e/smoke.a.geolocation-allowed.spec.ts` | Globe loads with geolocation |
| `e2e/smoke.b.geolocation-denied.spec.ts` | Globe loads without geolocation |
| `e2e/smoke.c.auth-social-connect.spec.ts` | OAuth social connect flow |
| `e2e/comprehensive-auth-test.spec.ts` | Full auth flow |
| `e2e/stabilization.spec.ts` | Provider stability / no remount |
| `e2e/overlay-authority.spec.ts` | Sheet authority compliance |
| `e2e/events.spec.ts` | Events page CRUD |
| `e2e/marketplace.spec.ts` | Market page |
| `e2e/messaging.spec.ts` | Social/messaging |
| `e2e/music.spec.ts` | Radio/music page |
| `e2e/profile.spec.ts` | Profile page |
| `e2e/safety.spec.ts` | SOS / check-in safety features |

Run: `npm run test:e2e`  
Config: `playwright.config.ts`

### 3g. Vercel config — `vercel.json`

Key rules to verify:
- `/assets/(.*)` → `Cache-Control: public, max-age=31536000, immutable`
- Security headers on `/(.*)`
- `/api/(.*)` → Vercel Functions (`api/**/*`, maxDuration 10 s, 1024 MB)
- SPA fallback: `^/(?!assets/|data/).*` → `/index.html` (excludes `/data/`)
- Cron jobs: events cleanup, notification dispatch

### 3h. Architecture docs

| Path | Purpose |
|------|---------|
| `docs/HOTMESS-LONDON-OS-BIBLE-v1.5.md` | **Canonical** navigation & naming decisions |
| `docs/HOTMESS-LONDON-OS-BIBLE++-v1.6.md` | v1.6 extensions |
| `docs/PLATFORM-OVERVIEW.md` | High-level platform overview |
| `docs/AUTH_AUTHORITY.md` | Auth listener ownership register |
| `docs/OVERLAY_AUTHORITY.md` | Sheet/modal authority |
| `docs/MOBILE_APP_SHELL.md` | Mobile shell spec |
| `docs/DEPLOYMENT.md` | Vercel deployment guide |
| `docs/ROUTING_COLLISION_REPORT.md` | Past routing conflicts |
| `docs/COMPONENT_TREE.md` | Component hierarchy |
| `README.md` | Project overview and build status |
| `OS_RUNTIME_GUIDE.md` | Runtime architecture decisions |

---

## 4. Blockers First Runbook

### 4a. Blocker 1 — Vercel CDN Cache (14-day stale build)

**Symptom:** hotmessldn.com serves old JS/CSS bundles even after new code is pushed.

**Fix:**
1. Log in to https://vercel.com/dashboard
2. Select the `hotmess-globe` project
3. Go to **Deployments** → find the latest deployment
4. Click **⋮ (More)** → **Redeploy** → check **"Clear build cache"**
5. Wait for deployment to complete (green checkmark)

**Verify:**
```bash
# Check the X-Vercel-Cache response header — must NOT be HIT
curl -I https://hotmessldn.com | grep -i "x-vercel-cache"
# Expected: X-Vercel-Cache: MISS  (or STALE only once, then MISS)
```

### 4b. Blocker 2 — Google OAuth Redirect URI Mismatch

**Symptom:** "redirect_uri_mismatch" error when signing in with Google.

**Fix:**
1. Open https://console.cloud.google.com
2. Select the HOTMESS project → **APIs & Services** → **Credentials**
3. Find the OAuth 2.0 Client ID used for this app
4. Under **Authorised redirect URIs**, add:
   ```
   https://rfoftonnlwudilafhfkl.supabase.co/auth/v1/callback
   ```
5. Click **Save**

**Verify:**
1. Open https://hotmessldn.com in an incognito window
2. Tap **Sign in with Google**
3. Complete the OAuth flow — should redirect back to the app without error
4. Confirm user is logged in (profile icon appears in top HUD)

### 4c. Post-fix Smoke Test Checklist

After resolving both blockers, run this checklist **on mobile (Chrome DevTools → iPhone 12 Pro)**:

- [ ] Page loads at https://hotmessldn.com — no blank screen
- [ ] Globe renders (3D sphere visible)
- [ ] Bottom dock shows 7 tabs: HOME · PULSE · EVENTS · MARKET · SOCIAL · MUSIC · MORE
- [ ] Navigating between tabs does not reload the page
- [ ] Age gate appears for first-time visitor
- [ ] Sign in with Google completes without redirect error
- [ ] Sign in with Email/magic link sends email
- [ ] Profile page loads after auth
- [ ] No red errors in DevTools Console
- [ ] No `window.__THREE__` dispose warnings in Console
- [ ] Network tab: no 404s for `/assets/` files

---

## 5. Step-by-Step Verification Plan

### 5a. Local Dev Verification

```bash
# 1. Install dependencies
npm ci

# 2. Set up local env (copy from .env.example, fill in Supabase keys)
cp .env.example .env.local
# Edit .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Start dev server
npm run dev
# → http://localhost:5173

# 4. Manual checks
# - Open in Chrome mobile emulation (iPhone 12 Pro)
# - Verify Globe renders
# - Verify bottom dock tabs
# - Verify auth flow (email magic link)

# 5. Lint + typecheck + build
npm run lint && npm run typecheck && npm run build
```

### 5b. CI Checks

CI runs on every push via GitHub Actions:

```bash
# Check latest workflow run status
gh run list --branch main --limit 5

# View failed job logs
gh run view <run-id> --log-failed
```

Via GitHub MCP: `list_workflow_runs` → `get_job_logs` for any failed jobs.

Expected CI steps (`.github/workflows/`):
- Lint (`npm run lint`)
- Typecheck (`npm run typecheck`)
- Build (`npm run build`)
- Unit tests (`npm run test:run`)
- E2E tests (`npm run test:e2e`)

### 5c. E2E Execution

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run with browser visible (debug)
npm run test:e2e:headed

# Run a single spec
npx playwright test e2e/smoke.a.geolocation-allowed.spec.ts

# View HTML report
npx playwright show-report
```

All 17 tests in `e2e/` must pass. If any fail:
1. Check `playwright-report/` for screenshots and traces
2. Focus on `stabilization.spec.ts` and `overlay-authority.spec.ts` first (architecture regressions surface here)

### 5d. Production Smoke Tests (Mobile-First)

After each production deployment:

1. **Hard refresh** https://hotmessldn.com (Cmd+Shift+R / Ctrl+Shift+R)
2. Open **Chrome DevTools → Network** → confirm assets load from new build hash (not stale)
3. **Lighthouse** (DevTools → Lighthouse → Mobile):
   - Performance ≥ 70
   - Accessibility ≥ 85
   - Best Practices ≥ 90
4. **Console** → zero red errors
5. Run the [Post-fix Smoke Test Checklist](#4c-post-fix-smoke-test-checklist) above
6. Verify Supabase Realtime (globe beacons update without page reload)

---

## 6. Final Synthesis Template

Use this template to write a weekly synthesis after running the scrape plan.

```markdown
## Week-in-Review Synthesis — [DATE]

### What changed this week
- [ PR #N: title ] — summary of impact
- [ Commit abc123: message ] — summary
- Doc changes: ...

### Current Architecture Diagram

main.jsx
└─ Sentry.ErrorBoundary
   └─ ErrorBoundary
      └─ OSProvider
         └─ App.jsx
            └─ I18nProvider
               └─ AuthProvider
                  └─ BootGuardProvider (LOADING→READY state machine)
                     └─ QueryClientProvider
                        └─ WorldPulseProvider
                           └─ ShopCartProvider
                              └─ BrowserRouter
                                 └─ BootRouter (gates on boot state)
                                    └─ Layout.jsx
                                       └─ SheetContext (L2 sheets, ?sheet= URL sync)
                                       └─ RadioProvider
                                          └─ <Routes> (src/App.jsx)
                                             └─ OSShell → OSBottomNav + mode pages

Overlay layers:
  L0 z-0   UnifiedGlobe (Three.js, persistent, never remounts)
  L1 z-50  HUD (TopHUD, BottomDock/OSBottomNav)
  L2 z-80  Sheets (SheetContext, URL-synced via ?sheet=)
  L3 z-100 Interrupts (SOS modal, AgeGate, OnboardingGate)

### Risks / Unknowns
- [ List any regressions, unresolved conflicts, or unclear ownership ]

### Next 3 Priorities
1. [ Highest impact / most blocking ]
2. [ Second priority ]
3. [ Third priority ]
```

---

## Appendix: Quick Command Reference

```bash
# Dev
npm run dev                  # Vite dev server :5173
npm run build                # Production build → dist/
npm run preview              # Preview production build

# Quality
npm run lint                 # ESLint (quiet)
npm run typecheck            # tsc --noEmit
npm run test:run             # Vitest (unit, no watch)
npm run test:e2e             # Playwright E2E

# Seed
npm run seed:mock-profiles   # Populate local DB with mock profiles

# Single test
npx vitest run src/path/to/file.test.ts
npx playwright test e2e/smoke.a.geolocation-allowed.spec.ts
```

---

*This document is the executable agent task for shipping HOTMESS OS. Update the [Week-in-Review Synthesis](#6-final-synthesis-template) each session and tick off DoD criteria as they pass.*
