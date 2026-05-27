# HOTMESS — System State

**Last updated:** 2026-05-27, end of day, by hotmess-ops.
**Audience:** anyone (human or LLM) walking into this repo cold and needing to know what's true *right now*.
**If you read only one file in this repo before doing anything, read this one.**

---

## 1. What HOTMESS is right now

HOTMESS is a queer-led emotional operating system covering radio, nightlife, fashion, care advocacy, and digital community. The codebase in this repo (`SICQR/hotmess-globe`) is the live web/PWA app at **[hotmessldn.com](https://hotmessldn.com)**.

Today's phase: **live beta with real paying users**. Not a prototype anymore. Every shipping decision now produces social consequences. Velocity is no longer the metric — emotional coherence and trust integrity are.

The product is becoming "a slower, more atmospheric, more emotionally aware alternative" to mainstream dating/discovery apps. Restraint is the differentiator.

---

## 2. Live numbers (snapshot, 2026-05-27 16:10 UTC)

These are pulled from production Supabase, not estimates.

| Metric | Value |
|---|---|
| Real profiles (excludes `is_demo` seeds) | 129 |
| Signups last 24h | **19** (12 at 14:00 UTC, 5 at 15:00, 2 at 16:00) |
| Signups last 7d | 20 |
| Signups last 30d | 29 |
| Paying subscribers (active) | 2 |
| Active beta cohort | 2 |
| Beacons dropped last 24h | 11 |
| Boos (taps) last 24h | 2 |
| Boost purchases since launch | 0 (boosts unhid ~16:00 UTC) |
| Feedback submitted last 24h | 0 (V1 just shipped) |
| Escalated feedback last 24h | 0 |

**Live dashboard:** [hotmessldn.com/admin/analytics](https://hotmessldn.com/admin/analytics) (admin auth required). Component: `src/components/admin/AnalyticsDashboard.jsx`. NOTE: this page does `SELECT *` from `profiles`/`beacons`/`orders` — fine at 129 users, will need pagination at ~1000.

---

## 3. Infrastructure

| Layer | Provider | ID / handle |
|---|---|---|
| Hosting | Vercel | project `hotmess-globe`, team `phils-projects-59e621aa` |
| Domains | Vercel | `hotmessldn.com`, `www.hotmessldn.com` |
| Database | Supabase | project `rfoftonnlwudilafhfkl` |
| Auth | Supabase | Magic-link + Telegram (HotmessAuthBot) |
| Payments | Stripe | Live keys in Vercel env |
| Notifications | Telegram + WebPush (VAPID) + Twilio SMS | All env-keyed |
| Source | GitHub | `SICQR/hotmess-globe` |
| Branch model | `main` = staging-of-truth, `production` = live | Promote via deterministic commit-tree |

**Vercel cron jobs registered** (`vercel.json`):
- `*/5 * * * *` — notification processing + dispatch
- `*/2 * * * *` — safety check-ins
- `* * * * *` — SOS health check
- `*/30 * * * *` — aftercare nudge + safety escalation
- `0 3 * * *` — events cron + data retention
- `0 7 * * *` — WhatsApp daily summary
- `0 9 * * *` — **morning observation digest → Phil's Telegram** (NEW today, PR #585)
- `0 2 * * *` — data retention
- `20 4 * * *` — rate-limit cleanup

---

## 4. Sacred Invariants (do not violate)

Codified at `docs/doctrine/sacred-invariants.md`. The most-cited in code review:

1. No exact tracking — fuzzy ≤200m, no persistent trails (location is approximate, always).
2. No real user data in fixtures or seed scripts.
3. Use the deterministic promote pattern; never bypass branch protection.
4. **HOTMESS never sells symbolic capability.** Every paid feature must produce a perceivable, observable outcome.
5. Relationship signals always outrank monetisation signals visually (doctrine `07-visual-hierarchy.md`).
6. **Monetisation may amplify atmosphere, but must never override relational truth.** (Phil 2026-05-27 lock.)

---

## 5. Doctrine tree (canonical references)

All in `docs/doctrine/`. **Read these before touching the matching surface:**

| File | Covers |
|---|---|
| `00-canonical-naming.md` | What things are called + sacred invariants index |
| `01-relationship-permissions-matrix.md` | MESS → CONNECT → TRUSTED state machine |
| `02-membership-entitlement-matrix.md` | Free / HOTMESS / CONNECTED / PROMOTER / VENUE tiers |
| `03-identity-system-spec.md` | Beacon Identity System, 9 hero glyphs |
| `04-upgrade-surface-doctrine.md` | When to ask for money (and when not to) |
| `05-downgrade-and-grace-period-doctrine.md` | What happens when someone stops paying |
| `06-media-moderation-doctrine.md` | Image / video / consent rules |
| `07-visual-hierarchy.md` | Relationship > monetisation. Felt-feature principle. Glow restraint. Felt-copy table. |
| `08-visibility-state-architecture.md` | **NEW.** Gates #213 incognito. State model + per-surface contract + exceptions A/T/M. |
| `beacon-doctrine.md` | Beacon lifecycle, categories, render rules |
| `product-doctrine.md` | Top-level product principles |

---

## 6. The boost system (current state — fully wired or explicitly hidden)

This was today's main thread. Auditing the boost system found **3 of 6 boosts charged users with no observable effect**. All resolved.

| Boost | Status | Effect | Hidden? |
|---|---|---|---|
| `vibe_blast` | LIVE | Right-now upsert with consumption | No |
| `extra_beacon_drop` | LIVE | Beacon credit decrements on use | No |
| `highlighted_message` | LIVE | Message highlight + consumption | No |
| `profile_bump` | **LIVE (today)** | Sort-to-top + outer gold glow on Ghosted card | No (unhid PR #578) |
| `globe_glow` | **LIVE (today)** | L8 atmospheric aura layer on Pulse map for owner's beacons | No (unhid PR #580) |
| `incognito_week` | HIDDEN | — | **Yes — gated on `docs/doctrine/08-visibility-state-architecture.md`** |

### Boost system architecture (concrete file paths)

- **Server:** `api/stripe/webhook.js` (boost_key handler, `uses_remaining: catalog.duration_hours === null ? 1 : null`)
- **Server purchase endpoint:** `api/stripe/create-boost-checkout.js` (`DISABLED_UNTIL_WIRED = new Set(['incognito_week'])` is the kill-switch list)
- **Shop UI:** `src/components/sheets/L2BoostShopSheet.jsx` (`HIDDEN_UNTIL_WIRED = new Set(['incognito_week'])` matches server-side)
- **Hooks:** `src/hooks/usePowerups.ts` (consume RPC + filter consumed rows), `src/hooks/useBoostedUserIds.ts` (profile_bump), `src/hooks/useGlowUserIds.ts` (globe_glow)
- **Supabase RPCs:**
  - `consume_boost(user_id, boost_key)` — atomic FOR UPDATE decrement
  - `boosted_profile_user_ids()` — SECURITY DEFINER, returns SETOF uuid (user_ids only, no commerce)
  - `globe_glow_user_ids()` — sister RPC, same pattern
- **Rendering:**
  - `src/modes/GhostedMode.tsx` — sorts boosted users to top of grid
  - `src/components/ghosted/GhostedCard.tsx` — `isBoosted` prop renders outer gold glow
  - `src/lib/globe/mapboxLayerStack.js` — L8 `beaconGlow` circle layer beneath markers (radius 8→26 across zooms, blur 1.4, opacity 0.22-0.38)
- **Post-purchase tone (`src/App.jsx`):** per-boost felt copy table. globe_glow → "Your pulse is glowing tonight." NOT "Globe Glow activated!"

### Why incognito_week is gated

Incognito is not "hide me." It is a distributed visibility policy engine touching map presence, websocket broadcasts, beacon serialization, Ghosted inclusion, search, mutual exceptions, TRUSTED overrides, moderation visibility, analytics persistence, audit retention, push fanout, map cache invalidation. Treat like auth or payments. **Spec is `docs/doctrine/08-visibility-state-architecture.md` and has 4 open questions for Phil before any code starts.**

---

## 7. Observation surface (live, query directly or wait for digest)

The current operating mode is **observation, not feature shipping**. Four read-only Supabase views capture what to watch:

| View | Question it answers |
|---|---|
| `obs_feedback_clusters_72h` | What surface / temperature / type is generating Pulse Feedback right now? Includes escalation count. |
| `obs_boost_lifecycle_14d` | For each boost_key: purchased, active now, consumed, distinct buyers, repeat buys. |
| `obs_beacon_return_cadence_30d` | Do beacon droppers come back? Median + p25/p75 gap hours between drops. |
| `obs_relationship_pipeline` | Snapshot: total boos, mutual pairs, trusted-eligible pairs, new mutuals last 7d. |

All four are `security_invoker = on` and granted `SELECT` to `authenticated`. They populate at different speeds — feedback within hours, boost lifecycle in days.

**Daily push:** `api/cron/morning-observation-digest.js` runs at 09:00 UTC and posts a Markdown summary to Phil's Telegram. Separate alert ping fires if any escalated feedback in the last 72h. Code lives at PR #585 (merged 2026-05-27).

**Manual trigger:** `GET /api/cron/morning-observation-digest?secret=$CRON_SECRET` to fire on demand.

---

## 8. What shipped today (2026-05-27, chronological)

| PR | Title | Why it matters |
|---|---|---|
| #568 | SOS SMS cost caps + doctrine | Per-user daily cap + global SMS budget kill-switch. Prevents unbounded Twilio bill. |
| #571 | isPremium gate honors live tier names (Bren unlock) | Bren paid £7.99, got nothing observable — tier name mismatch. Sacred Invariant #4 violation, fixed. |
| #573 | UX fixes — profile scroll + duplicate Sell button | Live user complaints. iOS dvh fix + FAB-only Sell. |
| #575 | Single-use boost consumption tracking | `uses_remaining` column + `consume_boost` RPC. Without this, single-use boosts gave infinite uses for one £1.49–£3.99 payment. Sacred Invariant #4 violation, fixed. Plus L2EventSheet `useNavigate` wiring (prevented event-location tap crash). |
| #578 | profile_bump end-to-end on Ghosted grid | RPC + hook + sort + gold-glow card affordance. Closed the boost-vapourware audit (#566) for this boost. |
| #580 | globe_glow renderer + visual-hierarchy doctrine | L8 atmospheric aura layer. Doctrine 07. Per-boost felt copy. Last hidden boost wired (modulo incognito). |
| #582 | Doctrine line: "amplify atmosphere, never override relational truth" | Sacred sentence at head of doctrine 07. |
| #583 | Visibility-state architecture spec (doctrine 08) | Gate for #213 incognito. 166-line spec, 4 open Phil-questions. |
| #584 | Postmortem: PR #554 TDZ crash | Root cause + 4 prevention rules. Codified the failure mode. |
| #585 | Morning observation digest → Telegram cron | Push observation, not pull. Runs 09:00 UTC daily. |

All shipped via the deterministic commit-tree promote pattern, each verified live before the next.

---

## 9. What is parked / forbidden (do not pick up)

**Frozen until observation phase produces signal:**
- New boosts
- New monetisation surfaces
- New ambient amplifiers (no second glow, no flash, no pulse animation)
- Monetisation copy polish

**Frozen until `docs/doctrine/08-visibility-state-architecture.md` is reviewed:**
- `#213` incognito_week — code, schema, UI. All of it.

**Frozen pending Phil decision (4 open questions in doctrine 08):**
- Q1: chat partner sees "offline" when other user goes invisible mid-thread?
- Q2: trusted-contacts (SOS fanout) = TRUSTED-tier set?
- Q3: beacon visibility = snapshot at publish or current at render?
- Q4: map cache 60s gap acceptable for V1, or ship pg-notify off-cadence refresh from day one?

**Allowed during observation phase:**
- Critical hotfixes (live-user crash, security, payments)
- Doctrine writing
- Postmortems
- Observation tooling
- Investigation / diagnostics

---

## 10. Workflow rules (codified from postmortems)

### Bundle hygiene (from PR #554 TDZ postmortem)

1. Any new component mounted globally in `OSArchitecture` MUST be lazy-loaded if >150 lines OR has >3 internal imports, AND wrapped in a local ErrorBoundary that returns null on throw.
2. Top-level hook calls in root-mounted components must come from contexts already in the root provider tree.
3. Client-side global side effects (`window.__x = ...`) belong in `useEffect`, never in render bodies.
4. "Vercel preview check green" ≠ "the root path loads." Manually load the preview URL at `/` and tap one route before promoting. The `Lint → Typecheck → Build` check passing only means the build completed.

### Promote discipline

- `main` is squash-merge; `production` is merge-merge (preserves promote commits).
- Deterministic commit-tree pattern: create commit with main's tree parented by production tip, branch off it, PR → production, merge with `merge_method=merge`.
- Bash sandbox has a 45s timeout — local `vite build` won't fit. Typecheck-only pre-push (`npx tsc --noEmit`) + Vercel preview as build gate.

### Verification step (mandatory)

After every shipped PR:
1. Poll Vercel for READY state on production deploy
2. Live smoke `/`, `/pulse`, `/ghosted` for 200
3. Grep the live JS bundle for the new RPC name / hook to confirm it's bundled
4. Update the task list as completed only after the above

---

## 11. Environment variables (currently set in Vercel)

Do NOT regenerate VAPID keys. Do NOT log token values.

- `SUPABASE_URL`, `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_KEY` / `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_ANON_KEY`
- `TELEGRAM_BOT_TOKEN` (bot is **HotmessAuthBot**, not @HOTMESSBot)
- `TELEGRAM_WEBHOOK_SECRET = 26ca4a9b165bfe10b8e78a800bcc8857`
- `VITE_TELEGRAM_BOT_USERNAME`
- `PHIL_TELEGRAM_CHAT_ID` (for direct ops pings + morning digest)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, all `STRIPE_*_PRICE_ID`s
- `TWILIO_*` (SMS); `MAX_DAILY_SMS_SENDS` (defaults 500 if unset, kill-switch)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- `MAPBOX_TOKEN`, `VITE_MAPBOX_TOKEN`
- `RESEND_API_KEY` (transactional email)
- `CRON_SECRET` (Bearer-auth for cron endpoints)

---

## 12. File map (where to look for what)

```
src/
  modes/
    GhostedMode.tsx           ← live Ghosted grid (NOT ProfilesGrid.tsx — that's dead path)
  components/
    globe/
      PulseMap.jsx            ← single-engine Mapbox globe
      beaconIconFactory.ts    ← sprite registration
      beaconGlyphs.tsx        ← 9 hero category glyphs
    ghosted/
      GhostedCard.tsx         ← card render + isBoosted gold glow
      GhostedRecentStories.tsx ← IG-stories layout above grid
    sheets/
      L2BoostShopSheet.jsx    ← boost shop, HIDDEN_UNTIL_WIRED kill-switch
      L2BeaconSheet.jsx       ← beacon drop sheet (consumes extra_beacon_drop)
      L2ChatSheet.jsx         ← chat (consumes highlighted_message)
    feedback/
      PulseFeedbackButton.jsx ← "HOW'S IT FEEL?" floating chip, lazy + ErrorBoundary
      PulseFeedbackSheet.jsx  ← 6-type selector
    admin/
      AnalyticsDashboard.jsx  ← /admin/analytics
  lib/
    globe/
      mapboxLayerStack.js     ← L6-L10 layer definitions + toPublicSafeFeatureCollection
  hooks/
    useBoostedUserIds.ts      ← profile_bump RPC poll
    useGlowUserIds.ts         ← globe_glow RPC poll
    usePowerups.ts            ← isActive + consume helper
    useUserContext.js         ← tier gate (isPremium, isHotmess, etc.)

api/
  stripe/
    webhook.js                ← boost activation + tier upgrade
    create-boost-checkout.js  ← purchase endpoint + DISABLED_UNTIL_WIRED guard
  cron/
    morning-observation-digest.js  ← daily Phil Telegram digest
  safety/sos.js               ← SOS with daily user cap
  notifications/
    dispatcher.js             ← fanout (.limit(3) trusted contacts)
    channels/sms.js           ← global daily SMS budget kill-switch
  feedback.js                 ← Pulse Feedback V1 server

docs/
  doctrine/                   ← READ THESE BEFORE TOUCHING THE SURFACE
  postmortems/                ← read after a bug, write after fixing one
```

---

## 13. The room outside this repo

- **Phil Gizzie** — solo founder, sole code owner, CEO/CTO/dev. Operates with high autonomy; delegates execution end-to-end via this repo + Supabase MCP.
- **Bren McKenna** — first real paying user (£7.99 HOTMESS tier).
- **Beta cohort** — 250-user 2-week free access (invite-driven via `/redeem/CODE`). 2 active so far today.
- **Live users** — ~129 real profiles. Real consequences. No demo mode.

---

## 14. The next step

Per Phil 2026-05-27 close:

> Don't immediately start another feature sprint. The product is finally alive enough to respond back. Let the field teach you something.

So:
1. **Tomorrow morning, 09:00 UTC:** the digest pings Phil's Telegram. Read it.
2. **Within 48h:** decide on the 4 visibility-state architecture questions.
3. **Within ~1 week:** review boost lifecycle data + decide if `incognito_week` should be wired or repriced or dropped.
4. **Whenever signal is clear:** the queue resumes with #213 implementation (in 5 ordered PRs per doctrine 08 §16).

---

*Written by hotmess-ops. If this file is more than 7 days old and you're picking up the repo, the live numbers will be stale — re-pull from Supabase and update §2.*
