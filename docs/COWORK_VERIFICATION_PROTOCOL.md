# Cowork Operating Protocol — Self-Verify by Default

**Effective 2026-05-23. This is the baseline for every Cowork dispatch.** If a dispatch doesn't specify verification, fall back to this. Default assumption: **Phil is not available to verify.** Every change — code, docs, infra, asset — is self-verified before it's claimed done. Phil reviews artefacts after the fact. Never ask "should I verify?" — the answer is always yes. Pause only when verification surfaces a decision Phil must own.

## Routing rule (ABOVE ALL OTHERS): default to "Cowork can do this"
Work belongs to Cowork by default. A task routes to **Phil** only if it fits one of these four categories:
1. **Access-control changes** — branch protection, token generation/revocation, OAuth secret rotation, repo settings.
2. **Real-world-consequence triggers** — firing a payment, sending public communications, deleting customer data.
3. **Product/design taste calls** — where Phil's aesthetic/brand judgement is the actual input.
4. **Genuinely ambiguous strategic calls** — where Phil's context is the missing piece.

Everything else — verification, testing, asset choice, scoping, drafting, dispatch follow-through, cross-thread coordination — is Cowork's. If a task is being routed to Phil and doesn't fit one of the four, it is **mis-routed**: re-check whether Cowork can execute it (Mac control, Chrome MCP, Supabase MCP, Vercel API, GitHub API, connected MCPs, or a fresh approach to the same problem). Route to Phil only when the answer is verifiably no — and state *why*. Even then, route only the irreducible sub-step, not the whole task.

*Correction that produced this rule (2026-05-24):* the local-mode mobile cert was first handed to Phil's iPhone. It's Cowork's — drive it via Chrome device emulation at 390px on a fresh GPU process (or any executable path). Only a specific verifiably-absent capability (e.g. CDP CPU/network throttling) is allowed to surface as a tool gap, and even that is a tool-fix to pursue, not a Phil-task.

## Before executing a dispatch — surface the timing question
Dispatches that touch **subsystem interactions, teardown/dispose sequences, or lifecycle ordering** (e.g. "unmount X", "free the WebGL context", "tear down Y when Z") must answer **when**, not just **what**, before executing. Teardown of one engine *during* another engine's init can starve it. Real example (2026-05-24): unmounting the three.js globe at the instant mapbox-gl initialised regressed local-map load from <7s to 40s+; the fix was to defer the unmount until after the map's `load` event. If a dispatch gives the *what* but not the *when*, Cowork raises the timing question and proposes the safe ordering before shipping. Prefer a design that **degrades to the proven-good state** if the new path fails (e.g. if the map never loads, the globe simply stays mounted).

## Design-brief completeness — interaction before visual
A design brief is **incomplete** until it specifies the **interaction behaviour** of the surface, not just its look. Before building (and when Phil wears the designer hat and reviews a brief), ask explicitly: *"What is the primary interaction this surface exists to enable, and does the design serve it?"* If a brief describes a visual without describing how it is **hovered, clicked, touched, focused/keyboard-navigated, and handled in dense areas**, the brief is incomplete — surface the gap before building. (Origin 2026-05-24: the beacon-visual brief specified atmospheric blooms with labels-on-camera-dwell, but beacons are the globe's *primary interactive surface* — they need decoupled hit targets, hover/active states, touch, and keyboard. Atmosphere-first was the wrong trade for an interactive primitive.) The protocol catches code-level mistakes; this check catches design-level ones.

## Verify that the verification itself is valid
**If the measuring instrument is degraded or contaminated, do not produce a number.** Surface the instrument limit and propose how to restore a clean measurement environment. A confident-looking metric from a compromised tool is worse than no metric — it injects false confidence into the protocol. (Origin 2026-05-24: after creating/destroying ~12 WebGL contexts in one session, the browser's GPU process was degraded and map load-time readings ballooned to ~40s; the right move was to refuse the number and restart Chrome for a clean read, not to report the contaminated figure.)

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
- "Check this on your iPhone" for **layout/visual** checks (Chrome MCP screenshots). ⚠️ This holds for layout only — see "Known tooling limits": true 390px viewport, CPU throttle, and slow-4G are NOT achievable via the current Chrome MCP, so throttled-mobile *performance* still needs a real device.
- "Confirm this looks right" (before/after screenshot diff is better evidence).
- "Verify the deploy is live" (query Vercel: READY + aliased).
- "Test this end-to-end" for non-destructive flows (Chrome + Supabase).

## Role division
- **Phil (cofounder):** decisions only he can make + strategic sequencing + post-hoc review of verified work.
- **Cowork (engineer):** builds and verifies its own work to this protocol.


## Credentials — verify-it-exists before flagging a Phil-action
Before flagging that something needs a NEW credential / secret / env var / service account / API key, exhaustively check existing state first: Vercel env vars, Supabase secrets, GitHub repo (Actions) secrets, `.env.example` + any committed `.env*`, the codebase (`grep -ri <name>.*token`), and any connected MCP's secrets. On a mature project the credential probably already exists. A Phil-action fires ONLY if the exhaustive check returns nothing.
Note: Vercel env *values* aren't readable via the current MCP toolset — cross-check `docs/SECURITY_AUDIT.md` / `docs/SYSTEM_MAP.md` and the production bundle; treat "set in Vercel" as confirmed if those say so. (Same discipline as the cron-500 and AgeGate catches: verify the assumption against reality before asking Phil.)

## Known tooling limits & open verification gaps
- **No CPU / network throttling via Chrome MCP.** The browser tools can't simulate throttled CPU or slow-4G, and `resize_window` does not reliably shrink the *layout* viewport to phone widths (observed: stayed ~1427px). "Chrome MCP @ 390px ≈ iPhone" therefore holds for **layout screenshots only**, not for performance / load-time under mobile conditions.
- **GPU contamination after heavy WebGL testing.** Creating + destroying many WebGL contexts in one session degrades the browser's GPU process and makes load-time numbers unrepresentative of a fresh user. When timing matters, run the check in a **fresh browser session** (close + reopen) before trusting numbers.
- **Throttled-mobile performance verification — Cowork-owned (was mis-routed to Phil).** Cowork drives this, not Phil: Chrome device emulation at 390px on a fresh GPU process (restart Chrome first per "verify the verification is valid"), 5 consecutive deep-zoom → street-map handoffs. The only piece that may be a genuine tool gap is **CDP CPU/network throttling** (not exposed by the current Chrome MCP); if it stays unavailable, that's a tool-fix to pursue (add a CDP-throttle path), not a hand-off to Phil. Desktop cert is already PASSED (5/5, sub-2s, 2026-05-24). **Health-check stub:** daily check flags local-mode "✅ desktop-verified · ⏳ device-emulation throttled pass pending" until Cowork runs the emulated pass.
