# GLOBE REALITY AUDIT — 2026-05-23

**Scope:** Phase 1 verification of the HOTMESS Globe. Facts only, from primary sources (Supabase queries, Vercel API, git history, live URL, code inspection). No interpretation, no recommendations. Interpretation belongs to Phil reading this.

**Method:** Repo `SICQR/hotmess-globe` cloned and read at commit `6f51d59`; Supabase `rfoftonnlwudilafhfkl` queried live via MCP; Vercel project `prj_xdS5EoLRDpGhj4GOIbtSLSrCmvJO` (team `team_ctjjRDRV1EpYKYaO9wQSwRyv`) queried live via MCP.

**Tag legend:** `VERIFIED ✅` = confirmed from a primary source · `BROKEN ❌` = confirmed broken/failing · `UNKNOWN ⚠️` = could not get a clean answer (reason given).

---

## 1.1 Live deployment state

| # | Check | Tag | Finding | Source |
|---|---|---|---|---|
| 1.1a | Production URL | ✅ | `https://hotmessldn.com` (custom domain). Latest READY production deployment is `dpl_NiSRGhvjp6vqtrbZFPsuQyJMi1Vq`, target=production, state=READY, branch alias `hotmess-globe-git-main-phils-projects-59e621aa.vercel.app`, built from commit `6f51d59`. | Vercel `list_deployments` |
| 1.1b | Latest commit on `main` | ✅ | `6f51d59ffd9cb441e22ad657619338b76db3219f` — "docs: add AI assisted discovery and city guidance system" — author SICQR — 2026-05-23 03:27:24 -0700. | `git log -1 main` |
| 1.1c | Production returns 200 | ✅ | `HTTP/2 200`, `server: Vercel`, `x-vercel-cache: HIT`, `content-type: text/html`, `content-length: 3195`. Strict CSP + HSTS present. | `curl -I https://hotmessldn.com` |
| 1.1d | What the homepage renders | ⚠️ | Served document is a 3,195-byte React/Vite SPA shell. `<title>HOTMESS - Global Nightlife Discovery</title>`, single `<div id="root">`. The actual UI is client-rendered (JS), so the fully painted DOM was **not** captured in this pass. Route/nav structure (from `src/App.jsx`): `/` → HomeMode; `/pulse` → Globe (the 3D globe); `/globe` and `/events` → redirect to `/pulse`; `/ghosted` → GhostedMode (grid); `/market` → MarketMode; `/more` → MorePage; `/music` → MusicMode. Bottom nav = `src/modes/OSBottomNav.tsx`. | `curl` body + `src/App.jsx`, `src/modes/` |
| 1.1e | Console errors on load | ⚠️ | Not captured — requires a JS-executing browser. Chrome MCP is available on request for a live DOM + console capture; not run in this Phase-1 pass. No build/deploy failures (deployment is READY). | n/a |

**Additional live finding (not in the brief, surfaced during 1.1/1.4):**

| # | Check | Tag | Finding | Source |
|---|---|---|---|---|
| 1.1f | Daily cron `/api/cron/data-retention` | ❌ | Returns **HTTP 500** in production — `TypeError: supabase.from(...)`. Root cause in code: `const supabase = supabaseUrl && supabaseServiceKey ? createClient(...) : null;` — when `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` don't resolve for this function, `supabase` is `null` and the handler still calls `supabase.from('cron_runs')`. This is the only 500 in the last 7 days of runtime logs. | Vercel `get_runtime_logs` (status=500, 7d) + `api/cron/data-retention.js` |

---

## 1.2 Current globe components — what exists in code

### `src/components/globe/` (one-line purpose each)

| File | Purpose (from code) |
|---|---|
| `EnhancedGlobe3D.jsx` | **The live 3D globe.** `react-globe.gl` (Three.js) renderer; takes `beacons`/`recoveryPins` props and plots points. Rendered by `pages/Globe.jsx`. |
| `UnifiedGlobe.tsx` | L0 background-layer wrapper. Renders **only** on `/pulse` (else returns `null`); lazy-loads `@/pages/Globe`. Mounted from `src/App.jsx`. |
| `GlobeHero.jsx` | Lazy globe used as the **Home page hero** (`src/pages/Home.jsx`), not the Pulse globe. |
| `AmbientGlobe.jsx` | **Dead code** — imported nowhere. Superseded by `UnifiedGlobe` (per UnifiedGlobe's own header comment about ambient-canvas bleed-through). |
| `GlobeBeacons.tsx` | Beacon list component typed against `core/beacons`. **Imported nowhere** — not in the live render path. |
| `GlobeActivityLayer.ts` | Pure (non-React) helpers called from `EnhancedGlobe3D`'s imperative `useEffect`. |
| `FoundingTierLayer.tsx` | Founding-tier labels/arcs/rings overlay; **uses `mapbox-gl`**. Wired into `Globe.jsx`. |
| `BeaconDropModal.jsx` | Modal for creating ("dropping") a beacon. |
| `BeaconPreviewPanel.jsx` | Preview panel shown on beacon click. |
| `CityDataOverlay.jsx` | City data/overlay (incl. weather-ish fields) on the globe. |
| `CityPulseBar.jsx` | City energy/pulse bar UI. |
| `LiveFeed.jsx` | Live activity feed component. |
| `LocationShopPanel.jsx` | Shop panel surfaced from a location/beacon. |
| `RightNowModal.jsx` | "Right Now" status modal. |
| `ActivityTracker.jsx` | Activity tracking singleton used by `Globe.jsx`. |
| `GlobeFallback.jsx` | Fallback UI when the globe can't render. |
| `useRealtimeBeacons.js` | **Live beacon data hook** — consumed directly by `pages/Globe.jsx` (exports `useRealtimeBeacons`, `useRightNowCount`, `useRealtimeLocations`, `useRealtimeRoutes`). |

### `src/components/beacon/`

| File | Purpose |
|---|---|
| `BeaconComposer.jsx` | Beacon authoring form. |
| `BeaconActions.jsx` | Beacon action buttons (interact/report/etc.). |
| `CommentsSection.jsx` | Comments under a beacon. |
| `index.js` | Barrel export. |

### Canonical entry point — VERIFIED ✅

The brief's hypothesis ("likely `UnifiedGlobe.tsx`") is **partly right but indirect**. Trace: `src/App.jsx` route `/pulse` → `GlobePage` (`@/pages/Globe.jsx`) → renders **`EnhancedGlobe3D`**. Separately, `App.jsx` mounts `<UnifiedGlobe/>` as a persistent background layer that *also* lazy-loads `@/pages/Globe` but only on `/pulse`. So the **rendered globe is `EnhancedGlobe3D`**, reached through `pages/Globe.jsx`; `UnifiedGlobe` is a route-gating wrapper around that same page. `/globe` is a redirect to `/pulse`.
*Source: `src/App.jsx` (lines ~77, 440–446), `src/pages/Globe.jsx` (line 7), `src/components/globe/UnifiedGlobe.tsx`.*

### Duplication resolutions

| Question | Tag | Answer |
|---|---|---|
| `GlobeHero` vs `AmbientGlobe` vs `EnhancedGlobe3D` vs `UnifiedGlobe` — which renders in prod? | ✅ | **`EnhancedGlobe3D`** (on `/pulse`, via `pages/Globe.jsx`, gated by `UnifiedGlobe`). `GlobeHero` = Home-page hero only. `AmbientGlobe` = **dead code** (imported nowhere). `UnifiedGlobe` = wrapper, not a renderer. |
| `src/lib/data/beacons.ts` vs `src/core/beacons.ts` — canonical data layer? | ✅ | **Neither is in the live globe's path.** The live globe gets beacons from the `useRealtimeBeacons` hook (direct Supabase queries in `Globe.jsx`). `core/beacons.ts` exports the `Beacon` *type* used only by `GlobeBeacons.tsx` (itself unrendered). `lib/data/beacons.ts` is **imported nowhere = dead code**. |
| `useRealtimeBeacons.js` vs `useGlobeRealtime.ts` vs `useGlobeActivity.ts` — which is canonical / dead? | ✅ | **All three are imported and used by `pages/Globe.jsx`** (lines 22–24) — none is dead. They cover different concerns: `useRealtimeBeacons` (beacons/locations/routes/right-now count), `useGlobeRealtime` (city heat), `useGlobeActivity` (seed zones / venue glow / activity events; its types also feed `GlobeActivityLayer.ts`). |

---

## 1.3 Supabase live state (exact counts, project `rfoftonnlwudilafhfkl`)

| Brief query | Tag | Exact result | Note |
|---|---|---|---|
| `profiles where deleted_at is null` | ⚠️ | **157** total profiles | `profiles` has **no `deleted_at` column** (soft-delete-ish columns present: `subscription_status`, `founding_status`, `active_persona_id`). Count is total rows; the brief's `deleted_at` filter cannot run as written. |
| `memberships where tier != 'free' and tier != 'mess'` | ✅ | **0** | All 157 memberships are tier `free`. (Note: live `membership_tiers` names are mess/hotmess/connected/promoter/venue; the `memberships` rows themselves are all `free`.) 0 paying members. |
| `beacons` | ✅ | **17** | `beacons` is a **TABLE**, not a view. (The brief's note "beacons is a view per GLOBE_DOC_TRAIN.md" is incorrect for live DB. The read-only *view* is `right_now_status`.) |
| `trusted_contacts` | ✅ | **4** | (BLK-01 — see 1.4.) |
| `safety_events where created_at > now()-30d` | ✅ | **28** | 28 of 28 total safety_events rows are within 30 days. |
| `globe_events where starts_at > now()` | ⚠️ | **0 upcoming** | `globe_events` has **no `starts_at` column** — it is an *ephemeral pulse* table (`created_at`, `expires_at`, `event_type`, `intensity`). 46 rows total, **0 currently active** (`expires_at > now()`). Scheduled-event tables `events` and `club_events` are both **0**. |
| `venues` | ✅ | **8** | |
| `operator_venues` | ✅ | **0** | |
| `storage.buckets` (does `uploads` exist?) | ✅ | **`uploads` EXISTS** (public) | 10 buckets: avatars, brand-assets, chat-uploads, ghosted-photos, messmarket-images, radio-assets, records-audio, records-covers, thread-attachments, **uploads**. |
| `push_subscriptions` (extra, for BLK-04) | ✅ | **15** total, 4 in last 30d | |

*Source: Supabase MCP `execute_sql` + `list_tables`.*

**Supabase security advisory (surfaced by MCP, not in brief):** `public.spatial_ref_sys` has **RLS disabled** (PostGIS system table; anon/authenticated can read every row). Remediation is `ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;` — *do not auto-apply* (enabling without policies blocks access). Flagged for Phil's decision. Ref: https://supabase.com/docs/guides/database/postgres/row-level-security

---

## 1.4 Production blockers

| Blocker | Tag | Finding | Source |
|---|---|---|---|
| **BLK-01** trusted_contacts = 0 (SOS push untested) | ✅ FIXED (data present) | `trusted_contacts` now has **4 rows** (was 0 at the 2026-04-06 baseline). The data gap that defined BLK-01 is closed. *Real-device two-phone SOS delivery still not proven here* (needs physical devices — see 1.8). | SQL count |
| **BLK-02** `uploads` storage bucket missing | ✅ FIXED | `uploads` bucket **exists** (public). | `storage.buckets` |
| **BLK-03** magic-link email delivery unverified | ⚠️ PARTIAL | Auth **is working**: `auth.users` = 157 total, **126 confirmed**, **5 sign-ins in the last 7 days**, last sign-in **2026-05-21 13:33 UTC**. Users are successfully authenticating, which is strong evidence email/login works end-to-end. **Resend/SMTP verified-sender-domain config is not SQL-queryable** → that specific sub-check is ⚠️ UNKNOWN (needs Supabase Auth dashboard / Management API). (`magic_links` table = 0 rows, but that table is the founding-partner Welcome Portal, not Supabase Auth magic links.) | `auth.users` SQL |
| **BLK-04** push notifications real-device | ⚠️ PARTIAL | Subscription pipeline is live: `push_subscriptions` = **15 rows (4 in last 30d)**; `notification_outbox` = 141; `notify-push` edge function deployed. **Real-device lock-screen delivery not proven here** (needs a physical device — see 1.8). | SQL + `supabase/functions/notify-push` |
| **AgeGate sessionStorage→localStorage** (memory-claimed) | ✅ NOT A BUG (uses localStorage) | No `sessionStorage` is used by any AgeGate. `src/pages/AgeGate.jsx` and `src/components/onboarding/screens/AgeGateScreen.jsx` both persist with **`localStorage`** (`hm_age_gate_passed`). `sessionStorage` in the codebase appears only in analytics, SOS overlay, and error boundaries — unrelated to the age gate. **Caveat:** there are **4 AgeGate implementations** (`components/auth/AgeGate.jsx`, `components/interrupts/AgeGate.tsx`, `components/onboarding/screens/AgeGateScreen.jsx`, `pages/AgeGate.jsx`) — duplication, but no sessionStorage bug. | grep across `src` |
| **Stripe webhook 500 (`ERR_MODULE_NOT_FOUND`)** (memory-claimed) | ✅ NO CURRENT 500s | `api/stripe/webhook.js` uses clean ESM imports (`import Stripe from 'stripe'`, `import { createClient } from '@supabase/supabase-js'`); `package.json` is `"type":"module"`, node ≥20; no extension-less relative imports. **Zero Stripe-path 500s in the last 7 days** of runtime logs. **Caveat:** with 0 paying members / 0 real subscriptions, the webhook may simply not be receiving live events — absence of 500s is partly absence of traffic. | `api/stripe/webhook.js` + Vercel logs (7d) |

**Other listed blockers (from `LAUNCH-BLOCKERS.md`, for completeness):**

| Blocker | Tag | Finding |
|---|---|---|
| BLK-05 Google OAuth broken | ⚠️ UNKNOWN | Config-level (Supabase Auth → Providers → Google client secret). Not SQL/log-verifiable here; dashboard action. |
| BLK-06 7-step onboarding unverified | ⚠️ UNKNOWN | Requires a fresh-account human walk-through; not done in this pass. (Funnel data exists but end-to-end human verification is the open item.) |

---

## 1.5 Per-doc reality check — the GLOBE_*.md files

**Count note ⚠️:** the brief says "49 docs." There are **50** `GLOBE_*.md` files in `docs/` (48 added 2026-05-23, 2 added 2026-05-22). All 50 are tagged below.

**Tagging basis:** each doc's stated purpose (read from the file) cross-referenced against the live code inventory (`src/components/globe`, `src/lib/globe`, `src/hooks`, `src/pages`, `api/`, `supabase/functions`) and the live Supabase schema (full table list). Tags reflect structural code/DB presence, not line-by-line conformance review of every system.

| Filename | Status |
|---|---|
| GLOBE_ACCESSIBILITY_REDUCED_MOTION.md | EXISTS · partial |
| GLOBE_AFTERCARE_AND_RECOVERY_INFRASTRUCTURE.md | EXISTS · partial |
| GLOBE_AI_ASSISTED_DISCOVERY_AND_CITY_GUIDANCE.md | EXISTS · partial |
| GLOBE_AUDIO_REACTIVITY_AND_SOUNDSPACE_SYSTEM.md | MISSING · new build |
| GLOBE_BEACON_CREATION_SYSTEM.md | EXISTS · partial |
| GLOBE_BEACON_LIFECYCLE_ECONOMY.md | EXISTS · partial |
| GLOBE_BEACON_MONETISATION_AND_BOOST_POLICY.md | EXISTS · differs from spec |
| GLOBE_BEACON_RENDERING_AND_PARTICLE_BEHAVIOUR.md | EXISTS · partial |
| GLOBE_BEACON_REPUTATION_AND_SPAM_CONTROL.md | MISSING · new build |
| GLOBE_BEACON_TAXONOMY.md | EXISTS · partial |
| GLOBE_BEACON_VISUAL_SYSTEM.md | EXISTS · partial |
| GLOBE_CAMERA_CHOREOGRAPHY.md | EXISTS · partial |
| GLOBE_CITY_TO_CITY_TRAVEL_AND_CROSS_DISTRICT_PRESENCE.md | EXISTS · partial |
| GLOBE_COMPONENT_CONTRACTS.md | RESTATEMENT |
| GLOBE_DENSITY_CLUSTERING_SYSTEM.md | EXISTS · partial |
| GLOBE_DISTRICT_EDITORIAL_AND_CURATION_SYSTEM.md | MISSING · new build |
| GLOBE_DISTRICT_HEAT_AND_CITY_ENERGY_MODEL.md | EXISTS · partial |
| GLOBE_DOC_TRAIN.md | RESTATEMENT |
| GLOBE_EMOTIONAL_RENDERING_AND_NIGHTLIFE_PSYCHOLOGY.md | MISSING · new build |
| GLOBE_EVENT_AND_VENUE_PARTNER_SYSTEM.md | EXISTS · partial |
| GLOBE_EVENT_ARCHIVE_AND_CULTURAL_MEMORY_SYSTEM.md | MISSING · new build |
| GLOBE_FEED_RANKING_AND_CURATION_POLICY.md | EXISTS · partial |
| GLOBE_GHOSTED_CHAT_SYSTEM.md | EXISTS · partial |
| GLOBE_GLOBE_TO_LOCAL_TRANSITION_ANIMATION_SYSTEM.md | MISSING · new build |
| GLOBE_HELP_SOS_PRIVACY_MODEL.md | EXISTS · partial |
| GLOBE_IMPLEMENTATION_PLAN.md | RESTATEMENT |
| GLOBE_INTERACTION_PATTERNS.md | EXISTS · partial |
| GLOBE_MAPBOX_LAYER_STACK.md | MISSING · new build |
| GLOBE_MAPBOX_LOCAL_MODE.md | MISSING · new build |
| GLOBE_MEDIA_CAPTURE_AND_CONSENT_SYSTEM.md | EXISTS · partial |
| GLOBE_NOTIFICATION_AND_ALERT_POLICY.md | EXISTS · partial |
| GLOBE_ONBOARDING_AND_IDENTITY_SYSTEM.md | EXISTS · partial |
| GLOBE_PARTNER_SUBSCRIPTION_TIERS.md | CONTRADICTS · live |
| GLOBE_PRIVACY_LOCATION_POLICY.md | EXISTS · partial |
| GLOBE_REALTIME_ARCHITECTURE.md | EXISTS · partial |
| GLOBE_REALTIME_SIGNAL_ENGINE.md | EXISTS · partial |
| GLOBE_RENDER_PIPELINE_SPEC.md | EXISTS · partial |
| GLOBE_SEARCH_DISCOVERY_AND_FEEDS.md | EXISTS · partial |
| GLOBE_SIGNAL_VISUAL_SYSTEM.md | EXISTS · partial |
| GLOBE_SOCIAL_GRAPH_AND_PRESENCE.md | EXISTS · partial |
| GLOBE_SUPABASE_SCHEMA_MAP.md | RESTATEMENT |
| GLOBE_TICKETING_AND_GUESTLIST_SYSTEM.md | EXISTS · partial |
| GLOBE_TRANSPORT_AND_SAFE_ROUTE_OVERLAYS.md | EXISTS · partial |
| GLOBE_TRUSTED_CONTACTS_AND_SAFETY_ESCALATION.md | EXISTS · partial |
| GLOBE_TRUST_SAFETY_MODERATION.md | EXISTS · partial |
| GLOBE_VENDOR_DASHBOARD_AND_ANALYTICS.md | EXISTS · partial |
| GLOBE_VENDOR_TEAM_PERMISSIONS_AND_MODERATION.md | EXISTS · partial |
| GLOBE_VIEW_INTERACTION_MATRIX.md | EXISTS · partial |
| GLOBE_VISUAL_LANGUAGE_TOKENS.md | EXISTS · partial |
| GLOBE_WEATHER_TIME_AND_ENVIRONMENTAL_RENDERING.md | MISSING · new build |

**Tally:** EXISTS·partial = 33 · MISSING·new build = 9 · RESTATEMENT = 4 · EXISTS·differs from spec = 1 · CONTRADICTS·live = 1 · EXISTS·matches spec = 0.

**Evidence notes for the non-"partial" tags (so Phil can audit the calls):**

- **CONTRADICTS · live — GLOBE_PARTNER_SUBSCRIPTION_TIERS.md:** two tier systems already exist live and conflict with a new partner-tier scheme. `membership_tiers` (5): mess £0 / hotmess £7.99 / connected £19.99 / promoter £44.99 / venue £99.99. `venue_beacon_tiers` (3): community £0 / standard £29 / pro £79. Any new "partner subscription tiers" doc must reconcile against these, plus `membership_annual_pricing`, `venue_subscriptions`, and the `hotfix/partner-beacons-tier-discriminator` branch.
- **EXISTS · differs from spec — GLOBE_BEACON_MONETISATION_AND_BOOST_POLICY.md:** live `user_boost_types` has 6 entries matching the Stripe boost catalogue (Globe Glow / Profile Bump / Vibe Blast / Incognito / Extra Beacon / Highlighted Message). The doc's boost taxonomy is Discovery Boost / District Boost / Momentum Boost — different names and model.
- **MISSING · new build — Mapbox docs (LOCAL_MODE, LAYER_STACK, GLOBE_TO_LOCAL_TRANSITION):** the live globe renders with `react-globe.gl` + Three.js (`earth-night.jpg` texture). `GLOBE_VIEW_INTERACTION_MATRIX.md` itself states zoom goes blurry because there is no local-detail handoff. **Caveat:** `mapbox-gl ^3.1.0` *is* a dependency, used in `FoundingTierLayer.tsx` and `useLiveTierData.ts` — partial scaffolding exists, but the documented local-map mode/transition is not wired into the globe.
- **MISSING · new build — AUDIO_REACTIVITY:** Web-Audio (`AnalyserNode`/`getByteFrequency`) appears only in the SOS button and a care component — not on the globe. Radio streaming is a separate system.
- **MISSING · new build — BEACON_REPUTATION_AND_SPAM_CONTROL:** no reputation/trust-weight/throttle scoring found; `beacon_scans` and `reports` are empty, no scoring code.
- **MISSING · new build — EVENT_ARCHIVE, DISTRICT_EDITORIAL, EMOTIONAL_RENDERING, WEATHER_TIME:** no archive system (`events` empty, `globe_events` ephemeral); no district editorial CMS (admin `CurationQueue` is generic/event-level); "emotional rendering" is design philosophy with no corresponding system; no weather/day-night/environmental rendering (static night texture).
- **RESTATEMENT — COMPONENT_CONTRACTS, DOC_TRAIN, IMPLEMENTATION_PLAN, SUPABASE_SCHEMA_MAP:** these document existing architecture / reading order / build sequence / schema map rather than specifying unbuilt systems.

---

## 1.6 Recent commit activity (last 14 days, `main`)

**⚠️ Method correction:** the initial shallow clone (`--depth 50`) truncated history at the 50 most-recent commits (all the `docs: add globe...` dump) and corrupted `--name-only` at the graft boundary. After `git fetch --unshallow`, the true picture is below.

- **VERIFIED ✅ — 159 commits on `main` since 2026-05-09.** The most recent ~50 (2026-05-22/23) are the `GLOBE_*.md` documentation dump (49–50 docs). The two weeks beneath them are substantial **code** work.
- **VERIFIED ✅ — commits touching globe code paths** (`src/components/globe/`, `src/lib/globe/`, `src/pages/Globe.jsx`, `src/hooks/useGlobe*`), newest first:
  - `3197fa69` polish-sweep: SOS UX hold-to-fire + 6 fixes (#278)
  - `961286e7` fix(pulse): isolate globe gestures from pull refresh
  - `be38025d` fix: stabilise auth callback and Safety FAB crash
  - `e64d6709` fix(globe): SOS rings — decode lat/lng from `safety_events.metadata` jsonb
  - `bcaefdbb` fix(globe): phase 4a — promoter migration arcs use home coords from RPC
  - `6c35b0fd` feat(globe): wire FoundingTierLayer into Globe.jsx + EnhancedGlobe3D
  - `d1f72d8c` feat(globe): FoundingTierLayer sibling + Promoter accent #FF4F9A
  - `bf159a6a` chore: untrack accidentally-committed files
  - `51fc1b7b` fix(brand): amber→#C8962C + rounded-3xl→2xl
  - `3aa970e2` fix(profile-sheet+globe): MapPin import, BOO in card, globe responsive
  - `de61821c` feat: GSD final — XXX gate flow + play button fix
- **VERIFIED ✅ — other notable non-docs work in the window:** SOS + check-ins + aftercare v1 (#280), Ghosted boo-first strict + RLS (#281/#282/#283), shared geolocation coalescer (single permission prompt), profile photo grid (#285), chat canonical adapter, telegram login fix, WhatsApp template work, a prod revert/restore to a stable tree on 2026-05-20.

*Source: `git log --since="2026-05-09" main` (post-unshallow), path-filtered.*

---

## 1.7 Active branches and open PRs

- **VERIFIED ✅ — total remote branches: 113.**
- **VERIFIED ✅ — branches updated in the last 30 days (since 2026-04-23): ~75.** Most-recent first (date · branch · author):

```
2026-05-23  main / HEAD                                  SICQR
2026-05-21  fix/boo-match-and-double-geo                 SICQR
2026-05-20  fix/profile-photo-grid                       SICQR
2026-05-20  audit/pre-release-may-20                     SICQR
2026-05-20  feat/safety-v1                               HOTMESS Cowork
2026-05-20  test/boo-first-regression                    SICQR
2026-05-20  feat/ghosted-rls-mutual                      SICQR
2026-05-20  feat/ghosted-boo-first-strict                SICQR
2026-05-19  design/system-reset-2026-05-19               Phil Gizzie (via Cowork)
2026-05-18  polish/sos-ux-and-monday-evening-tidy        Phil Gizzie (via Cowork)
2026-05-18  cowork/post-audit-followup-2026-05-18        Phil Gizzie (via Cowork)
2026-05-18  fix/consent-location-refresh-stability       SICQR
2026-05-18  fix/auth-callback-code-exchange              SICQR
2026-05-18  fix/sos-consent-cancel-flow                  Philip Gizzie
2026-05-17  docs/sos-restore-l1-l2                        Phil Gizzie
2026-05-17  feat/sos-dispatch-rebuild                     Phil Gizzie
2026-05-17  emergency/sos-safety-restore                  Phil Gizzie
2026-05-17  docs/sprint-0-auth-rescue                     Phil Gizzie
2026-05-17  fix/auth-funnel-rescue                        Phil Gizzie
2026-05-17  feat/founding-partner-pitch                   Phil Gizzie
2026-05-17  (+ ~6 more sprint-0-closeout / reentry / market-crash fix branches)
2026-05-16  fix/sw-cache-invalidation, fix/telegram-widget, feat/founding-tier-sprites,
            docs/v2-architecture, docs/sunday-checklist,
            hotfix/partner-beacons-tier-discriminator, feat/phase-3b-welcome-portal
2026-05-13  design/hotmess-os-end-to-end-mockup
2026-05-09  fix/maps-server-side-proxy, fix/csp-allow-maps-googleapis, feat/auth-telegram
2026-05-07  smoke/github-mcp-wiring-check
2026-05-01/02  ~30 × feat/v6-* spec-build branches + claude/* + chore/* cleanup
2026-04-30  merge/ziaullah-v5-safety-and-music
```

- **Open PRs — UNKNOWN ⚠️.** Open-PR enumeration (title / author / age / mergeable status) **could not be retrieved** from this environment: no `gh` CLI, no `GITHUB_TOKEN`/credentials, and `web_fetch` is provenance-restricted (can't call `api.github.com/.../pulls`). Closest primary-source proxies obtained: **274 PR head-refs exist all-time** (`git ls-remote origin 'refs/pull/*/head'`) and the full 113-branch list above. To complete this item: connect a GitHub MCP/token, or run `gh pr list --repo SICQR/hotmess-globe --state open`.

*Source: `git for-each-ref` (post-fetch of all heads), `git ls-remote`.*

---

## 1.8 What this audit did NOT check (needs a separate pass)

- **Performance on real devices** — Three.js/`react-globe.gl` render FPS, mobile thermal/battery, memory under load. Not measured.
- **Third-party integration health** — Mapbox tile quotas; Three.js render perf; Sentry error rates/volume; Resend send health & verified sender domain; RadioKing/AzuraCast stream health. Not checked (no dashboards/Management API access in this pass).
- **Mobile-specific bugs** not visible on desktop / not in code.
- **Anything requiring physical devices** — two-device SOS push delivery (BLK-01 real-world), real-device push notification lock-screen display (BLK-04), BLK-06 fresh-account onboarding walk-through, BLK-05 Google OAuth live exchange, video-call (SOFT-02) two-device test.
- **Live rendered DOM + browser console** on `hotmessldn.com` (1.1d/1.1e) — SPA shell verified; painted UI/console not captured (Chrome MCP available on request).
- **Conformance depth on 1.5** — tags reflect structural presence (code + schema), not a line-by-line spec-vs-implementation review of each of the 50 systems.

---

*End of Phase 1 audit. Phase 2 (build plan) does not begin until Phil has reviewed this and given explicit go.*
