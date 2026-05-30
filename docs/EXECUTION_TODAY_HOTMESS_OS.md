# EXECUTION TODAY — Ship hotmessldn.com 🏴

> **Mission:** Ship **hotmessldn.com** as a production-ready, mobile-first OS-style webapp — today.
> This is a runbook/checklist for end-to-end execution by an agent or engineer.

---

## 🚨 Immediate Blockers

These must be resolved **first** before any testing or smoke-test pass can succeed.

### Blocker 1 — Vercel Cache / Stale Deploy

**Symptom:** Production URL serves old build or returns 404 on SPA routes.

**Steps:**
1. Log in to [Vercel Dashboard](https://vercel.com/dashboard) → select **hotmess-globe** project.
2. Navigate to **Deployments** tab.
3. Locate the latest deployment → click the `⋯` menu → **Redeploy** (choose "without cache").
4. Wait for build to complete (watch build logs for errors).
5. **Evidence to capture:** screenshot of green deployment status + production URL loading.

**CLI alternative (requires Vercel CLI):**
```bash
npx vercel --prod --force
```

**Verify:**
```bash
# SPA route check — should return index.html (200), not 404
curl -I https://hotmessldn.com/events
curl -I https://hotmessldn.com/market
# Auth callback check
curl -I https://hotmessldn.com/auth/callback
```

---

### Blocker 2 — Google OAuth Redirect URI

**Symptom:** Google sign-in fails with `redirect_uri_mismatch` error.

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Open the OAuth 2.0 Client ID for HOTMESS.
3. Under **Authorized Redirect URIs**, confirm this entry exists:
   ```
   https://<your-supabase-project>.supabase.co/auth/v1/callback
   ```
4. Under **Authorized JavaScript Origins**, confirm all of:
   ```
   https://hotmessldn.com
   https://hotmess.london
   https://<your-project>.vercel.app
   ```
5. Click **Save** and wait ~5 min for propagation.
6. **Evidence to capture:** screenshot of the Google OAuth credentials page showing correct URIs saved.

**Supabase side (cross-check):**
1. Go to [Supabase Dashboard](https://app.supabase.com/) → project → **Authentication** → **Providers** → **Google**.
2. Verify Client ID and Secret match Google Console values.
3. Check that `Site URL` is set to `https://hotmessldn.com`.
4. Under **Redirect URLs**, add:
   ```
   https://hotmessldn.com/**
   https://hotmess.london/**
   ```

---

## ⏱️ Today Plan (Timeboxed)

### Block 0 — Pre-flight (15 min)

```bash
cd /path/to/hotmess-globe

# Verify local env
grep -E "VITE_SUPABASE|VITE_MAPBOX" .env.local

# Install deps (if needed)
npm install

# Quick lint + type check
npm run lint && npm run typecheck
```

Expected: zero errors. If lint/typecheck fails, fix before proceeding.

---

### Block 1 — Unblock Deploy + Auth (60 min)

- [ ] **Execute Blocker 1** (Vercel cache clear redeploy) — see above.
- [ ] **Execute Blocker 2** (Google OAuth redirect URI) — see above.
- [ ] Confirm Supabase `Site URL` = `https://hotmessldn.com`.
- [ ] Manual smoke: open `https://hotmessldn.com` in mobile Chrome → does globe render?
- [ ] Manual smoke: attempt Google sign-in → does auth complete without `redirect_uri_mismatch`?
- [ ] Capture screenshots as evidence.

---

### Block 2 — Local Build + Unit Tests (30 min)

```bash
# Full local build (catches bundler errors)
npm run build

# Unit tests
npm run test:run

# Combined CI gate (lint + typecheck + unit + e2e)
npm run test:ci
```

Expected: `npm run build` exits 0, unit tests pass.

---

### Block 3 — E2E Tests (30 min)

```bash
# Run all Playwright e2e tests
npm run test:e2e

# Or run headed (visual) for manual review
npm run test:e2e:headed

# Auth-specific smoke (social connect)
npm run test:e2e:auth

# Specific file
npx playwright test e2e/smoke.a.geolocation-allowed.spec.ts
npx playwright test e2e/smoke.c.auth-social-connect.spec.ts
```

Key E2E specs to pass today:

| Spec | What it verifies |
|------|-----------------|
| `smoke.a.geolocation-allowed.spec.ts` | Globe loads, geolocation granted |
| `smoke.b.geolocation-denied.spec.ts` | Globe loads, geolocation blocked gracefully |
| `smoke.c.auth-social-connect.spec.ts` | Google/social auth flow |
| `safety.spec.ts` | SOS, fake call, check-in, location share |
| `overlay-authority.spec.ts` | L2 sheet overlay behaviour |

---

### Block 4 — Production Smoke Tests (20 min)

After Vercel redeploy is confirmed:

```bash
# Integration tests (requires prod env)
npm run test:integrations
```

Manual checklist on `https://hotmessldn.com`:

- [ ] Globe renders on mobile (Chrome iOS + Android)
- [ ] Age gate appears for first visit
- [ ] Google sign-in completes end-to-end
- [ ] `/events` route loads event listings
- [ ] `/market` route loads marketplace
- [ ] Safety FAB visible; panic button tappable
- [ ] Radio player persists across route changes
- [ ] Bottom dock navigation works on mobile

---

## 🔍 CI Triage Checklist

### 1. Find failing workflows

GitHub Actions: `https://github.com/SICQR/hotmess-globe/actions`

Workflows to monitor:
| Workflow | File | Trigger |
|----------|------|---------|
| CI Pipeline | `.github/workflows/ci.yml` | push / PR |
| Deploy (Vercel) | `.github/workflows/deploy-vercel.yml` | push to main |
| Security Checks | `.github/workflows/security.yml` | push / schedule |

### 2. Gather failure logs

Using GitHub CLI:
```bash
# List recent CI runs
gh run list --workflow=ci.yml --limit=5

# View a specific run's logs
gh run view <run-id> --log-failed

# Download artifact logs
gh run download <run-id>
```

Using GitHub UI:
1. Click the failing workflow run.
2. Expand the failing job → click failed step to see logs.
3. Search for `Error`, `FAIL`, `TypeError`, or `Cannot find module`.

### 3. Common failure patterns

| Error pattern | Likely cause | Fix |
|---------------|-------------|-----|
| `Cannot find module` | Missing import / bad path alias | Check `@` alias resolves to `src/` in `vite.config.js` |
| `Type error` | TypeScript mismatch | Run `npm run typecheck` locally, fix types |
| `ESLint: ...` | Lint rule violation | Run `npm run lint:fix` |
| `playwright: browserType.launch` | Playwright browser not installed | Run `npx playwright install --with-deps` |
| Vercel build `ENOENT` | Missing env var in Vercel dashboard | Add env var in Vercel project settings |
| Supabase `invalid JWT` | Mismatched anon key | Cross-check `VITE_SUPABASE_ANON_KEY` in Vercel env |

---

## 🗂️ Key Code Paths

### App Shell & Router
```
src/App.jsx                          # Root router (100+ routes, React Router 6)
src/Layout.jsx                       # Shell: HUD, nav, player, safety layers
src/pages.config.js                  # Page registry (canonical source)
```

### OS Modes (5-pillar architecture)
```
src/modes/OSShell.tsx                # Top-level OS shell component
src/modes/GhostedMode.tsx            # Ghosted/anonymous mode
src/modes/PulseMode.tsx              # "Right Now" social pulse
src/modes/RadioMode.tsx              # Radio / audio mode
src/modes/MarketMode.tsx             # Marketplace mode
src/modes/ProfileMode.tsx            # Profile / identity mode
src/modes/OSBottomNav.tsx            # Bottom dock navigation
src/modes/index.ts                   # Mode exports
```

### Overlay Authority (L0–L3)
```
src/Layout.jsx                       # L1 HUD mount point
src/components/ui/Sheet*             # L2 sheet primitives (Radix UI)
src/contexts/SheetContext*           # Sheet URL-sync (?sheet=)
docs/OVERLAY_AUTHORITY.md            # Overlay spec
```

### BootGuard / Auth State Machine
```
src/contexts/BootGuardContext.jsx    # State machine: LOADING→READY
src/lib/AuthContext.jsx              # Supabase auth + session state
src/components/boot/BootRouter.jsx   # Gates: AgeGate, Onboarding, UNAUTHENTICATED
```

### Supabase Client
```
src/components/utils/supabaseClient.jsx   # Singleton client (import from here)
api/routing/_utils.js                     # Server-side Supabase client (API routes)
api/shopify/_utils.js                     # Shared API helpers: json(), getEnv()
```

### Safety Features (must not regress)
```
src/components/safety/SafetyFAB.jsx          # Floating action button
src/components/safety/PanicButton.jsx        # SOS panic button
src/components/safety/SafetyCheckinModal.jsx # Check-in timer
src/components/safety/FakeCallGenerator.jsx  # Fake call overlay
src/components/safety/LiveLocationShare.jsx  # Location sharing
```

### Vercel Routing Config
```
vercel.json                          # Routes, headers, cron jobs, build config
```

### E2E Tests (Playwright)
```
e2e/smoke.a.geolocation-allowed.spec.ts
e2e/smoke.b.geolocation-denied.spec.ts
e2e/smoke.c.auth-social-connect.spec.ts
e2e/safety.spec.ts
e2e/overlay-authority.spec.ts
e2e/messaging.spec.ts
e2e/events.spec.ts
e2e/marketplace.spec.ts
e2e/profile.spec.ts
playwright.config.ts                 # Playwright configuration
```

---

## ✅ Definition of Done

All of the following must be true before calling production "shipped":

### Deploy
- [ ] Vercel deployment status: **green** (no error)
- [ ] `https://hotmessldn.com` returns HTTP 200
- [ ] SPA routes (`/events`, `/market`, `/profile`) return HTTP 200 (not 404)
- [ ] No stale cache serving old builds (check build timestamp in Vercel)

### Auth
- [ ] Google OAuth sign-in completes without `redirect_uri_mismatch`
- [ ] Magic link / email sign-in works
- [ ] Supabase session is stored and user is redirected post-auth
- [ ] Auth callback URL (`/auth/callback`) is reachable

### Core UX (Mobile-First)
- [ ] Globe renders on mobile viewport (375px)
- [ ] Age gate fires on first visit and can be dismissed
- [ ] Bottom dock navigation is tap-accessible (≥44px touch targets)
- [ ] Radio player persists between route changes
- [ ] Sheet overlays open/close without full-page remount

### Safety (non-negotiable)
- [ ] Safety FAB renders on all authenticated pages
- [ ] Panic button triggers emergency overlay (no JS error)
- [ ] Check-in timer modal opens and saves
- [ ] Fake call overlay appears

### Tests
- [ ] `npm run lint` exits 0
- [ ] `npm run typecheck` exits 0
- [ ] `npm run test:run` all unit tests pass
- [ ] `npm run test:e2e` all Playwright specs pass (or known flaky ones documented)

---

## 🚦 Go / No-Go Decision Gate

Before declaring prod ship:

| Gate | Criteria | Status |
|------|----------|--------|
| **Deploy** | Vercel green, hotmessldn.com 200 | ⬜ |
| **Auth** | Google OAuth end-to-end works | ⬜ |
| **Globe** | Renders on mobile, no crash | ⬜ |
| **Safety** | All 4 safety features functional | ⬜ |
| **CI** | `npm run test:ci` exits 0 | ⬜ |
| **E2E smoke** | Smoke specs a, b, c pass | ⬜ |

**GO** = all gates ✅  
**NO-GO** = any gate ❌ → fix blocker, re-run gate

---

## 📎 Appendix — Week in Review

| Area | Done this week | Outstanding |
|------|---------------|-------------|
| Auth | Google OAuth wired, Telegram login active | Redirect URI needs prod domain added |
| Overlay | Sheet L2 architecture documented | Sheets remount on route change (Layout-scoped) |
| Safety | All 5 safety components exist | Emergency mode overlay (red theme) not yet built |
| Commerce | Shopify + P2P marketplace working | Cart clears on refresh (localStorage rehydration pending) |
| Navigation | OSBottomNav + OSShell in `src/modes/` | Tonight mode toggle not wired to Layout |
| CI | CI Pipeline + deploy-vercel.yml active | Check Actions tab for latest run status |

---

## 🔗 Related Docs

| Doc | Purpose |
|-----|---------|
| [HOTMESS-LONDON-OS-BIBLE-v1.5.md](./HOTMESS-LONDON-OS-BIBLE-v1.5.md) | Canonical navigation & architecture spec |
| [OAUTH_SETUP.md](./OAUTH_SETUP.md) | Google + Telegram OAuth configuration |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Vercel deployment reference |
| [OVERLAY_AUTHORITY.md](./OVERLAY_AUTHORITY.md) | L0–L3 overlay layer spec |
| [QA_FIRST_NIGHT.md](./QA_FIRST_NIGHT.md) | First night QA checklist |
| [CI_CD_SETUP.md](./CI_CD_SETUP.md) | CI/CD pipeline documentation |
