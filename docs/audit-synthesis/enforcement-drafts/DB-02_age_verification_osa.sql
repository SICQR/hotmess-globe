-- ============================================================================
-- DB-02 — Age verification provability (OSA)  (CRITICAL, legal)
-- DRAFT ONLY. DO NOT APPLY without Phil review.
-- Fills DB-02. Inherits: 09-onboarding-truth, UK Online Safety Act duty.
-- Blast radius: profiles age-gate write path + 77 existing rows.
-- ============================================================================
-- STATE (2026-06-30): 306 profiles; 228 age_verified_at NOT NULL; of those 77
-- have age_verification_method IS NULL; 0 constraints enforce method-when-verified.

-- STEP 1 — triage the 77 unprovable rows (run as read first, decide policy):
--   SELECT id, age_verified_at, created_at FROM profiles
--   WHERE age_verified_at IS NOT NULL AND age_verification_method IS NULL;
-- Decision (Phil): backfill a method where known, else NULL the age_verified_at
-- so the flag matches reality. Example conservative reset (DRAFT — Phil approves):
--   UPDATE profiles SET age_verified_at = NULL
--   WHERE age_verified_at IS NOT NULL AND age_verification_method IS NULL;

-- STEP 2 — enforce going forward so the state cannot recur:
ALTER TABLE public.profiles
  ADD CONSTRAINT age_verified_requires_method
  CHECK (age_verified_at IS NULL OR age_verification_method IS NOT NULL)
  NOT VALID;                    -- NOT VALID: applies to new/updated rows only…
-- …then, AFTER step 1 cleans the 77 rows:
--   ALTER TABLE public.profiles VALIDATE CONSTRAINT age_verified_requires_method;

-- STEP 3 — enforcement test (place in CI / pgTAP):
--   age_verified_at set without method must RAISE; with method must succeed.
