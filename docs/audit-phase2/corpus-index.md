# Corpus Index — Enforceable Rules & Invariants

**Phase 2 backbone audit · SICQR/hotmess-globe · generated 2026-06-30**

Scope: every doctrine in `docs/doctrine/` (47 .md incl. slices), `docs/governance/` (5), `docs/operations/` (5), and the 33 sealed specs converted from `docs/v6/specs/*.docx` -> `docs/v6/specs_txt/`.

A rule is **enforceable** only if it can be measured / thresholded / state-transitioned / rate-limited / audited (per Sacred Invariant #13 and Developer-Rules §8). Rules that assert a value, tone, or intention without a measurable trigger are flagged **aspirational**. This is an extract of the load-bearing rules per doc — not a transcription.

Legend: **E** = enforceable, **A** = aspirational-only.

---

## docs/doctrine/ — numbered spine (Dxx)

| doc | rule (1 line) | E/A | how it could be measured |
|---|---|---|---|
| 00-canonical-naming | HOTMESS never sells symbolic capability (FOUNDING 250 never resold/reopened/duplicated) | E | assert no SKU/price grants Founding capability; Founding rows <=250, immutable |
| 00-canonical-naming | Every code-level gate must reference a key in `membership_tiers.benefits`; no hardcoded tier strings | E | static-scan src for hardcoded tier enums / `z-[NN]`; CI grep |
| 01-relationship-permissions-matrix | Capability belongs to a relationship state; mutual-boo within 7 days -> TRUSTED after 24h cooldown | E | assert TRUSTED gate checks `cooldown_until`; reject capability without state row |
| 01-relationship-permissions-matrix | Distance shown only as bucket ("<5 min"/"far away"), never exact | E | DOM scan for raw distance/coords; assert bucketed strings only |
| 02-membership-entitlement-matrix | DB is source of truth for entitlements; beta_access grants hotmess-equiv for 14 days | E | gate reads `profiles.beta_access_until > now()`; assert 14-day window |
| 03-identity-system-spec | Care badge requires >=3 active TRUSTED for >=30 days; drops if <3; streaks display-cap at 99 | E | threshold check on trust count + age; assert display cap=99 |
| 03-identity-system-spec | Trust badge shows abstract count ("trusted by 12"), never names | E | assert no names in badge payload |
| 04-upgrade-surface | Upgrade prompts frequency-capped (once/day, once/30-day) and forbidden on intimacy surfaces | E | count prompt fires per user per window; assert zero on forbidden surfaces |
| 04-upgrade-surface | HOTMESS never nags, ransoms, or interrupts intimacy | A | partly measurable via frequency cap; "nag feel" aspirational |
| 05-downgrade-grace | 7-day grace (3 for beta); 1-tap restore <=30 days; frozen items archive after 30d, never deleted | E | assert grace timer = 7/3 days; assert no hard-delete of frozen items |
| 06-media-moderation | Voice notes retained 24h; video DMs 24h, never client-saveable; transcripts purged after 30 days | E | cron purge at 24h/30d; assert file gone + placeholder |
| 06-media-moderation | Video pre-check flags if recipient blocks sender within 10s of opening | E | event window 10s; route to /admin/safety-review |
| 07-visual-hierarchy | Monetisation may amplify atmosphere, never override relational truth; pulse <=1 cycle/8s | E/A | assert pulse cadence <=1/8s; truth-override is judgment |
| 08-visibility-state-architecture | Fuzzy <=200m, no trails; visibility snapshot at publish-time; toggle propagates <=60s | E | assert radius <=200m; matview refresh <=60s; snapshot column present |
| 09-onboarding-truth | "Active" = signed in N>=2 times in last 7 days; free users fog Ghosted past 3 cards, 90s music cap | E | threshold N>=2/7d; assert 3-card fog + 90s cap in code |
| 10-profile-identity | Visibility unlock and identity reveal MUST stay separate systems; drag damping >=22, stiffness <=400 | E | static assert two distinct code paths; spring constants in config |
| 11-arrival-state | First 5s after signup: monetisation never ahead of care; system never sounds excited ("Welcome back!" forbidden) | E/A | assert no upsell in first-5s render; DOM scan forbidden greetings |
| 12-drop-beacon | Presence (Go Live) and Beacon never the same act; both +/-200m fuzz; Presence never persisted on globe | E | assert Presence has no `beacons` row; radius <=200m |
| 13-spatial-continuity | No blind cluster taps — cluster must show preview sheet; close completes before open (80ms defer) | E | runtime assert preview rendered; transition timing 80ms |
| 14-routing-continuity | No fare estimates, no driver pings, no "last train" certainty; never eject to Google Maps | E | DOM/code scan forbidden strings + external map escape |
| 15-care-language | D15 §5 forbidden-vocabulary list must not appear in any rendered care surface | E | release-checklist DOM grep of forbidden vocab (already a CI gate) |
| 16-surface-layer | z-index from constants only; rail never exceeds 60% viewport height; hover suppressed 400ms after flyTo | E | static grep hardcoded z; assert rail max 60vh; timing 400ms |
| 18-product-sheet-layout | Product sheet max 70dvh; peekFraction 0.92 for shop/product; bottom padding 128px | E | assert constants in `sheetSystem.ts` |
| 19-marketplace | Marketplace must never reconstruct/imply live presence for off-grid users; provenance self-volunteered, never inferred | E | assert no presence join in listing query; no auto-tag from attendance |
| 19-marketplace | Staleness labels required ("active 2m ago"/"active today") | E | assert freshness label maps to lifecycle state |
| 20-identity | 4 identity layers never collapse; cross-layer effects explicit/audited, never silent/inferred | E | assert no KYC->boost, trust->discovery, recovery->trust paths; audit log |
| 21-payment-payout | Stripe is source of truth; reconcile amends platform table from Stripe never reverse; atmospheric write fire-and-forget, never blocks regulated write | E | assert reconcile direction; assert atmospheric write non-throwing |
| 21-payment-payout | Regulated timestamp precise; atmospheric bucket quantised to day, separate column, never co-queried | E | schema assert two columns; query-path audit |
| 22-temporal | Remember enough for continuity, never enough to reconstruct a life; trajectory memory decays minutes->days, never weeks | E | assert decay TTL on trajectory tables; no long-lived identifiable rows |
| 22-temporal | Aggregate atmosphere may influence ambience, never enforcement | E | assert atmospheric reads not consumed by any gate/ranking |
| 24-contextual-trust-weighting | Trust position reconstructed at query-time; NO denormalised trust column anywhere; consumed gate-shaped (boolean), never as score | E | schema assert no trust-state column; gate returns boolean per-rung |
| 25-in-app-messaging | Chat gate-gated (D24 converged), never permission-gated; no chat-request/pending-inbox/follow flow | E | assert chat opens on gate boolean; no request table/flow |
| 25-in-app-messaging | Operator-to-user broadcast forbidden entirely (D31 §6) | E | assert no broadcast channel; per-pair shape only |
| 28-refund-cancellation | Reversal never gates future activity; per-pair only, no cross-pair aggregation; uses D15 tone not legal | E | assert no dispute-history feature; reversal row scoped to pair; DOM tone scan |
| 31-venue-partner-power | Operators inherit reach, never reconstruction; no live user-presence stream; no broadcast-to-attendees | E | assert operator endpoints aggregate-only; no per-user presence feed |
| 32-ai-automation | Models inherit substrate incapability; AI never acts (lowest authority) | E | assert model inputs pre-bucketed; no AI write to user-action paths |
| 33-memory-permanence | Aggregate-only persistence — counter deltas, no per-event row survives; boundary-side bucketing destroys raw inputs pre-write | E | schema assert no per-event rows; function severs identity pre-write |
| 34-trajectory | Chat resolves back into movement; first contact never feels like cold DM spam | E/A | assert "headed there" affordance present; spam-feel aspirational |
| 35-language-operating-system | Canonical tiers MESS/HOTMESS/CONNECTED/PROMOTER/VENUE — caps, no abbreviation/localisation; never gamified/urgent unless structurally true | E | DOM scan tier strings; assert no emoji-urgency copy |
| 43-in-world-vs-sheet-world | In-world anchored or ambient never modal; sheet-world invoked never assumed | E | assert in-world non-interrupting; sheet requires explicit invoke |
| 44-identity-account-persona | Auth method != identity; account ID never rendered; every personal entity declares ownership layer; system never speaks first on linking | E | assert account_id absent from user payloads; entity ownership-layer field required |
| 48-spatial-identity-exposure | Face exposure climbs a consent ladder; down-spectrum always allowed, up must be earned; aftercare face structurally forbidden | E | assert render tier <= earned consent; no face on aftercare surface |
| 49-entity-ontology | A passive venue is not social proof and MUST NOT enter the signal source (`hm-signals`) | E | assert passive venues filtered from signal pipeline |
| 52-trajectory-interruption | Never display stale location as live; force-quit >3min -> offline; battery-dead >10min -> auto-end; GPS >100m -> uncertainty halo | E | assert heartbeat thresholds 3/10min + 100m drive state |
| 53-surface-continuity-substrate | Every primary action surface must change URL/sheet/error-toast within 800ms or fail CI; state<->URL echo race forbidden | E | runtime CI harness asserts 800ms response on every surface |
| 53-surface-continuity-substrate | HOTMESS RADIO anchor: one slot, leftmost, never dismissable/reorderable/hidden | E | assert single radio slot, fixed position, non-dismissable |
| 56-unified-signal-emission | No intensity slider exposed to user; default emission window "Tonight" = 4h | E | assert no slider UI; default TTL 4h |
| 63-nominator-sovereignty | Class A (glanceable) surfaces never name third parties | E | assert no named third-party on Home cards / push previews |
| beacon-doctrine | Trust/moderation may affect rank but never override safety; bands LOCKED(0-100m)/STRONG(100-300m)/PINGING(300-800m) | E | assert band thresholds; safety floor in ranking |
| product-doctrine | Ranking hierarchy immutable (Safety..Monetization); never reordered/abbreviated; never fabricate urgency | E | assert ranking code follows 8-layer order; quiet-state honesty |
| GLOBE-CINEMATIC (D50) | Governs rendering never routing; never alarm-red unless emergency; never flashy | E/A | assert no routing in render layer; colour assert non-emergency |
| GLOBE-ZOOM (D51) | Per-zoom: what appears/recedes/is-forbidden fixed per Z-level | E | assert layer visibility map per zoom |
| EXECUTION | Every constitutional doctrine = [human reality preserved, extractive mutation forbidden] and must name its pair | E | doc-lint: each new Dxx declares its pair |
| sacred-invariants | 18 invariants incl fuzzy <=200m, no trails, signals always expire, trust outranks payment, district caps, every alert has owner | E | each invariant maps to a measurable gate |
| sacred-invariants | Decision hierarchy Safety->Truth->Trust->Freshness->Momentum->Readability->Relevance->Monetization | E | assert conflict-resolution code walks this order |

### Slices (docs/doctrine/slices/)
| doc | rule | E/A | measure |
|---|---|---|---|
| SLICE_G_PERSON_PHOTO_MARKERS | Person photo markers gated by D48 consent ladder | E | assert marker render tier <= consent |
| convergence-v1 | Convergence chat opens on mutual-boo primitive | E | assert gate event |
| ghosted-nearby-blend | Nearby blend reads `location_consent` before GPS | E | assert consent read precedes GPS |
| phase-0-closeout-criteria | Phase-0 closeout has explicit pass criteria | E | checklist gate |
| cinematic-mockup-slice-ladder / editorial-aspect | Editorial/cinematic rendering ladders | A | aesthetic guidance |

---

## docs/governance/ (Tier-1)

| doc | rule (1 line) | E/A | how measured |
|---|---|---|---|
| developer-rules-checklist | Every rule must have owner + observable signal + threshold + action on breach; else not operational | E | governance lint: reject rule lacking any of the 4 |
| developer-rules-checklist | Conflict hierarchy: Sacred invariants -> Governance canonical -> Product/doctrine -> Drafts | E | precedence engine (see conflict-resolution-doctrine.md) |
| ranking-constitution | Monetization cannot break trust; no single source permanently dominates a district (district caps) | E | assert boost <= cap; per-district source share <= cap |
| ranking-constitution | Abuse limited via cooldowns/district quotas/category quotas/boost caps/repetition penalties/trust rate-limits | E | each is a numeric threshold to assert |
| ranking-formula-spec | 8-layer order; hard exclusions (unsafe/stale-beyond-threshold/below-trust-min/over-cap/readability-fail) | E | assert suppression triggers on each condition |
| signal-economics-spec | Signals finite+decay+tiered+bounded; quotas (user 1 active intent/cooldown); durations (user 60-120min max 4h; venue 2-4h) | E | assert TTLs + quotas in signal pipeline |
| trust-system-spec | High trust -> longer durations/shorter cooldowns; low -> throttling/faster decay/aggressive caps; earned/decayable/reversible | E | assert trust band modulates duration/cooldown/cap |

## docs/operations/

| doc | rule (1 line) | E/A | how measured |
|---|---|---|---|
| launch-ops-playbook | v1 conservative: tight density caps, narrow boost rights, strict quotas, aggressive moderation, 1 active intent signal | E | assert launch-config values |
| metrics-and-instrumentation-spec | Every core metric bounded/time-aware/district-segmented/alertable/tied to action threshold | E | assert each metric has alert threshold + owner |
| observability-and-alerting-spec | Severity ladder Info->Watch->Warning->Critical->Emergency; every alert tied to action ownership | E | assert alert routing + owner mapping |
| release-checklist | PR touching D15 surface -> rendered DOM searched for D15 §5 forbidden vocab before ship | E | CI DOM grep (already wired) |
| HANDOFF-2026-05-27 | Privacy rule 7: raw lat/lng never renders; deterministic-promote tree-equality only | E | DOM/code scan raw coords; assert prod tree-equality |

---

## docs/v6/specs_txt/ — sealed specs (converted from .docx)

| doc | rule (1 line) | E/A | how measured |
|---|---|---|---|
| HOTMESS-DevHandoff | Silence after arrival 90s min (no push/AI/UI, cannot override); movement <=10s (>15s -> last-known, no fake); Flash expires 120s never stored | E | assert 90s silence; <=10s cadence; 120s Flash TTL + no persistence |
| HOTMESS-SystemAudit | CANONICAL: Flash expires after 120 seconds (resolves 120s vs "2 min"); 60s post-expiry cooldown separate | E | assert single value 120s across code/docs |
| HOTMESS-Legal-Compliance-v1-FINAL | 18+ before any proximity/match/intent (UK OSA 2023 Sch.8; GDPR Art.8); AgeGate localStorage; no profile/Ghosted/proximity until passed | E | assert gate blocks <18; localStorage persistence; features locked pre-gate |
| HOTMESS-Content-Policy | 18+ platform; CSAM never allowed; event listings need accurate description + 18+ warning | E | assert CSAM scan; 18+ chip on listings |
| HOTMESS-Globe-Beacons-v2-FINAL | k-anonymity >=20 + time jitter 3-7min for aggregation; boost multiplier=3 cleaned every 60s | E | assert k>=20 before aggregate render; jitter window; boost=3 |
| HOTMESS-ProximityFailureSystem | GPS modes: REDUCED (5-30m/5-15s) freeze 60% opacity; MINIMAL (>30m/>15s) hide route, proximity text | E | assert thresholds drive mode; opacity/visibility per mode |
| HOTMESS-ProximityMeet | Exact location always temporary: one send, 2min(=120s), never stored, no exceptions | E | assert single-send TTL 120s + no persistence |
| HOTMESS-RuntimeEnforcement | Care state never in presence payload; care events never enter event bus; operator care queries `USING (false)` | E | assert care fields absent; RLS false for operator care reads |
| HOTMESS-SystemIsolationMap | Care = highest authority never overridden; AI = lowest never acts/final; no upward scope reach | E | assert authority ordering; no upward reach |
| HOTMESS-Admin-Moderation-v1 | PLATFORM ADMIN (global) vs VENUE_OPERATOR (own venue only); moderation reason field required | E | assert role scope; reason non-null |
| HOTMESS-NightOperatorPanel-v1 | Safety switches auto-expire 4h if uncleared; HIGH actions (kill switch/SOS/end event) need double-confirm (type CONFIRM) | E | assert 4h auto-expire; two-action confirm gate |
| HOTMESS-AA-System | PASSIVE->ACTIVE on density/live event; ACTIVE intensity 0.5; post-meet 90min; SOS identity never in Globe AA signal | E | assert transition triggers; assert AA identity severance |
| HOTMESS-Auth-Onboarding-v2 | Boot timeout 10s; profile-load timeout 8s; AgeGate sessionStorage bug traps ~79% | E | assert timeouts; localStorage fix |
| HOTMESS-Stripe-Payments-v1 | All 6 boost price IDs required or all boost checkout fails | E | assert 6 price IDs present at boot |
| HOTMESS-Radio-v2 | Radio signal throttle 1/5min (SIGNAL_THROTTLE_MS=300000); listener bucket "1-10"; expires_at=now+30min | E | assert throttle constant; 30min TTL + bucketed count |
| HOTMESS-Notifications-v1 | Stale movement data never sends; ETA push only crosses minute threshold; "on my way" 8min in-app only | E | assert staleness guard; push channel rules |
| HOTMESS-Profiles-Personas-v2 | Match scores never shown (no %); "Active tonight" = last_seen_at > now-30min | E | assert no score in payload; 30min window |
| HOTMESS-Market-Commerce-Rules | Drops 15% / Preloved 10% / venue consignment 70/30; copy never says "safety product"/"lubricant" | E | assert fee constants; DOM scan forbidden vocab |
| HOTMESS-Seller-Venue-Onboarding | Fulfilment <=5 working days; incomplete app closed after 2 reminders; DBS not required at v1 | E | assert SLA; reminder count |
| HOTMESS-HNHMess-GTM-LOCKED | Beacon pulse persists 20min after sell-out; pause Shopify if dispatch backlog >3 days; alert if beacon->purchase <5% | E | assert 20min persistence; backlog + conversion thresholds |
| HOTMESS-Events-SEALED | Winding-down = last 30% of duration (0.5 decaying); within 500m + RSVP -> HomeMode; scan_boost 20min | E | assert 30%/500m/20min thresholds |
| HOTMESS-First5Minutes-LOCKED | Meet trigger within 5min = retention goal; every second reduce friction | E/A | assert time-to-meet-trigger <=5min |
| HOTMESS-Infrastructure-v1 | Cron: notifications process/dispatch every 5min; rate-limit prune daily 04:20 UTC | E | assert cron schedules present |
| HOTMESS-AI-Layer-v1 | NOW events hard-cap 5km; OPENAI_API_KEY required; RAG scope bounded | E | assert 5km cap; key presence |
| HOTMESS-Music-Records-v2-FINAL | trackSource + trackTitle required; SoundCloud token expiry checked | E | assert required fields; token-expiry guard |
| DEV_BRIEF_support-proximity | Support (AA/NA) proximity: session-use only, no retention; neutral copy | E | assert no retention table; DOM tone scan |
| HOTMESS-CareAsKink | User never sees infrastructure word for safety features; old wellness language never used | E | DOM scan forbidden vocab; care features unlabeled |
| HOTMESS-Chat-Messaging-SEALED | No loading state between CTA tap and chat; within-300m newly detected -> Meet Trigger card | E | assert no spinner on chat open; 300m proximity trigger |
| HOTMESS-CorePrinciples | System never acts on behalf of user without explicit tap | E | assert no auto-action paths |
| HOTMESS-CLAUDE_CODE_BUILD_BRIEF | AgeGate sessionStorage bug traps ~79%; AA transitions on density/event | E | assert localStorage persistence test |
| HOTMESS-SoundOfTheNight-LOCKED | Density rows London every 5min; meet threshold drops to 500m on density boost; music match = 3 pairs within 300m same track | E | assert density cadence; 500m/300m thresholds |
| HOTMESS-SYSTEM-INDEX-FINAL | Canonical rule references never redefined; superseded files never beside active | E | doc-lint: single canonical location per rule |

---

### Counts

- Enforceable rules extracted (E or mixed-E): **~95**
- Aspirational-only rules flagged (A): **~10**
- Total rule rows: **~105** across 90 corpus documents (47 doctrine + 5 governance + 5 operations + 33 specs).
- The corpus is unusually enforceable by design: Sacred Invariant #13 ("if a rule cannot be measured/enforced/audited/thresholded, it is not production-ready") and Developer-Rules §8 force authors to attach owner + signal + threshold + breach-action to every rule. Most "soft" copy lives inside otherwise-enforceable docs (e.g. D15 tone is aspirational, but its forbidden-vocabulary list is a live CI gate).
