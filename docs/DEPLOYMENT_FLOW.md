# HOTMESS Globe — Deployment Flow

**Status:** proposed governance (2026-05-23). Not enforced until the access-control steps in `PHIL_ACTIONS.md` are applied by the repo owner.

## Why this exists

On 2026-05-23, ~50 doc commits hit `main` in ~65 minutes and each triggered a production build, because `main` auto-promotes to `hotmessldn.com`. A cron crash also went unnoticed for 12 days. This flow stops both: no direct pushes to `main`, no production deploy without a deliberate promotion, and no build at all for docs-only changes.

## The flow

```
feature branch
   → push                → Vercel preview deploy (preview URL on every push)
   → open PR to main      → review on the preview URL (readable on iPhone)
   → CI green + approval   → merge to main      (NO production change)
   → merge main → production (deliberate)        → production deploys to hotmessldn.com
```

- **`main`** = integration branch. Gets preview deploys. Never auto-promotes to production.
- **`production`** = the only branch wired to `hotmessldn.com`. Updated only by merging `main` → `production`.
- **Docs-only commits** (`docs/**` only) skip the build entirely (`ignoreCommand` in `vercel.json`).
- **Every branch** gets a preview URL.

## Hard rules

1. No agent (ChatGPT, Claude Code, Cowork) commits to `main` directly. PR only.
2. No production deploy without an explicit `main` → `production` merge.
3. Docs-only commits do not deploy.
4. Every code commit gets a preview URL before any production move.

## Enforcement layers (see `PHIL_ACTIONS.md` for setup — owner action)

- **Vercel:** production branch = `production` (not `main`); `ignoreCommand` skips docs-only builds; previews stay on for all branches.
- **GitHub:** branch protection on `main` and `production` (require PR, require status checks, enforce for admins, no force-push/deletion, linear history).

## Known caveats (verified 2026-05-23)

- `SICQR/hotmess-globe` is a **user-owned** repo, not an org repo. GitHub branch `restrictions` (named push-allowlists / service-account-only) are **org-only** and cannot be set here. The equivalent is `enforce_admins: true` + require-PR (blocks direct pushes even by the owner).
- **"Require 1 approval" can deadlock a solo owner** — GitHub won't let a PR author approve their own PR, and CodeRabbit comments are not "approvals." Either add a second reviewer (a second account or a GitHub App that can approve) or rely on require-PR + status checks + preview review without the hard approval gate.
- Vercel **crons run only on the production deployment** — after switching the production branch to `production`, confirm the 12 crons in `vercel.json` still fire against it.
