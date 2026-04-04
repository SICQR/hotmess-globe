CREATE TABLE IF NOT EXISTS public.user_private_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  sti_status text,
  last_tested text,
  condom_preference text,
  safer_sex_notes text,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);
ALTER TABLE public.user_private_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_only" ON public.user_private_profile
  FOR ALL USING (auth_user_id = auth.uid());

-- Backfill: re-route completed users with no data back to profile screen
UPDATE public.profiles
SET onboarding_stage = 'quick_setup', updated_at = NOW()
WHERE onboarding_completed = true
  AND onboarding_stage = 'complete'
  AND (public_attributes IS NULL OR public_attributes = '{}');
