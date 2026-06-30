# SAFETY / SOS SURFACE — CONFORMANCE FINDINGS

**Scope:** Safety / SOS / trusted-contacts / check-in / escalation surface of SICQR/hotmess-globe.
**Date:** 2026-06-30
**Method:** code trace (`api/`, `src/`) + read-only live DB inspection (Supabase `rfoftonnlwudilafhfkl`: `information_schema`, `pg_policies`, `pg_proc`, row counts).
**Governing doctrines:** `sacred-invariants.md` (Safety is invariant #1; anti-stalking is *structural not policy*), D15 Care Language, D11 Arrival, D63 Nominator Sovereignty (ratified), and the **named-but-unwritten** D59 / D60.

> **Naming collision — read first.** The task brief assigns **D59 = Safety/SOS orchestration** and **D60 = two-party trusted-contact agreement.** But the already-ratified `docs/doctrine/63-nominator-sovereignty-doctrine.md` cross-references them the *other way round*: it calls **D59 = "Trusted Contact as Two-Party Agreement" (recipient side)** and **D60 = "Safety Event Orchestration."** The code agrees with D63 — `api/safety/accept-token.js`, `_acceptance-token.js`, and `_invitation-templates.js` all cite "D59 S1/S2" for the *invitation/acceptance* flow. To avoid contradicting a ratified doctrine and live code comments, the companion `DRAFT-D59-D60.md` keeps **D59 = two-party agreement** and **D60 = SOS/event orchestration** (the D63-consistent assignment) and flags the brief's inverted labels at the top. Findings below are doctrine-number-agnostic and reference the two *concepts* directly.

---

## 0. What is built (surface inventory)

### Code entry points

| Path | Method | What it does |
|---|---|---|
| `api/safety/sos.js` | POST (JWT) | Loud panic SOS. Rate-limited 3/h (escalation bypasses) + 10/day (hard cap). Writes `safety_events{type:'sos'}`, then `dispatchSafetyEvent()` fan-out. |
| `api/safety/get-out.js` | POST (JWT) | Quiet "Get Out" (Care-As-Kink). Loads `trusted_contacts WHERE notify_on_sos`, writes `safety_events{type:'get_out'}`, **deletes** user's `right_now_posts` (no trace), queues outbox per contact. |
| `api/safety/alert.js` | POST (JWT) | Single-contact emergency alert; looks up one `trusted_contacts` row (scoped to `user_id`), queues `notification_outbox`. Called by `src/core/emergency.ts`. |
| `api/safety/check-ins.js` | POST + GET (cron, 2 min) | POST create/extend/cancel a `safety_checkins` row with `expires_at`. GET = tier-1 sweep: finds expired un-alerted rows, notifies trusted contacts. |
| `api/cron/safety-checkin-escalate.js` | GET/POST (cron, 30 min) | Tier-2 escalation: `safety_checkins` overdue 30 min + `status='active'` -> per-contact `safety_alerts` rows + real Twilio SMS. Idempotent via `delivery_status='escalated'`. |
| `api/cron/sos-health-check.js` | GET (cron, 1 min) | Failure-of-the-failure-detector. Finds `safety_events` in last 5 min with no `safety_delivery_log` success -> SMS/Telegram Phil directly. Post-Glen (2026-05-17) hardening. |
| `api/safety/dispatch-invitation.js` | POST (JWT) | Sends trusted-contact *invitation* (email/Telegram/SMS), throttled 1/5 min. Builds HMAC acceptance URL. |
| `api/safety/accept-token.js` | POST (anon, HMAC-authed) | Recipient preview/accept/decline of invitation. Account-free. Writes `accepted_at`/`declined_at`, `confirmed_*` channels. |
| `api/safety/_acceptance-token.js` | lib | HMAC sign/verify, 30-day TTL acceptance tokens (`SAFETY_ACCEPT_SECRET`). |
| `api/safety/_invitation-templates.js` | lib | 3-channel invitation copy; comments cite Safety Posture/Purpose invariants + D15. |
| `api/operator/sos.js` | POST (operator) | Venue-staff SOS *broadcast* (distinct surface): safety-role/admin only, 1/event/30 min, writes `safety_broadcasts` + queues `notification_outbox{type:'sos_broadcast'}`. |
| `api/notifications/dispatcher.js` | lib | `dispatchSafetyEvent()`: `loadContacts()` + fan-out + P0 ops-alert to Phil. The single fan-out oracle. |
| `src/lib/safety.ts` `panicResolve()` | client | Client resolve path — **writes to `safety_incidents`** (see CV-SCHEMA-01). |
| `src/components/safety/SilentSOSButton.jsx` | client | POSTs `/api/safety/sos`. |

### Live DB tables (public schema)

`safety_events`, `safety_checkins`, `safety_broadcasts`, `safety_alerts`, `safety_delivery_log`, `trusted_contacts`, `emergency_contacts`, `aa_escalation_log`, `sos_dispatch_audit`, `safety_switches`, `timed_checkins`, plus 4 `obs_safety_*` observability views + `safety_network_health` view. RPCs: `get_my_safety_network_summary`, `get_safety_network_state`, `my_safety_network_state`.

**Two-party consent fields already exist** on `trusted_contacts`: `invitation_sent_at`, `acceptance_token`, `acceptance_token_expires_at`, `accepted_at`, `declined_at`, `decline_reason`, `confirmed_phone/email/whatsapp/telegram_*`, `channel_preference_order`, `quiet_hours`. The *schema* is two-party-ready; the *dispatch code* is not (see CV-CONSENT-01).

### Live data snapshot (the smoking gun)

`SELECT count(*), count(accepted_at), count(declined_at), count(invitation_sent_at) FROM trusted_contacts`
-> **total 8 / accepted 0 / declined 0 / invited 2 / pending-unconsented 8.**

Every trusted contact in production is unconsented. Yet the dispatch path keys on `notify_on_sos` (default `true`), so **all 8 would be paged on an SOS today** despite none having agreed.

---

## CONFORMANCE VIOLATIONS

Severity: **CRITICAL** (safety-invariant breach; can page a non-consenting human or silently drop a real SOS) / **HIGH** (governance gap with live blast radius) / **MEDIUM** (lifecycle/RLS hygiene) / **LOW** (drift/cosmetic).

---

### CV-CONSENT-01 — One-sided trusted contacts: SOS fan-out ignores `accepted_at` — **CRITICAL**

**Doctrine:** Two-party-agreement concept; Sacred Invariant "anti-stalking is structural, not policy"; D63 §1 (recipient consent is the contract).

**Evidence:**
- `api/notifications/dispatcher.js:105-111` — `loadContacts()` selects `trusted_contacts WHERE user_id=... AND notify_on_sos=true LIMIT 5`. **No `accepted_at IS NOT NULL` filter.**
- `api/safety/get-out.js:49-54` — same: `.eq('notify_on_sos', true)`, no consent filter.
- `api/safety/check-ins.js:124-128` (tier-1 cron) and `api/cron/safety-checkin-escalate.js` (tier-2) — same pattern.
- `api/safety/alert.js:39-45` — single-contact alert, no consent filter.
- Live data: 8/8 rows unconsented; on any SOS all flagged rows are messaged.

**Why critical:** The acceptance machinery (`dispatch-invitation.js` -> `accept-token.js` -> `accepted_at`) was built, but the *consumption* side never gated on its output. A nominator can type any phone number and that stranger gets SMS'd on an SOS. That is exactly the structural (not policy) anti-stalking breach Sacred Invariant #3 forbids — and a real-world harm vector (paging an ex, an abuser, a wrong number).

**Smallest fix:** Add the consent gate to every contact-load query:
```
.not('accepted_at','is',null)   // only consented contacts receive live alerts
```
in `dispatcher.js loadContacts`, `get-out.js`, `check-ins.js`, `safety-checkin-escalate.js`, `alert.js`. To avoid a *silent* SOS when a user has zero consented contacts, route those events to the existing Phil ops-alert path (`dispatcher.js dispatchPhilOpsAlert`) **instead of** to unconsented numbers — never message an unconsented destination. Ratify this floor in the event-orchestration draft (D60).

---

### CV-LIFECYCLE-01 — SOS events have no closure: `safety_events.resolved_at` never written — **CRITICAL**

**Doctrine:** Sacred Invariant #5 "Signals always expire" + #13 "if it can't be state-transitioned it's not production-ready"; D11 lifecycle.

**Evidence:**
- `safety_events.resolved_at timestamptz` exists (live), nullable, no default.
- `grep -rn resolved_at api/` over the safety surface returns **zero writers** for `safety_events`.
- The only client "resolve" path, `src/lib/safety.ts:103-110 panicResolve()`, updates **`safety_incidents`** — a table that **does not exist** in the live census. The resolve UI writes into the void; `safety_events` rows stay open forever.
- `api/cron/sos-health-check.js` keys "undelivered" off `safety_delivery_log`, never off `resolved_at`.

**Why critical:** An SOS is a lifecycle, not a log line. No resolution write means: (a) no "user is now safe" state — dashboards/health-check cannot tell an open emergency from a stale row; (b) no audited end-of-incident; (c) re-alert/aftercare logic has nothing to hang off. A safety event that can never be closed breaks the "must be state-transitioned" invariant directly.

**Smallest fix:** (1) Repoint `panicResolve()` at the real table: `from('safety_events').update({resolved_at,...}).eq('user_id',user.id).is('resolved_at',null)`. (2) Add server endpoint `POST /api/safety/resolve` (JWT, own events only) so resolution is auditable + RLS-checked. (3) Ratify the state machine (`active -> resolved | expired`) + max-open TTL in D60.

---

### CV-SCHEMA-01 — `panicResolve` writes to phantom `safety_incidents` table — **HIGH**

**Doctrine:** Sacred Invariant #13 (no aspirational/untestable paths in safety).

**Evidence:** `src/lib/safety.ts:104` writes `from('safety_incidents')...` — table absent from live census. Any caller of `panicResolve` silently fails and the user *thinks* the incident resolved.

**Smallest fix:** Same repoint as CV-LIFECYCLE-01; add a test asserting the target table exists in the live schema.

---

### CV-ESCALATION-01 — `aa_escalation_log` has lifecycle fields but no writer and no expiry — **HIGH**

**Doctrine:** Care-As-Kink spec ("Get Out fires: AA escalates... beacon intensity rises"); Sacred Invariant #5/#13.

**Evidence:**
- `aa_escalation_log` (live): `zone_lat/lng`, `zone_radius_km` (default 2.0), `trigger_type`, `triggered_by`, `resolved_at`, `created_at`. RLS: admin SELECT/UPDATE-resolve, service-role INSERT.
- `grep -rln aa_escalation_log .` across `api/` + `src/` -> **no inserts, no reads, no resolves.** Named in CareAsKink doctrine and wired in RLS, but no code path touches it.
- `resolved_at` nullable, no cron -> any future escalation would never expire.

**Why high:** The "AA escalation" (area escalation that raises beacon intensity around an SOS) is doctrine-promised, has a live table + live RLS, but is entirely unbuilt — a named-but-unwritten mechanism with a real footprint. No expiry means future writes would be permanent escalations (a #5 breach waiting to happen).

**Smallest fix:** Either (a) ratify as deferred and annotate the table `-- UNUSED, see D60 future` so it stops reading as live, or (b) on build: write on SOS dispatch (`dispatcher.js` P0 path), add an auto-resolve cron keyed on `created_at + ttl` with default `zone_radius_km`/TTL, and an admin-resolve action. Specify TTL + auto-resolve in D60.

---

### CV-RLS-01 — `sos_dispatch_audit` has RLS **disabled** — **HIGH**

**Doctrine:** Sacred Invariant #1 (safety data is the most sensitive class); D63 (nominator/recipient identities are sensitive).

**Evidence:**
- `pg_class.relrowsecurity` survey: every safety table is `rls_enabled=true` **except `sos_dispatch_audit` -> false** (and it has no policies).
- Columns include `destination`, `rendered_body`, `safety_event_id`, `provider_id` — i.e. *who was messaged, at what number/handle, with what text* during an SOS. The single most sensitive disclosure surface in the system.

**Why high:** With RLS off, any role reaching the table (an over-broad grant, or a future view join) can read SOS recipient destinations + message bodies — a direct de-anonymisation / stalking vector against the exact people the safety system protects. "RLS disabled on a table holding recipient phone numbers + SOS body text" is a latent CRITICAL one mis-grant away.

**Smallest fix:** `ALTER TABLE sos_dispatch_audit ENABLE ROW LEVEL SECURITY;` + `service_role ALL USING(true)` policy (mirrors `safety_delivery_log.service_role_full_access`) + optional `owner_read` via `safety_event_id -> safety_events.user_id`. (DB write — stage as a migration; **not** executed here per read-only constraint.) Ratify "all safety tables FORCE RLS" as a D60 enforcement clause.

---

### CV-CONSENT-02 — Quiet-hours / recipient-confirmed channels ignored at dispatch — **MEDIUM**

**Doctrine:** D15 Care Language (never feel surveilled); recipient owns their reachability (`accept-token.js` comment: "confirmed_* are SoT").

**Evidence:**
- `trusted_contacts` has `quiet_hours jsonb`, `channel_preference_order jsonb`, `confirmed_*` channels, `preferred_channel`, `channels_enabled` (live).
- `dispatcher.js loadContacts` selects only `id, contact_name, contact_phone, contact_email, role, notify_on_sos` — it ignores `confirmed_*`, `channel_preference_order`, `quiet_hours`, and messages `contact_phone` (nominator-typed) rather than `confirmed_phone` (recipient SoT).

**Why medium:** SOS is life-safety, so overriding quiet-hours *for a true emergency* is defensible — but non-emergency check-in/invitation reminders should honour them, and live SOS should still prefer the recipient-confirmed destination over the nominator-typed one (the unconfirmed number can be stale/wrong).

**Smallest fix:** In `loadContacts`, prefer `confirmed_*` over `contact_*` when present; honour `channel_preference_order`; bypass `quiet_hours` only for `type IN ('sos','get_out')`, honour it for reminders. Ratify "emergency overrides quiet-hours; reminders do not" in D60.

---

### CV-EMERGCONTACTS-01 — Two parallel contact tables (`trusted_contacts` vs `emergency_contacts`) — **MEDIUM**

**Doctrine:** D63 §8 "single canonical oracle"; Sacred Invariant #4 (no two surfaces telling different truths).

**Evidence:** Live DB has BOTH `trusted_contacts` (rich: consent + channels, 8 rows) and `emergency_contacts` (lean: `name/phone/email/relationship/notify_on_sos`, RLS `Users manage own`). Code reads/writes `trusted_contacts` only; `emergency_contacts` has no safety-surface writer. D63 §8 warns count/state must derive from one oracle or "the state word becomes a lie."

**Why medium:** A second contact table with `notify_on_sos` + own-row RLS is a latent split-brain. If any legacy/admin path populates `emergency_contacts`, those contacts silently never get paged (no reader) — false sense of safety.

**Smallest fix:** Make `trusted_contacts` canonical; migrate + drop `emergency_contacts` or mark it deprecated in-schema. Declare the canonical contact oracle in D60.

---

### CV-CONSENT-03 — Stored `acceptance_token` column is non-authoritative vs HMAC — **LOW**

**Doctrine:** D59 account-free-acceptance integrity.

**Evidence:** `accept-token.js:80-86` correctly rejects rows with null `user_id` and verifies HMAC against the canonical nominator `user_id` (good). But `trusted_contacts.acceptance_token` is also stored on the row while verification is HMAC-derived — two token notions coexist; only the HMAC is authoritative. The stored column invites a future weaker check.

**Smallest fix:** Document in D59 that stored `acceptance_token` is non-authoritative (HMAC is SoT), or drop the column. No live exploit.

---

## Severity roll-up

| ID | Severity | One-line |
|---|---|---|
| CV-CONSENT-01 | CRITICAL | SOS fan-out ignores `accepted_at`; 8/8 live contacts unconsented yet paged |
| CV-LIFECYCLE-01 | CRITICAL | `safety_events.resolved_at` never written; SOS cannot be closed |
| CV-SCHEMA-01 | HIGH | `panicResolve` writes to phantom `safety_incidents` table |
| CV-ESCALATION-01 | HIGH | `aa_escalation_log` doctrine-named, live RLS, zero writers, no expiry |
| CV-RLS-01 | HIGH | `sos_dispatch_audit` (recipient numbers + SOS body) has RLS disabled |
| CV-CONSENT-02 | MEDIUM | quiet-hours / `confirmed_*` channels / preference order ignored at dispatch |
| CV-EMERGCONTACTS-01 | MEDIUM | two parallel contact tables; `emergency_contacts` is an unread split-brain |
| CV-CONSENT-03 | LOW | stored `acceptance_token` column non-authoritative vs HMAC |

**What's ungoverned (the gap D59/D60 close):** the *consent contract* between nominator and recipient (whose `accepted_at` must gate fan-out) and the *SOS event lifecycle* (open -> resolved/expired, escalation TTL, RLS floor on audit). Both are named (D59/D60) but unwritten — drafted in `DRAFT-D59-D60.md`.
