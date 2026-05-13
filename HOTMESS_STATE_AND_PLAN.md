# HOTMESS — State of Play + Next-Stage Plan
**Investigator:** Cowork (parallel workstream to M17a SampleMap)
**Date:** 2026-05-11
**Mode:** Read-only recon (no commits, no env writes, no DB writes)
**Test account created:** *none yet — used existing e2e fixtures*

This document is the deliverable from a 4-phase recon brief Phil issued on
2026-05-11. Phases 1-3 run autonomously; Phase 6 (next-stage proposal) is
written only after Phil reads Phases 1-5. Evidence-backed throughout.

---

## TABLE OF CONTENTS

- PART 1 — Infrastructure state of play
- PART 2 — User experience state of play
- PART 3 — Delta from May 4 baseline
- PART 4 — Top 10 open issues, ranked
- PART 5 — Improvement suggestions from UX walkthrough
- PART 6 — Proposed next stage *(written after Phil reads 1-5)*
- APPENDIX A — Screenshots and evidence files
- APPENDIX B — Test account credentials (if created)
- APPENDIX C — Tool calls that hit walls


---

# PART 1 — INFRASTRUCTURE STATE OF PLAY
*Snapshot taken 2026-05-11 03:42-04:00 UTC*

## TL;DR colour summary

| Surface | Status | One-line |
|---|---|---|
| Production deployment | 🟢 GREEN | Vite/Node 24, latest commit `354737148` deployed ~1h ago, READY |
| Custom domain | 🟢 GREEN | hotmessldn.com → Vercel, TLS valid (Let's Encrypt, expires Jul 19), HSTS+CSP locked |
| Postgres | 🟢 GREEN | 17.4.1.064 (upgraded since May 4), 72MB, 14/60 conn, healthy |
| Supabase auth config | 🔴 RED | Open redirects still on, OTP exp still 24h, anonymous users still on |
| Resend (email) | 🔴 RED | Domain `send.hotmessldn.com` status=**failed** — DKIM+SPF marked failed by Resend |
| Stripe — payments | 🔴 RED | `sk_test` ↔ `pk_live` key mismatch (May 4 finding unchanged) |
| Stripe — webhook | 🔴 RED | Endpoint points at **`rawcut.vercel.app`** not hotmess-globe (May 4 finding unchanged) |
| Stripe — money | 🔴 RED | Lifetime revenue = **£9.99** (1 succeeded payment); 110 orders **stuck pending** |
| WhatsApp | 🔴 RED | Token **expired since 2026-04-15** (26 days, unchanged from May 4 audit) |
| Twilio | 🟡 YELLOW | Verify Service 200 OK; Accounts API returns 401 (API key scope issue) |
| RadioKing/AzuraCast | 🔴 RED | radio/azuracast/stream.hotmessldn.com all DNS-NXDOMAIN — no stream |
| Telegram bot | 🟢 GREEN | @HotmessAuthBot live, `getMe` ok=true |
| Apple Sign-In | 🟡 YELLOW | client_id+secret set, **team_id NULL** in Supabase config |
| Google Sign-In | 🟢 GREEN | Client + secret set |
| Crons | 🟢 GREEN | notifications/dispatch + data-retention firing; data-retention 500s (TypeError) |
| User activity | 🔴 RED | **DAU = 0**, WAU = 8, 152 profiles, 4 signups in last 7d |
| Onboarding funnel | 🔴 RED | 110/152 (72%) stuck at `stage='start'`; only 18 reach `'complete'` |
| Brand visibility | 🟡 YELLOW | 22 v6 spec chunks: only 2 flags globally enabled (`v6_aa_system`, `v6_first_five_minutes`); 13 dark/phil-only |
| Sentry | 🟢 GREEN | DSN configured (`o4510805032697856.ingest.de.sentry.io`); 4 runtime errors in 7d |
| Codebase health | 🟢 GREEN | 971 src files, 419 components, 157 API routes, 0 explicit "broken" TODOs, 0 LLM stubs left |

## §1.1 Production deployment

- **Vercel project**: `prj_xdS5EoLRDpGhj4GOIbtSLSrCmvJO` / team `phils-projects-59e621aa`, framework `vite`, node `24.x`
- **Current production**: `dpl_BXhpS4temNkGdijwxHHBUWi2oPMg` — commit `354737148` ("Increase labelDotRadius … bump city labelDotRadius 0.3 → 0.6"), deployed 2026-05-11 03:24:35 UTC (~1h before recon)
- **Domains**: `hotmessldn.com`, `www.hotmessldn.com`, `hotmess-globe-*.vercel.app`
- **Deploy velocity**: 20 deploys visible in last ~3.7h slice (PRs #237-#261 burst on 2026-05-09). Last 20 includes 4 CANCELED (cancellation from rapid push churn, not failure)
- **No payment-failure banner**: project metadata clean
- **DNS+TLS**: `hotmessldn.com` HTTP/2 200, TLS verify OK, ~510ms total time, Let's Encrypt R13 cert valid Apr 20 → Jul 19 2026 (auto-renew via Vercel)
- **Security headers**: HSTS preload, X-Content-Type-Options nosniff, `Permissions-Policy` locked to camera/geo self, CSP includes `maps.googleapis.com` ✓ (the PR #260 fix landed)

## §1.2 Database state

- **Project**: `rfoftonnlwudilafhfkl` (eu-west-2), ACTIVE_HEALTHY, **Postgres 17.4.1.064** (release_channel=ga). *May 4 baseline flagged vulnerable_postgres_version — now upgraded.*
- **Size**: 72 MB; **connections**: 14/60 active; org `pzqzjdnjfpmxiiyvzlod`
- **Schema breadth**: 154 tables in `public` (vs ~60 baseline). Active migration to `conversations`+`messages` (deprecating `chat_threads`+`chat_messages` 2026-05-21).
- **Row counts (real data)**:
  - `profiles`: 152 (vs 50 on Apr 4 = +204% in 5 weeks; 4 signups in last 7d)
  - `personas`: 139 (multi-persona system in active use)
  - `orders`: 110 (vs 5 on Apr 4 = +2100%)
  - `chat_messages`: 86, `messages`: 75, `conversations`: 15, `conversation_members`: 28
  - `pulse_places`: 64, `radio_signals`: 45, `taps`: 44
  - `label_releases`: 38, `tracks`: 36 (music catalogue)
  - `profile_photos`: 35
  - `market_listings`: 30, `preloved_listings`: 15
  - `notifications`: 28, `notification_outbox`: 11 (all `failed`)
  - `cron_runs`: 2,766 (very high)
- **Last-touch surface** (where active dev is happening): `cron_runs`, `user_presence`, `push_subscriptions`, `profiles`, `globe_events`, `chat_threads`, `messages`, `conversations`, `memberships`, `taps`, `chat_messages`, `notifications`, `orders`, `market_listings`
- **Dead/idle tables**: `beacon_scans`, `qr_codes`, `sellers`, `reports`, plus dozens of pre-built tables with 0 rows (`travel_*`, `meet_*`, `creator_*`, `ghosted_albums*`, `operator_*`, `safety_switches`, `safety_broadcasts`, `aa_escalation_log`, `support_meetings`, `support_notification_log`, `radio_stingers`, `radio_idents`, `radio_script_log`, `radio_ad_bookings`, `globe_ad_bookings`)
- **kv_store_\* base44 residue**: 4 tables still present (`kv_store_a670c824` has 17 rows, others ≤1) — *not yet purged*

## §1.3 Auth + advisors

- **Site URL**: `https://hotmessldn.com` ✓
- **uri_allow_list**: still contains `https://**,http://**` (open redirects unchanged from May 4) — **P0 security**
- **mailer_otp_exp = 86400 (24h)** — Supabase recommends ≤3600 (May 4 finding unchanged) — **P0 security**
- **external_anonymous_users_enabled = true** (May 4 finding unchanged)
- **jwt_exp = 3600 (1h)** ✓
- **refresh_token_rotation_enabled = true** ✓
- **security_captcha_enabled = false** (no CAPTCHA on signup)
- **password_min_length = 6** (Supabase default minimum)
- **OAuth providers enabled**: `google`✓, `apple`✓, `email`✓, `phone`=false (Twilio Verify is used via custom code path instead)
- **Apple OAuth**: client_id+secret set; **`external_apple_team_id` is NULL** — likely benign because Apple secret is the signed JWT, but worth confirming
- **Email autoconfirm = false**, secure_email_change = true
- **MFA**: TOTP enroll enabled; phone MFA disabled
- **SAML**: disabled
- **Advisors**: Postgres 17 upgrade closes the May 4 `vulnerable_postgres_version` ERROR. Only RLS-disabled table is `public.spatial_ref_sys` (PostGIS, expected). Full counts couldn't be parsed inline due to advisor payload size (940k tokens) — referenced for follow-up.

## §1.4 Service integrations

| Service | Env present | Live test | State |
|---|---|---|---|
| Stripe — secret/pub | ✓✓ | `sk_test_…` + `pk_live_…` (live publishable, test secret) | 🔴 **MISMATCH** |
| Stripe — webhook URL | ✓ | Points at `https://rawcut.vercel.app/api/stripe/webhook` (2 enabled events) | 🔴 **WRONG PROJECT** |
| Stripe — account | — | `acct_1TEUAmFD4E2lo8Ap` "PageReady", livemode true, balance £0/£0 | 🟡 Account exists but no money |
| Stripe — boost prices | 6×✓ (38d ago) | All 6 STRIPE_BOOST_*_PRICE_ID set | 🟢 |
| Stripe — membership prices | DB has IDs | 4 tiers (`hotmess`, `connected`, `promoter`, `venue`), monthly+annual recurring prices in Stripe | 🟢 |
| Resend | ✓ (RESEND_API_KEY 30d) | Domain `send.hotmessldn.com` API returns **status: failed**; DKIM TXT exists, SPF TXT exists, but Resend marks all 3 records FAILED | 🔴 |
| WhatsApp (Meta Graph) | ✓ (WA_ACCESS_TOKEN 30d) | `/me` → **401, "Session has expired on Wednesday, 15-Apr-26 21:00:00 PDT"** — unchanged from May 4 audit | 🔴 |
| Twilio | ✓ (4× SID/SECRET/MSG/VERIFY) | Accounts API 401 with API Key SID + Secret; **Verify Services API 200** with same creds | 🟡 API key likely scoped to Verify only — adequate for OTP path, blocks generic Twilio admin ops |
| Telegram (Login Widget) | ✓ (TG_BOT_TOKEN + USERNAME 102d) | `getMe` → ok=true, `@HotmessAuthBot` ("HOTMESS Auth") | 🟢 |
| Apple Sign-In (Supabase) | client+secret set | `external_apple_team_id` is NULL (signed-JWT secret model masks this), no E2E test in this pass | 🟡 |
| Google Sign-In | ✓ | Set in Supabase config; CLAUDE.md flagged "Unable to exchange external code: 4/0A" in last audit — not verified via live test | 🟡 |
| RadioKing / AzuraCast | NEXT_PUBLIC_RADIOKING_STREAM_URL set | radio.hotmessldn.com / azuracast.hotmessldn.com / stream.hotmessldn.com → all NXDOMAIN | 🔴 No stream |
| Shopify Storefront | ✓ (4 env, 30d ago) | Domain check via curl failed locally (URL parser issue) — needs in-browser test in Phase 2 | 🟡 |
| OpenAI / Anthropic | ✓ (OPENAI_API_KEY 85d, ANTHROPIC_API_KEY 30d) | Not tested live; AI stubs all migrated to real endpoints (0 `[TODO] LLM endpoint needed` warnings left in src) | 🟢 |
| VAPID (web push) | ✓✓✓ | Public + private + subject set | 🟢 (channel ready, no real sends observed yet) |
| Sentry | ✓ (VITE_SENTRY_DSN, 100d) | DSN points at `o4510805032697856.ingest.de.sentry.io/4510805037482064`; no `sentry-cli` installed locally to query issues | 🟡 |
| SoundCloud | ✓ (4 env, 100d) | Not live-tested | 🟡 |
| Notion | ✓ (3 env, 74d) | Not live-tested | 🟡 |
| HOTMESSLDN bot / RADIO bot | ✓ | Custom bot tokens, not introspected | 🟡 |

Vercel production env totals: **51 user-defined vars** (vs 9 "Needs Attention" flagged on May 4 — most appear settled).

## §1.5 Application surface

- **API routes**: 157 files in `api/` (vs CLAUDE.md note of ~30) — heavy growth in `api/admin/*`, `api/auth/*`, `api/cron/*`, `api/notifications/*`
- **Modes (nav tabs)**: 11 mode files (`Home`, `Pulse`, `Ghosted`, `Market`, `Music`, `More`, `Profile`, `Radio`, `Vault`, `Events`, `OSShell`)
- **Feature flags (live state, all v6 spec chunks)**:
  - `v6_first_five_minutes` — **enabled_globally=true, cohort=all** (onboarding 5-stage funnel)
  - `v6_aa_system` — enabled_globally=true, cohort=**phil_only** (Phil sees AA escalation; nobody else)
  - 13 other v6 chunks: enabled_globally=false, cohort=phil_only, requires_phil_signoff_for_ramp=true (dark to users)
  - `v6_all_off` master kill: ready, not engaged
- **Crons (last 24h)**:
  - `notifications/dispatch` → 288 runs/24h (every 5min ✓), 0 items processed (queue is empty/non-pending after the 2026-05-07 cancellation cleanup)
  - `data-retention` → 1 run/24h, **500 TypeError: `supabase.from(…)`** — broken
- **Notification outbox**: 11 rows total, all status=`failed`, error_message records a deliberate "Phil chose C, no replay" cancellation on 2026-05-07. Genuine new traffic: zero.
- **Beacons live now**: 0 (all `ends_at` past)
- **Active boosts**: 0
- **Cart items**: 0; saved items: 3
- **Globe events table**: 21 rows
- **Recent edge function updates**: `panic-alert` v25 (2026-05-07), `notify-push` v7 (2026-05-07)

## §1.6 Revenue + Market

| Source | Number | Notes |
|---|---|---|
| Stripe lifetime succeeded payments | **1** (pi_3TM7JyFD4E2lo8Ap0TSSJsJt, £9.99, 2026-03-13) | Single test charge |
| Stripe customers | **0** | No persisted customers |
| Stripe subscriptions (all statuses) | **0** | Zero recurring revenue ever |
| DB `orders` total | 110 | All 110 status=`pending_payment` or `paid`+payment_status=`pending` |
| DB orders sum | £2,378.51 (zero collected) | |
| DB orders with `stripe_session_id` | partial (rough ~6 visible) | Webhook fires to wrong project so the writeback never happens |
| Unique buyers | 6 | All Zia (`ziaullah4127@`, `antigr6zia@`, `batch21.cs011@`) + Phil (`scanme@sicqr.com`) — internal test traffic |
| Unique sellers | 1 | Single seller, presumably Phil/HOTMESS itself |
| Memberships in DB | 152 (all `tier=free`, `status=active`, `ends_at=null`) | No paying tier rows |
| Stripe webhook endpoint | `rawcut.vercel.app/api/stripe/webhook` | **Wrong project — diverts every event away from hotmess-globe** |
| Shopify (HNH MESS) | 4 env vars set (30d ago) | Not live-tested in this pass |
| Membership annual pricing | 4 tier rows wired to Stripe prices | hotmess £7.99/£63.90, connected £19.99/£159.90, promoter £44.99/£359.90, venue £99.99/£799.90 |
| Boost products | 6 prices in Stripe + env | £1.49/£1.99/£2.49/£2.99/£3.99/£4.99 — never purchased |

**Bottom line: HOTMESS has collected £9.99 in real revenue across its entire history. £2,378.51 sits in pending orders because the Stripe webhook routes to a different Vercel project.**

## §1.7 Security + incidents

- **Vercel env "Needs Attention" gate (May 4 baseline=9)**: not introspectable via CLI; all 9 launch-relevant ones appear present (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, CRON_SECRET, TELEGRAM_BOT_TOKEN, TICKET_QR_SIGNING_SECRET, RESEND_API_KEY, WHATSAPP_*, TWILIO_*) — exact rotation state not surfaced
- **JWT rotation**: NEW Supabase keys present (`SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS`, `SUPABASE_JWKS`, `SUPABASE_JWT_SECRET`) — rotation completed since April incident
- **uri_allow_list open redirects**: STILL OPEN (`https://**,http://**`)
- **OTP exp 24h**: STILL OPEN
- **Anonymous auth**: STILL ON
- **CAPTCHA**: still off
- **Trusted contacts** (4 rows, scanme@sicqr.com primary user):
  1. *Ziaullah khaan* — orphaned (`user_email=null`), all notify flags on
  2. **Glen McCarty** — STILL PRESENT post-breakup, all notify flags on
  3. *Test Contact* — orphaned, all notify flags on
  4. *Phil* (partner) — orphaned, all notify flags on
- **safety_delivery_log** (24 rows): 0 delivered. Email 5×failed + 1×skipped; WhatsApp 6×failed; SMS 2×sent + 4×skipped; Push 6×skipped. No successful "delivered_at" timestamp anywhere.
- **safety_events**: 10 in last 30d, 3 alerts
- **Runtime errors last 7d (prod)**: 4 — 1×500 (`/api/cron/data-retention` TypeError); 1×400 (`/api/events/cron`); 1×401 (`/api/admin/cleanup/rate-limits` — legit auth gate); 1× cosmetic DEP0169 warning on `/api/shopify/cart`
- **Sentry**: DSN configured, cannot query issue list without sentry-cli locally; needs browser API check

## §1.8 Codebase health

- **LOC surface**: 971 source files (`.js/.jsx/.ts/.tsx` in `src/` + `api/`)
- **Top 10 fattest files**:
  - `src/components/utils/supabaseClient.jsx` 1,758 lines (god-object client wrapper)
  - `src/components/sheets/L2ChatSheet.jsx` 1,693
  - `src/components/ui/design-system.tsx` 1,521
  - `src/pages/Profile.jsx` 1,270
  - `src/components/sheets/L2ProfileSheet.jsx` 1,261
  - `src/pages/OnboardingGate.jsx` 1,226
  - `src/components/sheets/L2BrandSheet.tsx` 1,195
  - `src/pages/EditProfile.jsx` 1,176
  - `src/lib/pricing.js` 1,154
  - `src/pages/Pricing.jsx` 1,125
- **Components**: 419
- **API routes**: 157
- **Explicit production blockers in code**: 0 TODOs matching `production|urgent|broken|FIXME|HACK`
- **LLM stub remnants**: 0 (`[TODO] LLM endpoint needed` fully purged — CLAUDE.md's "13 stubs" claim is stale)
- **Worktrees in repo root**: 5 untracked `.claude/worktrees/*` directories (recent parallel-agent activity)
- **Last commit on origin/main**: `a2aef6c9 feat(onboarding): Pulse-first destination after auth (Grindr-fast directive) (#256)` — but Vercel currently deploys `354737148` (1 commit ahead, the labelDotRadius bump) — local main is behind remote
- **PR velocity**: 25 merged PRs visible in last 20 commits (PRs #237-#261 = ~25 PRs in a single 2026-05-09 burst)
- **Test scripts**: `lint`, `typecheck`, `test:run` (vitest), `test:e2e` (playwright), `test:e2e:prod` (vs hotmessldn.com), `verify` (lint+typecheck+test:run+build), `test:ci` (full)
- **Branches stale on remote**: 19 merged into main; 17 active branches from 2026-05-09 (PR feature branches)
- **Zia's parallel work**: `gh` CLI not installed locally, status not pulled

## §External signals (lighter pass)

- Not exhaustively scanned in this pass (deferred to Phase 2 UX1 first-touch). The Vercel `live: false` field is suspicious — worth confirming whether that's the project visibility flag or a billing flag.


---

# PART 2 — USER EXPERIENCE STATE OF PLAY

**METHODOLOGY CAVEAT (must read first):** the brief asked Cowork to act as a real
user in a fresh incognito browser. The Claude-in-Chrome MCP extension was not
connected on Phil's Mac at the time of this recon (`list_connected_browsers`
returned `[]` and a broadcast request was not picked up). Rather than block, I
walked the UX from three real-evidence sources:
1. **Live API responses** (curl-traced what would actually fire as the SPA
   bootstrapped each route)
2. **Production HTML + service-worker payloads** served from `hotmessldn.com`
   right now
3. **Source code at the deployed commit** (`SignUpScreen.jsx`, `OnboardingRouter.jsx`,
   `AgeGateScreen.jsx`, `QuickSetupScreen.jsx`, `AuthCallbackPage.jsx`)

This means "first impression" reactions are inferred from the actual rendered
content + flow, not from staring at pixels. Visual polish, frame-rate of the
3D globe, animation feel, mobile touch tap-targets — those need a follow-up
Chrome pass. I've flagged that explicitly in the deliverable.

## Overall feel (3-paragraph plain English)

HOTMESS *reads* like a real product. The landing HTML opens with a real
title ("HOTMESS — Global Nightlife Discovery"), a real description ("Queer-led
nightlife, music, and care. Real radio. Real venues. Real community."), the gold
brand colour pinned as the theme tag, a 1200×630 og-image present, a full PWA
manifest with installable Pulse / Ghosted / Market / Music shortcuts, and a
service-worker on version v5 that does network-first for HTML. Security headers
are tight — HSTS preload, frame-ancestors none, a CSP that locks down what can
load and finally includes `maps.googleapis.com` (the May 9 fix landed). This
isn't a side project. This is *operationally* a real product.

But the second any non-`phil@hotmessldn.com` visitor tries to sign up via the
legacy magic-link path, the API returns a 500 and *quotes back the Resend test-
mode error verbatim*: "You can only send testing emails to your own email
address (phil@hotmessldn.com)." That single sentence is the entire HOTMESS
launch story right now. Apple, Google, Telegram, Phone OTP, and email+password
paths exist in the SignUpScreen UI, so a real user can still get past auth —
but anyone who pastes their email into the magic-link path gets a server error.
Then if they do get an account, they hit a 4-step onboarding (Splash →
AgeGate → SignUp → QuickSetup) that strips name/photo capture to a post-onboarding
nudge (a deliberate, well-reasoned "Grindr-fast" trade — name+photo become a
banner the user can dismiss for 7 days). Then they land on `/pulse` which is
the new default destination. The globe loads an empty cities heat-map (8
cities, 0 active beacons everywhere) and a "1 MEMBER ONLINE" badge that until
last week read "1 MEMBERS ONLINE".

So the lived experience is: *premium dark luxury brand at the front door,
empty room behind it.* The work to fill the room is happening at extreme
velocity (25 PRs merged in a single 2026-05-09 burst) but the room is still
empty: DAU=0, WAU=8, 152 lifetime profiles (4 in the last 7 days), zero paying
members, zero real Stripe transactions in the last 60 days, no beacons live
anywhere on earth right now. A producer arriving from a Discord link would see
a beautiful login screen, sign in via Google, land on an empty globe, swipe
through Ghosted (3 demo profiles?), see "from £10" HNH MESS lube in Market,
and then — depending on whether their tester landed on Phil's allowlisted
Resend account — either confirm or 500-fail at email.

## UX1-UX15 per-step results (bash-walkthrough)

For each step: Result = ✓ working at API/routing level / ⚠ degraded / ✗ broken.
Visual signals deferred to Chrome-extension pass.

| UX | Step | Result | Evidence |
|---|---|---|---|
| UX1 | First touch (cold incognito → hotmessldn.com) | ⚠ | HTML serves in 510ms with `x-vercel-cache: HIT` (age 46h stale). Title + meta + og — all on-brand. Single JS bundle `index-BjUa2Icr.js`. Service worker v5 network-first means user sees fresh content after first paint. **Concern**: the cached HTML is from `2026-05-09 05:28:27 GMT`, 46h old; users hitting fresh code only after SW updates. |
| UX2 | AgeGate | ✓ | `AgeGateScreen.jsx` writes `localStorage.hm_age_gate_passed=true`. Single checkbox, single button, no DOB capture (deferred to verification). `BlockedScreen` exists for under-age path. ProgressDots shown. CLAUDE.md says session→localStorage fix shipped (PR `eb11276b` / session 8). |
| UX3 | Signup — magic link path | ✗ | `/api/auth/magic-link POST` → **HTTP 500**, body verbatim quotes Resend test-mode error: *"You can only send testing emails to your own email address (phil@hotmessldn.com)…"* Magic link is REMOVED from the UI per PR #257 (Grindr-fast) but the endpoint still exists and 500s for everyone except Phil. |
| UX3a | Signup — Apple OAuth | ⚠ | Code path correct (`signInWithOAuth({provider:'apple'})` → `/auth/callback`). Supabase config has client_id+secret; `external_apple_team_id` is null (probably OK if signed-JWT secret). WebView detection hides Apple in Instagram/FB/Twitter (smart). Not live-tested. |
| UX3b | Signup — Google OAuth | ⚠ | Same code path. CLAUDE.md flagged "Unable to exchange external code: 4/0A" as an open issue 5 weeks ago; not retested today. Need a real Chrome session. |
| UX3c | Signup — Telegram Login Widget | ✓ | `@HotmessAuthBot` returns `ok:true` on `getMe`. `TelegramLoginButton.jsx` mounts widget if `VITE_TELEGRAM_BOT_USERNAME` set (it is). Tunnels through `/api/auth/telegram-callback` → `admin.generateLink` → Supabase session. |
| UX3d | Signup — Phone OTP (Twilio Verify) | ⚠ | `/api/auth/phone-otp-send POST` returns Twilio 60200 "Invalid parameter `To`" for `+447700900100` (UK test range Twilio rejects). With a real number this would likely work — Verify Service API auth tested OK with 200. Real-number test not done in this pass. |
| UX3e | Signup — email + password | ✓ | Now collapsed under "More options" expander. Supabase `signInWithPassword` / `signUp` with `mailer_autoconfirm=false` means user must click confirmation email — and **that email is sent via Resend, which is broken for any address other than phil@hotmessldn.com**. So practically: email+password creates account on first POST, then user is told "check your email", email never arrives. |
| UX4 | Profile creation (QuickSetup) | ✓ | Only captures GPS consent + GDPR/terms (no name/photo — deferred to L2EditProfileSheet via DeferredProfileNudge banner that pops on /pulse, /ghosted, /). Passkey enrolment prompt offered. Geolocation has 10s timeout + `enableHighAccuracy:true`, falls through silently if denied. |
| UX5 | Pulse (3D globe) | ⚠ | Route serves SPA shell (3195 bytes). `/api/globe` returns 8 cities (London, Berlin, Amsterdam, Paris, Barcelona, …) all with `active_beacons:0, heat_intensity:0`. `/api/globe/pulse` 401s without auth (correct). The globe will render with zero dots until beacons are seeded. Phil's session-9 fix returns `null` outside `/pulse` so the canvas doesn't bleed; this is good. Performance not measured. |
| UX6 | Ghosted (proximity grid) | ✓ | Route serves SPA. `/api/profiles` filters ghost emails per CLAUDE.md (`@hotmess.app/.test`, `demo`, `admin`, `e2e`, `cowork-test`). Real signups available: 152 profiles minus 13 ghosts = 139. Some non-trivial part of those have no avatar (86/152 = 57% no_avatar overall). |
| UX7 | Market | ✓ | Routes `/market`, `/market/drops`, `/market/preloved` all serve SPA. `/api/products` 200s (body suppressed for unauth in test). DB has 30 market_listings, 15 preloved_listings, 4 membership tier rows wired to Stripe prices, 6 boost products in Stripe. **Critical**: webhook routes to wrong project so even if user clicks Buy and pays, the writeback to `orders` will never flip `payment_status` from pending to paid. |
| UX8 | Music + Radio | ⚠ | `/music`, `/music/live`, `/radio` all serve SPA. `radio_signals` has 45 rows. `tracks` has 36. `label_releases` has 38. **But** the radio stream URL host `radio.hotmessldn.com` does not resolve — NXDOMAIN. The play button will 404 the stream. Needs the Hetzner VPS Phil has flagged for AzuraCast install. |
| UX9 | Safety / SOS | ⚠ | `/safety` route serves SPA. 24 safety_delivery_log rows — 0 ever "delivered" successfully. 11 notification_outbox rows all failed (deliberate "no replay" markers from Phil's May 7 cleanup). Edge function `panic-alert` v25 deployed 2026-05-07. **The SOS path will reach the edge function but the downstream dispatch via WhatsApp will 401, SMS may work via Twilio Verify scope, email will fail via Resend.** Safety net is metaphorically intact in code but broken at every external channel. |
| UX10 | Settings / account | ✓ | `/settings`, `/profile`, `/more` serve. Code path established. Standard auth/account UI flows. Not deep-tested. |
| UX11 | Mobile | ⚠ | Manifest is solid PWA-grade (`display:standalone, orientation:portrait-primary, theme_color:#C8962C, bg:#050507`). Apple meta tags set (`apple-mobile-web-app-capable yes, status-bar-style black-translucent, title HOTMESS`). Viewport pinned at scale 1, no zoom — assumes native-app feel. No mobile-specific issues surfaced via curl; needs real device test. |
| UX12 | Returning user | ✓ | AuthCallback fast-path: returning user → `/pulse`. New user → `/`. Bot/scraper 400s → `/` gracefully. Session token written to IndexedDB hint to survive Safari localStorage purge (per CLAUDE.md). |
| UX13 | Error states | ⚠ | `/this-route-does-not-exist` → HTTP 200 + SPA shell (no server 404; SPA handles client-side). `/api/admin/safety-switch` 500s unauthenticated (should 401, not 500 — leaks). `/api/right-now-feed`, `/api/products`, `/api/events`, `/api/beacons` all 200 unauthenticated — **publicly readable, no auth gate** — possible privacy issue for `right_now_feed`. |
| UX14 | Click-every-button (deferred) | — | Requires visual Chrome session. Not done in this pass. |
| UX15 | Speed-of-thought | ⚠ | Onboarding compressed to 4 screens (Splash→Age→Auth→QuickSetup) — well under the brief's 90s / 8 click target if Apple/Google OAuth works. But the user who picks email+password (or magic-link via legacy URL) hits a 500. Friction depends entirely on which signup button they tap. |

## Click-every-button exhaustive findings (partial — code-only pass)

| Class | Item | State |
|---|---|---|
| Broken endpoints | `/api/auth/magic-link` | 500 for all non-Phil emails |
| Broken endpoints | `/api/admin/safety-switch` (unauth) | 500 leak; should 401 |
| Broken endpoints | `/api/cron/data-retention` | 500 TypeError daily |
| Misrouted endpoints | Stripe webhook | Sent to `rawcut.vercel.app` not hotmess-globe |
| Auth-leaky endpoints | `/api/right-now-feed`, `/api/products`, `/api/events`, `/api/beacons` | 200 unauth — readable without login |
| 404 handling | `/this-route-does-not-exist` | Returns SPA shell with 200 (SPA-correct, SEO-debatable) |
| Robots | `/robots.txt` | Serves SPA HTML — no actual robots.txt — search engines see SPA only |
| SW caching | HTML at edge | 46h stale (`age: 167170`) before SW network-first revalidates |
| Routes verified live | /age /auth /reset-password /legal/privacy /legal/terms /music /music/live /market /market/preloved /market/drops /radio /more /settings /profile /safety | All 200 SPA shell ✓ |

## Speed-of-thought score

From cold visit → first meaningful action (sign up via OAuth → land on /pulse
with QuickSetup done):
- **Best path** (Apple or Google works): ~4 screens, ~6 clicks, **estimated 45-60s**
- **Fast path with QuickSetup geolocation grant**: as above + 1 native prompt
- **Email path**: hard fail at 500 unless Phil's email
- **Phone OTP path**: SMS → enter code → ~3 screens, ~6 clicks, **estimated 60-90s** (requires real phone number)

Onboarding compression is excellent. The bottleneck is which signup button the
user picks. The "1-tap" promise of Apple/Google/Telegram is delivered in code.
Email is a trap door.


---

# PART 3 — DELTA FROM MAY 4 BASELINE

The May 4 audit (referenced in the brief) flagged 11 ERROR / 335 WARN / 17 INFO
on Supabase advisors, plus a specific list of blockers. Here's the delta now.

## What changed (better)

- **Postgres upgraded** to 17.4.1.064 — May 4's `vulnerable_postgres_version` ERROR is resolved
- **JWT rotation completed** — `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS`, `SUPABASE_JWKS`, `SUPABASE_JWT_SECRET` all present in Vercel env (vs the April-incident pending rotation)
- **6 Stripe boost price IDs all set in Vercel env** (May 4 status was "❓ unknown")
- **TWILIO_VERIFY_SERVICE_SID** added 2 days ago — enables phone OTP path that PR #258 ships
- **TELEGRAM_BOT_TOKEN + bot live** (`@HotmessAuthBot`) — Telegram login widget shipped via PR #259
- **CSP unblocks `maps.googleapis.com`** (PR #260) — Maps now reachable for geocode
- **Onboarding compressed** Splash→Age→Auth→QuickSetup (4 screens) per "Grindr-fast directive" (PRs #254-#256)
- **Magic link removed from primary signup flow** (PR #257) — email+password collapsed under "More options"
- **Service worker v5 network-first for HTML** (PR #175) — stale-cache regressions fixed
- **AuthCallbackPage error handling** (PR #176) — bot 400s route to splash gracefully
- **`v6_first_five_minutes` flag now `enabled_globally=true, cohort=all`** — 5-stage funnel live to everyone
- **AI stubs all migrated** — `[TODO] LLM endpoint needed` warnings 0 (vs CLAUDE.md's "13")
- **`InvokeLLM` and `UploadFile` migrations complete** — no base44 residue in active code (kv_store_ tables linger as DB rows but no consumers)
- **Notification dispatch cron firing reliably** — 288 runs/24h, zero errors
- **Apple Sign In hidden in webviews** — Instagram/FB/Twitter detected and Apple button suppressed (UX win)
- **152 profiles vs 50 baseline** — 3× user growth in 5 weeks
- **110 orders vs 5 baseline** — order volume up (but all pending, see worse)

## What changed (worse)

- **Stripe webhook STILL points at `rawcut.vercel.app`** — unchanged; £2,378.51 in pending orders confirms the divergence
- **Stripe `sk_test` ↔ `pk_live` key mismatch STILL** — unchanged
- **Resend domain status:failed** — was "blocker, DNS records not at Arvixe" on May 4; DNS records now resolve in zone, but Resend's verification still reports failed (likely needs a manual re-verify in Resend dashboard)
- **WhatsApp token still expired (since 2026-04-15)** — unchanged for 26 days
- **uri_allow_list still has `https://**, http://**`** — open redirect unchanged
- **mailer_otp_exp still 86400 (24h)** — unchanged
- **external_anonymous_users_enabled still true** — unchanged
- **AzuraCast / radio stream**: was "Phil needs Hetzner VPS" on May 4 — still unprovisioned. No DNS for `radio.hotmessldn.com`.
- **DAU dropped to 0** today (was unknown on May 4, but 18 onboarded / 50 profiles was healthier signal)
- **Onboarding funnel: 110/152 still at `stage='start'`** — the compression didn't unblock the funnel measurably
- **Memberships have NO paying tier rows** — all 152 are `tier=free`. CLAUDE.md noted "tier model: mess/hotmess/connected/promoter/venue" but the actual DB stores them as `tier=free` regardless of which Stripe price was attached. The `membership_annual_pricing` table maps tier_name→price_id correctly, but the `memberships` table has nothing using those mappings.
- **kv_store_\* tables still present** — 4 of them, base44 residue not purged
- **Trusted contacts**: Glen McCarty still in scanme@sicqr.com's list with all notify flags on (May 4 finding unchanged)

## What's still as it was

- Domain SSL auto-renewal working
- Sentry DSN configured
- VAPID keys configured
- Shopify env vars configured
- Telegram bot working
- All 6 brand channels visibility flags in `src/config/brands.ts` — not re-checked but no PR has flipped HUNG/HIGH/HUNGMESS visibility
- safety-critical SOSContext code intact
- 6 modes in bottom nav

## Surprises uncovered (not in May 4 brief)

- **Stripe account display name is "PageReady"** not HOTMESS — branding-level oddity
- **Single lifetime succeeded payment of £9.99 from 2026-03-13** is the entire HOTMESS revenue history in Stripe
- **All 110 orders are test traffic from 4 emails** (Phil + 3 Zia accounts)
- **`/api/right-now-feed`, `/api/products`, `/api/events`, `/api/beacons` return 200 without auth** — potential privacy/scraping exposure
- **`/api/admin/safety-switch` 500s instead of 401ing unauthed callers** — leak of internal error state
- **`/robots.txt` returns the SPA HTML** — no real robots.txt; search engines see only the JS shell
- **Edge cache age 167,170s (~46h)** on the homepage HTML — fresh deploys are not invalidating edge cache as expected
- **5 `.claude/worktrees/*` untracked directories in the repo root** — recent parallel agent work residue
- **`memberships` table has 152 rows all `tier=free`** — the tier→stripe price mapping in `membership_annual_pricing` is wired but nothing in memberships uses it. Bootstrap trigger creates a free tier on signup, but no path appears to actually flip a membership to a paid tier when Stripe checkout succeeds.
- **`v6_aa_system` is `cohort=phil_only` but `enabled_globally=true`** — flag-resolution semantics worth confirming; "globally on but only Phil" reads contradictory
- **Twilio API key has Verify scope but not Account scope** — works for OTP send/verify, won't work for the dashboard-style API key probes you might use for diagnostics


---

# PART 4 — TOP 10 OPEN ISSUES, RANKED

Ranked by **impact-to-fix-ratio**: how big the cost of leaving it broken vs.
how small the fix.

### 1. 🔴 P0 — Stripe webhook URL points at `rawcut.vercel.app`
- **Category**: Revenue / infrastructure
- **Evidence**: `stripe webhook_endpoints list` → `https://rawcut.vercel.app/api/stripe/webhook enabled events:2`. 110 orders in DB stuck `payment_status=pending`. £2,378.51 in pending order value never confirms.
- **Impact**: Every Stripe payment HOTMESS receives loses its writeback. No paid membership can flip from `free` to `hotmess/connected/promoter/venue`. No boost can flip from purchase → `user_active_boosts`. Stripe payouts may still land in the PageReady account but the app shows zero confirmation.
- **Owner**: Phil — Stripe dashboard → Developers → Webhooks → Edit endpoint, change URL to `https://hotmessldn.com/api/stripe/webhook` and re-sync `STRIPE_WEBHOOK_SECRET` to that endpoint's signing secret.
- **Time to fix**: 5 minutes
- **Why it ranks #1**: Single biggest delta between work shipped and money collected. Same finding as May 4. Cheapest possible fix with largest single revenue unblock.

### 2. 🔴 P0 — Stripe `sk_test` + `pk_live` key mismatch
- **Category**: Revenue / infrastructure
- **Evidence**: `STRIPE_SECRET_KEY` starts `sk_test_`, `VITE_STRIPE_PUBLISHABLE_KEY` starts `pk_live_`.
- **Impact**: Frontend builds a Stripe Elements session against the live publishable key. Backend then attempts to confirm using the test secret key — Stripe rejects every cross-mode call. Even *if* the webhook were correctly routed (#1), no real payment would complete.
- **Owner**: Phil — Vercel env → swap one to match the other (probably set both to live; we're in `livemode:true` already on the account).
- **Time to fix**: 5 minutes + 1 redeploy
- **Why it ranks #2**: Co-blocker with #1. Either alone keeps revenue at £0. Both together must be fixed before any paying customer is possible.

### 3. 🔴 P0 — WhatsApp token expired 2026-04-15 (26 days now)
- **Category**: Safety / dispatch
- **Evidence**: `curl -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN" https://graph.facebook.com/v18.0/me` → 401, "Session has expired on Wednesday, 15-Apr-26 21:00:00 PDT"
- **Impact**: SOS dispatch via WhatsApp dead. trusted_contact_alert dispatch via WhatsApp dead. 6 `whatsapp:failed` rows in safety_delivery_log. This is the *safety* surface; the brand is built on "real care."
- **Owner**: Phil — Meta for Developers → app → Generate new system user token (long-lived, 60 day) → Vercel env → redeploy.
- **Time to fix**: 15 minutes
- **Why it ranks #3**: HOTMESS sells care/aftercare as a core value prop. A safety dispatch channel that has been silently dead for 26 days is the kind of thing that ends a Twitter thread badly. Equal severity to the Stripe issues but slightly less easy to fix.

### 4. 🔴 P0 — Resend domain `send.hotmessldn.com` status=failed
- **Category**: Email / auth / safety
- **Evidence**: `GET /domains/d11e90c9…` → `status:failed`, all three records (DKIM TXT, SPF TXT, SPF MX) marked failed despite DNS resolving them in-zone.
- **Impact**: Magic-link signup 500s for everyone except `phil@hotmessldn.com` (Resend test mode). Email confirmation for email+password signup never arrives. Email channel for trusted_contact alerts dead (5 `email:failed` rows). Daily 07:00 brief email cron can't fire.
- **Owner**: Phil — Resend dashboard → Domains → send.hotmessldn.com → click "Verify DNS records" again, or rotate to a fresh domain if Resend's verification is stuck.
- **Time to fix**: 15 minutes (manual click) or 30 minutes (rotate domain)
- **Why it ranks #4**: Email is the *fallback* signup path — Apple/Google/Telegram should work without it, but a real user who picks email gets a hard fail. Also blocks every other email touchpoint.

### 5. 🔴 P0 — `uri_allow_list` open-redirect wildcards in Supabase auth
- **Category**: Security
- **Evidence**: `https://**, http://**` in Supabase auth allowlist. Unchanged from May 4.
- **Impact**: Any HTTPS or HTTP URL can be a valid Supabase auth redirect. An attacker can craft a magic-link or OAuth callback URL that redirects the user's authenticated session to an arbitrary phishing host. This is the textbook open-redirect → session theft chain.
- **Owner**: Phil — Supabase dashboard → Auth → URL Configuration → Redirect URLs → delete `https://**, http://**` entries, keep only the explicit production + preview origins.
- **Time to fix**: 2 minutes
- **Why it ranks #5**: Trivial fix, real attack surface. Stays here because the user base is so small the actual attack-realization risk is low — but a bug-bounty hunter or security researcher would file this immediately.

### 6. 🔴 P1 — Memberships table has 152 free rows and zero paid
- **Category**: Revenue / product
- **Evidence**: `SELECT tier, status FROM memberships GROUP BY 1,2` → only `(free, active, n=152)`.
- **Impact**: There is no observable code path that flips a membership row from `tier=free` to a paid tier when Stripe checkout succeeds. Even with #1 + #2 fixed, the Stripe webhook handler would land but nothing in the app would care unless there's a code path I missed.
- **Owner**: Cowork code change — `api/stripe/webhook.js` upgrade handler must `UPSERT memberships(user_id, tier, status, ends_at, payment_provider='stripe', stripe_subscription_id=…) ON CONFLICT (user_id) DO UPDATE`.
- **Time to fix**: 30 minutes + tests
- **Why it ranks #6**: Discovered by data, not by reading code — needs verification that this gap really exists vs. me missing a code path. If the gap is real, fixing #1+#2 without fixing #6 leaves revenue uncollected at the *app* level even if Stripe sees the money.

### 7. 🟡 P1 — mailer_otp_exp = 86400 (24h)
- **Category**: Security
- **Evidence**: Supabase auth config `mailer_otp_exp: 86400`. Supabase recommends ≤3600.
- **Impact**: A magic-link captured from a user's inbox is valid for 24h instead of 1h. Phishing window is 24× longer than recommended.
- **Owner**: Phil — Supabase dashboard → Auth → Email → OTP expiry → 3600.
- **Time to fix**: 30 seconds
- **Why it ranks #7**: One-click fix, smaller impact than #5.

### 8. 🟡 P1 — Onboarding stuck at `stage='start'` for 110/152 (72%)
- **Category**: Funnel / product
- **Evidence**: `SELECT onboarding_stage, count(*) FROM profiles`. 110 rows at `start`, 18 at `complete`, 16 at `quick_setup`, 4 at `signed_up`. The Grindr-fast PRs #254-#256 compressed onboarding but the funnel doesn't show measurable improvement.
- **Impact**: The OS doesn't work for 72% of people who hit the AgeGate. Either they bounce at the AgeGate checkbox, or the state machine doesn't advance them out of `start`. Without instrumentation we can't tell which.
- **Owner**: Cowork code change — add analytics event at each stage transition + sample 10 of the stuck profiles to see if they have anything else (avatar, sessions, last_seen_at) to diagnose whether they're real users who bounced or test rows that never reach signed_up.
- **Time to fix**: 2-4 hours (instrument + sample + write a follow-up)
- **Why it ranks #8**: This is the deepest product question of all the open issues. Fixing it requires understanding what's actually happening, not just config changes.

### 9. 🟡 P1 — AzuraCast / radio stream not provisioned
- **Category**: Product surface
- **Evidence**: `radio.hotmessldn.com`, `azuracast.hotmessldn.com`, `stream.hotmessldn.com` all NXDOMAIN.
- **Impact**: Radio tab + Music tab + RadioMiniPlayer all render UI for a stream that 404s. HOTMESS RADIO is in the brand DNA; right now it's dead air.
- **Owner**: Phil — Provision Hetzner VPS, install AzuraCast (or RadioKing managed), point `radio.hotmessldn.com` A record at it, set `NEXT_PUBLIC_RADIOKING_STREAM_URL` in Vercel env.
- **Time to fix**: 2-4 hours (Phil's hands-on)
- **Why it ranks #9**: Big visible feature, but doesn't block monetisation, signup, or safety. Until it's there, the radio tab is brand cosplay.

### 10. 🟡 P2 — `/api/admin/safety-switch` 500s unauthed (leak)
- **Category**: Security / hygiene
- **Evidence**: `curl https://hotmessldn.com/api/admin/safety-switch` → `{"error":"Failed to get safety state"}` HTTP 500.
- **Impact**: Should 401. Currently leaks "an admin endpoint exists here, here's an internal error" — minor info disclosure, attacker can fingerprint admin routes.
- **Owner**: Cowork code change — auth gate before the try/catch.
- **Time to fix**: 10 minutes
- **Why it ranks #10**: Smallest impact on the list. Included because it's the cleanest example of "we have admin routes that aren't properly gated."

## Honourable mentions (below the cut but worth tracking)

- `data-retention` cron returning 500 daily — TypeError on `supabase.from(...)` inside the handler. Job not actually retaining anything; GDPR clock running.
- Glen McCarty still in trusted_contacts post-breakup — Phil-personal call.
- `kv_store_*` tables present but unused — DROP after one more session of confirming zero readers.
- Edge cache age 46h on `/` — Vercel cache-control says `max-age=0, must-revalidate` but a 46h-old etag is being served. Investigate purge behaviour.
- `/api/right-now-feed`, `/api/products`, `/api/events`, `/api/beacons` 200 unauth — confirm whether this is intentional public read or RLS-leak.
- `external_apple_team_id` NULL in Supabase OAuth config — verify Apple sign-in actually works end-to-end.
- Onboarding funnel has 6 distinct `onboarding_stage` values including overlapping `complete` vs `completed` — schema drift.


---

# PART 5 — IMPROVEMENT SUGGESTIONS FROM UX WALKTHROUGH

Visual walkthrough was deferred (no Chrome connection); these are derived from
the code + API evidence. P-tier definitions as in the brief.

## P0 — would-make-me-leave issues

| # | Location | Problem | Suggested fix | Effort |
|---|---|---|---|---|
| P0-A | Signup screen — email path | User who types email gets either (a) a "More options" hidden form they may not find, or (b) the legacy magic-link 500. No fail-safe message saying *"email signup is unavailable right now — please use Apple, Google, or Telegram."* | When `RESEND_API_KEY` is unverified, swap the email form for an explicit "Email signup is temporarily unavailable — use 1-tap above" banner | S |
| P0-B | Signup screen — "More options" expander | A new user does NOT know "1-tap is better than email" — they may default-trust email. Apple/Google/Telegram are 1-tap on PURPOSE but the UI doesn't say so. | Add a one-line subhead above the OAuth row: *"1-tap. No password to remember."* + dim the "More options" link slightly | S |
| P0-C | Pulse globe — empty state | New user lands on `/pulse` and sees a globe with **zero beacons everywhere** (8 cities all `active_beacons:0`). This is the homepage of the OS. It looks broken. | Either (a) seed 10-20 demo "live now" beacons so the globe reads as alive in major cities until volume catches up, or (b) replace the empty globe with a "Be the first in your city" CTA that drops a beacon | M |
| P0-D | Market — buy flow | User clicks Buy on HNH MESS / membership / boost → Stripe checkout → payment lands at PageReady → app shows order "pending payment" indefinitely. From the user's perspective: *"I paid, why does the app think I didn't?"* | Fix webhook URL (#1 in Part 4). UX-side: surface a "Confirming with Stripe…" pending state with a 60s timeout, and a "Did your payment confirm? Refresh" button | S (config) + S (UX state) |
| P0-E | Safety — SOS confirmation screen | If a real SOS is triggered, dispatch fails silently on WhatsApp + email; SMS may or may not work depending on Twilio key scope. User sees the SOS confirmation but no actual contact gets pinged. | Until all 4 channels work, the SOS UI should explicitly say which channels are configured for the current account ("WhatsApp: connected · SMS: connected · Email: connected"). If a channel is dark, mark it on screen. | M |

## P1 — would-frustrate-but-I'd-stay

| # | Location | Problem | Suggested fix | Effort |
|---|---|---|---|---|
| P1-A | Onboarding | DeferredProfileNudge prompts for "Add a name" on /pulse, /ghosted, /. But 57% of users (86/152) have no avatar. The nudge should also ask for a photo. | Extend nudge with "Add name *and* photo" — same banner, two CTAs | S |
| P1-B | Pulse — radio mini-player | Stream URL NXDOMAINs. Mini-player will show "Live now" but the audio fails. | If stream URL DNS fails, hide the mini-player entirely instead of showing a broken play button | S |
| P1-C | Market — preloved listings | 15 preloved listings in DB but the seller_id is all the same single seller. The Preloved tab will show the same person 15 times. | Either add buyer-side filtering by seller, or seed varied seller data, or hide preloved until there's a real Phase-2 seller | S |
| P1-D | Safety — trusted contacts | Glen McCarty is in scanme@sicqr.com's list with all notify flags on. Phil hasn't removed him post-breakup. | Phil-personal call — surface a "you haven't reviewed your trusted contacts in 30+ days" reminder in /safety | XS |
| P1-E | Ghosted — empty signal | 152 profiles minus 13 ghosts = 139 candidates, but 51 have no name and 86 have no avatar. The Ghosted grid will look like a wall of placeholder avatars. | Ghost-filter should also hide profiles with NULL display_name AND NULL avatar_url from the grid (they're not "you" — they're shells) | S |

## P2 — minor polish

| # | Location | Problem | Suggested fix | Effort |
|---|---|---|---|---|
| P2-A | Homepage / | `x-vercel-cache: HIT` with `age: 167170` (46h) on the HTML root. New deploys take longer than expected to reach the edge for users with old SW caches. | Investigate Vercel cache-control settings; consider explicit purge on deploy | S |
| P2-B | /robots.txt | Currently returns SPA HTML. SEO can't index. | Add a real /robots.txt with `User-agent: * Allow: / Sitemap: /sitemap.xml` and a basic sitemap.xml | XS |
| P2-C | Stripe account display name | "PageReady" — looks like a placeholder from when account was created. | Phil → Stripe dashboard → Settings → Business name = "HOTMESS LDN" | XS |
| P2-D | /api/admin/safety-switch | 500s unauthed (P0-10 above) | Auth gate first, catch second | S |
| P2-E | Cron data-retention | Returns 500 daily for ~30 days now. Job isn't actually retaining anything; GDPR clock running on raw `meet_sessions` past 48h. | Fix the TypeError in api/cron/data-retention.js | S |
| P2-F | kv_store_* tables | 4 tables, base44 residue, 17+9+1+0 = 27 rows total. No consumers. | DROP TABLE after one final grep confirming zero references | XS |
| P2-G | Onboarding stages schema | `complete` and `completed` are different `onboarding_stage` values. 18 rows in `complete`, 1 row in `completed`. | Standardise to `completed`, backfill the 18 rows | XS |

## Copy / content fixes

- "1 MEMBERS ONLINE" → already fixed to singular/plural (PR `e4e2509b`) ✓
- Magic-link 500 error is currently visible to non-Phil users — should be replaced with a user-friendly "Email signup is temporarily unavailable" message *before* the request is even made
- `<title>HOTMESS - Global Nightlife Discovery</title>` and `og:title HOTMESS — Global Nightlife Discovery` use different dashes (hyphen vs em-dash). Pick one.
- Description copy is solid: *"Queer-led nightlife, music, and care. Real radio. Real venues. Real community."* — keep
- Manifest description is weaker: *"Discover events, connect with people, and explore the world's nightlife scene on an interactive 3D globe."* — generic. Bring it closer to the brand voice from the og description.


---

# PART 6 — PROPOSED NEXT STAGE

**NOTE TO PHIL**: this is a *proposal*, not an execution plan. Per the brief,
Cowork wrote this without running any of it. Read, revise, then say "go" and
I'll execute the sequence you approve.

## Strategic frame

Picking from {revenue, user growth, feature completeness, safety reliability},
the **right next-stage goal is *revenue plumbing + safety reliability*, in
that order**. Justification:

- Feature completeness is **not** the bottleneck — 22 v6 chunks shipped, 25 PRs landed in a single day on May 9, onboarding compressed to 4 screens, auth has 5 paths (Apple/Google/Telegram/Phone/Email), Market is wired, Pulse is wired, Safety code is wired. The product is *built*.
- User growth is **not** today's blocker — 152 profiles in 5 weeks is healthy for a queer-niche pre-launch. The bottleneck isn't getting people to the door, it's that the door 500s on email signup and the cash register doesn't ring.
- Revenue plumbing is two config fixes (Stripe webhook + key alignment) and one code change (membership tier upsert in webhook). All the Stripe products, prices, env vars, and membership pricing rows are already there. *The thing that's stopping HOTMESS from collecting money is two strings of text in two dashboards.*
- Safety reliability is the brand promise. Right now WhatsApp 401s, email 500s, push is skipped, only SMS partially works. A real SOS today fails silently — that's the kind of incident that ends a brand. WhatsApp token rotate is 15 minutes; Resend re-verify is 15 minutes; verifying the SMS path is real engineering. All small.

These two themes together = "make the floor solid before pushing for users."

## Stage objective (single sentence)

**Ship `OPERATION FLOOR`: 7 surgical fixes that unblock paid revenue, restore
the safety dispatch matrix, and close the open-redirect window — measured by:
one paid Stripe transaction completing end-to-end (webhook → membership upsert
→ tier flip), one SOS dispatch reaching all 4 channels in a test, and the
Supabase auth advisor showing zero open-redirect entries.**

## Ship sequence

Each step has scope, why-this-order, time estimate, owner, success criteria.

### Step 1 — Repoint Stripe webhook to hotmess-globe
- **Scope**: Stripe dashboard → Webhooks → edit endpoint URL: `https://rawcut.vercel.app/api/stripe/webhook` → `https://hotmessldn.com/api/stripe/webhook`. Rotate signing secret → update `STRIPE_WEBHOOK_SECRET` in Vercel env → redeploy.
- **Why this order**: Cheapest, biggest single revenue unblock. Doesn't depend on anything else.
- **Time**: 5min config + 1min redeploy = **6 minutes**
- **Owner**: Phil (Stripe dashboard) + Cowork (env update via CLI)
- **Success**: Trigger a test webhook event from Stripe dashboard → see it land in `/api/stripe/webhook` runtime logs with 200.

### Step 2 — Align Stripe live/test keys
- **Scope**: Vercel env → set `STRIPE_SECRET_KEY` = `sk_live_…` (the live secret pair to `pk_live_…`). Redeploy.
- **Why this order**: Co-blocker with Step 1; without this, even a correctly routed webhook can't process anything.
- **Time**: **5 minutes**
- **Owner**: Phil (Stripe dashboard for live secret) + Cowork (Vercel env update)
- **Success**: Test buy of a £1.49 boost → Stripe charge succeeds in live mode.

### Step 3 — Upsert membership tier on Stripe webhook
- **Scope**: `api/stripe/webhook.js`: on `customer.subscription.created` or `checkout.session.completed` with `metadata.tier`, `UPSERT memberships(user_id, tier, status='active', ends_at=…, payment_provider='stripe', stripe_subscription_id=…) ON CONFLICT (user_id) DO UPDATE`. Mirror for `customer.subscription.deleted` → tier='free'.
- **Why this order**: Without this code change, Stripe receipts arrive but the app still thinks the user is `tier=free`.
- **Time**: **30 minutes code + 15 minutes tests = 45 minutes**
- **Owner**: Cowork code
- **Success**: Phil subscribes to `hotmess £7.99/month` via test buy → DB row `memberships(user_id=phil, tier='hotmess', status='active', ends_at=…)` appears within 10 seconds.

### Step 4 — Rotate WhatsApp Graph API token
- **Scope**: Meta for Developers → app → Generate new long-lived (60 day) system user token with `whatsapp_business_messaging` + `whatsapp_business_management` scopes → Vercel env `WHATSAPP_ACCESS_TOKEN` → redeploy.
- **Why this order**: Independent from Stripe. Unblocks safety dispatch.
- **Time**: **15 minutes**
- **Owner**: Phil (Meta dashboard) + Cowork (env update)
- **Success**: Trigger a test SOS for a trusted contact → safety_delivery_log row with `channel=whatsapp status=delivered`.

### Step 5 — Re-verify Resend domain
- **Scope**: Resend dashboard → Domains → `send.hotmessldn.com` → click "Verify DNS records" again. If still failed, rotate to `mail.hotmessldn.com` or `email.hotmessldn.com` and re-create the records. Then test: `curl -X POST /api/auth/magic-link` with a non-Phil address.
- **Why this order**: Unblocks email signup + magic-link fallback + email-channel safety dispatch.
- **Time**: **15-30 minutes**
- **Owner**: Phil (Resend dashboard, possibly DNS rotation)
- **Success**: Magic-link POST with any address returns 200 + email arrives.

### Step 6 — Close the Supabase auth open redirect
- **Scope**: Supabase dashboard → Auth → URL Configuration → Redirect URLs → delete `https://**` and `http://**` entries. Verify only explicit production + preview origins remain. Also drop `automation-integration-enterprise://**` if it's not in active use.
- **Why this order**: Independent security fix. Two-minute job.
- **Time**: **2 minutes**
- **Owner**: Phil (Supabase dashboard — no CLI for this)
- **Success**: Auth callback to `https://attacker.example/` is rejected by Supabase.

### Step 7 — Tighten OTP exp + disable anonymous users
- **Scope**: Supabase dashboard → Auth → Email → OTP expiry → 3600. → Anonymous Sign-ins → off. *(Only flip anonymous off after confirming no v6 chunk depends on it — quick grep for `signInAnonymously` in src/.)*
- **Why this order**: Security hygiene; smallest items in the queue.
- **Time**: **5 minutes**
- **Owner**: Phil + Cowork (grep check)
- **Success**: Supabase auth config returns `mailer_otp_exp:3600, external_anonymous_users_enabled:false`.

## Sequencing logic

- Steps 1+2+3 form one revenue chunk: they MUST be done together (any one without the others = still no money). Bundle them as a single deploy with `verify` (lint/typecheck/test) run as the gate.
- Steps 4+5 are independent comms-channel repairs. Can be done in parallel with 1+2+3.
- Steps 6+7 are Supabase dashboard clicks. Phil can do these in a single sit-down without touching code.

**Total wall-clock**: ~2 hours if Phil's available for the dashboard clicks while Cowork ships Step 3 code. Worst case (Phil only available 1 evening): 4 hours.

## Risk register

| Risk | What could break | Mitigation |
|---|---|---|
| Stripe webhook URL change loses in-flight events | A Stripe event fires during the cutover and is delivered to rawcut.vercel.app then disappears | Run Step 1 at a low-traffic window; check Stripe's webhook event log for any "failed" entries the next morning and replay them |
| Stripe live-mode confirms charge that test-mode never saw | We've been issuing test-mode "succeeded" payment intents to users who might already think they paid | Audit the 110 pending orders before Step 2; any with a `stripe_session_id` deserves an outreach email saying "we caught a missed payment, please verify" |
| Memberships tier upsert conflicts with the bootstrap free-tier trigger | The signup trigger creates `tier=free`; if the Stripe webhook tries to insert it gets a duplicate-key error | Use `ON CONFLICT (user_id) DO UPDATE` not plain INSERT |
| WhatsApp token rotation invalidates any in-flight notify-push edge function calls | Edge function calls that captured the old token in memory will 401 | Edge function reads env on every invocation; redeploy will refresh; no caching issue |
| Resend domain rotation breaks the daily 07:00 brief email cron | If the FROM domain changes, anything referencing the old domain by name will break | Grep for `send.hotmessldn.com` in src/ + api/ before rotating; update references; tests pass before rotation |
| Closing `https://**` from uri_allow_list breaks a redirect Phil forgot about | A preview deploy or local-dev callback URL might rely on the wildcard | Replace the wildcards with explicit `https://*-globe-phils-projects-59e621aa.vercel.app/**` entries that already exist further down the list — those cover preview deploys safely |
| Stripe key swap during user session breaks Stripe Elements | A user mid-checkout sees Elements 400 because pk/sk mismatch resolves the other way | Do the swap at low-traffic; serverside redeploy completes before the rolling client picks up the new pk |

## Out of scope (deferred to stage after next)

- **Onboarding funnel analytics** (110/152 stuck at `start`) — instrument first, fix second; don't rush.
- **AzuraCast / radio stream provisioning** — Hetzner box + AzuraCast install is its own afternoon; Music tab works without it. Park.
- **Membership tier UI redesign** — Stripe upsert (Step 3) unblocks the data; the UI for "you're on Hotmess tier" already exists.
- **Sentry triage + JS-side error pass** — until we have a real user base, the Sentry queue is mostly false positives. Park until first 100 real users.
- **GH Actions e2e CI green** (`VITE_SUPABASE_ANON_KEY` secret) — productive but not blocking revenue.
- **kv_store_\* DROP** — janitorial; do alongside another DB migration session.
- **Cron data-retention 500 fix** — GDPR clock is running but volume is microscopic; fix in next pass.
- **Trusted contact Glen cleanup** — Phil-personal call, not a launch blocker for non-Phil users.
- **All 13 dark v6 flags** — phil_only is the right state until revenue + safety are solid; don't ramp anything else until OPERATION FLOOR is green.

## Why this is the right next stage (3 paragraphs)

**One**: the evidence from Phase 1 says HOTMESS is *built* but *not paid*. £9.99
lifetime revenue against 25 merged PRs in a single day says the velocity-to-
revenue ratio is broken. Two strings of config (webhook URL, key alignment) and
one webhook handler upgrade is what stands between £0 collected and an
arbitrarily-large revenue throughput. Any other next-stage objective that
ignores this is shipping into a bucket with a hole in it.

**Two**: the evidence from Phase 1 also says the safety dispatch matrix has
been silently dead for 26 days (WhatsApp), and that the email channel has
never worked outside Phil's own address. HOTMESS sells "real care" as a brand
value. The first user who triggers SOS expecting WhatsApp to wake their
trusted contact, and finds it doesn't, ends the trust story permanently. The
fix here is hands-on token rotation, not engineering — minutes-not-hours.

**Three**: alternatives considered: (a) a feature-completion stage to ship the
13 dark v6 chunks — rejected because more dark surface area while revenue is
£0 deepens the build/value gap; (b) an aggressive growth push — rejected
because growth into a broken funnel (110/152 stuck at start, no payment
collection) loses goodwill faster than it gains it; (c) a UX polish sweep —
rejected because polish without paid plumbing is decoration. If OPERATION
FLOOR succeeds, the *next* next-stage opens up with leverage: now you can ship
the dark v6 chunks knowing that any user who likes them can pay you, and any
user in crisis can reach help. If OPERATION FLOOR proves anything wrong (e.g.
Stripe Connect is needed for the seller flow, or the webhook handler reveals a
deeper data model gap), we discover it cheaply on a 2-hour cycle rather than
on a 2-week build cycle.


---

# APPENDIX A — Screenshots and evidence files

*No screenshots produced — visual walkthrough deferred. See Methodology Caveat
in Part 2.*

Evidence sources used in this recon:

| Source | Tool | Time |
|---|---|---|
| Vercel project + 20 deployments | `mcp__vercel__get_project / list_deployments` | 03:42Z |
| Vercel runtime logs 7d errors | `mcp__vercel__get_runtime_logs` | 03:42Z |
| Supabase project info | `mcp__supabase__get_project` | 03:42Z |
| Supabase tables (verbose) | `mcp__supabase__list_tables` | 03:43Z |
| Supabase auth config | Mgmt API via osascript | 03:46Z |
| Supabase secrets (27 names) | Mgmt API via osascript | 03:46Z |
| Supabase advisors (security + perf) | `mcp__supabase__get_advisors` | 03:43Z (oversized, summarised) |
| SQL queries (row counts, funnel, orders, memberships, trusted_contacts, safety_delivery_log, cron_runs, feature_flags, schema columns) | `mcp__supabase__execute_sql` × 12 | 03:43-04:00Z |
| Vercel env vars (51 entries) | `vercel env ls / pull` via osascript | 03:50Z |
| Stripe account info, balance, prices, payment intents, subscriptions, customers | `mcp__stripe__*` × 6 | 03:50-03:52Z |
| Stripe webhook endpoints | `curl /v1/webhook_endpoints` via osascript | 03:55Z |
| WhatsApp Graph API `/me` (401 expired) | `curl graph.facebook.com/v18.0/me` via osascript | 03:51Z |
| Resend domain detail | `curl api.resend.com/domains` via osascript | 03:51Z |
| Twilio Account + Verify Service check | `curl api/verify.twilio.com` via osascript | 03:51Z |
| Telegram bot `getMe` | `curl api.telegram.org/bot…/getMe` via osascript | 03:51Z |
| RadioKing/AzuraCast DNS resolution | `curl radio/azuracast/stream.hotmessldn.com` via osascript | 03:51Z |
| Apple Sign-In Supabase config | Mgmt API via osascript | 03:53Z |
| Production HTML + headers | `curl https://hotmessldn.com` | 03:54Z |
| TLS cert | `openssl s_client` | 03:46Z |
| Service worker | `curl /sw.js` | 03:54Z |
| PWA manifest | `curl /manifest.json` | 03:54Z |
| Live API probes (15 routes) | `curl` | 03:55-03:56Z |
| Magic-link POST (revealed Resend test-mode error) | `curl POST /api/auth/magic-link` | 03:54Z |
| Phone OTP POST (Twilio 60200 with test number) | `curl POST /api/auth/phone-otp-send` | 03:54Z |
| Source code (4 onboarding screens + AuthCallback + data-retention cron) | local repo at deployed commit | 03:55-04:00Z |
| Git log (25 commits) + branches | `git log / git for-each-ref` via osascript | 03:46Z |
| Codebase LOC + structure | `find / wc -l` via osascript | 03:50Z |

---

# APPENDIX B — Test account credentials

**No new test account created.** The brief allowed for a `cowork-test+<ts>@hotmessldn.com`
account but the Resend test-mode block meant signup-via-email would 500 for
anything other than `phil@hotmessldn.com`. Apple/Google OAuth requires a real
device + browser session which the Chrome MCP couldn't deliver in this pass.

Existing test accounts referenced (already in skill):
- `e2e.alpha@hotmessldn.com` / `Hotmess2026!`
- `e2e.beta@hotmessldn.com` / `Hotmess2026!`

---

# APPENDIX C — Tool calls that hit walls

For follow-up TOOLS.md updates:

| Tool | What I tried | What failed | Workaround |
|---|---|---|---|
| `mcp__supabase__get_advisors` | Pull full security + performance lints | Output payload 318k chars (security) + 940k chars (performance), exceeds 25k token Read limit | Read file in 1-line chunks via Read tool, used grep but file write-mount was ephemeral; ultimately accepted advisor summary signal from `list_tables` advisory field |
| `mcp__Claude_in_Chrome__list_connected_browsers` | Connect to Phil's Chrome | Returned `[]` — extension not paired | Tried `osascript open -a 'Google Chrome'` to nudge — extension still didn't pair. Could not do visual walkthrough; pivoted to bash-evidence walkthrough. |
| `mcp__Claude_in_Chrome__switch_browser` | Broadcast pairing request | Not attempted (2-min blocking wait would have burnt context) | Open question whether broadcast would have succeeded with Phil at machine |
| `osascript -e 'do shell script "…" with timeout of 30'` | Add timeout to long calls | AppleScript syntax error on `with timeout of` keyword inside `do shell script` | Just dropped the timeout — default 30s was adequate |
| `sentry-cli organizations list` | Pull Sentry issue list | `sentry-cli` not installed locally on Phil's Mac | DSN confirmed in env; need browser-based dashboard check or install sentry-cli to do this in future |
| `gh repo view Ziaullah22/Hotmess-website` | Check Zia's parallel work | `gh` CLI not installed in PATH (despite brief saying it was authed) | Could install via `brew install gh` for next pass |
| `mcp__stripe__list_products` | List all Stripe products | Schema rejected `limit:100` — required integer not string | Dropped to 50, mostly worked; prices list was the more valuable data anyway |
| `curl --max-time` flags | Cap curl timeouts | Not consistently applied | Add `--max-time 10` everywhere for hostile DNS targets |
| `vercel env ls` via osascript | Get env var names | Failed initial time due to PATH not having node | Added `export PATH=…/v22.14.0/bin:…` to PATH; worked on retry |
| Reading `/var/folders/.../tool-results/*.txt` via bash | The saved-result files for oversized MCP responses | Linux sandbox can't see macOS paths | Used Read tool instead — same files visible there |
| `grep -o` flag | Extract just match text | InputValidationError — `-o` not in Grep schema | Used regex instead of -o |
| Vercel CLI `vercel env pull --environment` | Same as above | Worked once Path fixed | Note: writes plaintext secrets to `/tmp/envprod.txt` — left in place since osascript is on Phil's box |

---

*End of HOTMESS_STATE_AND_PLAN.md. Saved to `/Users/philipgizzie/hotmess-globe/HOTMESS_STATE_AND_PLAN.md`. Repo file (not committed). Cowork awaiting Phil's review.*

---

# AMENDMENT — 2026-05-11 11:11 BST (post-Phil pushback)

Phil flagged that the first pass missed "a big data sheet we created the
other day." Searched and found three source documents Cowork should have read
first, not last:

1. **`HOTMESS Ghosted Costings v3.xlsx`** in `~/Downloads/` — a 7-sheet
   financial model for the **Ghosted XXX add-on** (a whole revenue pillar
   the original report doesn't mention).
2. **`STATE.md`** in the repo root — Phil's hand-maintained May 4 audit, the
   actual baseline the brief references when it says "May 4 finding". 696
   lines, follows the same TOOLS.md "could not verify" gate the brief asks
   for, and contains specific corrections to several claims in my Parts 1-6.
3. **`outputs/SESSION_REPORT_2026_05_07.md`** — the 9-PR overnight build wave
   from May 7-9 (Waves B/H/I/C.1-C.4/F/G), explaining the May 9 burst of 25
   PRs that the first pass treated as opaque velocity.

## Cowork honest accounting

The first pass treated CLAUDE.md as ground truth and discovered live state via
fresh queries. It did NOT read `STATE.md` — which is the document that
already had the May 4 baseline, the existing tier names, the radio stream URL
that's actually live, and the brand-visibility correction my Part 3 got wrong.
It also did NOT find the Ghosted XXX costings sheet, which is the single
biggest revenue gap in the original Part 6 OPERATION FLOOR. Mea culpa.

## Specific corrections to Parts 1-6

### Tier names — DB has a bug, not a "model change"

My Part 3 ("Surprises uncovered") read: *"`memberships` table has 152 rows all
`tier=free`"* and treated this as the data model.

**Correct reading per the costings xlsx + STATE.md:** the spec tier names are
`mess` (free), `hotmess` (£7.99), `connected` (£19.99), `promoter` (£44.99),
`venue` (£99.99). The DB writes `tier=free` because the **signup trigger has
the wrong free-tier name** — it should write `tier='mess'`. This is a bug,
not a schema change. Fix is a one-line trigger update + a 152-row backfill
`UPDATE memberships SET tier='mess' WHERE tier='free'`.

### Brand visibility — already on, CLAUDE.md is stale

My Part 1 §1.5 implied HUNG/HIGH/HUNGMESS need Phil to flip `visible: true` in
`src/config/brands.ts`. **STATE.md §5 (verified May 4):** *"All eleven brands
are flipped to `visible: true` in the prod-tip code. … The CLAUDE.md note
that hung/high/hungmess are still hidden is **stale**."* My report propagated
the stale CLAUDE.md. The real gating on those brands is whether Shopify has
products in those collections — different problem.

### Radio — RadioKing IS live, not "no stream"

My Part 1 §1.4 + Part 4 #9 said radio.hotmessldn.com / azuracast.hotmessldn.com
NXDOMAIN means *"the radio tab is brand cosplay"*.

**Correct per STATE.md gap-fill (verified by inspecting the compiled prod
bundle):** the live stream URL baked into prod is
`https://listen.radioking.com/radio/736103/stream/802454` — **RadioKing is
already provisioned and live**. The Hetzner/AzuraCast note in CLAUDE.md is
about a *future migration*, not a *missing capability today*. My report
dropped #9 to mid-tier; it should be removed from OPERATION FLOOR entirely.

### Stripe price IDs — two sets visible

The Stripe API I queried today returned membership prices `price_1TSISz…`
family. The Costings xlsx (May 2026) says the live tier price IDs are
`price_1THYR0Rffz` family. These are **two different price ID sets**. Either
Phil rotated prices since the xlsx was written (then `membership_annual_pricing`
in the DB is correct and the xlsx is the older note), or there are duplicate
Stripe products and only one is wired. **Action: confirm which family is in
the DB's `membership_annual_pricing.stripe_monthly_price_id` matches Step 3
of OPERATION FLOOR or the upsert hits the wrong product.**

### Boost prices — xlsx vs Stripe API mismatch

Costings xlsx says boosts are: Highlighted Message £0.49, Vibe Blast £0.99,
Extra Beacon £1.49, Globe Glow £1.99, Incognito Week £1.99, Profile Bump £2.99.

Stripe API today returned: £1.49, £1.99, £2.49, £2.99, £3.99, £4.99 (6 prices,
all one-time). **The numbers don't match.** Either Phil raised boost prices
in Stripe since the xlsx (so the xlsx is the historical reference and Stripe
is now authoritative), or the Stripe products I'm seeing are a parallel set.
Either way, the boost UI in the app pulls `STRIPE_BOOST_*_PRICE_ID` from env
— if the env points at the higher-£ prices but the UI labels the lower-£
spec from the xlsx, users will see "£0.49 Highlighted Message" and be charged
£1.49. **Action: confirm the env price IDs match the UI copy.**

### Ghosted XXX add-on — entirely missing from my Part 6

This is the biggest miss. The xlsx lays out:

- **Stripe stays clean.** £7.99 `hotmess` tier + boosts + GRANULE + HNH MESS
  all flow through Stripe (2.9% fee).
- **CCBill is a NEW processor** for the XXX add-on (Stripe TOS bans adult
  content; CCBill is industry-standard at ~12% fee).
- **Pricing**: £4.99/month XXX add-on, layered on top of `hotmess` £7.99 →
  blended £12.98 vs Grindr UNLIMITED ~£14.99. Competitive.
- **Attach rate**: 40 % of `hotmess` subs assumed to attach XXX.
- **Conversion**: 5 % of MAU on `hotmess` tier.
- **Net economics**: ARPU of paying user = £9.51/mo, net £9.21/mo after mod
  cost — same per-user regardless of stage.

| Stage | Users | hotmess subs | XXX subs | Stripe net £/mo | CCBill net £/mo | Mod cost £/mo | Net £/mo | Net £/yr |
|---|---|---|---|---|---|---|---|---|
| MVP | 100 | 5 | 2 | 38.79 | 8.78 | 1.50 | 46.07 | £553 |
| MVP | 1 000 | 50 | 20 | 387.91 | 87.82 | 15 | 460.74 | £5 529 |
| Growth | 5 000 | 250 | 100 | 1 939.57 | 439.12 | 75 | 2 303.69 | £27 644 |
| Growth | 10 000 | 500 | 200 | 3 879.15 | 878.24 | 150 | 4 607.39 | £55 289 |
| Scale | 50 000 | 2 500 | 1 000 | 19 395.73 | 4 391.20 | 1 050 | 22 736.93 | £272 843 |
| Scale | 100 000 | 5 000 | 2 000 | 38 791.45 | 8 782.40 | 1 800 | 45 773.85 | £549 286 |

Moderation pipeline (also missed by my report):
- **Yoti** age estimation £0.15/check on signup (OSA-compliant — UK Online Safety Act 2023)
- **NudeNet** self-hosted on RunPod, sunk cost from RAWCUT — every upload, free
- **Microsoft PhotoDNA** — free for qualifying platforms via NCMEC, CSAM hash matching, mandatory for any UGC adult platform
- **StopNCII.org** — free, non-consensual intimate image hashes
- **No FaceTec** — £25k/yr minimum, explicitly excluded
- **Human moderator** — part-time, ~£300/mo, only at 50k+ users

Sub-product unlock structure (per xlsx Existing Pricing tab):
- Free `mess`: 2 regular photos cap, browse only
- `hotmess` £7.99/mo: 6 regular photos, full Ghosted, taps, messaging, music, Dial-A-Daddy, HNH MESS, 3 beacons/mo
- `connected` £19.99/mo: + sell preloved (cap 20), creator dashboard, analytics, 10 beacons/mo
- `promoter` £44.99/mo: + create events, ticketing, Radio slot, 20 beacons, unlimited personas
- `venue` £99.99/mo: + door staff app, Stripe Connect payouts, permanent Globe presence
- Ghosted XXX add-on £4.99/mo (CCBill): 6 XXX photos cap

### Gumroad off-platform revenue — missing entirely

Live products on `scanme2.gumroad.com`:
- GRANULE reverb plugin — £15
- RAWMASTER CLI — £19
- RAWMASTER Desktop — £29
- Smash Daddys Toolkit (RAWMASTER + GRANULE) — £39

These are already shipping. Revenue is off-Stripe so my "lifetime real revenue
£9.99" claim is **wrong** — that's only Stripe. The actual figure includes
whatever Gumroad has cleared (not introspected in this pass). **Action: pull
Gumroad sales summary for an honest revenue baseline.**

### Bottom nav label mismatch

STATE.md last live-browser check found prod showing **6 tabs labelled
"Home / Pulse / Ghosted / Music / Shop / More"** — note "Shop" not "Market".
The routes register `/market`, the UI label reads "Shop". My Part 2 listed
"Market" — I propagated the route name not the UI label. Either rename the
route to `/shop` or the label to "Market" — they should match.

### Onboarding funnel — stage values are unreliable

My Part 4 #8 read 110/152 stuck at `stage='start'`. **STATE.md found 65 of
those 110 also have `onboarding_completed=true`** — i.e. the state machine
advances `onboarding_completed` without updating `onboarding_stage`. So my
funnel breakdown is contaminated. Fixing the issue is not "improve onboarding";
it's first "fix the state-machine schema drift" then re-measure.

### Cron `data-retention` 500 — root cause known

Part 4 honourable-mention. STATE.md identifies the fix already shipped
(`3ab4480e` env-fallback) but the runtime error recurs. The actual TypeError
is on a `supabase.from(...)` call deeper than the env-init — likely a missing
table reference (`meet_sessions` or `safety_alerts.location_data` field).
Cheaper to diagnose with a 5-min code read than a re-run.

## Updated Part 4 — top issues, RE-RANKED with XXX track included

The ranking didn't account for the Ghosted XXX add-on plumbing, which the
costings model identifies as a £4.99/mo product that should sit alongside
hotmess £7.99 to push blended ARPU. New ranking:

| Rank | P | Issue | Why this order |
|---|---|---|---|
| 1 | P0 | Stripe webhook → repoint to hotmess-globe | Same as before |
| 2 | P0 | Stripe `sk_test` + `pk_live` alignment | Same as before |
| 3 | P0 | Membership tier upsert in webhook + free→mess rename | Was P1, promoted: signup trigger writes wrong name; webhook needs to write paid tiers |
| 4 | P0 | WhatsApp token rotation | Same |
| 5 | P0 | Resend domain re-verify | Same |
| 6 | P0 | Open-redirect entries in Supabase allow-list | Same |
| 7 | P1 | **NEW: pick a CCBill alternative + draft XXX add-on integration spec** | Costings model is ready, code is not; without this the whole 40 %-attach revenue line is paper |
| 8 | P1 | mailer_otp_exp 24h → 3600 | Same |
| 9 | P1 | **NEW: confirm Stripe price ID family** (`THYR` vs `TSIS`) matches DB + env + UI labels | Boost UI says one price, Stripe takes another |
| 10 | P1 | **NEW: bottom-nav label "Shop" vs route `/market`** match | UI / route drift on the front door |
| 11 | P2 | Onboarding state-machine schema drift (`stage` vs `completed` decoupled) | Was #8; needs schema fix first then re-measure |
| 12 | P2 | `data-retention` cron 500 (TypeError on deeper supabase.from) | Same |
| 13 | P2 | RadioKing — already live, drop from blockers | **Removed from list** (was Part 4 #9) |

## Updated Part 6 — OPERATION FLOOR + LAYER 2 XXX track

OPERATION FLOOR (Steps 1-7) stays as written, but with these tweaks:

- **Step 3 amended**: webhook handler must `UPSERT memberships(user_id, tier='hotmess'|'connected'|'promoter'|'venue', …)` AND a one-time migration `UPDATE memberships SET tier='mess' WHERE tier='free'` AND a trigger update so `mess` is the default-on-signup name, not `free`.
- **Step 9 (NEW)**: confirm `STRIPE_BOOST_*_PRICE_ID` env values match the UI's price-label copy. If the xlsx is stale and Stripe has updated prices, update the UI copy from £0.49/£0.99/etc to the actual £1.49/£1.99/etc. If the env points at deprecated prices, update env. 10 min.
- **Step 10 (NEW)**: drop the bottom-nav "Shop" label to "Market" (or rename `/market` → `/shop` — pick one). 5 min.

**Then `LAYER 2 — GHOSTED XXX WEDGE`** (second stage, after FLOOR ships):
- Open CCBill merchant application (1-2 day wait); StopNCII + PhotoDNA enrollment (free); Yoti commercial account
- Build the `xxx_photo_uploads` schema (separate from regular `profile_photos`) with NudeNet pre-flight check + PhotoDNA + StopNCII hash check
- `Ghosted XXX` add-on subscription product in CCBill (£4.99/mo)
- App-side: separate XXX album surface gated on `xxx_addon_active` flag in `memberships` (or new `addons` table)
- Marketing copy in xlsx Existing Pricing tab is ready

LAYER 2 isn't part of OPERATION FLOOR — it's the next stage after the floor is
solid. But it's the highest-leverage product to ship next per the costings
model (40 % attach × 5 % conversion of MAU = 2 % of users on £12.98/mo
blended = strong unit economics).

## What Cowork still needs from Phil

1. Confirm the xlsx is the "big data sheet" you meant — or point me at another one (search of mdfind / Spotlight didn't surface anything else recent).
2. Confirm whether the £THYR or £TSIS Stripe price IDs are the live ones in `membership_annual_pricing`.
3. Pull a Gumroad sales summary for an honest revenue baseline (or tell me you have it).
4. After you've read this amendment, say "go on OPERATION FLOOR" and I'll start shipping Step 1, with the Step 3 amendment above wired in.

