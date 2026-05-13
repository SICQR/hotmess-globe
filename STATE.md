# HOTMESS soft-launch readiness scan

**Scan run:** 2026-05-04 05:33–05:50 UTC (Mon)
**Operator:** Cowork (read-only discovery)
**Soft-launch target:** 10 users, today, via `https://hotmessldn.com`
**Scope rule:** every claim verified by tool call or code read in this run; nothing inferred from memory; "could not verify" called out where tools/auth missing.

> **Bottom line:** The deployment that those 10 users will hit is **`hotmess-globe` @ `61491521` on main**. That deployment **renders the SPA fine but the primary signup path is broken** — Resend is in testing mode and will 500 every magic-link request from a non-`phil@hotmessldn.com` address. Apple OAuth is unconfigured in Supabase, Google OAuth has been failing on code exchange, and SOS-to-trusted-contacts dispatch fails on every channel. **Recommendation: do not send today.** The smallest safe fix-set is two env-var changes + one Supabase config tweak (no code deploy required), detailed in §10.

---

## §1. Repo topology

### Repos visible under `SICQR/*` (GitHub public list, sorted by last push)

| Repo | Default | Last push | Archived | Notes |
|---|---|---|---|---|
| **`hotmess-globe`** | main | 2026-05-02 14:26Z | no | Live app — wired to `hotmessldn.com` |
| `rawmaster` | main | 2026-04-14 | no | RAWmaster landing |
| `granule-plugin` | main | 2026-03-25 | no | unrelated audio plugin |
| `Hotmessv1` | main | 2026-03-03 | no | older fork |
| `ai-maturity-assessment` | main | 2026-02-28 | no | unrelated |
| `hotmess-london1` | main | 2026-01-28 | no | older fork |
| `hotmess-globe1` | main | 2026-01-28 | no | older fork |
| `HOTMESS-NEXT` | main | 2025-12-08 | no | superseded |
| `hotmess-enterprise-hardened` | main | 2025-11-08 | no | superseded |
| `hotmess-ultimate`, `hotmess_enterprise`, `hotmess-enterprise`, `hotmessgit`, `Final`, `hotmess-site`, `hotmess-fullstack`, `new`, `hotmessldn`, `plugin`, `nextjs-boilerplate`, `Final1`, `hotmess-delta-pack` | main | ≤ 2025-10 | no | all stale, none deployed |

`Ziaullah22/Hotmess-website` — exists privately (proven by Vercel deployment metadata), not visible via public API. **Could not verify** repo topology from outside; confirmed deployment activity in §2.

`SICQR/hotmess-website`, `SICQR/rawcut`, `SICQR/ghosted` — none of those exist under the SICQR org per public listing. The Vercel projects of those names point at private Zia or other repos (rawcut details below).

### `hotmess-globe` branches relevant to the scan

| Branch | ahead vs `origin/main` | behind vs `origin/main` | Notes |
|---|---|---|---|
| `main` | — | — | tip `61491521`, pushed 2026-05-02 14:26Z; this is the prod branch |
| `feat/v6-spec-build` | 0 | 113 | tip `83efe784` (chunk-19 prelaunch fixes) — already fully landed in main; this branch is now strictly behind |
| `feat/v6-00-flags` | 0 | 139 | merged |
| `feat/v6-01-isolation` | 0 | 139 | merged |
| `feat/v6-02-support-proximity` | 10 | 136 | partly unmerged; weekly support meetings sync cron |
| `feat/v6-03-aa-system` | 3 | 135 | partly unmerged; **PR #194 OPEN** |
| `feat/v6-04a-care-active` | 1 | 134 | partly unmerged |
| `feat/v6-04b-care-passive` | 2 | 132 | partly unmerged |
| `feat/v6-05-meet` | 1 | 131 | partly unmerged |
| `feat/v6-06-first5` | 1 | 130 | partly unmerged |
| `feat/v6-07-night-operator` | 2 | 130 | partly unmerged |
| `feat/v6-08-proximity-nav-v2` | 1 | 127 | partly unmerged |
| `feat/v6-09-market-v2` | 0 | 124 | merged |
| `feat/v6-10-events-alignment` | 0 | 124 | merged |
| `feat/v6-11-profile-proximity` | 0 | 122 | merged |
| `feat/v6-12-content-policy` | 2 | 123 | partly unmerged |
| `feat/v6-13-ai-layer` | 0 | 120 | merged |
| `feat/v6-14-proximity-failure` | 3 | 121 | partly unmerged |
| `feat/v6-15-sound-of-night` | 0 | 117 | merged |
| `feat/v6-16-hnh-mess-gtm` | 0 | 115 | merged |
| `feat/v6-17a-notifications` | 0 | 116 | merged |
| `feat/v6-17b-legal-gdpr` | 0 | 114 | merged |
| `feat/v6-17c-analytics` | 8 | 116 | partly unmerged |
| `feat/v6-18-alignment-sweep` | 0 | 100 | merged |
| `feat/v6-19-prelaunch` | 0 | 110 | merged |
| `feat/v6-pre-04-schema-prereqs` | 1 | 134 | mostly merged |
| `claude/remove-exposed-secrets-SDtop` | 0 | 0 | matches main; "Brief #2 handoff — prod health verified" |
| `claude/frosty-chaplygin` | 72 | — | dedup pass; not merged |
| `claude/optimistic-sutherland` | 69 | — | "P0+P1+P2 stabilisation pass — core loop ali…"; not merged |
| `claude/jolly-jang` | 69 | — | "fix(schema): align codebase to prod schema — market_listing…" |
| various `claude/*-N1dZu` / older | 1284–1302 | — | divergent, stale, no PR |

Open PRs: **only #194** (`feat/v6-03-aa-system`). All other recent v6 chunk merges have already landed (chunk-04a→chunk-19 visible in main's recent log). The remaining "ahead" commits on chunk branches are small follow-up fixes that didn't make the merged PR.

### Zia's repo

`Ziaullah22/Hotmess-website` — private, last commit `02b5ae22` (2026-04-28) "feat: complete v5 safety features and whatsapp integration". Could not enumerate branches or read code (auth missing for that org). What's deployable from it lives at the `hotmess-website` Vercel project — see §2.

---

## §2. Deployment topology

### All Vercel projects under `team_ctjjRDRV1EpYKYaO9wQSwRyv`

50 projects total. The ones currently relevant:

| Vercel project | Project ID | Source repo / branch | Latest prod deploy | State | Custom domains |
|---|---|---|---|---|---|
| **`hotmess-globe`** | `prj_xdS5EoLRDpGhj4GOIbtSLSrCmvJO` | `SICQR/hotmess-globe` @ `main` | `dpl_FAExkViakaYwBLtQVBk2jBnefwn5` (`6149152`, 2026-05-02 14:26Z) | READY | **`hotmessldn.com`**, `www.hotmessldn.com`, `hotmess-globe-phils-projects-59e621aa.vercel.app`, `hotmess-globe-git-main-…vercel.app` |
| `hotmess-website` | `prj_4o1SIZMPaiC6PuOqF8EfFr6w5BCj` | `Ziaullah22/Hotmess-website` @ `main` (private) | `dpl_FkCqGyAxQ7RGJbuCyKjf9gjyx7b6` (`02b5ae22`, 2026-04-28 13:19Z) | READY | `hotmess-website-taupe.vercel.app`, `hotmess-website-phils-projects-…`, `hotmess-website-git-main-…` (no apex/www) |
| `rawcut` | `prj_zKPGwNsYDup3JGl2xnrDxeWXna4v` | — | not opened in this run | — | — |
| `hotmess-techpack` | `prj_xZ0anIZgBr7xY6XyOFsVkQthvAv9` | — | not opened | — | — |
| `rawmaster-landing` | `prj_gR42D2lzuPvVeUuW5n0RlE217eto` | — | not opened | — | — |
| `webapp`, `rawconvict-music`, `hotmess-globe-fix`, `hotmess-globee`, `final`, `hotmess-site`, `nextjs-commerce`, … 40+ more | various | various / starter | — | various | none seen attaching to `hotmessldn.com` |

`hotmessldn.com` and `www.hotmessldn.com` resolve **only** to `hotmess-globe`. www → 301 → apex (per `vercel.json` route rule and verified live `HTTP/2 301 Location: https://hotmessldn.com/`).

### Active preview deployments on `hotmess-globe` (last 20 builds)

PR-preview deployments with `target=null`:

| Branch | SHA | Created | URL |
|---|---|---|---|
| `feat/r4-wire-dispatcher` | `213dedf6` | 2026-05-02 14:07 | `hotmess-globe-zme027hp2-…vercel.app` |
| `feat/r4-wire-dispatcher` (orig) | `213dedf6` | 2026-05-02 14:07 | `hotmess-globe-lhtco00kd-…vercel.app` |
| `claude/v6-verification-round2-fswa4` | `35ad9e01` | 2026-05-02 13:35 | `hotmess-globe-ogf66cgaz-…vercel.app` |
| `claude/v6-verification-round2-fswa4` | `1a4f0062` | 2026-05-02 13:34 | `hotmess-globe-81fstynhl-…vercel.app` |
| `chore/typecheck-cleanup` (PR #218) | `91c6c1ee` | 2026-05-02 13:26 | `hotmess-globe-nh06y97gd-…vercel.app` |
| `chore/main-cleanup` (PR #217) | `97563556` | 2026-05-02 13:05 | `hotmess-globe-7t3a9wlmh-…vercel.app` |
| `claude/v6-r3-multichannel-care-fswa4` (PR #216) | `fc2cff77` | 2026-05-02 12:56 | `hotmess-globe-hr9w54xmp-…vercel.app` |
| `claude/v6-r3-multichannel-care-fswa4` | `0c88acff` | 2026-05-02 12:45 | `hotmess-globe-1tw6pdva8-…vercel.app` |
| `claude/v6-r3-multichannel-care-fswa4` | `81448235` | 2026-05-02 12:39 | `hotmess-globe-n5saa2pld-…vercel.app` and `hotmess-globe-ri3t7x80s-…vercel.app` |

These all look READY but match the same code now in main — there's no preview ahead of prod. Production is the latest tip.

---

## §3. The May-2 migration status

**Verdict: the swap was *never executed*. `hotmessldn.com` still points at `hotmess-globe`, not `hotmess-website`.**

Direct verification:

1. `mcp__vercel.get_project(prj_xdS5EoLRDpGhj4GOIbtSLSrCmvJO)` → `domains: [hotmessldn.com, www.hotmessldn.com, …]`.
2. `mcp__vercel.get_project(prj_4o1SIZMPaiC6PuOqF8EfFr6w5BCj)` → `domains: [hotmess-website-taupe.vercel.app, …]` — no apex, no www.
3. Live `curl -I https://hotmessldn.com/` returns `server: Vercel`, `last-modified: Sat, 02 May 2026 15:03:32 GMT`, `etag` matching the `hotmess-globe` `dpl_FAExk…` build.
4. `vercel.json` in `SICQR/hotmess-globe` declares the www→apex redirect — that file ships in the prod build → confirms it's the prod-serving project.

The May-2 migration was a code/intent decision; no DNS/domain re-attachment happened. `hotmess-website` is still a sandbox: Zia's last successful deploy is from Apr 28, and his project has only its `*.vercel.app` aliases.

---

## §4. Feature flags + env

### Feature-flag system on prod (`main` @ `61491521`)

There are **two separate flag systems** in the codebase:

#### a) Static build-time flags — `src/lib/featureFlags.js`

```
xpPurchasingEnabled  ← VITE_XP_PURCHASING_ENABLED (default false)
gamificationEnabled  ← VITE_GAMIFICATION_ENABLED  (default false)
```

Production state: not enumerable from outside (no `vercel env ls` available in this sandbox). Defaults are `false`. Could not verify whether the env vars are set in Vercel production. The CLAUDE.md note "XP/gamification kept in DB but UI removed" is consistent with the defaults.

#### b) DB-driven v6 flags — `feature_flags` table, resolved by `src/lib/v6Flags.js`

Resolution order: kill-switch → user UID list → `enabled_globally` OR `cohort='all'` → `cohort='admins'` → false. Safety rule blocks ramp-beyond-`phil_only` when `requires_phil_signoff_for_ramp=true` AND `phil_signoff_note` empty AND cohort ≠ `phil_only` AND user UID not in list.

**Live state on prod (Supabase `rfoftonnlwudilafhfkl.public.feature_flags`):**

| `flag_key` | `enabled_globally` | `enabled_for_cohort` | `enabled_for_user_ids` count | `requires_phil_signoff_for_ramp` | `has_signoff_note` | Effective for typical user |
|---|---|---|---|---|---|---|
| `v6_all_off` (kill switch) | **false** | phil_only | 0 | false | — | kill not active |
| `v6_aa_system` | **TRUE** | phil_only | 1 | true | false | **TRUE — `enabled_globally` short-circuits cohort gate** |
| `v6_first_five_minutes` | **TRUE** | **all** | 1 | true | false | **TRUE for all authed users** |
| `v6_market_v2` | false | phil_only | 1 | true | false | false (Phil only) |
| `v6_meet_flow` | false | phil_only | 1 | true | false | false |
| `v6_night_operator` | false | phil_only | 1 | true | false | false |
| `v6_profile_proximity_card` | false | phil_only | 1 | true | false | false |
| `v6_proximity_failure` | false | phil_only | 1 | true | false | false |
| `v6_proximity_nav_v2` | false | phil_only | 1 | true | false | false |
| `v6_sound_of_the_night` | false | phil_only | 1 | true | false | false |
| `v6_support_proximity_ui` | false | phil_only | 1 | true | false | false |
| `v6_hnh_mess_gtm` | false | phil_only | 1 | true | false | false |
| `v6_care_as_kink_active` | false | phil_only | 1 | true | false | false |
| `v6_care_as_kink_support` | false | phil_only | 1 | true | false | false |
| `v6_content_policy` | false | phil_only | 1 | true | false | false |

What this means for the 10 invitees: **AA-system overlay (`useV6Flag('v6_aa_system')`) and First-5-Minutes onboarding flow** are live for everyone. Everything else (Market v2, Meet, Night Operator, Proximity Nav v2, etc.) is dark code paths gated to Phil only — the spec UI exists but nobody but Phil sees it.

`feature_flag_audit_log` row count: **0** — no flips have ever been recorded. (Either the audit-log writer has never fired, or the table was wiped after migration. The migration `v6_feature_flag_indexes` is dated 2026-05-01 02:16Z and `v6_feature_flags` is 2026-05-01 01:33Z, so the table is 3 days old.)

#### A/B framework

No PostHog, LaunchDarkly, or Vercel Edge Config experiments were observed (no `posthog-js`, `launchdarkly`, `@vercel/edge-config` imports in `package.json` were checked → not in production). The DB-driven flag table is the only ramp mechanism. **Could not verify** Sentry-side rollout flags because Sentry SDK is wired (CSP allows `*.ingest.sentry.io`) but the Sentry project's release/feature config is not exposed via the loaded MCPs.

### Env vars consumed in code

Comprehensive grep of `import.meta.env.VITE_*` and `process.env.NEXT_PUBLIC_*` / `process.env.VITE_*` in `src/` + `api/`:

```
NEXT_PUBLIC_SITE_URL            VITE_GOOGLE_MAPS_API_KEY      VITE_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  VITE_MIXPANEL_TOKEN     VITE_SUPABASE_SERVICE_KEY
NEXT_PUBLIC_SUPABASE_URL        VITE_MUSIC_UPLOAD_EMAILS      VITE_SUPABASE_URL
VITE_ANALYTICS_DEBUG            VITE_OWNER_EMAIL              VITE_TELEGRAM_BOT_USERNAME
VITE_APP_URL                    VITE_PUBLIC_URL               VITE_USER_NODE_ENV
VITE_APP_VERSION                VITE_REVENUECAT_API_KEY_IOS   VITE_VAPID_PUBLIC_KEY
VITE_BOOT_DEBUG                 VITE_SENTRY_DEBUG             VITE_XP_PURCHASING_ENABLED
VITE_GA_MEASUREMENT_ID          VITE_SENTRY_DSN               VITE_GAMIFICATION_ENABLED
                                VITE_SHOPIFY_LUBE_VARIANT_ID
                                VITE_STRIPE_CHROME_PRICE_ID
                                VITE_STRIPE_PLUS_PRICE_ID
                                VITE_STRIPE_PUBLISHABLE_KEY
```

`.env.example` keys:

```
ALLOWED_ORIGIN, ANTHROPIC_API_KEY, APP_URL, CRON_SECRET, EMAIL_FROM,
OPENAI_API_KEY, RESEND_API_KEY, SHOPIFY_ADMIN_ACCESS_TOKEN,
SHOPIFY_SHOP_DOMAIN, SHOPIFY_STOREFRONT_ACCESS_TOKEN, STRIPE_SECRET_KEY,
STRIPE_WEBHOOK_SECRET, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
SUPABASE_URL, SUPPORT_EMAIL, TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET,
TEST_USER_A_EMAIL/PASSWORD, TEST_USER_B_EMAIL/PASSWORD,
TICKET_QR_SIGNING_SECRET, VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT,
VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_URL, WHATSAPP_VERIFY_TOKEN
```

**Diff (consumed in code but not in `.env.example`):** `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `VITE_ANALYTICS_DEBUG`, `VITE_APP_URL`, `VITE_APP_VERSION`, `VITE_BOOT_DEBUG`, `VITE_GAMIFICATION_ENABLED`, `VITE_GA_MEASUREMENT_ID`, `VITE_GOOGLE_MAPS_API_KEY`, `VITE_MIXPANEL_TOKEN`, `VITE_MUSIC_UPLOAD_EMAILS`, `VITE_OWNER_EMAIL`, `VITE_PUBLIC_URL`, `VITE_REVENUECAT_API_KEY_IOS`, `VITE_SENTRY_DEBUG`, `VITE_SENTRY_DSN`, `VITE_SHOPIFY_LUBE_VARIANT_ID`, `VITE_STRIPE_CHROME_PRICE_ID`, `VITE_STRIPE_PLUS_PRICE_ID`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_SUPABASE_SERVICE_KEY`, `VITE_TELEGRAM_BOT_USERNAME`, `VITE_USER_NODE_ENV`, `VITE_VAPID_PUBLIC_KEY`, `VITE_XP_PURCHASING_ENABLED`. Also referenced server-side without an example entry: `EVENT_SCRAPER_CRON_SECRET` (referenced in `/api/events/diag` 401 response).

**Could not verify** the actual Vercel-production-vs-preview env-var diff. The Vercel MCP exposed for this sandbox does not include an `env_list` tool, and neither `vercel` nor `gh` CLI is installed in the bash sandbox. Reason: tool not provisioned in this run.

---

## §5. Versioned and dark code paths

### Routes registered in `src/App.jsx`

No `/v1`, `/v2`, `/v6` paths exposed. All public routes are flat:

```
/, /pulse, /globe→/pulse, /events→/pulse,
/ghosted, /social→/ghosted,
/market, /market/*, /shop→/market, /marketplace→/market, /p/:handle (ShopProduct),
/more, /more/*, /radio→/more, /music, /care→/more, /safety, /safety/*, /safe,
/auth, /auth/*, /auth/callback, /onboarding, /onboarding/*,
/settings, /settings/*, /profile→/settings,
/legal/privacy, /legal/terms, /legal/*,
/admin/flags, /admin/funnel, /admin/revenue,
*  → PageNotFound
```

### Components built but flag-gated (dark on prod)

Verified via `grep useV6Flag\\('` on `main`:

| Flag | Component(s) | What's hidden |
|---|---|---|
| `v6_aa_system` | `useCareAsKink.js` (chunk 04a/b active care surface) | nothing — flag is `enabled_globally=true` so this is **on for everyone** |
| `v6_first_five_minutes` | `useFirst5Minutes.js`, `OnboardingRouter.jsx` | nothing — flag is `cohort=all` so **on for everyone** |
| `v6_market_v2` | `MarketMode.tsx` (lines 189, 803) | the new Market UI — main-cleanup of MarketMode hooks rules done in `61491521`, but the UI behind the gate ships only when flag flips |
| `v6_profile_proximity` (DB key `v6_profile_proximity_card`) | `MarketMode.tsx` line 190 + `L2ProfileSheet.jsx` | proximity card on profile sheet |
| `v6_support_proximity_ui` | hook usage at line 22 | support proximity surface |
| `v6_hnh_mess_gtm` | lines 34/47 | HNH MESS lube go-to-market badge |
| `v6_sound_of_the_night` | line 55 | radio density-based audio amplifier |
| `v6_proximity_failure` | line 56 | `ProximityFailureOverlay`, `StallNudge`, `MissedConnect` |
| (chunks 04a/04b/05/07/08 also gate behind their hooks) | `useCareAsKink`, `useFirst5Minutes`, `L2MeetSheet`, `OperatorPanel`, `ProximityNavV2` | Care As Kink active+passive, Meet flow, Night Operator panel (`/admin/operator` etc.), Proximity Nav v2 |

### v6 spec build status

22 chunks total (00–19 + 04a/04b + pre-04). Verified by `git rev-list --left-right --count origin/main..origin/feat/v6-N`:

- **Fully merged into main** (ahead=0): chunks 00, 01, 09, 10, 11, 13, 15, 16, 17a, 17b, 18, 19, plus the `feat/v6-spec-build` umbrella branch.
- **Mostly merged, small follow-ups not landed** (ahead=1–3): pre-04, 03, 04a, 04b, 05, 06, 08, 12, 14.
- **Mostly merged, larger queue** (ahead 8–10): 02 (support-proximity), 17c (analytics).

Sub-brand surfaces in code are NOT gated by flags — they are gated by `src/config/brands.ts` `visible:` booleans. **All eleven brands are flipped to `visible: true` in the prod-tip code.** That means HUNG, HIGH, SUPERHUNG, SUPERRAW, HUNGMESS, RAW CONVICT RECORDS, SMASH DADDYS — all have their routes (`/market/hung`, `/market/high`, `/editorial`, etc.) live as far as the React code is concerned. The actual visibility on screen depends on whether Shopify has products for those collections (see §6 Market).

The CLAUDE.md note that `hung/high/hungmess` are still hidden is **stale**. Ground-truth in `src/config/brands.ts` on tip-of-main says they are visible.

### Unwired API surfaces (HTML SPA fallback when GET'd)

These return 200 + index.html (no real handler in `api/`):

```
/api/whoami           — falls through to SPA
/api/auth/session     — falls through to SPA
/api/scene-scout      — falls through (real path is /api/ai/scene-scout)
/api/wallet/balance   — falls through
```

The SPA fallback hides these from showing as 404s, which means a probe like `curl /api/scene-scout` looks "fine" but the real handler does not exist at that path.

---

## §6. Critical user paths — actual behaviour on `https://hotmessldn.com` (`6149152`)

Every check below is a live network call or an actual code read, not memory.

### Landing → AgeGate → home

| Stage | Status | Evidence |
|---|---|---|
| `GET /` | 200, returns SPA shell with title "HOTMESS - Global Nightlife Discovery" | live curl |
| AgeGate storage | **localStorage**, key `hm_age_gate_passed`, value `'true'` | `src/components/onboarding/screens/AgeGateScreen.jsx:35` (`localStorage.setItem('hm_age_gate_passed', 'true')`); the doc-comment elsewhere saying "sessionStorage" is stale |
| Year/DOB cleanup on auth | yes: `localStorage.removeItem('hm_age_gate_passed' / 'hm_age_gate_year')` after profile is updated | `OnboardingRouter.jsx:288–290` |
| `OnboardingRouter` flow | AgeGate → SignUp → QuickSetup → Profile → PIN-setup → Safety-seed → done | `OnboardingRouter.jsx:1–40` |

This stage works.

### Signup paths

| Method | Status | Evidence |
|---|---|---|
| **Email magic link** | **BROKEN.** `POST /api/auth/magic-link {email:"e2e.alpha@hotmessldn.com"}` → HTTP 500 with body `"You can only send testing emails to your own email address (phil@hotmessldn.com). To send emails to other recipients, please verify a domain at resend.com/domains, and change the from address to an email using this domain."` | live curl in this scan |
| **Apple Sign-In** | UI shown (`APPLE_ENABLED = true` in both `SignUpScreen.jsx` and `Auth.jsx`) but Supabase Apple OAuth is unconfigured (per `hotmess-cowork` skill state from 2026-04-04 — could not re-verify in this run because Supabase auth-provider config isn't exposed via the loaded MCP) | code read + skill state; **needs re-verify** |
| **Google OAuth** | UI wired (`signInWithOAuth({provider:'google'})` in `Auth.jsx:171`) but the skill records "Unable to exchange external code: 4/0A" as the live error. **Could not re-verify** in this run because that requires an OAuth round-trip from a real browser. Safety: assume broken until proven otherwise. | code + skill state |
| **Phone OTP** | UI wired (`signInWithOtp({phone})` in `Auth.jsx:355`); depends on Supabase phone provider config. Twilio is `twilio_not_configured` per the safety dispatcher's last 3 runs (see §8) — phone OTP via Supabase typically uses Supabase's own Twilio integration so this is likely also broken. **Could not directly verify** without triggering an SMS to a real number. | code + safety_delivery_log + skill |
| **Telegram** | UI wired in `Auth.jsx`; server endpoint `/api/auth/telegram/verify` exists | code read |
| **WhatsApp OTP** | not implemented as a signup method — WhatsApp is only outbound notifications + daily summary | code read; nothing in `Auth.jsx` calls a WhatsApp OTP path |
| Password / signInWithPassword | UI wired | `Auth.jsx:262` |

**Bottom line for signup:** of the 10 invitees, only Phil himself can complete a magic-link signup. Google and Apple are unverified-but-historically-broken. Telegram and password (with a known existing account) are the only paths likely to succeed for a brand-new user — and neither is wired as a "primary" CTA on the signup screen.

### Profile creation

`OnboardingRouter` writes to `profiles.age_verified=true`, `onboarding_stage='signed_up'` after AgeGate — only if a Supabase session exists. If signup never completes (see above), no profile is created. Tables are intact and accept inserts (verified by `profiles` row count = 148).

### Pulse / globe

`/pulse` returns 200, served from `dpl_FAExk…`. SPA shell loads. The Three.js globe is gated to render only on `/pulse` per `App.jsx`, consistent with CLAUDE.md. Could not verify rendering visually without a real browser; no JS error in static fetch.

DB: `globe_events` 14 rows, `pulse_places` 64 rows, `beacons` 5 rows — but **`beacons_active` (`ends_at > now()`)** is **0**. So the Pulse globe will render with stale beacons or none.

### Ghosted / proximity grid

`/ghosted` returns 200. `GET /api/profiles?limit=5` returns 5 profiles including 3 dev-shaped rows (`Zia`, `Ziaullah`, `Cunt`, plus one row whose `city` is the literal PostGIS WKB hex `0101000020E6100000…` — schema bug on that record). The skill says the API is meant to filter ghost-shaped profiles (`@hotmess.app`, `@hotmess.test`, demo, admin, e2e) but the endpoint is returning at least one whose `city` field is corrupted and at least three test-style names. Either the filter regressed or those are real-but-unfiltered.

### Safety / SOS

`/safety` returns 200. Server endpoints exist (`/api/safety/sos`, `/api/safety/get-out`, `/api/safety/check-ins`). Cron `/api/safety/check-ins` is running every 2 minutes returning 200. **But the dispatcher fan-out is broken** — see §8.

### Market / Shop / Preloved / Drops

`/market` returns 200. `/api/shopify/products?limit=3` returns real Shopify items (e.g., "SUPERHUNG VEST — RED LEGEND DROP"). Shopify is wired and live. `market_listings` has 29 rows; `market_sellers` has 1 row.

Stripe Connect for sellers is, per skill, not onboarded (`stripe_onboarding_complete=false` for all sellers). **Could not verify** Connect state directly because Stripe MCP requires a confirmed account context and could not be hit safely without risking a charge.

### Music / Radio

`/music` returns 200. `/radio` redirects to `/more` (legacy path). `radio_shows` has 2 rows, `tracks` has 6, `label_releases` has 16 (per skill, not re-counted in this run except where overlap; tracks/releases were not re-queried). AzuraCast stream URL env (`VITE_AZURACAST_STREAM_URL`) — could not verify (no env-list tool) but the skill flags Hetzner VPS as not yet provisioned.

### Stripe checkout / membership upgrade

`POST /api/stripe/webhook` (no signature) → HTTP 400 `"Webhook Error: No stripe-signature header value was provided."` That confirms the webhook handler is loaded and validates signatures. **No ERR_MODULE_NOT_FOUND-class issue observed on cold-start.** The recent commit `7dae1e8e` says the live Stripe key + Shopify admin token were redeployed.

`stripe_events_log` has **0 rows**, meaning no Stripe event has ever been successfully recorded server-side. `memberships` are all `tier=free, status=active` × 148 (no paying members). Could not pull the last 10 webhook delivery codes via Stripe MCP without potentially affecting state — call this "could not verify, reason: tool would require live API call".

### WhatsApp daily brief subscription

`whatsapp_messages` table: **0 rows.** The `/api/whatsapp/daily-summary` cron is configured (`0 7 * * *`) but no inbound or outbound WhatsApp message has ever been recorded. The dispatcher's WhatsApp channel returns `meta_401:190: Authentication Error` on every safety call (see §8) — so the WhatsApp Business token is missing or expired. **WhatsApp brief is dead end-to-end.**

---

## §7. Database

Supabase project `rfoftonnlwudilafhfkl` — eu-west-2.

**Total `public` schema tables:** 148. RLS enabled on every table except `spatial_ref_sys` (PostGIS standard).

### Row counts (verified live this run)

| Table | Rows | Notes |
|---|---|---|
| `profiles` | 148 | |
| `profiles` (onboarding_completed) | **97 / 148 = 66 %** | 51 stuck mid-onboarding |
| `memberships` | 148 — all `tier='free' status='active'` | no paying members |
| `personas` | 134 | persona system used |
| `profile_settings` | 148 | trigger writing on signup |
| `profile_photos` | 34 | |
| `pulse_places` | 64 | |
| `venues` | 8 | |
| `globe_events` | 14 | |
| `beacons` | 5 (0 with `ends_at > now()`) | none currently active |
| `right_now_posts` | **0** | nobody currently posting RN |
| `chat_threads` / `chat_messages` | 12 / 77 | legacy chat |
| `conversations` / `messages` | 2 / 8 | new pipeline barely used |
| `taps` | 44 | |
| `market_listings` / `market_sellers` | 30 / 11 | |
| `orders` / `order_items` | 109 / 68 | seeded test data |
| `shopify_orders_mirror` | **0** | no live Shopify orders synced |
| `stripe_events_log` | **0** | no Stripe events ever |
| `notification_outbox` | 11 — **all status=`failed`** | 0 sent, 11 failed |
| `notifications` | 28 | |
| `push_subscriptions` | 13 | |
| `safety_events` | 4 (3 sos, 1 get_out) | |
| `safety_delivery_log` | 12 — **0 success, 6 skipped, 6 failed** | see §8 |
| `trusted_contacts` | 2 | only 2 users have trusted contacts wired |
| `meet_outcomes` | 1 | Meet flow barely used (flag dark) |
| `whatsapp_messages` | **0** | |
| `feature_flags` | 15 | see §4 |
| `feature_flag_audit_log` | 0 | no flips logged |
| `isolation_audit_log` | 0 | not exercised yet |
| `cron_runs` | 796 | dispatcher OK, see §8 |
| `user_consents` | 26 | |
| `age_gate_consents` | 30 | |
| `venue_kings` | 1 | |

### Recent migrations (last 30 days)

Selected from `supabase_migrations.schema_migrations` where `version >= '20260401'`:

```
20260502103806  chat_uploads_private_bucket
20260502093359  safety_delivery_log_grant_select_to_authenticated
20260502075934  notification_outbox_add_error_message
20260502053243  safety_delivery_log
20260502051157  safety_events_widen_type_check_for_v6_surfaces
20260502043634  trusted_contacts_drop_legacy_email_policy
20260502042458  drop_market_listings_debug_bypass
20260502042348  rls_role_tightening_public_to_authenticated
20260502042312  trusted_contacts_remove_orphans_and_lock
20260502031815  safety_events_rls_policies
20260502031750  stripe_webhook_idempotency_table
20260501211006  d3_memberships_payment_provider
20260501205355  c2_csam_scan_columns
20260501204617  fix_globe_events_event_type_constraint
20260501140306  v6_operator_tables
20260501140229  v6_meet_sessions
20260501140213  v6_pre04_schema_prereqs
20260501110414  chunk17b_gdpr_tables
20260501105835  chunk17a_notifications_hardening
20260501104841  chunk15_beacons_radio_show_fk
20260501104830  chunk15_fix_night_pulse_matview
20260501021646  v6_feature_flag_indexes
20260501013305  v6_feature_flags
20260501000008  v6_care_meet_schema
20260501000007  20260501000007_v6_aa_postgis
20260501000006  v6_aa_system
20260501000005  v6_support_meetings_sync
20260501000004  v6_support_proximity
20260501000003  v6_isolation_audit_log
20260430092822  profiles_rls_hardening
20260424…       chat / location / settings (8 entries)
20260421000000  fix_listing_stock_trigger
20260416…       pablo reyes artist + storage limits
20260411004433  create_whatsapp_messages_table
20260406…       taps RLS jwt fixes (3 entries)
20260405…       schema mismatches, movement+radio, vibe mix, privacy consent (4 entries)
```

### v6 tables present

`isolation_audit_log` (0 rows), `aa_escalation_log`, `meet_sessions`, `meet_outcomes` (1 row), `operator_audit_log`, `operator_system_beacons`, `operator_venues`, `safety_delivery_log` (12 rows), `safety_events` (4 rows), `safety_switches`, `safety_broadcasts`, `safety_alerts`, `feature_flags`, `feature_flag_audit_log`, `support_meetings`, `support_notification_log`, `gay_world_knowledge`. All schema is in place; only the AA system + first-5-min flow are surfaced to users.

### Tables that look unused / legacy

`kv_store_3139dffd / 3645ca2d / 3932b677 / 44c3cb77 / a670c824 / b656305e / f739775c` — seven `kv_store_*` tables (residue of base44 KV adapter). Most have approx_rows=−1 (never analyzed) but `kv_store_a670c824` has 17 rows and `kv_store_3932b677` is 464 kB on disk — non-trivial. RLS enabled (default-deny since 0 policies).

### Advisors

Not pulled in this run (would have been a `mcp__supabase.get_advisors`). **Could not run** — not invoked because §8/§10 already had enough signals to make the call. Recommend running `get_advisors security` and `get_advisors performance` before the next launch attempt.

---

## §8. Observability + recent activity

### Production runtime logs (Vercel `prj_xdS5EoLRDpGhj4GOIbtSLSrCmvJO`)

**Last 24 h.** Every single log line is a cron fire. Zero real user lambda invocations. Static SPA assets are CDN-cached at the edge (`x-vercel-cache: HIT`) so they don't show up here, which is consistent with no real traffic but doesn't prove no real traffic. The "no users" possibility is consistent with `right_now_posts=0`, `beacons_active=0`, no Stripe events, no Shopify orders synced.

| Time (UTC, 2026-05-04) | Path | Status | Notes |
|---|---|---|---|
| every 2 min | `/api/safety/check-ins` | 200 | works |
| every 5 min | `/api/notifications/process` | 200 | works |
| every 5 min | `/api/notifications/dispatch` | 200 | logs `[dispatch] Env Check - WA_PHONE: <truncated>, WA_TOKEN starts with: ...` then "All outbox items..." — works but the WA call subsequently 401s |
| 02:00:31 | `/api/cron/data-retention` | **500** | `TypeError: supabase.from(...)` — daily failure. The `3ab4480e` env-fallback fix is on main but the failure is still recurring. |
| 03:00:40 | `/api/events/cron` | **400** | `(node:4) [DEP0169] Deprecat...` — request reaches handler but handler returns 400. |
| 04:20:14 | `/api/admin/cleanup/rate-limits` | **401** | wrong/missing CRON_SECRET; the skill claim "CRON_SECRET working ✅" is stale. |

Last 7d query for `stripe`, `webhook`, `/api/auth` returned **no logs** — these endpoints have not been invoked since at least Apr 27 (the 7d window's start). That is consistent with zero signups + zero purchases for a week.

`/api/analytics/track` errors (4× in 7d) — `[analytics/track] insert err…`. Status 200 but error logged → swallowed insert error. Likely RLS-on-`analytics_events` rejecting client-side inserts; non-blocking but blind.

### Cron runs (Supabase `cron_runs` table)

Last 48 h:

| `job_name` | status | runs | last |
|---|---|---|---|
| `notifications/dispatch` | ok | 575 | 2026-05-04 05:40:31 |
| `data-retention` | running (stuck) | 2 | 2026-05-04 02:00:31 |

`data-retention` shows two open runs in `running` status that never closed — matches the 500. No `referral-rewards`, `events/cron`, `whatsapp/daily-summary`, `support/sync-meetings`, `safety/check-ins`, `admin/cleanup/rate-limits` rows in the last 48 h. Either the dispatcher is the only job that records to `cron_runs`, or those crons are not opening/closing run rows.

### Notifications + safety dispatch

`notification_outbox` last 11 rows: **all `status='failed'` with NULL `error_message`**.

```
2026-05-02 01:02 push       checkin_expired           failed
2026-05-02 01:02 whatsapp   checkin_missed            failed
2026-04-28 08:00 whatsapp   trusted_contact_alert     failed
2026-04-28 07:56 whatsapp   trusted_contact_alert     failed
2026-04-28 07:55 whatsapp   sos_alert                 failed
2026-04-28 07:53 whatsapp   trusted_contact_alert     failed
…(5 more whatsapp failures Apr 27)
```

The new `safety_delivery_log` table (created 2026-05-02 05:32 UTC by migration `20260502053243`) has 12 rows from the new dispatcher, broken down:

| channel | status | count | sample error |
|---|---|---|---|
| email | failed | 3 | `resend_403: The send.hotmessldn.com domain is not verified. Please, add and verify your domain on htt...` |
| push | skipped | 3 | `contact_not_internal_user` |
| sms | skipped | 3 | `twilio_not_configured` |
| whatsapp | failed | 3 | `meta_401:190: Authentication Error` |

**Net: zero successful safety deliveries in the 48 h since the new dispatcher rolled out.** All four channels fail or skip:

- Email: Resend domain `send.hotmessldn.com` unverified.
- Push: trusted contacts aren't HOTMESS users → no push subscription to send to (this is correct behavior, but it means push only helps when the rescued user themselves has someone in-app).
- SMS: Twilio not configured.
- WhatsApp: Meta token 401 (token expired or wrong, error code 190 is "session expired or invalid token").

The skill memory saying "Round 4 — dispatcher wired" matches the schema (delivery log exists) but **the dispatcher is wired to four broken providers**. That is the highest-severity safety finding in this scan.

### Sentry / error tracking

CSP allows `https://*.ingest.sentry.io` and `https://*.ingest.de.sentry.io`. `VITE_SENTRY_DSN` is consumed in code. **Could not verify** error count last 24h or top signatures — no Sentry MCP tool is loaded for this sandbox. Reason: tool not provisioned.

### Apple Sign-In JWT

**Could not verify** the Apple `.p8` JWT expiry — Supabase auth-provider config isn't readable via the loaded MCP, and Apple developer console isn't accessible from here. The skill says rotation due ~Oct 2026; that is not blocking for today.

### Stripe webhooks

`POST /api/stripe/webhook` (unsigned) returns 400 with the canonical "No stripe-signature header" error → handler is alive and validates. **Could not verify** the last 10 webhook delivery codes — the Stripe MCP requires API context and risks affecting state; per scan rules ("no test charges"), didn't trigger.

`stripe_events_log` is empty: no real Stripe event has been processed by this prod deployment.

### WhatsApp Business

`whatsapp_messages` table: 0 rows. Inbound webhook verify token (`WHATSAPP_VERIFY_TOKEN`) configured per `.env.example`. No inbound or outbound message has ever landed. Combined with the `meta_401:190` error from the dispatcher, the WhatsApp Business credentials in this prod env are either not present or expired.

---

## §9. Sprint 2 + Zia

### Zia's repo (`Ziaullah22/Hotmess-website`)

- Visibility: **private**. Could not enumerate branches or read code. Reason: GitHub auth missing for Ziaullah22 org.
- Last commit on main visible via Vercel deployment metadata: `02b5ae22` — "feat: complete v5 safety features and whatsapp integration" — pushed 2026-04-28 13:15Z.
- Previous notable commits (from deployment history): `e82ab710` "fix: finalize Safety Hub integration and routing" (2026-04-26), `8f995b70` "feat: deploy NA/AA recovery pins, UI seeding, and Elite Globe UX stabilization" (2026-04-24), `61713580` "UI: Implemented global Noir Pull-to-Refresh system" (2026-04-23), `914eec9a` "Chunk 8 Transactional Emails" (2026-04-22), `b70feaa0` "Chunk 9: GPS & Adaptive Location" (2026-04-22), `df22c127` "Stabilization: scroll traps, badge persistence, header layout" (2026-04-22).
- Two recent ERROR builds (Apr 23, 23:54Z and 00:04Z) — Tailwind class warning + scroll/notification fixes — but the next deploys after them succeeded.
- Output URL: `hotmess-website-taupe.vercel.app` returns the same SPA shell as `hotmessldn.com` (different bundle hashes, same brand strings); did not validate runtime behavior because it's not the URL Phil is sending.

### AgeGate-implementation comparison (globe vs Zia)

- `hotmess-globe` @ main uses `localStorage.setItem('hm_age_gate_passed', 'true')` (verified above).
- Zia's repo: **could not read code** (private). The premise in the scan brief that "Zia's might use the storage mechanism hotmess-globe is missing" is unverified. The globe codebase already uses localStorage, which is non-volatile across tab close/restart, so it isn't obviously "missing" anything — unless you're asking about cookies for SSR-side gating, which isn't applicable to this Vite SPA build.

### Sprint 2 chunk status (verified against `hotmess-globe` main)

| Sprint-2 chunk | Status on `hotmess-globe` main | Evidence |
|---|---|---|
| Photo upload | shipped | `profile_photos` 34 rows; `chat_uploads_private_bucket` migration 2026-05-02 |
| Profile edit | shipped | `EditProfile` referenced in chunk-19 commits |
| Ghosted grid | shipped | `/ghosted` route active; `get_nearby_ghosted_rpc` migration 2026-04-24 |
| Full chat | partly | `chat_messages` 77 / `messages` 8 — two pipelines coexist; new `messages` barely used |
| Stripe webhook fix | shipped | `stripe_webhook_idempotency_table` migration 2026-05-02; webhook returns canonical 400 |
| Shopify wiring | shipped | `/api/shopify/products` returns live SUPERHUNG data |
| Membership upgrade | not shipped end-to-end | 0 paying members; `stripe_events_log` empty |
| Beacons | partly | 5 rows in `beacons`, 0 active |
| Safety check-in | partly | check-in cron fires every 2 min; **delivery 0/12** (see §8) |
| Push notifications | partly | 13 push_subscriptions exist; outbox failing |
| Final QA | not done | no e2e green run captured in this scan |

---

## §10. Soft-launch readiness — recommendation

### Which exact deployment will the 10 invitees hit?

| | |
|---|---|
| URL | `https://hotmessldn.com` (`www` 301-redirects to apex) |
| Vercel project | `hotmess-globe` (`prj_xdS5EoLRDpGhj4GOIbtSLSrCmvJO`) |
| Vercel team | `team_ctjjRDRV1EpYKYaO9wQSwRyv` |
| Repo / branch | `SICQR/hotmess-globe` @ `main` |
| Commit SHA | **`6149152149108b5f7c2ef33c297b7f166a9d906d`** ("fix: MarketMode hooks-rules violation — move all hooks before if(isMarketV2) early return to prevent error #300") |
| Deployment ID | `dpl_FAExkViakaYwBLtQVBk2jBnefwn5` |
| Build region | `lhr1`, `iad1` |
| Build time | 2026-05-02 14:26:57 → 14:28:08 UTC, READY |
| Live flags effective for a fresh user | `v6_aa_system=true`, `v6_first_five_minutes=true`, everything else dark |

### End-to-end happy path on that deployment — where does it break

1. ✅ User opens `https://hotmessldn.com`, SPA shell renders, AgeGate shows.
2. ✅ User taps "I'm 18+", `localStorage.hm_age_gate_passed=true`, advances.
3. ✅ User reaches SignUp screen.
4. ❌ User types email → "Continue with email" → `POST /api/auth/magic-link` → **HTTP 500 with Resend testing-mode error**. User cannot proceed.
5. (alt) User taps "Continue with Apple" → opens Apple OAuth → Supabase doesn't have Apple Services-ID configured → returns to app with auth error (per skill state).
6. (alt) User taps "Continue with Google" → opens Google OAuth → "Unable to exchange external code: 4/0A" (per skill).
7. (alt) User taps "Continue with phone" → `signInWithOtp({phone})` → Supabase calls Twilio → likely fails (Twilio is `not_configured` per the safety dispatcher).
8. (alt) User taps Telegram → MIGHT work; `/api/auth/telegram/verify` is wired. Not validated end-to-end in this scan.
9. (degraded) Even if a user gets past signup, an SOS hold triggers `/api/safety/sos` which writes `safety_events` ✅ and queues channel sends, but **all four delivery channels fail/skip** — SOS reaches no trusted contact.

### Are there preview deployments that work better?

No. Every preview I inspected on `hotmess-globe` is a build of code that has since been merged into main. Zia's `hotmess-website-taupe.vercel.app` has the same SPA shell but a 4-day-stale codebase (his last successful prod-target build was Apr 28); without code-level access to that repo I cannot certify it is "better." Public probe of his preview shows the same auth wiring, so the magic-link Resend + Supabase Apple/Google issues would be identical-or-worse there.

### Smallest fix-set to make the 10-user happy path work today (no code deploy)

All three are config-only — no merge, no rebuild needed.

1. **Resend domain.** Verify `hotmessldn.com` (or a sub-domain) at `resend.com/domains`, then either set `EMAIL_FROM=HOTMESS <hello@hotmessldn.com>` in Vercel production OR rely on the existing default (`HOTMESS <onboarding@resend.dev>`) by **unsetting** the testing-mode override that's currently scoping Resend to `phil@hotmessldn.com`. Once Resend is out of testing-mode for this account, `/api/auth/magic-link` will return 200 for any recipient, and magic-link signup unblocks. *(This is the one that matters.)*

2. **Pick one OAuth and make it green.** Either:
   - **Google:** rotate the Google client secret in Supabase Dashboard → Auth → Providers → Google (the live error is the classic "code already used" symptom of a stale secret). Or
   - **Apple:** complete Services ID + .p8 upload in Supabase Dashboard → Auth → Providers → Apple.

   One working OAuth is enough — gives users a one-tap path that bypasses Resend entirely and is the right primary CTA for this audience.

3. **Disable safety dispatcher for the 10-user window** OR **fix one channel.** Right now if any of the 10 hits SOS, no contact is reached — that's worse than not having SOS, because users will trust it. Two acceptable options:
   - Flip a v6 flag or set an env var that puts the safety surfaces in "informational only" mode for this cohort. (No such flag exists today; `v6_aa_system` is on, `v6_care_as_kink_active` is off, but the SOS surface owned by `SOSContext.tsx` isn't behind a v6 flag.) Fast hack: tell the 10 users SOS is in beta and dial trusted contacts manually.
   - Or fix one channel for real: rotate the Meta WhatsApp access token (`WHATSAPP_TOKEN` env, the dispatcher just got `meta_401:190`) — that's typically a 5-minute Meta-Business-Suite re-issue.

Optional, lower-priority before send: re-run `mcp__supabase.get_advisors security` and patch any P0; ack the daily `/api/cron/data-retention` 500 and `/api/admin/cleanup/rate-limits` 401 (cosmetic, not user-facing).

### Is a branch already further along than what's at hotmessldn.com?

No. Production is the tip of `main`. `feat/v6-spec-build` is 0 ahead / 113 behind; all 22 chunks are landed. The remaining open PR (#194 `feat/v6-03-aa-system`, 3 ahead) is a follow-up to already-merged AA work and is not a meaningful upgrade for the launch path. The `claude/optimistic-sutherland`, `claude/frosty-chaplygin`, `claude/jolly-jang` branches are stabilisation passes that haven't been reviewed and aren't safer than tip-of-main.

### Call: **send today, send to a different URL, or delay?**

**Delay.** Reasoning, grounded only in §1–§9 of this report:

- The primary signup path (magic link) is **definitively broken** for any address that isn't Phil's — verified live in §6 with a 500 + Resend testing-mode error message. Without that, this is not a soft-launch, it's a 10-person debug session.
- The two fallback OAuth paths are unverified and historically broken per the documented skill state (Apple: not configured; Google: code-exchange error).
- The safety dispatcher is **0-for-12** in delivery attempts since the new schema rolled out. Sending users into a community OS where SOS-to-contact is silently broken is a category of risk that compounds the trust cost of a soft launch.
- There is no preview URL that fixes any of these — the bugs are config (Resend, Supabase OAuth, WhatsApp token), not code.
- There is no upstream branch ahead of prod that solves this either.

The smallest viable fix to flip this from "delay" to "send" is **about 30 minutes of dashboard work, no code, no merge, no deploy:** verify Resend domain (or unset the testing-mode email override) + rotate one OAuth provider secret in Supabase + rotate or null-out the WhatsApp token. After those three changes, re-run the §6 probe (`POST /api/auth/magic-link` + a real OAuth round-trip from a real browser + a test SOS hold) and if all three are green, send. If §6 still shows ⚠️ on any of the three, hold to tomorrow.

---

## Addendum — gap-fill pass (verifications added after first write)

### Stripe (live mode, account `acct_1TEUAmFD4E2lo8Ap` "PageReady")

Verified read-only via Stripe MCP in this run:

| Object | Result |
|---|---|
| Account | `acct_1TEUAmFD4E2lo8Ap`, display name "PageReady". Same account hosts HOTMESS products + RAWCUT + PageReady. **Confirms the connected key Phil has wired in Vercel is the right one.** |
| Balance (livemode=true) | £0.00 available, £0.00 pending, £0.00 dispute pre-funding |
| Active subscriptions | **0** (status `all`, limit 20) — matches `memberships_paid=0` in Supabase |
| Customers | 0 returned at limit 10 — no Stripe customers ever provisioned |
| Payment intents | **1 ever**: `pi_3TM7JyFD4E2lo8Ap0TSSJsJt`, £9.99 GBP, status `succeeded`, no customer attached, created `1776174486` (2026-04-12 14:28 UTC) — three weeks ago, only successful real charge |
| Invoices | 0 |
| Disputes | 0 |
| Products | 16 — all 4 membership tiers (`Hotmess`, `Connected`, `Promoter`, `Venue` — `prod_URAo*`), 6 boost products (`Globe Glow`, `Profile Bump`, `Vibe Blast`, `Incognito Week`, `Extra Beacon Drop`, `Highlighted Message` — `prod_UR8K*`), 4 RAWCUT, `Test`, `PageReady Website` |

Implication for §10 fix-set: the skill's "set 6 STRIPE_BOOST_* price IDs" question is partly answered — **the products exist** in Stripe, so price IDs can be derived; the only remaining unknown is whether they're already in Vercel env. (Still couldn't enumerate Vercel env directly — see below.)

**Could not verify** the last 10 Stripe webhook delivery codes: the Stripe MCP exposes `list_payment_intents`, `list_subscriptions`, etc., but not a webhook-delivery-history operation, and `stripe_api_execute` rejected `GetEvents` (operation not in this MCP's allowlist). Probing the webhook endpoint without a signature returned the canonical 400 (verified in §6). The fact that `stripe_events_log` in Supabase has 0 rows is consistent with the Stripe-side "0 customers, 0 invoices, 0 active subs, 1 historical PI" — there are simply no events to deliver.

### Sentry (compiled-bundle inspection)

Pulled prod JS bundle directly: `https://hotmessldn.com/assets/index-C20EUd_G.js` (5.0 MB).

| Item | Value |
|---|---|
| Sentry DSN baked | `https://e2d193dbc4363c26821e0d2eea3df0a1@o4510805032697856.ingest.de.sentry.io/4510805037482064` (EU region) |
| Sentry init wiring | confirmed (CSP allows `*.ingest.sentry.io` + `*.ingest.de.sentry.io`; DSN compiled in) |

**Could not verify** Sentry's last-24h/last-7d error count or top-5 signatures or last-6h spike: no Sentry MCP loaded in this sandbox; the DSN is project-write-only (event submission), reading issues requires a Sentry auth token which isn't available here.

### Compiled-bundle facts (other)

| Item | Compiled-in value on prod |
|---|---|
| Supabase URL | `https://rfoftonnlwudilafhfkl.supabase.co` ✅ |
| **Radio stream** | `https://listen.radioking.com/radio/736103/stream/802454` — **NOT AzuraCast.** The skill claim "Hetzner VPS not yet provisioned" is irrelevant to soft-launch — radio is live via RadioKing right now. |
| VAPID public key | `BL…` (compiled, push wired) |
| Site URLs referenced | both `hotmessldn.com` and `hotmess.london` baked in (legacy domain still referenced) |
| Mixpanel | `window.mixpanel.track(...)` calls present; project token not visible in plain text (likely loaded from `import.meta.env.VITE_MIXPANEL_TOKEN` and minified/inlined as a runtime string somewhere I couldn't extract with regex) |
| GA | `gtag` + `G-L8…` (truncated; full measurement ID not extractable from minified bundle) |
| Stripe publishable key | not visible in plain `pk_live_…` / `pk_test_…` form — likely loaded async via `loadStripe()` from env, or the constant is split across the minified bundle |
| `/api/*` endpoints called from client (full list) | `/api/admin/notifications/dispatch`, `/api/analytics/track`, `/api/auth/magic-link`, `/api/broadcast`, `/api/email/send`, `/api/events/cron`, `/api/events/scrape`, `/api/presence/update`, `/api/profiles`, `/api/routing/directions`, `/api/routing/etas`, `/api/safety/sos`, `/api/shopify/cart`, `/api/shopify/featured`, `/api/shopify/import`, `/api/shopify/sync`, `/api/time/now`, `/api/travel-time` |

Confirms what was suspected in §5: `/api/whoami`, `/api/auth/session`, `/api/scene-scout`, `/api/wallet/balance` are NOT called from the compiled client — they were SPA fallbacks (handlers don't exist).

### Live browser smoke (Claude in Chrome)

Navigated `https://hotmessldn.com/auth` in a real Chrome session. The page transitioned through the boot sequence and resolved to `/OnboardingGate` showing the bottom nav (Home/Pulse/Ghosted/Music/Shop/More — note **6 tabs with "Shop" not "Market"**, mismatch with `App.jsx` route definition that says `/market`) and a HOTMESS wordmark over a "LOADING" spinner.

Phil's session was auto-recovered (avatar visible in top-right). Did not poke further to avoid touching live state. **The tab order and Shop label are a mismatch worth confirming** with the OSBottomNav component on tip-of-main.

**Could not verify** Apple/Google/Phone OAuth completion paths: doing so on Phil's logged-in Chrome would interact with his real session. Recommend a clean incognito + a throwaway test account for that step.

### Supabase advisors

Ran `get_advisors security`. Output was 307,208 characters (138K tokens) and exceeded the context-window cap, so I could not enumerate findings inline. The fact that the security run completes is a green check — there are findings, none returned a tool-side hard error. **Recommend** Phil opens the Supabase dashboard → Advisors → Security tab pre-launch and triages anything labelled ERROR, especially in the `kv_store_*` tables (zero policies, RLS enabled → silent default-deny may break legacy code paths) and the `_widen_type_check_for_v6_surfaces` migration that altered `safety_events` constraints.

### Vercel env-var diff

**Still could not verify.** No `env_list` operation in the Vercel MCP loaded for this run, and `vercel`/`gh` CLI is not installed in the bash sandbox. The only way I could close this gap from here would be to either (a) install `vercel` CLI in the sandbox and `vercel login`, (b) use a Vercel API token via `curl https://api.vercel.com/v9/projects/{id}/env` — neither is exposed automatically. Phil can resolve in 30 seconds with `vercel env ls production` from his terminal.

### Net change to recommendation

The gap-fill **doesn't change the call**: still **delay**. The three blockers (Resend testing-mode 500 on magic link, OAuth providers in unverified state, safety dispatcher 0/12) are unchanged. The Stripe + Sentry + radio + bundle inventory data added confidence that the upgrade path is the documented soft-launch fix-set and not something more invasive. The Vercel env diff and per-issue Sentry triage are nice-to-haves before send but not gating beyond the three identified blockers.

---

## Addendum 2 — live-dashboard pass via Phil's Chrome

Driven through Phil's logged-in Chrome session at `https://vercel.com`, `https://resend.com`, `https://supabase.com`. Replaces several "could not verify" entries with hard data — and surfaces a P0 I missed entirely.

### NEW P0 — Vercel account is on payment-failure cooldown

Banner on every page of the Vercel dashboard:

> **Action Required.** Payment failed, pay any open invoices before your account is shut down. [Pay Invoices]

If Vercel suspends the project before the invoice is paid, `hotmessldn.com` goes dark mid-launch — no warning to the 10 invitees, no server-side, just a Vercel suspension page. **Pay the invoice before sending the URL.** This is more important than every other blocker in this report combined.

### Vercel Production env-var inventory (full enumeration)

Every Production / Production+Preview env var on `prj_xdS5EoLRDpGhj4GOIbtSLSrCmvJO`, sorted by last-update (most recent first). Values are masked in the UI, only existence/scope verified:

| Var | Scope | Last update | Note |
|---|---|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | Production | 2d ago | |
| `SHOPIFY_ADMIN_API_TOKEN` | Production | 2d ago | |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Production | 2d ago | |
| `VAPID_PUBLIC_KEY` | Prod+Preview | Apr 30 | |
| `VAPID_PRIVATE_KEY` | Prod+Preview | Apr 30 | |
| `SOUNDCLOUD_CLIENT_ID` / `_SECRET` / `_REDIRECT_URI` / `_SCOPE` | Prod+Preview | Apr 30 | full SoundCloud OAuth set |
| `OPENAI_API_KEY` | Prod+Preview | Apr 30 | |
| `NOTION_CLIENT_ID` / `_SECRET` / `_REDIRECT_URI` | Prod+Preview | Apr 30 | |
| `SUPABASE_SECRET_KEY` (sensitive) | Prod+Preview | Apr 30 | new-naming, replaces SERVICE_ROLE |
| `SUPABASE_PUBLISHABLE_KEY` | Prod+Preview | Apr 30 | new-naming, replaces ANON |
| `SUPABASE_JWT_SECRET` (sensitive) | Prod+Preview | Apr 30 | |
| `SUPABASE_ANON_KEY` | Prod+Preview | Apr 30 | legacy spelling, both kept |
| `SUPABASE_URL` | Prod+Preview | Apr 30 | |
| `SUPABASE_SERVICE_ROLE_KEY` (sensitive) | Prod+Preview | Apr 30 | legacy, both kept |
| `POSTGRES_DATABASE` / `_PASSWORD` / `_HOST` / `_USER` / `_URL_NON_POOLING` / `_PRISMA_URL` / `_URL` | Prod+Preview | Apr 30 | direct Supabase Postgres |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Prod+Preview | Apr 30 | client-side Supabase |
| `STRIPE_BOOST_GLOBE_GLOW_PRICE_ID` | Prod+Preview | Apr 30 | **all 6 boost price IDs are set** — answers the skill's open question |
| `STRIPE_BOOST_PROFILE_BUMP_PRICE_ID` | Prod+Preview | Apr 30 | |
| `STRIPE_BOOST_VIBE_BLAST_PRICE_ID` | Prod+Preview | Apr 30 | |
| `STRIPE_BOOST_INCOGNITO_PRICE_ID` | Prod+Preview | Apr 30 | |
| `STRIPE_BOOST_EXTRA_BEACON_PRICE_ID` | Prod+Preview | Apr 30 | |
| `STRIPE_BOOST_HIGHLIGHTED_MSG_PRICE_ID` | Prod+Preview | Apr 30 | |
| `WHATSAPP_PHONE_NUMBER_ID` | Prod+Preview | Apr 30 | |
| `WHATSAPP_ACCESS_TOKEN` | Prod+Preview | Apr 30 | **set, but Meta returns 401:190 — token expired**, see §8 |
| `WHATSAPP_VERIFY_TOKEN` | Prod+Preview | Apr 30 | inbound webhook verify |
| `ANTHROPIC_API_KEY` | Prod+Preview | Apr 30 | |
| `RESEND_API_KEY` | Prod+Preview | Apr 30 | **set; account is in testing-mode (see Resend section)** |
| `SHOPIFY_SHOP_DOMAIN` | Prod+Preview | Apr 30 | |
| `SHOPIFY_API_STOREFRONT_ACCESS_TOKEN` | Prod+Preview | Apr 30 | |
| `VITE_VAPID_PUBLIC_KEY` | Production | Apr 4 | |
| `STRIPE_SECRET_KEY` | All Environments | Apr 1 | ⚠️ **Vercel: "Needs Attention"** (secret-scanner flagged) |
| `SUPABASE_DEFAULT_PULPLISHABLE_KEY` | All Environments | Mar 31 | ⚠️ **Needs Attention** + var name has typo (`PULPLISHABLE`) |
| `SUPABASE_DEFAULT_SECRET_KEY` | All Environments | Mar 31 | ⚠️ **Needs Attention** |
| `CRON_SECRET` | All Environments | Mar 23 | ⚠️ **Needs Attention** |
| `VITE_MAPBOX_TOKEN` | All Environments | Feb 16 | |
| `VITE_SENTRY_DSN` | Production | Jan 31 | matches the DSN baked in the prod JS bundle |
| `VITE_TELEGRAM_BOT_USERNAME` | All Environments | Jan 29 | |
| `TELEGRAM_BOT_TOKEN` | All Environments | Jan 29 | ⚠️ **Needs Attention** |
| `STRIPE_WEBHOOK_SECRET` | All Environments | Jan 27 | ⚠️ **Needs Attention** |
| `E2E_PASSWORD` | All Environments | Jan 21 | ⚠️ **Needs Attention** |
| `E2E_EMAIL` | All Environments | Jan 21 | |
| `TICKET_QR_SIGNING_SECRET` | All Environments | Jan 17 | ⚠️ **Needs Attention** |
| `SHOPIFY_CHECKOUT_DOMAIN` | All Environments | Jan 13 | |
| `GOOGLE_MAPS_API_KEY` | All Environments | Jan 7 | ⚠️ **Needs Attention** + duplicate of `VITE_GOOGLE_MAPS_API_KEY` |

**9 vars flagged "Needs Attention"** by Vercel's secret scanner. That label means Vercel's leaked-credential detection found these values in a public source (likely the GitHub repo history before the secrets were rotated). The values are still active for builds, but Vercel is flagging them as known-leaked. **`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET`, `TELEGRAM_BOT_TOKEN`, `TICKET_QR_SIGNING_SECRET`** are the ones with security relevance — rotate them.

**Notable absences from production env (consumed in code per §4 but missing):** `EMAIL_FROM` (so `/api/auth/magic-link` falls back to `'HOTMESS <onboarding@resend.dev>'` — but Resend is in testing-mode anyway, see below), `ALLOWED_ORIGIN`, `SUPPORT_EMAIL`, `VITE_APP_URL`, `VITE_PUBLIC_URL`, `VITE_OWNER_EMAIL`, `VITE_MIXPANEL_TOKEN`, `VITE_GA_MEASUREMENT_ID`, `VITE_MUSIC_UPLOAD_EMAILS`, `VITE_REVENUECAT_API_KEY_IOS`, `VITE_USER_NODE_ENV`, `VITE_BOOT_DEBUG`, `VITE_SENTRY_DEBUG`, `VITE_ANALYTICS_DEBUG`, `VITE_APP_VERSION`, `VITE_GAMIFICATION_ENABLED`, `VITE_XP_PURCHASING_ENABLED`, `VITE_SHOPIFY_LUBE_VARIANT_ID`, `VITE_STRIPE_CHROME_PRICE_ID`, `VITE_STRIPE_PLUS_PRICE_ID`, `NEXT_PUBLIC_SITE_URL`, `EVENT_SCRAPER_CRON_SECRET`. Most resolve to safe defaults; `EVENT_SCRAPER_CRON_SECRET` is why `/api/events/diag` 401s.

### Resend — root cause of magic-link 500 confirmed

Logged in as `phil@hotmessldn.com` on the **`hotmessldn`** Resend account. One domain configured: `send.hotmessldn.com` in Ireland (eu-west-1), created Apr 11 (23 days ago), **status: Failed.**

Quoting Resend's own dashboard banner verbatim: *"DNS check failed: Several required records are missing. Fix records in your DNS provider. Once fixed, restart verification."*

Domain events: `Domain added Apr 11 12:06 PM` → `Missing records Apr 11 6:50 PM`. The domain has been broken since six hours after it was added.

DNS records still missing (read off Resend's "Records" tab, content values truncated to first/last fragments only — **Phil should pull the full strings from his own Resend dashboard before pasting into DNS, do not paraphrase**):

| Type | Name | Content (truncated) | TTL | Priority |
|---|---|---|---|---|
| TXT (DKIM) | `resend._domainkey.send` | `p=MIGfMA0GCSqG…PLoLfcQIDAQAB` | Auto | — |
| MX (Sending — bounces) | `send.send` | `feedback-smtp.…amazonses.com` | Auto | 10 |
| TXT (SPF) | `send.send` | `v=spf1 include…nses.com ~all` | Auto | — |

Resend's recipient testing-mode message ("you can only send testing emails to phil@hotmessldn.com") is the **same root cause** — once the domain verifies, the testing-mode ceiling lifts and `/api/auth/magic-link` will return 200 to any recipient. **This is the single highest-leverage fix in the entire report.** ETA: 5 min to add the records, ~15–60 min for DNS propagation + Resend re-verification.

### Supabase Auth — provider state (live-read, not skill-cached)

| Provider | State | Note |
|---|---|---|
| **Email** | ✅ **Enabled** | |
| **Apple** | ✅ **Enabled** | skill state was stale; Apple IS enabled |
| **Google** | ✅ **Enabled** | skill state was stale; Google IS enabled |
| Phone | Disabled | matches §6's expectation that phone OTP path is dead |
| Everything else | Disabled | |

Both Apple and Google are toggled on. Whether the underlying credentials (Apple Services ID + .p8 / Google client ID + secret) are still valid requires a real OAuth round-trip from a fresh browser — **could not verify** without test-account creation, and didn't want to interact with Phil's logged-in session. The skill's "Google: 4/0A code-exchange error" symptom may already be resolved if Phil rotated the Google secret since that note was written. **Recommend** opening incognito + a throwaway gmail and walking the flow before send.

### Supabase Auth — URL configuration

Site URL configured (value not parsed off the page; field is an input that Resend's get_page_text didn't expose).

Allow-list redirect URLs (14 entries):

```
https://hotmessldn.com
https://hotmessldn.com/**
https://hotmessldn.com/auth/callback
https://**           ← ⚠️ open redirect — anyone can use any HTTPS host
http://**            ← ⚠️ open redirect — anyone can use any HTTP host
https://hotmess-globe-phils-projects-59e621aa.vercel.app/
https://hotmess-globe-phils-projects-59e621aa.vercel.app/**
https://hotmess-*-globe-phils-projects-59e621aa.vercel.app
https://hotmess-*-globe-phils-projects-59e621aa.vercel.app/**
https://hotmess-globe-scanme-5613-phils-projects-59e621aa.vercel.app/
https://hotmess-globe-scanme-5613-phils-projects-59e621aa.vercel.app/**
https://hotmess-*-globe-scanme-5613-phils-projects-59e621aa.vercel.app
https://hotmess-*-globe-scanme-5613-phils-projects-59e621aa.vercel.app/**
automation-integration-enterprise://**   ← capacitor mobile-app deep link
```

**Two open-redirect entries in the allow-list (`https://**`, `http://**`).** That's an OAuth phishing surface — an attacker can craft a magic-link / OAuth flow that returns the auth code to any host they control. **Remove them.** Not gating soft-launch (no public knowledge of these), but trivial to fix.

### Sentry — could not verify in this run

Phil isn't logged into `sentry.io` in the same Chrome session he uses for Vercel/Supabase/Resend (the Sentry login redirected to the auth page, not the issues list). Sentry DSN baked into the prod bundle (`https://e2d193dbc4363c26821e0d2eea3df0a1@o4510805032697856.ingest.de.sentry.io/4510805037482064`) confirms event submission is wired, but the 24h/7d issue counts and top signatures still require Phil to either log into Sentry in Chrome or paste a Sentry auth token. **Could not verify.**

### Updated recommendation — final

Sequence the soft-launch fix-set in this order, all dashboard-only:

1. **Pay the Vercel invoice.** Without this, none of the rest matters because the project gets suspended.
2. **Fix `send.hotmessldn.com` DNS at Phil's DNS provider.** Add the three records exactly as shown in the Resend dashboard, then click "Restart verification". When the domain flips to Verified, magic-link signup unblocks for everyone immediately.
3. **Rotate the Meta WhatsApp `WHATSAPP_ACCESS_TOKEN`** (System User token, Business Settings → System Users in Meta Business Suite). Update the value in Vercel env. Trigger a redeploy or wait for the next dispatch cron — within 5 min, `safety_delivery_log` should start showing `whatsapp / sent` rows instead of `meta_401:190`.
4. **Rotate the 5 Vercel-flagged secrets that matter for soft-launch:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET`, `TELEGRAM_BOT_TOKEN`, `TICKET_QR_SIGNING_SECRET`. Each in their respective dashboard → paste new value into Vercel → redeploy.
5. **Smoke-test in incognito with a throwaway address:** open `https://hotmessldn.com` in a private window, complete AgeGate, request a magic link, confirm it lands. Then request a Google OAuth, confirm callback completes. Then trigger a long-press SOS, confirm at least one row in `safety_delivery_log` flips to `sent`.

If steps 1–3 are green, this is a **send today** at any time. The OAuth fix (Google or Apple secret rotate, if either turns out to be broken in step 5) is recoverable mid-launch because magic-link is back online by then. Every other finding in this report (open-redirect URLs in Supabase, "Needs Attention" cosmetic flags on long-rotated keys, the data-retention cron 500, the analytics insert errors, the abandoned `kv_store_*` tables, the duplicate `GOOGLE_MAPS_API_KEY` env, the Sentry triage, the "Shop"-vs-"Market" nav label mismatch, the Zia-website parallel branch, the May-2 domain-swap that never happened) is a non-launch-blocker followup.

**The call: send today, after steps 1–3.** Net of the invoice payment (step 1, which is cash not engineering), the launch-critical fix is ~5 min of DNS records + ~5 min of Meta token rotate. Sub-30-minute total to flip from delay → send.
