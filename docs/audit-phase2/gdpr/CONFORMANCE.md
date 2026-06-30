# GDPR / Retention (Surface U) — Conformance Report

**Surface:** Data retention, erasure (DSAR / RTBF), export (SAR)
**Repo:** SICQR/hotmess-globe (sparse checkout `/tmp/p2`)
**DB:** Supabase `rfoftonnlwudilafhfkl` (read-only SELECTs)
**Date:** 2026-06-30
**Rules scattered across:** D22 (Temporal), D06 (Media Moderation), D33 (Memory & Permanence), Legal-Compliance docx. **No single governing retention doctrine exists.**

---

## 1. Entry points (what shipped)

| Path | Method | Auth | Behaviour |
|---|---|---|---|
| `api/gdpr/export.js` | GET | Supabase JWT | SAR (UK GDPR Art.15). Returns JSON bundle: profile, memberships, messages(30d), taps(90d), meet_sessions(30d), beacons, gdpr_consents, age_verification(excl. ip/ua hashes). Logs row into `gdpr_requests`. |
| `api/gdpr/request.js` | POST | Supabase JWT | Records an `export` or `delete` request into `gdpr_requests`. **Lodges intent only — does not perform deletion.** Rate-limited 5/min. |
| `api/cron/data-retention.js` | GET/POST | CRON_SECRET | Daily 02:00 UTC (Vercel cron). Time-based sweeps across 5 tables (see §2). Opens/closes a `cron_runs` audit row. |

**There is no erasure executor.** A `request_type='delete'` row is written and never acted on by any code in `api/`, `src/`, or any `cron.job`. RTBF (Art.17) is effectively a manual/ops process with no implementation.

---

## 2. Retention actually implemented

### `api/cron/data-retention.js` (Vercel cron, daily 02:00)
| Table | Action | Window |
|---|---|---|
| `meet_sessions` | DELETE | `created_at` > 48h |
| `messages` | DELETE | `created_at` > 30d |
| `age_verification_log` | DELETE | `verified_at` > 12 months |
| `taps` | DELETE | `created_at` > 90d |
| `safety_alerts` | UPDATE strip `location_data` | `created_at` > 7d |
| `safety_alerts` | DELETE | `created_at` > 90d |

### `cron.job` (Postgres pg_cron) — retention-relevant jobs that DO exist
| jobname | schedule | command |
|---|---|---|
| `consent_blocks_sweep` | `23 3 * * *` | `DELETE FROM consent_blocks WHERE created_at < now()-90d` |
| `ghosted_location_sessions_sweep` | `17 3 * * *` | `DELETE … expires_at<now()-24h OR revoked_at<now()-24h` |
| `cleanup-expired` | `*/5` | `expire_presence_and_beacons()` |
| `deactivate-expired-personas`, `expire_heat_bins`, `expire_right_now_posts`, `expire-off-grid-boosts`, `expire-person-signals`, `presence-drift-decay` | various | presence/atmospheric decay (D22 trajectory tier) |

**No `cron.job` runs `data-retention`.** The five-table sweep lives ONLY in Vercel cron. If the Vercel cron is disabled, mis-secured, or the deploy drifts, **no PII retention runs at all** and there is no DB-side backstop.

---

## 3. DB facts (read-only)

- **`gdpr_requests` table: the column-introspection SELECT returned NULL** — i.e. the table referenced by `api/gdpr/*` either does not exist in `public` or is named differently. `export.js`/`request.js` insert into `gdpr_requests` with `.catch(()=>{})` (export) or surface a 500 (request). **The audit trail for DSARs may be silently failing.** Confirm table existence/name before relying on any DSAR log.
- **`cron_runs`** exists (`job_name, started_at, ended_at, status, processed, dropped, errors, detail jsonb`) — gives the retention cron an audit row. Good.
- **`gdpr_consents`** exists keyed by `user_email` with RLS `auth.jwt()->>'email' = user_email` (select/insert own). **No `withdrawn_at` column is present** (export.js selects `withdrawn_at` — that select will error and be caught as a partial error). Consent **withdrawal is not modelled**.
- **`age_verification_log`** has `ip_hash`, `user_agent_hash` (export deliberately excludes them — good), RLS select-own.
- **`profiles` holds `email`, `phone`, `pin_code_hash`** alongside `age_verified*`. RLS `profiles_read_visible_authed` lets **any authenticated user SELECT any visible, non-demo profile row**. There is **no column-level protection** — exposure of `email`/`phone`/`pin_code_hash` to other authed users depends entirely on the app/PostgREST `.select()` list. This is the prior-audit "profiles broadcasts email/phone/pin_code_hash" finding, **confirmed structurally possible** (RLS is row-level only; the sensitive columns sit in the same broadcast-readable row).
- **`safety_alerts`** has `location_data jsonb` + `location_stripped_at` (the strip path works), RLS select/insert/update own.
- **`meet_sessions`** columns are `user_a_id`/`user_b_id` (not `user_id`/`partner_user_id`). The SAR export queries `.eq('user_id', userId)` and selects `partner_user_id` — **those columns do not exist**, so the meet_sessions branch of the SAR throws and is swallowed into `_partial_errors`. **A user's meet history is silently omitted from their Art.15 export.**

---

## 4. Conformance findings (severity-ranked)

| ID | Sev | Finding |
|---|---|---|
| **GD-1** | **HIGH** | **No erasure (RTBF/Art.17) implementation.** `delete` requests are recorded and never executed. There is no code that deletes or anonymises a user's `profiles`, `messages`, `ticket_orders`, `beacons`, etc. on request. UK GDPR Art.17 unmet; the app advertises deletion ("To request deletion, use DELETE /api/gdpr/request") it cannot fulfil. |
| **GD-2** | **HIGH** | **Retention has no DB-side backstop and a single point of failure.** The 5-table PII sweep runs only as a Vercel cron. `cron.job` runs unrelated sweeps but not this one. Silent failure of the Vercel cron = unbounded PII accumulation with no alarm beyond a missing `cron_runs` row nobody watches. D22 §3.1 ("retention beyond decay schedule is the failure mode") violated by construction. |
| **GD-3** | **HIGH** | **`profiles` PII (`email`/`phone`/`pin_code_hash`) is row-readable by every authenticated user.** RLS is row-level only; no column privilege or masking. Any `.select('email,phone')` against a visible profile returns it. Broadcast of contact PII + a (hashed) credential to the entire authed userbase — directly contradicts D33 §1.2 (identifying columns must not be reachable) and sacred-invariants. |
| **GD-4** | **HIGH** | **SAR export is incomplete and partially broken** (Art.15 completeness duty). `meet_sessions` branch queries non-existent columns (`user_id`/`partner_user_id` vs real `user_a_id`/`user_b_id`) -> omitted. `gdpr_consents.withdrawn_at` selected but column absent -> consent history omitted. Both fail into a swallowed `_partial_errors`, so the user receives an export that *looks* complete but isn't. Export also caps messages/taps by recency (30d/90d) — data the platform still holds beyond those windows is excluded from the subject's own access request. |
| **GD-5** | **MED** | **`messages` deletion ignores its own stated rule.** The code comment says "delete where both participants inactive >30d", but the query is a blunt `DELETE … created_at < now()-30d`. Active conversations lose all messages older than 30d regardless of activity. Either honour the documented rule or correct the doctrine — currently the implementation silently over-deletes. |
| **GD-6** | **MED** | **`gdpr_requests` audit trail may be silently failing.** Column introspection for the table returned NULL (table missing or renamed). `export.js` swallows the insert error; the DSAR audit log — itself a compliance artifact — may not be persisting. Confirm table existence and wire a hard failure if the audit write fails. |
| **GD-7** | **MED** | **Consent withdrawal not modelled.** `gdpr_consents` has `granted_at` but no `withdrawn_at`/revocation path. Consent is treated as monotonic; GDPR Art.7(3) requires withdrawal to be as easy as granting. |
| **GD-8** | **MED** | **No retention path for high-PII money/ticket tables.** `ticket_orders` (email-joinable, `age_verification_snapshot`, `qr_token`), `payouts`, `gdpr_consents`, `gdpr_requests`, `notification_outbox`, `xp_ledger`/`user_interactions` (keyed by `user_email`) have **no retention sweep at all**. They accumulate indefinitely. D22 §1 "indefinite retention" failure mode. |
| **GD-9** | **LOW** | **Retention windows are scattered as magic numbers** across `data-retention.js` constants, two `cron.job` literals, and prose in D22/D06/D33 — no single source of truth, and no D06 media-retention sweep present in code at all (media retention is doctrine-only). |
| **GD-10** | **LOW** | **`safety_alerts` location strip is correct but ungoverned** as the D22 Care/Legal-memory boundary. Works; just undocumented in a retention doctrine. |

---

## 5. What conforms

- **SAR endpoint exists** and is JWT-gated, excludes other users' data and `ip_hash`/`ua_hash`. (Art.15 structure right, completeness wrong — GD-4.)
- **`age_verification_log` 12-month retention** and **`safety_alerts` 7d location strip / 90d delete** are implemented and sensible (OSA-aligned).
- **`cron_runs`** gives the retention job an auditable run record.
- **Presence/trajectory decay** (the D22 trajectory tier) is well covered by pg_cron jobs and is the strongest-conforming part of the temporal architecture.

---

## 6. Companion references
- `docs/doctrine/22-temporal-doctrine.md` (five memory kinds, three-tier architecture, §3.1 decay-is-architecture, §4 irreversibility, "right to become unknown again")
- `docs/doctrine/33-memory-permanence-doctrine.md` (§1 substrate-incapability, §5 forbidden retention)
- `docs/doctrine/06-media-moderation-doctrine.md` (media retention — not implemented in code)
- Legal-Compliance docx (UK GDPR Art.15/17/7, OSA 2023)
- DRAFT: `DRAFT-gdpr-retention-doctrine.md` (this directory)
