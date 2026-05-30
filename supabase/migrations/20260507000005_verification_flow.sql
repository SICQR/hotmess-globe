-- MEGA-3 §3.4: verification submission flow
-- Existing table profile_verifications already has selfie_url, status,
-- submitted_at, reviewed_at, expires_at. Add the admin-review columns
-- the brief specifies (reviewed_by, rejection_reason) and the RLS
-- policies the admin queue needs.

ALTER TABLE public.profile_verifications
  ADD COLUMN IF NOT EXISTS reviewed_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Admin queue: read all (own + admin) + update for approve/reject (admin only)
DROP POLICY IF EXISTS "verifications_admin_select" ON public.profile_verifications;
CREATE POLICY "verifications_admin_select"
  ON public.profile_verifications FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- The pre-existing per-user SELECT policy is replaced by the union above.
DROP POLICY IF EXISTS "Users can read own verifications" ON public.profile_verifications;

DROP POLICY IF EXISTS "verifications_admin_update" ON public.profile_verifications;
CREATE POLICY "verifications_admin_update"
  ON public.profile_verifications FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE INDEX IF NOT EXISTS idx_profile_verifications_status_submitted
  ON public.profile_verifications (status, submitted_at)
  WHERE status = 'pending';

COMMENT ON COLUMN public.profile_verifications.reviewed_by IS
  'auth.users.id of the admin who approved/rejected this submission. NULL for pending.';
COMMENT ON COLUMN public.profile_verifications.rejection_reason IS
  'Set when status=rejected. Shown to the user on resubmit.';
