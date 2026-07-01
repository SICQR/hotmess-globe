-- ============================================================================
-- DB-03 (HIGH) — Harden the 35 RLS-enabled / zero-policy tables
-- DRAFT MIGRATION — branch fix/db-highs. DO NOT APPLY to prod. Phil applies.
-- Fixes DB-03 (+ DB-07). Owner columns verified live 2026-06-30.
-- Pattern A = REVOKE the latent GRANT ALL so protection isn't RLS-flag-only.
-- Pattern B = explicit owner-scoped SELECT policy for user-facing rows.
-- Blast radius: PostgREST surface of these tables only. service_role unaffected (BYPASSRLS).
-- ============================================================================

-- ---- (A) LOCK-HARD: secrets, auth/scarcity, money-gating, logs, kv, internal config ----
REVOKE ALL ON TABLE
  public.marketing_cron_auth,         -- x-auto-post cron secret
  public.reentry_tokens,              -- 68 auth/scarcity tokens
  public.cohort_locks,                -- scarcity gating
  public.founding_fee_exempt,         -- money-gating (owner_id) — keep server-only
  public.product_orders,              -- 27 revenue rows; child of orders, no owner col (see note)
  public.processed_webhook_sessions,  -- stripe idempotency
  public.beacon_rate_limits, public.beacon_reputation, public.beacon_spam_events,
  public.signal_routing_logic, public.cron_runs, public._wa_template_diag,
  public.marketing_x_queue,
  public.kv_store_a670c824, public.kv_store_3645ca2d, public.kv_store_3139dffd,
  public.kv_store_3932b677, public.kv_store_44c3cb77, public.kv_store_b656305e,
  public.kv_store_f739775c
FROM anon, authenticated;

-- DB-07 note: product_orders has no buyer column (id, order_id, product_id, quantity,
-- price_pence, status, stripe_session_id, ...). Buyer order-history must be served by a
-- SECDEF RPC joining the parent `orders` (buyer) -> product_orders scoped to auth.uid(),
-- NOT a direct table policy. Drafted separately if/when order history is a launch surface.

-- ---- (B) OWNER-READ: ad bookings keyed by advertiser_email ----
CREATE POLICY "advertiser reads own globe bookings" ON public.globe_ad_bookings
  FOR SELECT TO authenticated USING (advertiser_email = (auth.jwt() ->> 'email'));
CREATE POLICY "advertiser reads own radio bookings" ON public.radio_ad_bookings
  FOR SELECT TO authenticated USING (advertiser_email = (auth.jwt() ->> 'email'));
-- Writes for bookings remain service-role-only (booking flow runs server-side).

-- ---- (Decision) config/doc tables — authenticated read-only (app config, not PII) ----
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'signal_taxonomy','visibility_layers','operating_modes','persona_entry_paths',
    'feature_specs','care_docs','ops_docs','roadmap_docs','strategy_docs',
    'positioning_docs','radio_script_log','whatsapp_template_status','venue_upgrade_signals']
  LOOP
    EXECUTE format(
      'CREATE POLICY "authenticated read" ON public.%I FOR SELECT TO authenticated USING (true)', t);
  END LOOP;
END $$;

-- VERIFY after apply: every one of the 35 is either policy-governed or grant-revoked.
--   SELECT relname, relrowsecurity,
--     (SELECT count(*) FROM pg_policies p WHERE p.tablename=c.relname AND p.schemaname='public') pol,
--     has_table_privilege('authenticated', 'public.'||relname, 'SELECT') authed_select
--   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
--   WHERE n.nspname='public' AND relkind='r' AND relname = ANY(<the 35>);
