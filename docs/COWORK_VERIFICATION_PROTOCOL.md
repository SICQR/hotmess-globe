# Cowork Operating Protocol — Self-Verify by Default

**Effective 2026-05-23. This is the baseline for every Cowork dispatch.** If a dispatch doesn't specify verification, fall back to this. Default assumption: **Phil is not available to verify.** Every change — code, docs, infra, asset — is self-verified before it's claimed done. Phil reviews artefacts after the fact. Never ask "should I verify?" — the answer is always yes. Pause only when verification surfaces a decision Phil must own.

## Verification toolkit — use all of it

**Visual / UX (Chrome MCP on the Mac):**
- Load the preview/production URL. Screenshot at **360 / 390 / 768 / 1440 px**; save to `docs/verification-artifacts/<date>/<pr>/`.
- Interaction changes (FAB, sheets, menus): capture default + active state. Camera/zoom changes: capture before + after at the same level.
- Read console after load — any error = ❌, investigate. Read network — any non-2xx/3xx = ❌, investigate.
- Auth routes: use the persistent logged-in session on the Mac browser.

**Data / behaviour (Supabase MCP, project `rfoftonnlwudilafhfkl`):**
- Data changes: baseline query before deploy, post-state after; compare deltas.
- Schema changes: confirm via `information_schema.columns`.
- RLS changes: test as `anon` and `authenticated`, confirm enforcement.

**Infra (Vercel + GitHub APIs):**
- Every deploy: confirm deployment ID is **READY** (not QUEUED/BUILDING/ERROR/CANCELED) before claiming live.
- Every promote: confirm the new deployment is **aliased to `hotmessldn.com`** (the PR #296 silent-CANCEL pattern — never trust a promote, check the alias + a unique string/behaviour from the change).
- Governance/protection changes: read config back from the API, then attempt the blocked action and confirm rejection.

**Functional / end-to-end (Chrome + data):**
- UI→API→data: drive the UI, then query Supabase for the expected row.
- data→UI: insert/modify a test row, then load the UI and confirm render.
- **Never auto-trigger real-world-consequence flows** (SMS to a real number, push to a real device, payments). Verify wiring up to dispatch; mark on-device receipt "needs physical device."

## Per-PR protocol
1. **Pre-merge:** preview URL loads, console clean, network 2xx/204 only, screenshots at all four viewports.
2. **Post-merge to `main`:** confirm `main` deploy READY (or correctly CANCELED if docs-only).
3. **Post-promote to `production`:** confirm production deploy READY (production-always-builds, so no docs-skip can mask a code failure), alias points to the new deployment ID, and the production URL serves the new build (check a unique string/asset/behaviour).
4. **Functional check:** the behaviour the PR delivers works on live production (Chrome interaction + Supabase query where applicable).
5. **Report:** ✅ / ❌ / ⚠️ per item, with the artefact cited inline (screenshot path, query result, deploy ID).

## Still goes to Phil (decisions, not verification)
- Product/design decisions affecting what users see/feel (FAB placement, doctrine voice, brand colour).
- Access-control changes (branch protection, OAuth secrets, token rotation).
- Real-world-consequence triggers (live SOS dispatch tests, payments, public comms).
- Anything touching funds, customer data, or legal/compliance (refunds, GDPR deletions, partner contracts).
- Anything genuinely ambiguous — pause and ask rather than guess a default.

## No longer goes to Phil
- "Check this on your iPhone" (Chrome MCP @ 390px is equivalent).
- "Confirm this looks right" (before/after screenshot diff is better evidence).
- "Verify the deploy is live" (query Vercel: READY + aliased).
- "Test this end-to-end" for non-destructive flows (Chrome + Supabase).

## Role division
- **Phil (cofounder):** decisions only he can make + strategic sequencing + post-hoc review of verified work.
- **Cowork (engineer):** builds and verifies its own work to this protocol.


## Credentials — verify-it-exists before flagging a Phil-action
Before flagging that something needs a NEW credential / secret / env var / service account / API key, exhaustively check existing state first: Vercel env vars, Supabase secrets, GitHub repo (Actions) secrets, `.env.example` + any committed `.env*`, the codebase (`grep -ri <name>.*token`), and any connected MCP's secrets. On a mature project the credential probably already exists. A Phil-action fires ONLY if the exhaustive check returns nothing.
Note: Vercel env *values* aren't readable via the current MCP toolset — cross-check `docs/SECURITY_AUDIT.md` / `docs/SYSTEM_MAP.md` and the production bundle; treat "set in Vercel" as confirmed if those say so. (Same discipline as the cron-500 and AgeGate catches: verify the assumption against reality before asking Phil.)
