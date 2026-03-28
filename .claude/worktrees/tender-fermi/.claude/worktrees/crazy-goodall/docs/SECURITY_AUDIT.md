# HOTMESS — Security Audit
**Generated:** 2026-02-26
**Audited by:** Claude Code autonomous scan

---

## EXECUTIVE SUMMARY

| Category | Status | Issues Found |
|----------|--------|-------------|
| Vercel env vars | ⚠️ Needs cleanup | 5 issues |
| Exposed secrets in code | ✅ Clean | 0 (recent commit removed last exposure) |
| RLS policies | ✅ Solid | 4 holes fixed in 20260226000080 migration |
| API authentication | ✅ Good | Service role only server-side |
| Supabase client | ✅ Good | Anon key only in frontend |
| Git history | ⚠️ Check | Postgres credential was committed (since removed) |

---

## 1. VERCEL ENVIRONMENT VARIABLE ISSUES

### 🔴 ISSUE 1: `CLAUDE_1ST_KEY` in Vercel (All environments)
- **What:** Claude API key stored as a Vercel env var, set 9h ago by an automated agent
- **Risk:** High — API key exposure; deployed to Development, Preview, AND Production
- **Action:** Verify this is used somewhere; if not, remove it. If used, scope to Development only
- **Check:** `grep -r "CLAUDE_1ST_KEY\|CLAUDE_API_KEY" api/ src/`

### 🟠 ISSUE 2: Dead malformed vars from 53 days ago
- `vite_publicSUPABASE_ANON_KEY` — wrong prefix (Vite ignores non-`VITE_` prefixed vars in browser)
- `vite_publicSUPABASE_URL` — same issue
- `vite_publicSUPABASE_PUBLISHABLE_KEY` — same issue
- **Risk:** Low (code has fallbacks; vars are dead weight)
- **Action:** Remove these 3 from Vercel after confirming `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are confirmed working in all environments

### 🟠 ISSUE 3: `VITE_BASE44_APP_BASE_URL` + `VITE_BASE44_APP_ID`
- **What:** Leftover from Base44 platform (prior architecture)
- **Risk:** Low — likely dead; exposes no secrets but adds confusion
- **Action:** Confirm no code references `VITE_BASE44_*`; remove from Vercel
- **Check:** `grep -r "BASE44" src/ api/`

### 🟡 ISSUE 4: Missing `VITE_SUPABASE_ANON_KEY` from Preview + Development environments
- **What:** `VITE_SUPABASE_ANON_KEY` is only set for Production in Vercel (added 3 days ago)
- **Risk:** Medium — preview deployments and local dev via `vercel env pull` may fail Supabase auth
- **Action:** Add `VITE_SUPABASE_ANON_KEY` to Preview and Development environments too
- **Command:** `vercel env add VITE_SUPABASE_ANON_KEY preview` then `vercel env add VITE_SUPABASE_ANON_KEY development`

### 🟡 ISSUE 5: Missing `VITE_GA_MEASUREMENT_ID` and `VITE_MAPBOX_TOKEN`
- `VITE_GA_MEASUREMENT_ID` — not in Vercel; analytics won't fire in production
- `VITE_MAPBOX_TOKEN` — is in Vercel but as Development/Preview/Production. Good.
- **Action:** Add `VITE_GA_MEASUREMENT_ID` if Google Analytics is intended to be live

---

## 2. GIT HISTORY RISK

### 🟠 Committed Postgres credential (resolved)
- **What:** Commit `321e34b` (`security: remove exposed Postgres credential from documentation`) indicates a Postgres URL was committed to a docs file
- **Risk:** The credential is IN git history — anyone with repo access can see it via `git log -p`
- **Action:**
  1. Rotate the `POSTGRES_PASSWORD` and `POSTGRES_URL` in Supabase and Vercel
  2. Optionally rewrite git history with `git filter-repo` to purge the commit (only if repo is private and you control all forks)
- **Note:** Repo is at `SICQR/hotmess-globe` — verify private status

---

## 3. API SECURITY

### ✅ Service role never exposed to frontend
- `SUPABASE_SERVICE_ROLE_KEY` is only used in `api/` serverless functions
- Frontend uses anon key (`VITE_SUPABASE_ANON_KEY`) only

### ✅ Admin routes protected
- `/api/admin/*` uses `_verify.js` middleware
- Safety switch requires secret header

### ✅ Cron routes use secrets
- `EVENT_SCRAPER_CRON_SECRET`, `OUTBOX_CRON_SECRET`, `RATE_LIMIT_CLEANUP_SECRET` all set

### ✅ Stripe webhook uses signing secret
- `STRIPE_WEBHOOK_SECRET` is set — webhook validates signatures

### ⚠️ Telegram bot token exposed risk
- `TELEGRAM_BOT_TOKEN` is in Development, Preview, AND Production
- If Preview deployments are public, Telegram bot token could be read from preview build logs
- **Action:** Consider scoping to Production only if previews are public

---

## 4. RLS POLICY STATUS

From migration `20260226000080_rls_critical_fixes.sql`:
- ✅ 4 RLS holes patched
- ✅ INSERT policies added
- ✅ `user_favorites` RLS secured
- ⚠️ `profile_overrides` RLS uses wrong FK (medium severity, documented in CLAUDE.md Known Issues)

### Tables with RLS confirmed enabled:
- `profiles`, `messages`, `chat_threads`, `taps`, `emergency_contacts`
- `push_subscriptions`, `preloved_listings`, `orders`, `order_items`
- `seller_payouts`, `user_favorites`, `right_now_status`

---

## 5. SECRET INVENTORY

| Secret | Location | Environments | Action Needed |
|--------|---------|-------------|--------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel | All | ⚠️ Rotate (git exposure risk) |
| `POSTGRES_URL` / `POSTGRES_PASSWORD` | Vercel | All | ⚠️ Rotate (git exposure risk) |
| `STRIPE_SECRET_KEY` | Vercel | All | ✅ OK |
| `STRIPE_WEBHOOK_SECRET` | Vercel | All | ✅ OK |
| `TELEGRAM_BOT_TOKEN` | Vercel | All | ✅ Scope to Production |
| `GOOGLE_MAPS_API_KEY` | Vercel | All | ✅ OK (restrict to domain in Google Console) |
| `SHOPIFY_API_STOREFRONT_ACCESS_TOKEN` | Vercel | Prod+Preview | ✅ OK |
| `VAPID_PRIVATE_KEY` | Vercel | Production | ✅ OK |
| `OPENAI_API_KEY` | Vercel | Production | ✅ OK |
| `CLAUDE_1ST_KEY` | Vercel | All | 🔴 Review/remove |
| Figma token | memory/MEMORY.md | Local only | 🔴 Remove from memory file |
| GitHub OAuth token | memory/MEMORY.md | Local only | 🔴 Remove from memory file |
| Claude API key | memory/MEMORY.md | Local only | 🔴 Remove from memory file |

---

## 6. MEMORY FILE SECURITY

**Critical:** `/Users/philipgizzie/.claude/projects/-Users-philipgizzie/memory/MEMORY.md` contains:
- Claude API key (`sk-ant-api03-...`)
- Figma token (`figd_tNuJF-...`)
- GitHub OAuth token (`gho_wVwRm...`)
- Supabase `sb_secret_...` key

These are stored in plain text in a local file. While local-only, this represents poor secret hygiene:
- **Action:** Remove API keys from MEMORY.md, replace with references like `[see .env.local]`
- **Action:** Rotate tokens that are long-lived if possible

---

## 7. RECOMMENDED IMMEDIATE ACTIONS

Priority order:

1. 🔴 **Remove `CLAUDE_1ST_KEY` from Vercel** (or scope to Development)
2. 🔴 **Rotate `POSTGRES_PASSWORD` and `POSTGRES_URL`** (was in git history)
3. 🔴 **Remove secrets from MEMORY.md** (plain text API keys)
4. 🟠 **Remove dead vars from Vercel**: `vite_publicSUPABASE_*` (x3), `VITE_BASE44_*` (x2)
5. 🟡 **Add `VITE_SUPABASE_ANON_KEY` to Preview + Development** in Vercel
6. 🟡 **Restrict Google Maps API key** to `hotmessldn.com` domain in Google Console
7. 🟡 **Verify repo is private** at github.com/SICQR/hotmess-globe
8. 🟡 **Fix `profile_overrides` RLS wrong FK** (medium severity, documented known issue)
