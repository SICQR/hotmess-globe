# D-U (DRAFT) — GDPR & Data-Retention Doctrine

**Status:** DRAFT for Phil's sign-off. Proposed as the single governing retention doctrine, consolidating rules currently scattered across D22, D06, D33, and the Legal-Compliance docx.
**Inherits from:** D22 (Temporal), D33 (Memory & Permanence), D06 (Media Moderation), Legal-Compliance (UK GDPR / OSA 2023), sacred-invariants.
**Inherited by:** every surface that persists anything about a person.
**Written:** 2026-06-30
**Why now:** Retention sweeps, SAR export, and a (non-functioning) erasure intake shipped, but the rules live in five different documents and three different runtimes (Vercel cron, pg_cron, code comments). There is no one place that says what HOTMESS keeps, for how long, where the backstop is, and how a person becomes unknown again.

---

## §0 Why this doctrine exists

D22 gives the philosophy ("remember enough for continuity, never enough to reconstruct a life"; "the right to become unknown again"). D33 gives the substrate discipline. D06 governs media. The Legal-Compliance docx gives the statutory floor. None of them is operational law for the engineer asking "does this table have a retention path, and what runs it?" The single sentence:

> **HOTMESS keeps exactly what regulation forces, deletes everything else on a schedule that cannot silently fail, and lets any person become unknown again on request.**

---

## §1 Principle

**§1.1 — Decay is the default; retention is the exception that must justify itself.** (D22 §3.1.) Every PII-bearing table has a named retention class and an enforced sweep. A table with no retention path is a bug, not a default.

**§1.2 — Erasure is a right, and it is implemented.** A `delete` (RTBF / Art.17) request triggers actual deletion or irreversible anonymisation across every table holding the subject's data — not just an intake row.

**§1.3 — Access is complete.** A SAR (Art.15) returns *everything* held about the subject, accurately. A partial export that silently omits data (because of a column-name bug or a recency cap) is a breach of the access duty, not a degraded-but-acceptable result.

**§1.4 — PII is reachable only by those who must reach it.** Contact PII (`email`, `phone`) and credentials (`pin_code_hash`) are never broadcast to the general authenticated userbase. Row-level RLS is insufficient where the row is broadcast-readable; column-level discipline applies.

**§1.5 — Retention enforcement has a backstop and an alarm.** The schedule runs DB-side (pg_cron) or is mirrored there, so a single runtime (Vercel) failing does not silently suspend all deletion. A skipped run is observable.

**§1.6 — One source of truth for windows.** Every retention window is declared once (this doctrine + one config/table), not duplicated across cron literals, code constants, and prose.

---

## §2 Invariants

- **INV-U1 (universal retention path):** Every table containing personal data appears in the retention register (§3) with a class and a window. New PII tables ship with their retention path in the same migration.
- **INV-U2 (erasure completeness):** An executed erasure removes/anonymises the subject from *all* registered PII tables, including `profiles`, `messages`, `ticket_orders`, `payouts` (subject to D21 §2.1 regulatory minimum), `beacons`, `gdpr_consents`, `taps`, `meet_sessions`, `user_interactions`, `xp_ledger`, `notification_outbox`. Regulatory-minimum rows that must survive are anonymised, not retained intact.
- **INV-U3 (SAR completeness & correctness):** The export queries real columns, joins the subject across every PII table, and returns held data without an arbitrary recency cap. Any branch that errors fails the request loudly (or is fixed), never silently into `_partial_errors`.
- **INV-U4 (no PII broadcast):** No general-readable RLS policy returns `email`, `phone`, or `pin_code_hash`. These live behind column privileges, a redacted view, or a separate restricted table.
- **INV-U5 (backstopped schedule):** The core retention sweep is registered in `cron.job` (or mirrored), and each run writes a `cron_runs` row; absence of a successful daily row raises an operational alert.
- **INV-U6 (single window source):** Retention windows are defined in one place; `data-retention.js` constants and any pg_cron literals reference it rather than restating it.
- **INV-U7 (consent is reversible):** `gdpr_consents` models withdrawal (`withdrawn_at`), and withdrawal is as easy as granting (Art.7(3)).
- **INV-U8 (audit integrity):** Every DSAR (export/delete) writes a durable `gdpr_requests` audit row; a failed audit write fails the operation, it is not swallowed.
- **INV-U9 (rule == code):** A documented retention rule (e.g. "messages: delete when both participants inactive >30d") is either implemented exactly or the doctrine is amended to the truth. No comment that lies about the query.
- **INV-U10 (Care/Legal memory boundary):** Safety and care data (`safety_alerts.location_data`, age-verification logs) follow the D22 Care/Legal-memory rules — location stripped early, evidentiary minimum retained, never socialised.

---

## §3 Enforcement — the retention register

Single authoritative table of PII-bearing tables, their D22 memory class, and window. (Tables marked **MISSING** have no current sweep — they are the §4 failures.)

| Table | D22 class | Window / action | Runs where |
|---|---|---|---|
| `meet_sessions` | Trajectory | delete >48h | Vercel cron |
| `messages` | Continuity | delete (rule: both inactive >30d — see INV-U9) | Vercel cron |
| `age_verification_log` | Legal | delete >12mo | Vercel cron |
| `taps` | Continuity | delete >90d | Vercel cron |
| `safety_alerts` | Care/Legal | strip location >7d; delete >90d | Vercel cron |
| `consent_blocks` | Continuity | delete >90d | pg_cron |
| `ghosted_location_sessions` | Trajectory | delete expired/revoked >24h | pg_cron |
| presence/heat/posts/boosts/signals | Trajectory | minute-scale decay | pg_cron |
| `ticket_orders` | Legal (regulatory min) | **MISSING** — define regulatory-minimum window + anonymise | — |
| `payouts` | Legal (regulatory min) | **MISSING** | — |
| `gdpr_consents` / `gdpr_requests` | Legal | **MISSING** (audit minimum, then purge) | — |
| `notification_outbox` | Trajectory | **MISSING** — short window | — |
| `xp_ledger` / `user_interactions` | Continuity | **MISSING** | — |
| media (D06) | per D06 | **MISSING in code** — D06 retention is doctrine-only | — |

**Enforcement actions:**
- Move the core sweep into pg_cron (or add a pg_cron heartbeat that alerts if Vercel's `cron_runs` row is absent) — INV-U5.
- Build the erasure executor: `request_type='delete'` -> a SECURITY DEFINER function that walks the register and deletes/anonymises — INV-U2.
- Fix the SAR: correct `meet_sessions` columns (`user_a_id`/`user_b_id`), drop the absent `withdrawn_at` select or add the column, remove recency caps — INV-U3.
- Add column-level protection on `profiles` PII (redacted public view + restricted base table) — INV-U4.
- Add `withdrawn_at` to `gdpr_consents`; expose a withdrawal endpoint — INV-U7.
- Make the `gdpr_requests` audit write non-swallowed; confirm the table exists — INV-U8.
- Reconcile the `messages` query with its comment — INV-U9.
- **Acceptance test:** every PR touching PII answers — (a) which register row covers this table? (b) does erasure reach it? (c) does the SAR return it correctly? (d) is any new PII column reachable by general authed users? (e) is the sweep backstopped with an alarm?

---

## §4 Failure modes (current production)

| Mode | Principle breached | Current state |
|---|---|---|
| `delete` requests recorded, never executed (no RTBF) | §1.2 / INV-U2 | **Live — Art.17 unmet.** |
| Retention sweep only in Vercel cron, no DB backstop/alarm | §1.5 / INV-U5 | **Live — silent-failure risk.** |
| `profiles` email/phone/pin_code_hash readable by any authed user | §1.4 / INV-U4 | **Live — PII broadcast.** |
| SAR omits meet history + consent history via swallowed errors; recency-capped | §1.3 / INV-U3 | **Live — incomplete Art.15.** |
| `messages` deletion over-deletes vs documented rule | INV-U9 | **Live.** |
| `gdpr_requests` audit may be silently failing (table introspection NULL) | INV-U8 | **At risk — confirm table.** |
| Consent withdrawal not modelled | §1 / INV-U7 | **Live.** |
| ticket/payout/consent/outbox/ledger tables accumulate indefinitely | §1.1 / INV-U1 | **Live — no sweep.** |
| Windows duplicated across cron literals, constants, prose | §1.6 / INV-U6 | **Live.** |
| D06 media retention exists only in doctrine | §1.1 / INV-U1 | **Live — no code.** |

---

## §5 Companion references
- `docs/doctrine/22-temporal-doctrine.md` (five memory kinds; three-tier architecture; §3.1; §4 irreversibility; "right to become unknown again")
- `docs/doctrine/33-memory-permanence-doctrine.md` (§1 substrate-incapability; §5 forbidden retention; §6 permitted)
- `docs/doctrine/06-media-moderation-doctrine.md` (media retention)
- Legal-Compliance docx (UK GDPR Art.15/17/7; OSA 2023)
- `docs/doctrine/sacred-invariants.md`
- Conformance: `CONFORMANCE.md` (this directory) — findings GD-1…GD-10.
- Code: `api/gdpr/export.js`, `api/gdpr/request.js`, `api/cron/data-retention.js`; pg_cron `cron.job` register.
