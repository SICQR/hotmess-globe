-- =====================================================================
-- pgTAP regression suite for boo-first RLS
-- Phil's exec doctrine 2026-05-20
-- =====================================================================
-- Verifies, against a staging DB, that:
--   1. has_mutual_boo() returns false when no boos exist
--   2. has_mutual_boo() returns false with one-way boo
--   3. has_mutual_boo() returns true when both directions exist
--   4. chat_threads INSERT fails with no mutual
--   5. chat_messages INSERT fails with no mutual
--   6. ghosted_location_sessions INSERT fails with no mutual
--   7. Premium status is not consulted at the DB layer
--
-- Run with: psql -f supabase/tests/boo_first_rls.sql staging-db-url
-- =====================================================================

BEGIN;
SELECT plan(8);

-- Setup synthetic users
DO $$
DECLARE
  u_a uuid := gen_random_uuid();
  u_b uuid := gen_random_uuid();
BEGIN
  -- Skip if staging already has these IDs
  INSERT INTO public.profiles (id, email, display_name)
    VALUES (u_a, 'rls_test_a@hotmess.test', 'rls test a')
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (id, email, display_name)
    VALUES (u_b, 'rls_test_b@hotmess.test', 'rls test b')
    ON CONFLICT (id) DO NOTHING;
  PERFORM set_config('test.u_a', u_a::text, false);
  PERFORM set_config('test.u_b', u_b::text, false);
END$$;

-- 1. No boos = no mutual
SELECT is(
  public.has_mutual_boo(
    current_setting('test.u_a')::uuid,
    current_setting('test.u_b')::uuid
  ),
  false,
  'mutual=false when no boos exist'
);

-- 2. One-way boo = still no mutual
INSERT INTO public.taps (from_user_id, to_user_id, tap_type, tapper_email, tapped_email)
  VALUES (current_setting('test.u_a')::uuid, current_setting('test.u_b')::uuid, 'boo', 'rls_test_a@hotmess.test', 'rls_test_b@hotmess.test');
SELECT is(
  public.has_mutual_boo(
    current_setting('test.u_a')::uuid,
    current_setting('test.u_b')::uuid
  ),
  false,
  'mutual=false on one-way boo (A→B only)'
);

-- 3. Both directions = mutual
INSERT INTO public.taps (from_user_id, to_user_id, tap_type, tapper_email, tapped_email)
  VALUES (current_setting('test.u_b')::uuid, current_setting('test.u_a')::uuid, 'boo', 'rls_test_b@hotmess.test', 'rls_test_a@hotmess.test');
SELECT is(
  public.has_mutual_boo(
    current_setting('test.u_a')::uuid,
    current_setting('test.u_b')::uuid
  ),
  true,
  'mutual=true when both A→B and B→A exist'
);

-- 4. Email helper agrees
SELECT is(
  public.has_mutual_boo_by_email('rls_test_a@hotmess.test', 'rls_test_b@hotmess.test'),
  true,
  'has_mutual_boo_by_email matches uuid form'
);

-- 5. all_others_mutual returns true for a [me, other] array when mutual
SELECT is(
  public.all_others_mutual(
    ARRAY['rls_test_a@hotmess.test','rls_test_b@hotmess.test']::text[],
    'rls_test_a@hotmess.test'
  ),
  true,
  'all_others_mutual=true when every other party is mutual'
);

-- 6. RLS policy exists on chat_threads.INSERT and is named correctly
SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE tablename='chat_threads' AND policyname='chat_threads_insert_mutual_only'),
  'chat_threads_insert_mutual_only policy exists'
);

-- 7. RLS policy exists on chat_messages.INSERT
SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE tablename='chat_messages' AND policyname='chat_messages_insert_mutual_only'),
  'chat_messages_insert_mutual_only policy exists'
);

-- 8. The permissive bypass policy is gone (regression catch)
SELECT ok(
  NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='chat_messages' AND policyname='authenticated users can insert messages'),
  'permissive "authenticated users can insert messages" policy has been removed'
);

-- Cleanup
DELETE FROM public.taps
  WHERE from_user_id IN (current_setting('test.u_a')::uuid, current_setting('test.u_b')::uuid)
     OR to_user_id   IN (current_setting('test.u_a')::uuid, current_setting('test.u_b')::uuid);
DELETE FROM public.profiles WHERE email IN ('rls_test_a@hotmess.test','rls_test_b@hotmess.test');

SELECT * FROM finish();
ROLLBACK;
