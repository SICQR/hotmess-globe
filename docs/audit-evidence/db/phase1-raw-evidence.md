# Phase 1 — Raw DB Evidence

All queries READ-ONLY against `rfoftonnlwudilafhfkl` (eu-west-2). Pulled 2026-06-30.
No INSERT/UPDATE/DELETE/DDL issued. Probe used `SET LOCAL role` inside a `BEGIN…ROLLBACK`.

---

## E1 — Schema census (§2.1)
```
public_tables=215  public_views=34  public_functions=959
public_policies=409  rls_enabled_tables=214  applied_migrations=323
total non-system schemas=14
```
RLS split: **35 tables RLS-enabled with ZERO policies**, **179 RLS-enabled with ≥1 policy**, **1 RLS-off** (`spatial_ref_sys`, PostGIS system table — benign).

Matches the brief baselines exactly (numbers did not rot since 2026-06-30 baseline).

## E2 — The 35 RLS-enabled / zero-policy tables (ordered by est. rows)
```
cron_runs(16871) reentry_tokens(68) _wa_template_diag(52) kv_store_a670c824(17)
marketing_x_queue(15) strategy_docs(2) kv_store_3645ca2d(1) founding_fee_exempt(0)
globe_ad_bookings(0) kv_store_3139dffd kv_store_3932b677 kv_store_44c3cb77
kv_store_b656305e kv_store_f739775c marketing_cron_auth operating_modes ops_docs
persona_entry_paths positioning_docs processed_webhook_sessions product_orders
radio_ad_bookings radio_script_log roadmap_docs signal_routing_logic signal_taxonomy
venue_upgrade_signals visibility_layers whatsapp_template_status beacon_rate_limits
beacon_reputation beacon_spam_events care_docs cohort_locks feature_specs
```
Priority-table live row counts:
```
product_orders=27   globe_ad_bookings=0   radio_ad_bookings=0
reentry_tokens=68   cohort_locks=1        marketing_cron_auth=1   founding_fee_exempt=0
```

## E3 — Grants on all 35 (anon + authenticated)
Every one of the 35 grants **`SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER`**
to **both `anon` and `authenticated`** (the Supabase default `GRANT ALL` pattern).
→ The only thing blocking access is RLS-enabled-with-no-policy (deny-all). The underlying
grants are wide open. If RLS is ever toggled off on any of these, the table is instantly
world-readable/writable. `marketing_cron_auth` holds the x-auto-post **cron secret**;
`reentry_tokens` (68) are auth tokens; `product_orders` (27) is revenue.

## E4 — SECURITY DEFINER census (§2.1 / §2.2)
```
SECURITY DEFINER functions = 136   (SECURITY INVOKER = 823)
  of which anon-EXECUTE granted   = 126
  of which NO pinned search_path  = 51   ← search_path-injection surface
SECURITY DEFINER views           = 0    (good)
```
SECDEF functions touching sensitive tables (all anon+auth executable):
`assign_founding_status_slot`, `create_unified_order`, `get_nearby_ghosted`,
`nearby_candidates_secure`.

## E5 — Anti-stalking probe (§2.2) — JWT-scoped, simulated `authenticated` role
```sql
BEGIN;
SET LOCAL role authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"<userB>","role":"authenticated"}';
SELECT count(*) rows_returned, count(lat) precise_coords_leaked
FROM public.user_presence_locations WHERE auth_user_id = '<userA>';
ROLLBACK;
-- RESULT: rows_returned=0, precise_coords_leaked=0   → PASS (table RLS holds)
```
`user_presence_locations` policies (owner-scoped, correct):
- `Users can read own location`  SELECT  USING (auth.uid()=auth_user_id)
- `Users can update own location` UPDATE USING (auth.uid()=auth_user_id)
- `Users can upsert own location` INSERT WITH CHECK (auth.uid()=auth_user_id)
- `Service role full access` ALL USING (auth.role()='service_role')

**Direct-table anti-stalking invariant: PROVEN to hold.** Residual risk is the SECDEF
function below, not the table.

## E6 — `nearby_candidates_secure` source (the residual CRITICAL)
SECURITY DEFINER, `search_path=public` (pinned ✓), anon+auth executable. Returns
`last_lat/last_lng` **ROUND(…,3)** (~110 m fuzz) BUT returns `distance_meters` as
`CAST(st_distance(viewer, RAW coords) AS integer)` — distance computed from **raw,
un-fuzzed** lat/lng. Precise per-metre distance from any attacker-chosen viewpoint
defeats the coordinate fuzz via **trilateration**. Gated on `location_consent=true`.

## E7 — Signal expiry (invariant #5) — CONFORMANT
`expire_stale_signals()` exists AND is scheduled (`expire-person-signals`, */5 min).
Other live expiry crons: `cleanup-expired`→`expire_presence_and_beacons` (*/5),
`expire_right_now_posts_every_5m`, `expire_heat_bins_every_10m`, `expire-off-grid-boosts`
(*/1), `deactivate-expired-personas` (*/5), `ghosted_location_sessions_sweep` (daily),
`consent_blocks_sweep` (90-day, daily), `presence-drift-decay` (*/5).

## E8 — Tier pricing reconciliation (§2.4) — CONSISTENT in DB
`membership_tiers` (pence): mess=0, hotmess=799, connected=1999, promoter=4499, venue=9999.
`membership_annual_pricing`: connected 1999/15990, hotmess 799/6390, promoter 4499/35990,
venue 9999/79990 — **all 4 paid tiers carry non-null Stripe monthly+annual price IDs**
(`price_1TSI…`). No £0-MRR / NULL-price-ID finding. Two tables agree with each other and
with `02-membership-entitlement-matrix` numbers (venue £99.99, promoter £44.99). The
"two-surface lock" (venue money on founders page only) is a UI assertion → Phase 2.

## E9 — Age verification / OSA (§2.4) — FINDING
```
profiles total            = 306
age_verified_at NOT NULL  = 228
   …of which method NULL  = 77     ← unprovable age verification
CHECK constraints tying method-when-verified = 0
```

## E10 — Migration drift (§2.3)
Applied = 323 (earliest `20260222060750`, latest `20260630173917`).
Repo tracks 21 files; earliest repo migration `20260420000000_baseline_schema`.
- ~50 applied migrations predate the baseline (Feb–Apr) — no repo file.
- ~302 of 323 applied have no corresponding repo file.
- Repo `20260617000000_seed_radio_shows.sql` is **not** in the applied set (reverse drift).
→ Schema is not reconstructable from the repo.

## E11 — Schemas (§2.5) — 14 non-system
`public(215)`, `auth(23)`, `realtime(9)`, `storage(8)`, `cron(2)`, `net(2)`,
`supabase_functions(2)`, `atmosphere(1,RLS on)`, `extensions(1)`, `supabase_migrations(1)`,
`vault(1)`, `api(0)`, `graphql(0)`, `graphql_public(0)`.
**No `partner` schema exists** — D31 venue doctrine references a `partner` schema /
isolation boundary that is not present in production. The only bespoke non-public schema
is `atmosphere` (1 table). → Finding (doctrine references non-existent isolation boundary).
