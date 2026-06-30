-- ============================================================================
-- DB-04 baseline reconstruction + DB-05 search_path hardening
-- DRAFT ONLY. DO NOT APPLY. Audit-only.
-- ============================================================================

-- ---- DB-04: make tracked = applied -----------------------------------------
-- Procedure (run locally with service-role, NOT in this read-only audit):
--   1) supabase db dump --db-url "$PROD_URL" --schema public,auth,storage,cron \
--        > supabase/migrations/00000000000001_baseline_reconstruct.sql
--   2) Commit it as the single source-of-truth baseline.
--   3) Add CI gate (.github/workflows): on PR, run `supabase db diff` against a
--      shadow DB built from migrations; fail if diff is non-empty.
--   4) Doctrine: add a "production is truth + CI schema-dump" clause to
--      governance/developer-rules-checklist (Phase 2 doctrine draft).
-- Rationale: 302 of 323 applied migrations are untracked; RLS policies that
-- protect presence/safety exist only in prod (see DB-C2 — proven but untracked).

-- ---- DB-05: pin search_path on the 51 unprotected SECDEF functions ----------
-- Generate the ALTER statements (run the SELECT, review, then apply the output):
SELECT format(
  'ALTER FUNCTION public.%I(%s) SET search_path = '''';',
  p.proname, pg_get_function_identity_arguments(p.oid)) AS ddl
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef AND p.proconfig IS NULL
ORDER BY p.proname;
-- Note: `search_path = ''` forces full schema-qualification inside the function.
-- For functions that rely on unqualified names, use `SET search_path = public`
-- and schema-qualify any writes. Re-run get_advisors(security) after, expect the
-- "function_search_path_mutable" warnings to drop to 0.

-- ---- DB-05b: prune anon EXECUTE where not needed ---------------------------
-- 126 SECDEF functions are anon-executable. Review list:
--   SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--   WHERE n.nspname='public' AND p.prosecdef
--     AND has_function_privilege('anon', p.oid,'EXECUTE') ORDER BY 1;
-- REVOKE EXECUTE ... FROM anon for any that should require a session.
