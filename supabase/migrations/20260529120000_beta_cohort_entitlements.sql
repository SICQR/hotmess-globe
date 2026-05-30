-- ============================================================================
-- BETA COHORT ENTITLEMENTS — Phil locked 2026-05-29
-- ============================================================================
-- Purpose: during beta, three groups need a different gating layer than the
-- paid-tier defaults so they can feel the full HOTMESS loop:
--   1. Founding 250 — anyone with active beta_access_until
--   2. Phil's open account (SMASH)
--   3. e2e test accounts (Alpha + Beta)
--
-- Two entitlement overrides apply when a user is in the beta cohort:
--   A. Beacon drops: 4/day (daily window), not the tier monthly cap
--   B. Ghosted: fully unlocked — has_full_ghosted=true, no preview limit
--
-- All other tier benefits pass through unchanged. Doctrine 11 inheritance:
-- monetisation may amplify atmosphere but does not override relational truth.
-- Beta users get to feel the system; premium becomes a future layer, not a
-- pre-loop blocker.
--
-- This migration is idempotent and additive — it only redefines the two RPCs
-- and adds one column. Rolling back: DROP the column and restore the prior
-- function bodies (preserved verbatim in the project history).
-- ============================================================================

BEGIN;

-- 1. is_beta_cohort_override — manual flag for permanent test accounts that
--    don't go through the redeem flow (Phil's SMASH + e2e Alpha + e2e Beta).
--    The redeem flow already writes beta_access_until for the 250 founding
--    cohort and that ttl-based gate auto-expires correctly. The override is
--    only for permanent test accounts.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_beta_cohort_override boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_beta_cohort_override IS
  'Manual permanent override for the beta entitlement cohort (Phil + e2e test '
  'accounts). The 250 founding invitees are gated via beta_access_until > now() '
  'and do not need this flag. Phil 2026-05-29.';

-- 2. Mark Phil's SMASH account + e2e test accounts as permanent cohort members.
UPDATE public.profiles
   SET is_beta_cohort_override = true
 WHERE id IN (
   '302040e5-c2ac-4fb3-a192-70598aa7b962',   -- Phil — scanme@sicqr.com / SMASH
   'e2e00001-0000-0000-0000-000000000001',   -- e2e.alpha@hotmessldn.com
   'e2e00002-0000-0000-0000-000000000002'    -- e2e.beta@hotmessldn.com
 );

-- 3. Helper: is the user currently in the beta cohort?
--    Active beta_access_until OR permanent override.
CREATE OR REPLACE FUNCTION public.is_beta_cohort(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_active boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  SELECT (COALESCE(beta_access_until, 'epoch'::timestamptz) > now())
      OR COALESCE(is_beta_cohort_override, false)
    INTO v_active
    FROM public.profiles
   WHERE id = p_user_id;
  RETURN COALESCE(v_active, false);
END;
$$;

-- 4. get_beacon_quota — beta cohort gets 4/day (rolling 24h window).
--    Non-cohort: unchanged monthly tier-based logic.
--    Return shape gains a 'window' key ('daily' | 'monthly') so the UI can
--    render the correct copy ("today's cap" vs "monthly cap").
CREATE OR REPLACE FUNCTION public.get_beacon_quota(p_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_used   integer;
  v_cap    integer;
  v_tier   text;
  v_beta   boolean;
  v_window text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'used', 0, 'cap', 0, 'remaining', 0,
      'unlimited', false, 'tier', 'mess', 'window', 'monthly'
    );
  END IF;

  v_beta := public.is_beta_cohort(p_user_id);

  IF v_beta THEN
    -- Beta cohort: 4 drops per rolling 24h window.
    v_window := 'daily';
    v_cap    := 4;
    SELECT count(*)::int INTO v_used
      FROM public.beacons
     WHERE owner_id = p_user_id
       AND created_at >= (now() - interval '24 hours');
    v_tier := 'beta';
  ELSE
    -- Non-cohort: existing monthly tier-based logic, preserved verbatim.
    v_window := 'monthly';
    SELECT count(*)::int INTO v_used
      FROM public.beacons
     WHERE owner_id = p_user_id
       AND created_at >= date_trunc('month', now() AT TIME ZONE 'UTC');

    SELECT lower(COALESCE(membership_tier, 'mess')) INTO v_tier
      FROM public.profiles WHERE id = p_user_id;
    v_tier := COALESCE(v_tier, 'mess');

    SELECT COALESCE((benefits->>'beacon_drops_monthly')::int, 0) INTO v_cap
      FROM public.membership_tiers WHERE name = v_tier;
    IF v_cap IS NULL THEN v_cap := 0; END IF;
  END IF;

  RETURN jsonb_build_object(
    'used',      v_used,
    'cap',       v_cap,
    'remaining', CASE WHEN v_cap = -1 THEN -1 ELSE GREATEST(v_cap - v_used, 0) END,
    'unlimited', v_cap = -1,
    'tier',      v_tier,
    'window',    v_window
  );
END;
$$;

-- 5. get_user_benefits — beta cohort gets Ghosted fully unlocked.
--    Non-cohort: unchanged tier lookup.
--    Beta override merges has_full_ghosted=true and ghosted_preview_limit=-1
--    on top of whatever the user's tier benefits say. Other tier fields
--    pass through unchanged (so a paid HOTMESS user with active beta still
--    keeps their other paid benefits).
CREATE OR REPLACE FUNCTION public.get_user_benefits(p_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_tier          text;
  v_benefits      jsonb;
  v_mess_benefits jsonb;
  v_beta          boolean;
  v_overrides     jsonb;
BEGIN
  -- Anon / missing user → MESS benefits (unchanged)
  IF p_user_id IS NULL THEN
    SELECT benefits INTO v_mess_benefits FROM public.membership_tiers WHERE name = 'mess';
    RETURN COALESCE(v_mess_benefits, '{}'::jsonb);
  END IF;

  -- Resolve user's tier (lowercase) — fallback to mess
  SELECT lower(COALESCE(membership_tier, 'mess')) INTO v_tier
    FROM public.profiles WHERE id = p_user_id;
  v_tier := COALESCE(v_tier, 'mess');

  -- Pull tier benefits; fall back to mess if missing
  SELECT benefits INTO v_benefits FROM public.membership_tiers WHERE name = v_tier;
  IF v_benefits IS NULL THEN
    SELECT benefits INTO v_benefits FROM public.membership_tiers WHERE name = 'mess';
  END IF;
  v_benefits := COALESCE(v_benefits, '{}'::jsonb);

  -- Beta cohort override: unlock Ghosted + signal that the cohort is active
  v_beta := public.is_beta_cohort(p_user_id);
  IF v_beta THEN
    v_overrides := jsonb_build_object(
      'has_full_ghosted',      true,
      'ghosted_preview_limit', -1,
      'beta_cohort_active',    true
    );
    -- jsonb || jsonb — right side wins, so overrides take precedence.
    v_benefits := v_benefits || v_overrides;
  ELSE
    v_benefits := v_benefits || jsonb_build_object('beta_cohort_active', false);
  END IF;

  RETURN v_benefits;
END;
$$;

COMMIT;
