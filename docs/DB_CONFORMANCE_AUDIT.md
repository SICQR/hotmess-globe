# HOTMESS — Database Safety & Integrity Conformance Audit (Phase 1)

**Project:** `rfoftonnlwudilafhfkl` (eu-west-2) · **Repo:** `SICQR/hotmess-globe` @ `c810c88`
**Run:** 2026-06-30 · **Mode:** read-only, production = ground truth · **No writes issued.**
**Evidence:** `docs/audit-evidence/db/phase1-raw-evidence.md` · **Drafts:** `docs/audit-synthesis/`

---

## Executive summary

Three-layer drift, in numbers: the repo tracks **21** migration files against **323** applied
(≈302 untracked); production runs **215** tables, **34** views, **959** functions, **409** RLS
policies, **136** SECURITY DEFINER functions. The schema cannot be rebuilt from the repo.

Findings by severity: **2 CRITICAL · 3 HIGH · 2 MEDIUM · 3 conformant (verified-good).**

**Single worst finding — DB-01:** `nearby_candidates_secure` (SECURITY DEFINER, callable by
`anon`) fuzzes returned coordinates to 3 decimals but returns `distance_meters` computed from
the **raw** stored lat/lng. Precise per-metre distance from any chosen viewpoint defeats the
fuzz by trilateration — the anti-stalking invariant is breakable through the front-door RPC.
(The *table itself* is safe: the JWT-scoped probe proved a normal user cannot read another
user's row. The leak is the function, not the table.)

**Top 5 to fix before any Manchester / investor / press exposure:**
1. **DB-01** Quantise `distance_meters` to a band (e.g. nearest 100 m / buckets) and clamp the
   minimum returned distance — kill trilateration. *(CRITICAL, ~1 fn)*
2. **DB-02** 77 profiles are `age_verified_at IS NOT NULL` with `age_verification_method IS NULL`
   and **no constraint** enforces a method — unprovable age verification under the UK Online
   Safety Act. Backfill/triage + add a CHECK. *(CRITICAL, legal)*
3. **DB-03** Harden the 35 RLS-enabled/zero-policy tables: their only protection is the RLS flag
   while they carry full `GRANT ALL` to `anon`+`authenticated`. Includes `product_orders` (27
   live orders), `marketing_cron_auth` (cron secret), `reentry_tokens` (68 auth tokens). *(HIGH)*
4. **DB-04** Adopt "production is truth": commit a baseline schema+RLS dump so tracked = applied,
   add a CI schema-drift check. 302 untracked migrations is the structural risk behind all of
   the above. *(HIGH)*
5. **DB-05** 51 SECURITY DEFINER functions have no pinned `search_path` and 126 are anon-
   executable — pin `search_path` on every SECDEF function. *(HIGH)*

What is already right (verified, not assumed): signals expire on cron (incl. `expire_stale_signals`
*/5 min); the presence table's RLS is correctly owner-scoped and **proven** by probe; all four
paid tiers carry non-null Stripe price IDs and the two pricing tables agree with doctrine numbers.

---

## Database conformance chapter

### RLS census
| Bucket | Count | Verdict |
|---|---|---|
| RLS on, ≥1 policy | 179 | governed |
| RLS on, **0 policy** | 35 | deny-all by flag only — see DB-03 |
| RLS off | 1 (`spatial_ref_sys`) | benign PostGIS system table |
| **Total tables** | **215** | |

### The 35 RLS-enabled / zero-policy tables — resolution (DB-03)
Mechanism: RLS-on + no policy = deny-all for `anon`/`authenticated` regardless of GRANT, so
**today these are locked** for direct PostgREST access. But every one of the 35 also holds
`GRANT ALL` to `anon`+`authenticated` (evidence E3), so the lock is one `ALTER TABLE … DISABLE
ROW LEVEL SECURITY` away from total exposure, and any SECURITY DEFINER function reading them
bypasses the lock entirely.

Classification:
- **Must stay locked, harden by REVOKE (secret/auth/scarcity):** `marketing_cron_auth` (cron
  secret, 1 row), `reentry_tokens` (68), `cohort_locks` (1), `marketing_cron_auth`,
  `processed_webhook_sessions`, `beacon_rate_limits/_reputation/_spam_events`, all 7 `kv_store_*`,
  `_wa_template_diag`, `marketing_x_queue`, `signal_routing_logic`, `cron_runs` (16,871).
- **Revenue — needs explicit owner policy OR documented service-role-only:** `product_orders`
  (27 live orders — buyers currently cannot read their own orders via PostgREST), `globe_ad_bookings`
  (0), `radio_ad_bookings` (0). Drafted policies in `policy-drafts/`.
- **Content/config "docs" tables (read-mostly):** `strategy_docs`, `ops_docs`, `care_docs`,
  `roadmap_docs`, `positioning_docs`, `feature_specs`, `operating_modes`, `signal_taxonomy`,
  `visibility_layers`, `persona_entry_paths`, `radio_script_log`, `whatsapp_template_status`,
  `venue_upgrade_signals`, `founding_fee_exempt` (0). Decide per-table: authenticated-read vs
  service-only. Drafts provided.

None of the 35 is an active data-leak *today*; all 35 are a latent leak because protection is
RLS-flag-only over open grants. That is why DB-03 is HIGH, not CRITICAL.

### SECURITY DEFINER function risk list (DB-05)
136 SECDEF functions; **126 anon-executable**; **51 with no pinned `search_path`** (search_path-
injection surface — a SECDEF function with mutable search_path can be hijacked into running
attacker-controlled objects). 0 SECURITY DEFINER views (good). Remediation: pin
`SET search_path = ''` (schema-qualify) or `= public` on all 51; review whether all 126 anon-
executable SECDEF functions genuinely need `anon` EXECUTE.

### Anti-stalking probe result (DB-01)
- **Table path — PASS.** Authenticated user B reading user A's `user_presence_locations` row
  returns 0 rows / 0 coordinates (evidence E5). RLS policies are owner-scoped (`auth.uid() =
  auth_user_id`). The invariant the brief feared was unproven is now **proven to hold** for the
  table — but it remains **untracked** in migrations (DB-04).
- **Function path — FAIL (CRITICAL).** `nearby_candidates_secure` returns precise integer
  `distance_meters` from raw coordinates while only fuzzing the returned lat/lng. Trilateration
  recovers the exact position. Anon-executable. This is the real anti-stalking exposure.

### Migration drift remediation (DB-04)
21 tracked ⇄ 323 applied. Earliest applied `20260222060750`; earliest repo file
`20260420000000_baseline_schema`. ≈50 pre-baseline migrations and ≈252 post-baseline migrations
have no repo file; repo `20260617000000_seed_radio_shows` was never applied under that version.
Path: (a) `supabase db dump --schema public,auth,storage` → commit as a single
`docs/audit-synthesis/policy-drafts/00000000000000_baseline_reconstruct.sql`; (b) truncate-and-
reseed `schema_migrations` tracking OR formally adopt "production is truth" in doctrine with a CI
`supabase db diff` gate that fails the build on drift. Draft + procedure in `policy-drafts/`.

### Schemas (§2.5)
14 non-system schemas enumerated (E11). **No `partner` schema exists** — D31 venue doctrine's
isolation boundary is not in production (DB-06). Only bespoke non-public schema is `atmosphere`
(1 table, RLS on).

---

## Findings ledger

| ID | Sev | Title | Three-layer evidence | Risk | Smallest fix |
|----|-----|-------|----------------------|------|--------------|
| DB-01 | CRITICAL | Trilateration via `nearby_candidates_secure` | DB: fn source (E6) returns raw-derived `distance_meters` + 3-dp coords; Code: presence/nearby call sites; Doctrine: sacred-invariant #2/#3, `48-spatial-identity-exposure` | Exact location of any consenting user recoverable by anon attacker | Quantise distance to ≥100 m buckets; floor min distance; add jitter — `enforcement-drafts/DB-01_*` |
| DB-02 | CRITICAL | Age-verified with no method, no constraint | DB: 77 rows, 0 constraints (E9); Code: `api/auth/*` age gate; Doctrine: OSA / `09-onboarding-truth` | UK OSA legal exposure — unprovable age checks | Backfill method or revoke flag; add CHECK — `enforcement-drafts/DB-02_*` |
| DB-03 | HIGH | 35 RLS-no-policy tables protected by flag over open grants | DB: E2/E3 (GRANT ALL to anon+auth); Code: service-role API paths; Doctrine: sacred-invariants (default-deny) | One RLS-toggle from exposing revenue, cron secret, auth tokens | Explicit policies + REVOKE — `policy-drafts/DB-03_*` |
| DB-04 | HIGH | Migration drift 21⇄323; schema not reconstructable | DB: 323 applied (E10); Repo: 21 files; Doctrine: developer-rules-checklist | No recoverable source of truth; RLS lives only in prod | Baseline dump + CI drift gate — `policy-drafts/DB-04_*` |
| DB-05 | HIGH | 51 SECDEF fns no search_path; 126 anon-exec | DB: E4; Code: RPC call sites; Doctrine: trust-system-spec | search_path injection / privilege bypass | Pin search_path; prune anon EXECUTE — `enforcement-drafts/DB-05_*` |
| DB-06 | MEDIUM | `partner` schema referenced by D31 does not exist | DB: 14 schemas, no `partner` (E11); Doctrine: `31-venue-partner-power` | Doctrine asserts an isolation boundary that isn't built | Either build `partner` schema isolation or amend D31 — Phase 2 doctrine draft |
| DB-07 | MEDIUM | `product_orders` buyers can't read own orders | DB: 27 rows, RLS-no-policy (E2); Code: order history UI | Either intended (server-only) or broken order history | Add buyer SELECT policy or document service-only — `policy-drafts/DB-03_product_orders.sql` |
| DB-C1 | OK | Signals expire on cron | DB: `expire_stale_signals` scheduled */5 (E7) | — | conformant |
| DB-C2 | OK | Presence table RLS owner-scoped (probe-proven) | DB: E5 probe = 0 leak | — | conformant (but track it — DB-04) |
| DB-C3 | OK | Tier pricing consistent; Stripe IDs present | DB: E8 | — | conformant |

---

## Remediation roadmap (CRITICAL → LOW)

| ID | Effort | Blocks Manchester? |
|----|--------|--------------------|
| DB-01 trilateration fix | ~2h (1 fn + test) | **Yes** |
| DB-02 age-method backfill + CHECK | ~3h (triage 77 rows + constraint) | **Yes (legal)** |
| DB-03 35-table policies/REVOKE | ~1d | Yes (revenue/secret) |
| DB-05 pin search_path on 51 fns | ~half-day | Yes |
| DB-04 baseline migration + CI gate | ~1d | No, but unblocks everything |
| DB-07 product_orders policy | ~1h | If order history is a launch surface |
| DB-06 partner schema vs D31 | doctrine call | No |

All fixes are **drafted, not applied** (audit-only). Runnable SQL in `docs/audit-synthesis/`.
