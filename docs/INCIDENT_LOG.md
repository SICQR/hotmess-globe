# Incident Log — SICQR/hotmess-globe

Running log of production security incidents, credential rotations, and postmortems.
Append new entries at the top (reverse chronological). Keep entries short. Never paste actual secret values, PII, or raw customer data.

Format: one `##` heading per incident, with the fixed subsections below.

---

## 2026-04-17 — Supabase service role JWT + company email password exposed on GitHub

**Severity:** P0
**Detected by:** GitGuardian
**Detected at:** 2026-04-16 19:51 UTC (email password), 2026-04-17 03:51 UTC (Supabase JWT)
**Resolved at:** <PENDING Phil: smoke test after key rotation>
**Duration exposed:** JWT ~3 hours on main (cb2d2dd pushed 2026-04-17 03:44 UTC → now). Passwords ~40 days (first pushed 2026-03-08 via migration `20260308150000_create_e2e_test_users.sql`).
**Resolved by:** Claude Code (Cowork), autonomous execution per brief
**Blast radius:** Production Supabase project `rfoftonnlwudilafhfkl` + two Supabase Auth e2e test accounts

### What leaked
- Supabase service role JWT (commit: `cb2d2dd`, file `.claude/settings.local.json`) — full read/write to production DB, bypasses RLS. Payload decoded: `{ref:"rfoftonnlwudilafhfkl",role:"service_role",iat:1753658810,exp:2069234810}` — 10-year JWT, expires 2035-07-27.
- "Company email password" (commits: `eb11276`, `1a1eaf0`, `87d118d`, `0e3fcb7`, `abc174f`, `8be1352`; files `e2e/helpers/auth.ts`, `e2e/two-user-full.spec.ts`, `e2e/debug-auth*.spec.ts`, `.github/workflows/ci.yml`, `supabase/migrations/20260308150000_create_e2e_test_users.sql`) — two test-user passwords `***REMOVED_PASSWORD***` and `***REMOVED_PASSWORD***` used by Supabase Auth accounts `e2e.alpha@hotmessldn.com` + `e2e.beta@hotmessldn.com`. These are Playwright dedicated accounts, not production-user or inbox credentials.

### How it leaked
- Service role JWT: a curl upload one-liner containing the JWT as a Bearer header was pasted into a `Bash(…)` permission entry in `.claude/settings.local.json`, which was committed.
- E2E passwords: hardcoded in Playwright helper fixtures and in a Supabase migration's `crypt('***REMOVED_PASSWORD***', gen_salt('bf'))` seed for CI test users; reused across several spec files.

### Evidence of exploitation
- Supabase runtime logs (`auth.audit_log_entries` + `postgrest_logs`) checked for anomalous queries / signups / token grants between the `cb2d2dd` push time and rotation — no anomalies observed.
- `auth.users` latest `last_sign_in_at` for `e2e.alpha` / `e2e.beta` is 2026-04-06 14:10-14:11 UTC (expected CI runs); no sign-ins from unknown IPs in the exposure window.
- No customer inbox account (Gmail, Resend SMTP) was actually exposed — see "Decisions made autonomously".

### Rotation actions
- [ ] **PHIL ACTION** — Supabase service role key regenerated via dashboard (project `rfoftonnlwudilafhfkl`, Settings → API → JWT Settings → Generate new JWT secret). *Cannot be automated from this session — Supabase MCP does not expose key rotation.*
- [ ] **PHIL ACTION** — Vercel env vars updated across Production / Preview / Development (project `prj_xdS5EoLRDpGhj4GOIbtSLSrCmvJO`, team `team_ctjjRDRV1EpYKYaO9wQSwRyv`). Vars: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `VITE_SUPABASE_ANON_KEY` (anon rotates in lockstep with legacy service_role). *Cannot be automated — Vercel MCP does not expose env-var CRUD.*
- [ ] **PHIL ACTION** — Latest `main` redeployed after env swap, deployment green
- [x] e2e.alpha + e2e.beta Supabase Auth passwords rotated to fresh random 32-char strings via `UPDATE auth.users SET encrypted_password = crypt(...)`
- [x] All references to old passwords removed from tracked files (`ci.yml` comment, migration `20260308150000_create_e2e_test_users.sql` now reads password from `app.e2e_password` Postgres GUC)
- [x] Git history scrubbed with `git filter-repo --replace-text` — all three secret strings (service role JWT, `***REMOVED_PASSWORD***`, `***REMOVED_PASSWORD***`) replaced with `***REMOVED***`
- [x] Force-pushed to `main` and `claude/remove-exposed-secrets-SDtop`
- [ ] Old refs garbage-collected on GitHub (automatic after push + `--prune` on next GC cycle; can be expedited via `POST /repos/{owner}/{repo}/git/refs` cleanup — not currently needed)

### Hardening added
- [x] `gitleaks` GitHub Action added at `.github/workflows/gitleaks.yml` (runs on every push + PR, fails build on finding). Uses `gitleaks/gitleaks-action@v2`.
- [x] `.gitleaks.toml` config committed (allowlist for `dist_old/`, `dist2/` minified bundles which contain legitimate public anon JWTs).
- [x] `.gitignore` audited — now explicitly covers `.env`, `.env.local`, `.env.production`, `.env.*.local`, `.env.*`, `.claude/settings.local.json`, `.claude/agent-memory/`, `.claude/worktrees/`.
- [x] `.env.example` created (previously missing) — placeholder values only, no real credentials.
- [x] Tracked `.claude/settings.local.json`, `.claude/launch.json`, `.claude/agent-memory/**`, `.claude/skills/**` untracked via `git rm --cached` (gitignore does not untrack already-tracked files).

### Smoke test results
- [ ] Auth flow: sign-in against production — <PENDING Phil — run after key rotation>
- [ ] Age gate: blocks under-18, allows 18+ — <PENDING Phil>
- [ ] Supabase write: one live write operation succeeds — <PENDING Phil>
- [ ] Vercel runtime logs: no new 500s in 10 min post-deploy — <PENDING Phil>

### GitGuardian status
- [ ] **PHIL ACTION** — Alert 1 (Supabase Service Role JWT) — mark resolved at https://dashboard.gitguardian.com/
- [ ] **PHIL ACTION** — Alert 2 (Company Email Password) — mark resolved

### Follow-ups / open items
- Migrate backend from legacy `service_role` JWT to modern `sb_secret_*` key so future rotations don't log out all active users (legacy JWT secret rotation rotates `anon` + `service_role` simultaneously and invalidates every live session).
- Move test-user accounts off `@hotmessldn.com` domain (e.g. `@test.hotmess.test`) so GitGuardian's "Company Email Password" heuristic stops false-positiving on legitimate CI test fixtures.
- Add Sentry/Vercel alert on 5xx spike or `authentication failure` spike post-deploy as an automatic canary.
- Consider migrating to Supabase asymmetric JWT signing keys (new system) — independent key rotation without session invalidation.
- Apple Sign-In secret: separate rotation scheduled Oct 2026, not in scope.

### Decisions made autonomously
- **"Company email password" interpreted as Supabase Auth test-user passwords, not Resend SMTP or Gmail.** Full history scan found zero `re_[A-Za-z0-9]{30,}` (Resend), zero SMTP password literals, zero Gmail app passwords. The only password-shaped strings in history paired with `@hotmessldn.com` emails are `***REMOVED_PASSWORD***` and `***REMOVED_PASSWORD***` on e2e.alpha / e2e.beta Supabase Auth accounts. GitGuardian's heuristic fires on any password literal near an email, hence the "Company Email Password" label. Rotating the Supabase Auth password for both accounts resolves the underlying leak; no third-party inbox credential was actually exposed.
- **Chose JWT-secret rotation path over sb_secret_\* migration** for the immediate fix. The cleaner long-term path is to create a modern `sb_secret_*` key, swap backends to it, then disable the legacy JWT. That's larger work (touches every `/api/*` call and edge function). For a P0 rotation where the leaked key has full-admin scope and is live, dashboard JWT-secret rotation is the single fastest action that invalidates the leaked key. Accept the user-logout consequence.
- **Scrub strategy:** `git filter-repo --replace-text` over `--invert-paths`. Secrets live inside commits carrying legitimate unrelated changes; dropping the commits would lose real work. Replacing the literal secret strings with `***REMOVED***` preserves commit metadata, authorship, and surrounding diffs.
- **e2e migration rewritten to read password from `app.e2e_password` GUC** — keeps CI idempotent without re-introducing a literal. If GUC unset, the insert silently skips (WHERE clause guard).
- **Did NOT attempt to force-disable legacy service role via Management API** — Supabase MCP doesn't expose `PUT /v1/projects/{ref}/api-keys/legacy`, and hitting it directly via curl would require extracting the MCP's internal PAT, which is not available. Dashboard rotation is the path.
- **Did NOT notify third parties.** Per scope boundary — this is hygiene rotation, not a disclosure event. No evidence of exploitation.

---

<!-- append older incidents below -->
