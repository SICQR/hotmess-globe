-- Backfill: mark confirmed users as onboarding_completed
-- All 32 profiles have onboarding_completed = false because the app was writing
-- to the wrong column name (onboarding_complete vs onboarding_completed).
-- This unblocks the 6 confirmed users stuck in the onboarding loop.

UPDATE public.profiles p
SET
  onboarding_completed = true,
  onboarding_completed_at = NOW()
FROM auth.users u
WHERE p.id = u.id
  AND u.confirmed_at IS NOT NULL
  AND p.onboarding_completed = false;
