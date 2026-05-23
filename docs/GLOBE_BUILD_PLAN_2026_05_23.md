# GLOBE BUILD PLAN — 2026-05-23

**Basis:** `docs/GLOBE_REALITY_AUDIT_2026_05_23.md` (Phase 1 + §1.9 closeouts). Everything here is shaped by what was verified there. This is a proposal — Phil makes the final scope call (§2.6).

---

## 2.1 Truth statement

**What the live globe does today.** The production globe at `hotmessldn.com/pulse` is a `react-globe.gl` (Three.js) sphere rendered by `EnhancedGlobe3D` (via `src/pages/Globe.jsx`, route-gated by `UnifiedGlobe`). It plots beacons (17 live), supports six layer toggles (events, venues, people, safety, market, radio), city heat (`useGlobeRealtime`), nearby-people pins (`fetchNearbyCandidates`), realtime locations and routes, venue intensity, pulse places, recovery pins, founding-tier labels/arcs/rings (the only place `mapbox-gl` is used), a beacon-drop modal, a city overlay, and activity tracking. It reads beacons from the `useRealtimeBeacons` hook (direct Supabase queries) — not from either `beacons.ts` file, both of which are outside the live path. The homepage renders cleanly with no console errors and all-200/204 network calls. The backing database holds 157 profiles (0 paying — all memberships `free`), 8 venues, 4 trusted contacts, and live tier/boost tables.

**What is actually broken right now.** One verified production 500: the daily `/api/cron/data-retention` job has crashed on every run for 12+ consecutive days (`cron_runs` rows stuck at `running`) because it chains `.catch()` on a Supabase Postgrest builder that has no `.catch()` method — fix prepared, not yet shipped (no push credential). GDPR-style data retention (purging stale messages, taps, age logs, and 7-day SOS location stripping) has therefore not run since at least 2026-05-12. Safety/SOS contact delivery records gateway "sent" for SMS (15) and WhatsApp (13) but never records a delivery or ack receipt (`delivered_at`/`acked_at` are null on all 96 rows), so there is no server-side proof that any safety alert reached a device. Push has only 14 FCM + 1 WNS subscriptions and zero Apple Web Push, so iOS push is effectively uncovered. The two long-standing "memory" blockers are **not** real: AgeGate already uses `localStorage`, and the Stripe webhook has thrown no 500s in 7 days.

---

## 2.2 Fix-first list (production blockers still broken)

> **Excluded by verification:** *AgeGate sessionStorage* and *Stripe webhook 500 (`ERR_MODULE_NOT_FOUND`)* are memory-claimed blockers that Phase 1 verified are **not present** in the current code. They are deliberately not on this list.

Ordered by user/compliance impact, not ease:

1. **`/api/cron/data-retention` crashing daily (GDPR retention not running 12+ days).**
   - Broken: handler dies on `.catch()` chained to a Postgrest builder → uncaught `TypeError` → 500; retention/strip jobs never execute.
   - Fix: remove the `.catch()` chain, `await` the final `cron_runs` update inside try/catch. **Already committed** on `fix/cron-data-retention-crash` (`2c64dc9a`).
   - Effort: **S**.
   - Ownership: **Cowork autonomous once a GitHub push path exists**; then confirm via the next 02:00 UTC `cron_runs` row closing to `ok`.

2. **Safety/SOS delivery has no receipt tracking (safety-critical observability gap).**
   - Broken: `safety_delivery_log.delivered_at` / `acked_at` never populated; no proof an SOS alert reached a contact's device.
   - Fix: persist provider delivery callbacks (Twilio status callback / WhatsApp delivery webhook) into `delivered_at`/`acked_at`; surface in the SOS delivery status UI.
   - Effort: **M**.
   - Ownership: **Cowork autonomous** for the code; needs Phil only to confirm provider webhook URLs are registered.

3. **iOS / Apple Web Push uncovered (0 Apple subscriptions).**
   - Broken: only FCM + 1 WNS subscription exist; no Apple Web Push path proven.
   - Fix: verify VAPID + Apple Web Push registration in `usePushNotifications`/`sw.js`; test PWA install on iOS.
   - Effort: **M**.
   - Ownership: **Phil-gated** (needs a physical iOS device to register + confirm).

4. **BLK-05 Google OAuth ("Unable to exchange external code").**
   - Broken: stale Google client secret in Supabase Auth.
   - Fix: update the secret in Supabase Dashboard → Auth → Providers → Google.
   - Effort: **S**.
   - Ownership: **Phil-gated** (dashboard action; not exposed to Cowork tooling).

5. **BLK-01 / BLK-04 / BLK-06 real-device confirmations.**
   - Broken: two-device SOS delivery, real-device push lock-screen display, and a fresh-account 7-step onboarding walk-through have never been human-verified end-to-end.
   - Fix: one device-test session.
   - Effort: **S** each.
   - Ownership: **Phil-gated** (physical devices).

*Not listed as a fix because it needs a product call, not a fix:* `public.spatial_ref_sys` has RLS disabled (Supabase advisory). It is a PostGIS reference table; enabling RLS without a policy would break spatial functions. → §2.7.

---

## 2.3 New build list (the 9 `MISSING · new build` docs)

Ranked by user impact. "Foundational" = other docs/work depend on it; "Leaf" = standalone.

### Group A — Local map rendering (the blurry-zoom problem)
1. **`GLOBE_MAPBOX_LOCAL_MODE.md`** — globe→usable local map handoff so deep zoom shows real streets/venues instead of a blurred sphere. **Foundational. ⭐ This is the doc that resolves the "zoom goes blurry" P0 from `GLOBE_VIEW_INTERACTION_MATRIX.md`.** `mapbox-gl@3.1.0` is already a dependency. Effort: **L**.
2. **`GLOBE_MAPBOX_LAYER_STACK.md`** — layer order/interaction/privacy/perf contract for local mode. Foundational, depends on #1. Effort: **M**.
3. **`GLOBE_GLOBE_TO_LOCAL_TRANSITION_ANIMATION_SYSTEM.md`** — camera choreography for the planetary→district→street transition. Depends on #1/#2. Effort: **M**.

### Group B — Trust & safety integrity
4. **`GLOBE_BEACON_REPUTATION_AND_SPAM_CONTROL.md`** — reputation/trust-weighting/abuse-throttling for beacons. Foundational before any high-volume/open beacon creation. Effort: **L**.

### Group C — Culture & content (leaf)
5. **`GLOBE_DISTRICT_EDITORIAL_AND_CURATION_SYSTEM.md`** — editorial/curation CMS for districts. Leaf. Effort: **M**.
6. **`GLOBE_EVENT_ARCHIVE_AND_CULTURAL_MEMORY_SYSTEM.md`** — persistent archive of past events/cultural traces. Leaf. Effort: **M**.

### Group D — Atmosphere & ambience (leaf, lowest impact)
7. **`GLOBE_WEATHER_TIME_AND_ENVIRONMENTAL_RENDERING.md`** — weather/day-night/environmental mood. Leaf. Effort: **M**.
8. **`GLOBE_AUDIO_REACTIVITY_AND_SOUNDSPACE_SYSTEM.md`** — globe audio reactivity / spatial ambience. Leaf. Effort: **M**.
9. **`GLOBE_EMOTIONAL_RENDERING_AND_NIGHTLIFE_PSYCHOLOGY.md`** — emotional-pacing design philosophy; least concrete, most likely to fold into other systems. Leaf. Effort: **S–M**.

*Menu, not a commitment.* Realistically only Group A (and possibly #4) is worth scheduling near-term; Groups C/D are post-PMF polish.

---

## 2.4 Reconciliation list (docs that contradict reality)

| Doc | What the doc says | What's actually live | Recommended action |
|---|---|---|---|
| `GLOBE_PARTNER_SUBSCRIPTION_TIERS.md` (`CONTRADICTS · live`) | A new partner/vendor/creator/venue subscription scheme. | Two live tier systems already exist: `membership_tiers` (mess £0 / hotmess £7.99 / connected £19.99 / promoter £44.99 / venue £99.99) **and** `venue_beacon_tiers` (community £0 / standard £29 / pro £79). | **Escalate to Phil — defer to the `hotmess-founding` thread.** Per the brief's hands-off rule, noted here, not resolved on the globe side. |
| `GLOBE_BEACON_MONETISATION_AND_BOOST_POLICY.md` (`EXISTS · differs`) | Boost taxonomy = Discovery Boost / District Boost / Momentum Boost. | Live `user_boost_types` (6) = Globe Glow / Profile Bump / Vibe Blast / Incognito / Extra Beacon / Highlighted Message (matches the Stripe boost catalogue). | **Edit the doc to match the live boost types.** Low effort; Cowork autonomous. |

---

## 2.5 Restatement banners

Add this banner to the top of each doc so future agents don't treat it as spec for unbuilt work:
> *"This document describes existing architecture. See [code path] for the canonical implementation."*

| Doc | Code path for the banner |
|---|---|
| `GLOBE_COMPONENT_CONTRACTS.md` | `src/components/globe/EnhancedGlobe3D.jsx`, `UnifiedGlobe.tsx`, `src/pages/Globe.jsx` |
| `GLOBE_DOC_TRAIN.md` | (meta) `docs/GLOBE_*.md` reading order — no code |
| `GLOBE_IMPLEMENTATION_PLAN.md` | `src/pages/Globe.jsx` + `src/components/globe/` |
| `GLOBE_SUPABASE_SCHEMA_MAP.md` | live schema in Supabase `rfoftonnlwudilafhfkl` (`beacons`, `globe_events`, `right_now_posts` view, `venues`, `safety_*`) |

Effort: **S** (doc edits); Cowork autonomous.

---

## 2.6 Recommended sprint structure (proposal — Phil reshapes)

**Sprint 1 — "Close the gaps" — 1 calendar week.** Fixes + governance only, no big builds.

- 2.2 #1 — ship the data-retention cron fix (already committed) + confirm next run closes.
- 2.2 #2 — add SOS/push delivery-receipt recording.
- 2.4 — edit the boost-policy doc to match live boost types.
- 2.5 — add restatement banners to the 4 docs.
- Phil-gated within the week: BLK-05 Google OAuth secret; one real-device session covering BLK-01/04/06.

**Sprint 2 — "Local mode" — 2–3 weeks.** The headline build.

- 2.3 #1 Mapbox Local Mode (fixes blurry zoom — the single most visible defect), then #2 Layer Stack, then #3 Transition.

**Deferred to Sprint 3+:** beacon reputation/spam (#4); culture/ambience docs (#5–#9); partner-tier reconciliation (owned by the founding thread).

**What gates Sprint 1:**
- **A GitHub push path** — currently the hard blocker for *all* code landing (sandbox has no GitHub auth; Mac Terminal is click-only to Cowork). A token or GitHub MCP unblocks everything.
- Phil dashboard action for OAuth; Phil device session for the real-device tests.

---

## 2.7 Open questions for Phil

- **Q: How should Cowork land commits/PRs?** Options: A) connect a GitHub token/MCP so Cowork pushes directly; B) Phil runs the provided push commands; C) Cowork drives the GitHub web UI via the connected browser. **Lean: A** — cleanest and unblocks all future code work; C risks malformed commits to a production repo.
- **Q: Backfill the 12+ stuck `cron_runs` 'running' rows?** Options: A) mark them `error` for clean history; B) leave them. **Lean: A** — cheap, makes the dashboard truthful; do it alongside the cron fix.
- **Q: `spatial_ref_sys` RLS disabled (advisory).** Options: A) leave as-is (it's a PostGIS reference table; enabling RLS without a policy breaks spatial functions); B) enable RLS with a permissive read policy. **Lean: A** — leave it; the exposure is a static reference table, and enabling it risks breaking PostGIS. Revisit only if a security review requires it.
- **Q: SOS/push delivery receipts — how deep?** Options: A) just persist the gateway response + provider status callbacks into `delivered_at`/`acked_at`; B) full read-receipt + retry/escalation loop. **Lean: A** for Sprint 1; B later — for a safety feature, knowing "delivered" vs "sent" is the priority.
- **Q: iOS push.** Options: A) implement + verify Apple Web Push now (needs an iOS device); B) defer until the iOS PWA story is decided. **Lean: B** unless founding users are on iPhone — then A.
- **Q: Local detail — Mapbox vs higher-res globe texture?** The docs assume a Mapbox local-mode handoff; the live globe is `react-globe.gl` only. Options: A) full Mapbox local mode (the docs' design, `mapbox-gl` already a dep, L effort); B) cheaper interim — swap the `earth-night.jpg` demo texture for a higher-res tile and cap zoom (S effort) to stop the blur now. **Lean: B as a Sprint-1 stopgap, A as the Sprint-2 build.**
- **Q: Partner-tier contradiction ownership.** Confirm it is handled in `hotmess-founding` (per hands-off rule) and Cowork should not touch the globe-side tier tables. **Lean: confirm yes.**

---

*End of Phase 2 build plan. After Phil signs off, the actual build work becomes a separate brief based on §2.6.*
