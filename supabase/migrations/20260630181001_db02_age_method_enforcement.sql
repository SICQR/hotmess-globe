-- ============================================================================
-- DB-02 (CRITICAL, legal/OSA) — Enforce age_verification_method when verified
-- DRAFT MIGRATION — committed to branch fix/db-criticals. DO NOT APPLY to prod.
-- Phil applies manually after deciding the backfill value (see STEP 1).
-- Inherits: 09-onboarding-truth, UK Online Safety Act duty. Fixes DB-02.
-- Blast radius: profiles age-gate write path + 77 existing rows.
-- ----------------------------------------------------------------------------
-- STATE (2026-06-30, live read): profiles=306; age_verified_at NOT NULL=228;
--   of those, age_verification_method IS NULL = 77; enforcing constraints = 0.
-- ============================================================================

-- STEP 1 — BACKFILL THE 77 ROWS  *** PHIL DECISION REQUIRED — DO NOT GUESS ***
-- These are real users. A method must NOT be invented. Choose ONE:
--
--   (A) If logs/Stripe identity/onboarding telemetry can attribute a real method,
--       backfill it per-row from that source (preferred, provable).
--   (B) If the method is genuinely unknown and cannot be reconstructed, the honest
--       state is "not verified": clear the flag so DB matches reality and the user
--       is re-gated on next session.
--         UPDATE public.profiles SET age_verified_at = NULL
--         WHERE age_verified_at IS NOT NULL AND age_verification_method IS NULL;
--   (C) Introduce an explicit 'legacy_unverified' enum/text value and set it, IF
--       and ONLY IF Phil accepts that as a provable-enough method for OSA. (Legal call.)
--
-- >>> Phil: pick A, B, or C. This migration intentionally leaves STEP 1 commented
--     so it cannot run a blanket update without your decision. <<<

-- STEP 2 — ENFORCE GOING FORWARD (safe to apply after STEP 1 cleans the 77 rows)
ALTER TABLE public.profiles
  ADD CONSTRAINT age_verified_requires_method
  CHECK (age_verified_at IS NULL OR age_verification_method IS NOT NULL)
  NOT VALID;   -- NOT VALID: enforces on new/updated rows immediately; existing rows
               -- are not checked until VALIDATE (so STEP 2 is safe pre-backfill).

-- STEP 3 — AFTER STEP 1 backfill is complete, validate against the full table:
--   ALTER TABLE public.profiles VALIDATE CONSTRAINT age_verified_requires_method;

-- VERIFY (read-only) after STEP 1+3:
--   SELECT count(*) FROM public.profiles
--   WHERE age_verified_at IS NOT NULL AND age_verification_method IS NULL;  -- expect 0
