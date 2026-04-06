-- Photo moderation status: owner sees all, others see approved only
-- Existing photos default to 'approved' (trusted existing content)
-- New uploads from app will write 'pending'

ALTER TABLE public.profile_photos
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'approved';

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_profile_photos_moderation
  ON public.profile_photos (moderation_status)
  WHERE moderation_status != 'approved';

-- Replace permissive SELECT policy with moderation-aware one
DROP POLICY IF EXISTS "profile_photos_select_authenticated" ON public.profile_photos;

CREATE POLICY "profile_photos_select_moderated"
  ON public.profile_photos
  FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR moderation_status = 'approved'
  );
