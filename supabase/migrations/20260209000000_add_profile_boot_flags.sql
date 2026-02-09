-- Add profile gating flags to User table
-- These flags enforce OS boot gates per HOTMESS Globe OS architecture

-- Add columns if they don't exist (idempotent)
DO $$ 
BEGIN
  -- age_confirmed: User has confirmed they are 18+
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'User' 
                 AND column_name = 'age_confirmed') THEN
    ALTER TABLE public."User" ADD COLUMN age_confirmed boolean NOT NULL DEFAULT false;
  END IF;

  -- onboarding_complete: User has completed onboarding flow
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'User' 
                 AND column_name = 'onboarding_complete') THEN
    ALTER TABLE public."User" ADD COLUMN onboarding_complete boolean NOT NULL DEFAULT false;
  END IF;

  -- consent_location: User has consented to location services
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'User' 
                 AND column_name = 'consent_location') THEN
    ALTER TABLE public."User" ADD COLUMN consent_location boolean NOT NULL DEFAULT false;
  END IF;

  -- consent_safety: User has consented to safety/data policies
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'User' 
                 AND column_name = 'consent_safety') THEN
    ALTER TABLE public."User" ADD COLUMN consent_safety boolean NOT NULL DEFAULT false;
  END IF;

  -- is_suspended: Admin flag to suspend user accounts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'User' 
                 AND column_name = 'is_suspended') THEN
    ALTER TABLE public."User" ADD COLUMN is_suspended boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Migrate existing consent flags to new flags (backward compatibility)
-- Users who already gave consent in old schema should not be re-gated
UPDATE public."User"
SET 
  onboarding_complete = COALESCE(has_agreed_terms, false),
  consent_location = COALESCE(has_consented_gps, false),
  consent_safety = COALESCE(has_consented_data, false)
WHERE 
  onboarding_complete = false 
  OR consent_location = false 
  OR consent_safety = false;

-- Create index for boot gate queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_user_boot_gates 
ON public."User" (age_confirmed, onboarding_complete, consent_location, consent_safety, is_suspended)
WHERE is_suspended = false;

-- Add comment documenting the boot gate contract
COMMENT ON COLUMN public."User".age_confirmed IS 'LAW 1: OS runtime must not mount unless age_confirmed = true';
COMMENT ON COLUMN public."User".onboarding_complete IS 'LAW 1: OS runtime must not mount unless onboarding_complete = true';
COMMENT ON COLUMN public."User".consent_location IS 'LAW 1: OS runtime must not mount unless consent_location = true';
COMMENT ON COLUMN public."User".consent_safety IS 'LAW 1: OS runtime must not mount unless consent_safety = true';
COMMENT ON COLUMN public."User".is_suspended IS 'LAW 1: OS runtime must not mount if is_suspended = true';
