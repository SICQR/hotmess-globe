-- profiles schema gap-fill
-- Adds columns referenced by BootGuardContext, OnboardingGate, and Auth
-- that were never declared in any prior migration.
-- SAFE: all ADD COLUMN IF NOT EXISTS / DO-blocks guard against duplicates.

-- ─── 1. account_id — the FK used by all application code ────────────────────
-- The original 001 migration used `id UUID PRIMARY KEY = auth.users.id`.
-- All subsequent app code and RLS policies use `account_id` instead.
-- Ensure both patterns co-exist.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill: where account_id is NULL, copy from id only where id exists in auth.users
UPDATE public.profiles p
  SET account_id = p.id
  WHERE p.account_id IS NULL 
    AND p.id IS NOT NULL
    AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);

-- Index for the FK
CREATE INDEX IF NOT EXISTS idx_profiles_account_id ON public.profiles (account_id);

-- ─── 2. Consent columns — written by OnboardingGate step 3 ──────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_agreed_terms    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_consented_data  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_consented_gps   BOOLEAN NOT NULL DEFAULT false;

-- ─── 3. membership_tier — written by Auth.jsx handleMembership ──────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS membership_tier      TEXT    NOT NULL DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS subscription_status  TEXT    NOT NULL DEFAULT 'active';

-- ─── 4. display_name — written by OnboardingGate step 4 and handleProfile ───
--     (may already exist from 20260220110000_profile_pin_code.sql)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- ─── 5. Relax the onboarding_requires_username constraint ───────────────────
-- The original constraint blocks onboarding_complete=true unless username IS
-- NOT NULL. App uses display_name, not username, so the constraint fires.
-- Replace it with one that accepts display_name OR username.
DO $$ BEGIN
  ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_onboarding_requires_username;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_onboarding_requires_identity
    CHECK (
      onboarding_complete = false
      OR username IS NOT NULL
      OR display_name IS NOT NULL
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 6. RLS: ensure account_id policies are present ─────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT
    USING (account_id = auth.uid() OR id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    USING (account_id = auth.uid() OR id = auth.uid())
    WITH CHECK (account_id = auth.uid() OR id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "profiles_insert_own"
    ON public.profiles FOR INSERT
    WITH CHECK (account_id = auth.uid() OR id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
