---
name: ship-qa
description: >
  Runs the full HOTMESS quality gate and deployment pipeline: lint, typecheck, build, commit, push,
  Vercel deployment check, and post-deploy smoke testing. Use this skill whenever the task involves
  shipping code, deploying, running the QA cycle, verifying a deployment, checking if prod is healthy,
  or when Phil says "ship it", "push it", "deploy", "go live", "is prod working", "check the deploy",
  "run tests", "verify the build", or any variation. Also use after completing any feature task to
  ensure quality before pushing. The CLAUDE.md says "lint → typecheck → build → commit → push on
  every task" — this skill enforces that.
---

# Ship & QA — HOTMESS Deployment Pipeline

Every change to HOTMESS goes through this pipeline. No exceptions.

## The Pipeline

### Step 1: Quality Gate

Run all three checks. If any fail, fix before continuing.

```bash
cd /path/to/hotmess-globe
npm run lint && npm run typecheck && npm run build
```

What each does:
- `npm run lint` — ESLint (quiet mode). Catches unused imports, type errors, bad patterns.
- `npm run typecheck` — TypeScript check (no emit). Catches type mismatches.
- `npm run build` — Vite production build. Catches import errors, missing deps, bundle issues.

If lint fails: fix the specific errors. Common fixes:
- Unused imports → remove them
- Missing types → add them or use `as any` (last resort)
- React hook deps → add the missing dependency or disable the rule with a comment

If typecheck fails: fix type errors. Don't use `@ts-ignore` unless absolutely necessary.

If build fails: usually a missing import or circular dependency. Check the error message.

### Step 2: Stage Files

Stage specific files — not `git add .` or `git add -A`. This prevents accidentally committing
sensitive files (.env, credentials) or generated artifacts.

```bash
git add src/path/to/changed/file.tsx src/another/file.ts
```

### Step 3: Commit

Use imperative, specific commit messages. Short. No co-author lines unless meaningful.

```bash
git commit -m "feat(ghosted): join profiles to presence for real face photos"
```

Commit message format:
```
type(scope): short description

Types: feat, fix, refactor, style, docs, test, chore
Scope: feature area (ghosted, safety, radio, market, home, auth, etc.)
```

Examples from the codebase:
- `feat(ghosted): boo button + amber ring on cards, red badge in OSBottomNav`
- `fix(read-receipts): fixed RPC call, removed duplicate manual reset`
- `feat(auth): full HOTMESS universe landing page`

### Step 4: Push

```bash
git push origin main
```

Don't ask Phil if you should push. Push.

### Step 5: Verify Deployment

Vercel deploys automatically on push to main. Use Vercel MCP tools:

```
list_deployments — check latest deployment status (should be READY)
get_deployment_build_logs — if deployment failed, read the build logs
get_runtime_logs — check for runtime errors in production
```

Typical deployment takes 60-90 seconds. If it fails:
1. Read build logs to find the error
2. Fix locally
3. Run quality gate again
4. Push the fix

### Step 6: Smoke Test

After successful deployment, verify these on hotmessldn.com:

1. **App loads** — HTTP 200, no blank screen
2. **Auth page renders** — gold theme, "Make a mess" / "I'm already filthy" CTAs
3. **No console errors** — open browser devtools, check console
4. **Feature works** — test the specific feature you just shipped

For specific Phase 0 verifications:
- P0-1: Go to /ghosted → see real photos with names
- P0-2: Go to /safety on mobile → full screen, no sidebar
- P0-3: Go to /pulse → FAB is gold #C8962C, bottom-right
- P0-4: Tap shield icon → lands on /safety
- P0-5: Visit /sos → overlay triggers correctly

## Running Tests

```bash
# Unit tests (Vitest)
npm run test:run          # Single run
npx vitest run src/path/to/file.test.ts  # Single file

# E2E tests (Playwright)
npm run test:e2e          # Headless
npm run test:e2e:headed   # With visible browser

# Specific E2E test
npx playwright test e2e/specific.spec.ts
```

Note: E2E tests that hit Supabase will fail if `VITE_SUPABASE_ANON_KEY` isn't set as a
GitHub secret (known gap — CI runs but Supabase calls fail).

## Edge Function Deployment

If you've changed an edge function:

```bash
# Deploy via Supabase MCP
deploy_edge_function(project_id, function_slug, ...)
```

Or via CLI:
```bash
supabase functions deploy my-function --project-ref axxwdjmbwkvqhcpwters
```

After deploying, check logs:
```
get_logs(project_id, "edge-functions", ...)
```

## Bundle Analysis

If build succeeds but you're worried about bundle size:

```bash
ANALYZE=true npm run build
# Opens dist/stats.html with bundle visualization
```

## Emergency Rollback

If prod is broken after a deploy:

1. Check Vercel dashboard — previous deployment is still available
2. Use Vercel MCP to redeploy the previous successful deployment
3. Fix the issue locally, push a new fix

## Health Check Queries

Use Supabase MCP `execute_sql` to verify data state:

```sql
-- Are users actually using the app?
SELECT COUNT(*) FROM profiles WHERE last_seen_at > NOW() - INTERVAL '24 hours';

-- Safety system health
SELECT COUNT(*) FROM trusted_contacts;
SELECT COUNT(*) FROM safety_checkins WHERE created_at > NOW() - INTERVAL '7 days';

-- Engagement
SELECT COUNT(*) FROM taps WHERE created_at > NOW() - INTERVAL '7 days';
SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '7 days';
```

## What "Done" Means

A task is done when:
1. Quality gate passes (lint + typecheck + build)
2. Code is committed with a specific message
3. Code is pushed to main
4. Vercel deployment succeeds (READY status)
5. Smoke test passes (app loads, feature works)

Report back to Phil with: what you built, the commit hash. Nothing else.

Example:
```
feat(care): build /care page with aftercare resources — a1b2c3d
```
