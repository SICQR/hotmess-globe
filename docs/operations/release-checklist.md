# Release checklist

Locked 2026-05-29 — Phil Gizzie.

Every production deploy walks this list. No "verified" until every step is ticked.

## Pre-merge

- [ ] `npm run typecheck` passes locally on the branch
- [ ] Branch deploy on Vercel is **READY** (not BUILDING, not ERROR)
- [ ] Manual smoke: open the Vercel preview URL in a fresh tab, exercise the changed surface, confirm no console errors
- [ ] If schema/DB change: `apply_migration` succeeded in Supabase, queries return expected rows
- [ ] PR description names the user-visible behaviour change, not just the diff

## Merge + promote

- [ ] PR squash-merged to `main`
- [ ] `main` Vercel deploy READY
- [ ] `production` ref updated (force-update from main HEAD, branch protection temporarily relaxed and immediately re-tightened)
- [ ] Production target deploy on Vercel READY (look for `target: "production"` in the dpl meta)
- [ ] `hotmessldn.com` returns 200 and the new bundle hash appears in the page source

## Post-deploy — REQUIRED

This is the step that bit us 2026-05-29. The service worker (PWA cache) can serve a stale bundle for hours after Vercel goes READY. "It's live" is not the same as "the user sees it."

- [ ] **Fresh / private window check.** Open `hotmessldn.com` in an incognito or private window with no service worker active. Exercise the changed surface. Confirm the new behaviour is visible.
- [ ] **Hard refresh check on the dev machine.** Cmd+Shift+R on the desktop PWA / browser. Confirm the new bundle loads (look for the new asset hash in the JS bundle URL or a known string change).
- [ ] **Mobile PWA check** (if the change is mobile-relevant). Close the installed PWA fully, reopen, exercise the surface. If it still serves stale, force a service worker update via Settings → Storage → Clear site data (development) or wait for the per-build stamp invalidator (#90) to kick in.
- [ ] **Live DB cross-check** (if the change touches DB writes). Query the row produced by the new flow; confirm shape matches what the kind-router / read pipeline expects.

If any post-deploy step fails:
1. Do not announce the ship.
2. Diagnose: is it cache, build, or schema? Cache → wait + retry. Build → roll back. Schema → check the migration ran.

## Service-worker cache notes

The SW is stamped per-build (PR #90 — `scripts/stamp-sw.mjs` runs after `vite build`). The stamp invalidates the cache on the NEXT navigation after the user revisits. Until then, the old SW serves the old bundle.

- Fresh-incognito always shows the new bundle (no SW registered).
- Existing PWA installs may see the old bundle for up to one navigation cycle.
- `claim()` + `skipWaiting()` are NOT enabled by default to avoid blowing up a user mid-flow. Accept the one-cycle delay.

This means: a green Vercel deploy does NOT mean every active user sees the new build. Smoke test in a fresh window before claiming success.

## Cross-references

- `docs/doctrine/11-arrival-state-doctrine.md` — Single Auth Authority, no Silent State Death
- `docs/doctrine/12-drop-beacon-doctrine.md` — Drop Beacon entity separation
- `docs/operations/` — operational runbooks
- `scripts/stamp-sw.mjs` — per-build SW stamp implementation
