# BRANCH MAP — SICQR/hotmess-globe
> Generated: 2026-02-26 | Local repo: /Users/philipgizzie/hotmess-globe

---

## Summary

| Stat | Count |
|------|-------|
| Local branches | 10 |
| Remote branches (origin) | 50+ |
| Open PRs | 13 |
| Merged PRs | 87+ |
| Closed PRs (no merge) | 15+ |

---

## Primary Branches

### `main` — THE CANONICAL BRANCH

| Field | Value |
|-------|-------|
| Local HEAD | `321e34b` — security: remove exposed Postgres credential from documentation |
| Remote HEAD | `2566fdb` — Fix production SQL bugs: duplicate IF EXISTS clauses and wrong RLS FK in persona tables |
| Local date | 2026-02-25 |
| Remote date | 2026-02-26 |
| Status | **LOCAL IS 1 COMMIT BEHIND** — run `git pull` |

---

## Local Branches (not yet pushed or tracking remote)

| Branch | SHA | Date | Last Commit Message | Notes |
|--------|-----|------|---------------------|-------|
| main | 321e34b | 2026-02-25 | security: remove exposed Postgres credential from documentation | 1 behind origin/main |
| worktree-agent-a447b1e4 | c761426 | 2026-02-23 | docs: Update CURRENT_STATUS.md with comprehensive documentation index | Claude Code worktree |
| worktree-agent-a606ff88 | c761426 | 2026-02-23 | docs: Update CURRENT_STATUS.md with comprehensive documentation index | Claude Code worktree (same SHA as above) |
| hotmess-london-os-master-remap | aaeb868 | 2026-02-15 | deploy: trigger build with account_id fixes | Remap attempt |
| stabilization-phase-3a | aaeb868 | 2026-02-15 | deploy: trigger build with account_id fixes | Same SHA as above |
| stabilization/2026-02-20-phase0 | 1dc7440 | 2026-02-20 | feat: Add mobile dynamic viewport utilities | Tracks origin equivalent |
| cleanup/mvp-build | d620ca4 | 2026-02-02 | feat: Add 8 more rich mock profiles | MVP cleanup branch |
| visual-makeover-cherry-pick | c9e885f | 2026-01-31 | feat: Visual makeover for 10 core pages | Tracks origin equivalent |
| visual-makeover-and-readme | a48ed6a | 2026-01-31 | feat: Additional UI components and new page stubs | Untracked |
| fix | a895fe5 | 2026-02-14 | chore: bump service worker to v5 for fresh cache | Generic fix branch |

---

## Remote Branches — origin (SICQR/hotmess-globe)

### Active / Recently Used

| Branch | SHA | Date | Last Commit | PR # | PR Status |
|--------|-----|------|-------------|------|-----------|
| main | 2566fdb | 2026-02-26 | Fix production SQL bugs... (#134) | — | — |
| figma-make-v2 | 6c52bfa | 2026-02-15 | Add FIGMA-MAKE-V2 Feature Comparison Guide | #113 | **OPEN** |
| production-unified | 61a58aa | 2026-02-15 | Add ChatThread Integration Guide (Phase 1) | #114 | merged |
| stabilization/2026-02-20-phase0 | 1dc7440 | 2026-02-20 | feat: Add mobile dynamic viewport utilities | — | — |
| feat/l2-sheet-architecture | d4d3a7b | 2026-02-09 | fix: Use ONLY VITE_ Supabase vars to avoid integration conflicts | #82 | merged |
| fix/full-integration-polish | f5911d5 | 2026-02-14 | fix: prevent Stripe initialization crash when env var missing | #89 | merged |
| temp/no-gate-test | 12036d2 | 2026-02-08 | temp: Also bypass Layout.jsx age check | #81 | **OPEN** |
| visual-makeover-cherry-pick | c9e885f | 2026-01-31 | feat: Visual makeover for 10 core pages | — | — |
| add-claude-github-actions-1771957405455 | 3300c77 | 2026-02-25 | "Claude Code Review workflow" | #131 | merged |
| add-claude-github-actions-1771957405744 | 3300c77 | 2026-02-25 | "Claude Code Review workflow" | #132 | merged |
| coderabbitai/utg/a8751e5 | 410dc8d | 2026-02-26 | Potential fix for code scanning alert no. 844: Syntax error | #133 | merged |

### Copilot Agent Branches — Open PRs

| Branch | SHA | Date | PR # | PR Title |
|--------|-----|------|------|----------|
| copilot/resolve-merge-conflicts-again | 1ed26e3 | 2026-02-21 | **#129** | Resolve merge conflicts: apply figma-make-v2 z-index standardization |
| copilot/fix-authentication-wiring | 9e047dc | 2026-02-21 | **#127** | Fix password recovery flow, sign-up confirmation handling, and add auth tests |
| copilot/improve-motion-orchestrator | 52c7003 | 2026-02-21 | **#126** | feat: canonical z-index layer system, MotionOrchestrator, SpatialElement interface |
| copilot/resolve-all-issues | 180ea09 | 2026-02-14 | **#107** | Migrate console logging to structured logger |
| copilot/fix-google-login-callback | 9869d0d | 2026-02-14 | **#103** | Fix OAuth callback 404 and add migration verification |
| copilot/fix-user-authentication-issues | 492e929 | 2026-02-14 | **#98** | Fix build errors and add configuration validation tooling |
| copilot/fix-and-merge-pull-requests | 016c60d | 2026-02-14 | **#87** | Resolve merge conflicts for PR #80 (HotMess OS Integration) |
| copilot/update-files-from-figma | 06ffdb6 | 2026-02-11 | **#86** | Add agent handoff documentation suite for production deployment |
| copilot/fix-supabase-connection-issue | acec491 | 2026-02-09 | **#85** | Fix infinite loading when Supabase credentials missing |
| copilot/reduce-pages-to-one-runtime | 5e78958 | 2026-02-09 | **#83** | Fix consent gate loop: sync both age and location from sessionStorage |
| copilot/implement-telegram-auth-handshake | b7900a4 | 2026-02-08 | **#80** | Implement HotMess OS Integration |

### Copilot Agent Branches — Merged PRs

| Branch | Date | PR # | PR Title |
|--------|------|------|----------|
| copilot/resolve-conflicts-in-pr-branches | 2026-02-26 | #135 | Fix duplicate IF EXISTS SQL syntax |
| copilot/sort-all-pull-requests | 2026-02-25 | #134 | Fix production SQL bugs |
| copilot/fix-live-site-issues | 2026-02-21 | #130 | Fix CI security audit failures |
| copilot/resolve-bigger-picture-issues | 2026-02-21 | #128 | Fix unauthenticated admin ops, CORS wildcard |
| copilot/refactor-hotmess-globe-mobile | 2026-02-21 | #125 | feat: real-time geo-social engine |
| copilot/update-secrets-in-vercel-supabase | 2026-02-20 | #124 | Remove committed secrets from repo |
| copilot/ensure-supabase-connection | 2026-02-20 | #123 | [WIP] Ensure app is fully connected to Supabase |
| copilot/create-execution-first-runbook | 2026-02-20 | #122 | docs: add execution-first ship runbook |
| copilot/fix-vercel-cache-and-oauth-redirect | 2026-02-20 | #121 | docs: add AGENT_TASK_HOTMESS_OS.md |
| copilot/draft-stabilization-execution-plan | 2026-02-20 | #120 | docs: Stage 1 OS remap |
| copilot/stabilize-architecture-issues | 2026-02-19 | #119 | [WIP] Identify and document architectural instability |
| copilot/document-architecture-report | 2026-02-19 | #118 | Architectural Truth Report |
| copilot/build-analytics-dashboard | 2026-02-15 | #116 | Verify frontend-developer agent configuration |
| copilot/rebuild-hotmess-os-navigation | 2026-02-15 | #112 | Implement persistent Globe architecture |
| copilot/fix-featured-event-reference | 2026-02-14 | #111 | Fix ReferenceError: featuredEvent is not defined |
| copilot/resolve-conflict-in-pr | 2026-02-14 | #110 | Merge main to sync with PR #109 changes |
| copilot/define-all-features-pages | 2026-02-14 | #109 | Add comprehensive platform manifesto |
| copilot/define-features-for-pages | 2026-02-14 | #108 | Add Features Manifesto page |
| copilot/add-new-feature-implementation | 2026-02-15 | #106 | Add test coverage and documentation for cart localStorage |
| copilot/resolve-merge-conflicts | 2026-02-14 | #102 | Remove duplicate components |
| copilot/fix-ci-pipeline-failures | 2026-02-14 | #101 | Fix CI pipeline and integrate production error tracking |
| copilot/fix-login-issues-codebase-review | 2026-02-14 | #100 | Fix authentication vulnerabilities and harden RLS |
| copilot/fix-authentication-flows | 2026-02-14 | #99 | Fix OAuth callback handling |
| copilot/fix-deployment-issues | 2026-02-14 | #97 | Deployment readiness: fix lint error |
| copilot/formalize-finite-state-machine | 2026-02-13 | #88 | Implement OS-grade runtime with FSM |
| copilot/create-dashboard-user-analytics | 2026-02-13 | #90 | Add custom GitHub Copilot agents |
| copilot/fix-site-opening-issue | 2026-02-09 | #84 | Fix TypeScript compilation errors |

### fix/ Remote Branches (Conflict Resolution Archive)

| Branch | Date | Notes |
|--------|------|-------|
| fix/feat/l2-sheet-architecture | 2026-02-09 | Conflict-resolved copy of feat/l2-sheet-architecture |
| fix/fix/full-integration-polish | 2026-02-14 | Conflict-resolved copy of fix/full-integration-polish |
| fix/globe-fix-base | 2026-02-08 | Base for globe critical audit fixes |
| fix/main | 2026-02-14 | Conflict-resolved copy of main |
| fix/temp/no-gate-test | 2026-02-08 | Conflict-resolved copy of temp/no-gate-test |
| fix/visual-makeover-and-readme | 2026-01-31 | Conflict-resolved copy |
| fix/visual-makeover-cherry-pick | 2026-01-31 | Conflict-resolved copy |

---

## Open PRs — Priority Order

> As of 2026-02-26. All target `main`.

| Priority | PR # | Title | Branch | Age |
|----------|------|-------|--------|-----|
| 1 | **#129** | Resolve merge conflicts: apply figma-make-v2 z-index standardization | copilot/resolve-merge-conflicts-again | 5 days |
| 2 | **#127** | Fix password recovery flow, sign-up confirmation handling, auth tests | copilot/fix-authentication-wiring | 5 days |
| 3 | **#126** | feat: canonical z-index layer system, MotionOrchestrator, SpatialElement | copilot/improve-motion-orchestrator | 5 days |
| 4 | **#113** | Figma make v2 | figma-make-v2 | 11 days |
| 5 | **#107** | Migrate console logging to structured logger | copilot/resolve-all-issues | 12 days |
| 6 | **#103** | Fix OAuth callback 404 and add migration verification | copilot/fix-google-login-callback | 12 days |
| 7 | **#98** | Fix build errors and add configuration validation tooling | copilot/fix-user-authentication-issues | 12 days |
| 8 | **#87** | Resolve merge conflicts for PR #80 (HotMess OS Integration) | copilot/fix-and-merge-pull-requests | 14 days |
| 9 | **#86** | Add agent handoff documentation suite | copilot/update-files-from-figma | 15 days |
| 10 | **#85** | Fix infinite loading when Supabase credentials missing | copilot/fix-supabase-connection-issue | 17 days |
| 11 | **#83** | Fix consent gate loop: sync both age and location from sessionStorage | copilot/reduce-pages-to-one-runtime | 17 days |
| 12 | **#81** | temp: Bypass age/consent gates for testing L2 sheets | temp/no-gate-test | 18 days |
| 13 | **#80** | Implement HotMess OS Integration | copilot/implement-telegram-auth-handshake | 18 days |

---

## Branch Health Notes

- **figma-make-v2** (#113) is the oldest open PR at 11 days — it's the source of several downstream merge conflict PRs (#129). Close or merge this first to unblock others.
- **#80, #81, #83, #85, #87** are all pre-OS-stabilization branches from early Feb. Many may be superseded by main. Recommend closing with "superseded by main" comment.
- **temp/no-gate-test** (#81) bypasses consent gates — must NOT merge to production main.
- **worktree-agent-a447b1e4** and **worktree-agent-a606ff88** are identical (same SHA) — Claude Code worktree branches from 2026-02-23, safe to delete locally.
- **hotmess-london-os-master-remap** and **stabilization-phase-3a** share the same SHA (`aaeb868`) — same content, one can be deleted.
- **Local main is 1 behind origin/main** — `git pull` needed before any new work.
