-- ============================================================================
-- DB-03 — Resolution for the 35 RLS-enabled / zero-policy tables
-- DRAFT ONLY. DO NOT APPLY without Phil review. Audit-only deliverable.
-- Fills finding DB-03. Inherits: sacred-invariants (default-deny), trust-system-spec.
-- Blast radius: PostgREST read/write surface of these tables. No data mutated.
-- ============================================================================

-- Strategy: two patterns.
--   (A) LOCK-HARD  → REVOKE the open grants so the table is service-role-only by
--       construction, not by RLS-flag accident. Use for secret/auth/scarcity/log tables.
--   (B) OWNER-READ → add an explicit ownership-scoped policy. Use for user-facing rows.

-- ---------------------------------------------------------------------------
-- (A) LOCK-HARD: secrets, auth tokens, rate-limit/log, kv, internal config.
--     RLS already denies anon/auth; REVOKE removes the latent GRANT-ALL exposure
--     so a future "DISABLE RLS" cannot silently open them.
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE
  public.marketing_cron_auth,        -- holds x-auto-post cron secret
  public.reentry_tokens,             -- 68 auth/scarcity tokens
  public.cohort_locks,               -- scarcity gating
  public.processed_webhook_sessions, -- stripe idempotency
  public.beacon_rate_limits,
  public.beacon_reputation,
  public.beacon_spam_events,
  public.signal_routing_logic,
  public.cron_runs,
  public._wa_template_diag,
  public.marketing_x_queue,
  public.kv_store_a670c824, public.kv_store_3645ca2d, public.kv_store_3139dffd,
  public.kv_store_3932b677, public.kv_store_44c3cb77, public.kv_store_b656305e,
  public.kv_store_f739775c
FROM anon, authenticated;
-- service_role retains BYPASSRLS; server code paths are unaffected.

-- ---------------------------------------------------------------------------
-- (B) OWNER-READ revenue: product_orders (DB-07). Buyers should read own orders.
--     Verify the owner column name before applying (assumed user_id / buyer_id).
-- ---------------------------------------------------------------------------
CREATE POLICY "buyer reads own orders" ON public.product_orders
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);          -- TODO confirm column: user_id vs buyer_id
-- Writes stay service-role-only (Stripe webhook via create_unified_order SECDEF).
-- If order history is NOT a launch surface, skip this and REVOKE instead.

-- ---------------------------------------------------------------------------
-- (B) Ad bookings (revenue, currently 0 rows). Owner = booking advertiser.
-- ---------------------------------------------------------------------------
CREATE POLICY "advertiser reads own globe bookings" ON public.globe_ad_bookings
  FOR SELECT TO authenticated USING (auth.uid() = created_by);  -- TODO confirm column
CREATE POLICY "advertiser reads own radio bookings" ON public.radio_ad_bookings
  FOR SELECT TO authenticated USING (auth.uid() = created_by);  -- TODO confirm column

-- ---------------------------------------------------------------------------
-- (Decision) "docs"/config tables — choose authenticated-read or service-only.
-- Default recommendation: authenticated read-only (these are app config, not PII).
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'signal_taxonomy','visibility_layers','operating_modes','persona_entry_paths',
    'feature_specs','care_docs','ops_docs','roadmap_docs','strategy_docs',
    'positioning_docs','radio_script_log','whatsapp_template_status',
    'venue_upgrade_signals','founding_fee_exempt']
  LOOP
    EXECUTE format(
      'CREATE POLICY "authenticated read" ON public.%I FOR SELECT TO authenticated USING (true)', t);
  END LOOP;
END $$;
-- founding_fee_exempt: if it gates money, treat as LOCK-HARD instead of read-all.

-- VERIFY after apply (still zero anon leak):
--   SELECT tablename, count(*) FROM pg_policies WHERE schemaname='public'
--   AND tablename = ANY(<list>) GROUP BY 1;
