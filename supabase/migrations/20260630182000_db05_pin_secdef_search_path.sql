-- ============================================================================
-- DB-05 (HIGH) — Pin search_path on the 51 SECURITY DEFINER functions that have none
-- DRAFT MIGRATION — branch fix/db-highs. DO NOT APPLY to prod. Phil applies.
-- Fixes DB-05. Generated live 2026-06-30 from pg_proc (prosecdef AND proconfig IS NULL).
-- `SET search_path TO public` is the non-breaking pin (functions already assume public);
-- it removes the mutable-search-path injection surface. Review any function that writes
-- to a non-public schema before applying. Blast radius: function resolution only.
-- ============================================================================
ALTER FUNCTION public.activate_user_boost(p_user_id uuid, p_boost_key text, p_payment_intent_id text) SET search_path TO public;
ALTER FUNCTION public.beacon_to_globe_event() SET search_path TO public;
ALTER FUNCTION public.broadcast_signal(p_user_id uuid, p_lng double precision, p_lat double precision, p_area_hint text, p_vibe_note text, p_duration_hours integer) SET search_path TO public;
ALTER FUNCTION public.check_and_consume_ai_quota(p_user_id uuid, p_feature text) SET search_path TO public;
ALTER FUNCTION public.checkin_to_globe_event() SET search_path TO public;
ALTER FUNCTION public.compute_aa_state(p_lat numeric, p_lng numeric, p_radius_km numeric) SET search_path TO public;
ALTER FUNCTION public.conversation_messages_broadcast_trigger() SET search_path TO public;
ALTER FUNCTION public.create_default_persona() SET search_path TO public;
ALTER FUNCTION public.create_unified_order(p_buyer_id uuid, p_buyer_email text, p_total_gbp numeric, p_shipping_address text, p_items jsonb, p_status text) SET search_path TO public;
ALTER FUNCTION public.expire_stale_signals() SET search_path TO public;
ALTER FUNCTION public.fn_checkin_globe_event() SET search_path TO public;
ALTER FUNCTION public.fn_message_globe_arc() SET search_path TO public;
ALTER FUNCTION public.fn_timed_checkin_globe() SET search_path TO public;
ALTER FUNCTION public.get_content_health() SET search_path TO public;
ALTER FUNCTION public.get_funnel_by_week() SET search_path TO public;
ALTER FUNCTION public.get_globe_context(p_city_slug text, p_limit integer) SET search_path TO public;
ALTER FUNCTION public.get_membership_tier_full(p_tier_name text) SET search_path TO public;
ALTER FUNCTION public.get_onboarding_funnel() SET search_path TO public;
ALTER FUNCTION public.get_platform_health() SET search_path TO public;
ALTER FUNCTION public.get_revenue_dashboard() SET search_path TO public;
ALTER FUNCTION public.get_thread_unread_count(p_thread_id uuid, p_user_email text) SET search_path TO public;
ALTER FUNCTION public.get_total_unread_count(p_user_email text) SET search_path TO public;
ALTER FUNCTION public.get_user_tier(p_user_id uuid) SET search_path TO public;
ALTER FUNCTION public.get_whatsapp_daily_summary(target_date date) SET search_path TO public;
ALTER FUNCTION public.handle_listing_sale() SET search_path TO public;
ALTER FUNCTION public.handle_new_user_profile() SET search_path TO public;
ALTER FUNCTION public.increment_beacon_checkin_count() SET search_path TO public;
ALTER FUNCTION public.increment_signal_chat_started(p_signal_id uuid) SET search_path TO public;
ALTER FUNCTION public.increment_signal_ghosted_open(p_signal_id uuid) SET search_path TO public;
ALTER FUNCTION public.increment_signal_mutual(p_signal_id uuid) SET search_path TO public;
ALTER FUNCTION public.increment_thread_unread_count() SET search_path TO public;
ALTER FUNCTION public.mark_messages_read(p_thread_id uuid, p_user_email text) SET search_path TO public;
ALTER FUNCTION public.market_save_to_globe_event() SET search_path TO public;
ALTER FUNCTION public.message_broadcast_trigger() SET search_path TO public;
ALTER FUNCTION public.messages_broadcast_trigger() SET search_path TO public;
ALTER FUNCTION public.notify_seller_on_sale() SET search_path TO public;
ALTER FUNCTION public.queue_cohort_blast(p_cohort text, p_title text, p_message text, p_link text, p_dedup_key text) SET search_path TO public;
ALTER FUNCTION public.right_now_posts_broadcast_trigger() SET search_path TO public;
ALTER FUNCTION public.right_now_to_globe_event() SET search_path TO public;
ALTER FUNCTION public.set_beacon_owner() SET search_path TO public;
ALTER FUNCTION public.set_conversation_last_message_at() SET search_path TO public;
ALTER FUNCTION public.st_estimatedextent(text, text) SET search_path TO public;
ALTER FUNCTION public.st_estimatedextent(text, text, text) SET search_path TO public;
ALTER FUNCTION public.st_estimatedextent(text, text, text, boolean) SET search_path TO public;
ALTER FUNCTION public.stripe_price_id_status() SET search_path TO public;
ALTER FUNCTION public.switch_active_persona(p_user_id uuid, p_persona_id uuid) SET search_path TO public;
ALTER FUNCTION public.typing_broadcast_trigger() SET search_path TO public;
ALTER FUNCTION public.update_support_preferences(p_user_id uuid, p_enabled boolean, p_detail_level text) SET search_path TO public;
ALTER FUNCTION public.upsert_membership_from_stripe(p_user_id uuid, p_tier_name text, p_stripe_session_id text, p_period_end timestamp with time zone) SET search_path TO public;
ALTER FUNCTION public.user_can_manage_club(target_club_id uuid) SET search_path TO public;
ALTER FUNCTION public.withdraw_signal(p_user_id uuid) SET search_path TO public;
-- 51 functions. NOTE: 3 are PostGIS internals (st_estimatedextent overloads) — pinning is
-- still correct. Re-run get_advisors(security) after apply; function_search_path_mutable -> 0.
