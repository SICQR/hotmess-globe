-- Add missing columns to profiles that the onboarding flow writes to.
-- Production DB was missing these, causing silent write failures throughout
-- the 7-step onboarding flow (steps 1, 3, 4, 5, 7 all failed).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS community_attested_at timestamptz,
  ADD COLUMN IF NOT EXISTS pin_code_hash text,
  ADD COLUMN IF NOT EXISTS public_attributes jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS has_agreed_terms boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_consented_data boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_consented_gps boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS bio text;

-- Backfill confirmed users who were already marked onboarding_completed
UPDATE public.profiles p
SET
  age_verified = true,
  community_attested_at = NOW(),
  has_agreed_terms = true,
  has_consented_data = true
FROM auth.users u
WHERE p.id = u.id
  AND u.confirmed_at IS NOT NULL
  AND p.onboarding_completed = true;
