# HOTMESS — Deployment Playbook
**Generated:** 2026-02-26

---

## CURRENT DEPLOYMENT STATE

| Property | Value |
|----------|-------|
| **Live URL** | https://hotmessldn.com + https://hotmess.app |
| **Platform** | Vercel (phils-projects-59e621aa) |
| **Project** | hotmess-globe |
| **Repo** | github.com/SICQR/hotmess-globe |
| **Branch** | main → auto-deploys to production |
| **Build** | `npm run build` (vite build) → `dist/` |
| **Build time** | ~57–60 seconds |
| **Region** | iad1 (US East) |

---

## 1. LOCAL DEV SETUP

```bash
cd ~/hotmess-globe

# Install deps
npm install

# Pull latest Vercel env vars (includes all secrets)
vercel env pull .env.local

# Start dev server (LAN accessible — use for mobile testing)
npm run dev -- --host
# → http://localhost:5173
# → http://192.168.0.102:5173 (LAN)

# Or localhost only
npm run dev
```

**Required env vars for dev** (should be in `.env.local` after `vercel env pull`):
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` — Supabase auth/data
- `VITE_STRIPE_PUBLISHABLE_KEY` — Stripe frontend
- `VITE_TELEGRAM_BOT_USERNAME` — Telegram auth widget
- `VITE_VAPID_PUBLIC_KEY` — Push notifications
- All server-side vars (SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, etc.)

---

## 2. VALIDATION GATE (run before every PR/push)

```bash
cd ~/hotmess-globe

npm run lint        # ESLint (must pass with 0 errors)
npm run typecheck   # TypeScript (must pass with 0 errors)
npm run build       # Vite build (must succeed)
```

All three must pass. Do not push code that fails any of these.

---

## 3. DEPLOY TO PRODUCTION

### Normal deploy (push to main):
```bash
git push origin main
# Vercel auto-deploys in ~60 seconds
# Monitor at: vercel.com or `vercel ls`
```

### Check deployment status:
```bash
vercel ls          # List recent deployments
vercel inspect <deployment-url>  # Inspect specific deployment
```

### Force redeploy (without code change):
```bash
vercel --prod      # Deploy current state to production
```

---

## 4. ENVIRONMENT VARIABLES

### Check what's in Vercel:
```bash
vercel env ls production
vercel env ls preview
vercel env ls development
```

### Add a new env var:
```bash
vercel env add VARIABLE_NAME production
vercel env add VARIABLE_NAME preview
vercel env add VARIABLE_NAME development
```

### Remove a dead env var:
```bash
vercel env rm VARIABLE_NAME production
```

### Pull all vars to local .env.local:
```bash
vercel env pull .env.local
```

---

## 5. PREVIEW DEPLOYMENTS

Every push to a non-main branch creates a Preview deployment automatically.
- Preview URL format: `https://hotmess-globe-<hash>-phils-projects-59e621aa.vercel.app`
- Preview deployments have their own URL but share the same Vercel env vars (except Production-only vars)

**Note:** `VITE_SUPABASE_ANON_KEY` is currently Production-only. Add to Preview env if preview testing needs auth.

---

## 6. ROLLBACK

### Rollback to previous deployment:
```bash
# List deployments to find the target
vercel ls

# Promote a previous deployment to production
vercel alias set <old-deployment-url> hotmessldn.com
vercel alias set <old-deployment-url> hotmess.app
```

### Git rollback:
```bash
# Find the commit to revert to
git log --oneline -10

# Revert to specific commit
git revert <commit-hash>
git push origin main
# This creates a new commit that undoes the change, then auto-deploys
```

---

## 7. DOMAIN ALIASES

Current aliases on production deployment:
- `hotmessldn.com`
- `www.hotmessldn.com`
- `hotmess.app`
- `hotmess-globe-phils-projects-59e621aa.vercel.app` (default Vercel)
- `hotmess-globe-scanme-5613-phils-projects-59e621aa.vercel.app`

---

## 8. API ROUTES

API functions are in `api/**/*.js` and deploy as Vercel serverless functions.
- **Local dev:** Vite plugin (`localApiRoutes()` in vite.config.js) serves them as middleware
- **Production:** Vercel auto-detects and deploys as Lambda functions in iad1 region
- **Max duration:** 10 seconds, 1024MB memory (from vercel.json)

Adding a new API route:
1. Create `api/your-route.js`
2. Add to `localApiRoutes()` in `vite.config.js` for local dev
3. Push to main — Vercel auto-discovers it

---

## 9. CRON JOBS

Configured in `vercel.json`:

| Path | Schedule | Purpose |
|------|---------|---------|
| `/api/events/cron` | `0 3 * * *` (3am daily) | Scrape and import events |
| `/api/notifications/process` | `*/5 * * * *` (every 5 min) | Process notification queue |
| `/api/notifications/dispatch` | `*/5 * * * *` (every 5 min) | Dispatch push notifications |
| `/api/admin/cleanup/rate-limits` | `20 4 * * *` (4:20am daily) | Clean up rate limit records |

Crons require the corresponding `*_CRON_SECRET` env vars to be set.

---

## 10. PWA / SERVICE WORKER

- Service worker: `public/sw.js`
- Manifest: `public/manifest.json`
- On each deploy, bump the service worker version to force cache refresh:
  - In `public/sw.js`, increment `CACHE_VERSION` constant

---

## 11. MONITORING

- **Error tracking:** Sentry (VITE_SENTRY_DSN configured)
- **Deployment health:** `vercel ls` or Vercel dashboard
- **App health:** `https://hotmessldn.com/api/health`
- **Event scraper health:** `https://hotmessldn.com/api/events/diag`

---

## 12. MULTI-AGENT DEPLOYMENT SAFETY

**Problem:** Multiple agents (Copilot, Cursor, Claude Code) pushing to main simultaneously causes conflicting deployments (as seen in Feb 2026 — 10+ deployments in 10 minutes).

**Prevention:**
- Only one agent should be active on main at a time
- Use feature branches for agent work; review before merging
- Set Vercel deployment protection on preview branches if needed
- Check `vercel ls` before starting any deployment

**If bad deployment is live:**
1. Identify last known-good deployment URL from `vercel ls`
2. `vercel alias set <good-url> hotmessldn.com`
3. Then fix the issue on main and redeploy
