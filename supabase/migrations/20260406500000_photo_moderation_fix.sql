-- T-11: Fix photo moderation — drop old permissive SELECT policy that bypassed moderation
-- The old "Anyone can view profile photos" policy (qual: true) overrode the
-- moderation-aware policy, making flagged photos still visible to everyone.

DROP POLICY IF EXISTS "Anyone can view profile photos" ON public.profile_photos;

-- Approve any remaining pending photos (trust-first model: report/flag is the safety net)
UPDATE public.profile_photos SET moderation_status = 'approved' WHERE moderation_status = 'pending';
