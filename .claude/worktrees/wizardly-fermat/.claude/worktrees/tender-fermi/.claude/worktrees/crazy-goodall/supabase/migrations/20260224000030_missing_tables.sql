-- profile_photos table (used by L2PhotosSheet and OnboardingGate photo upload)
CREATE TABLE IF NOT EXISTS public.profile_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_photos_profile_id ON public.profile_photos (profile_id);

ALTER TABLE public.profile_photos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "profile_photos_select_authenticated"
    ON public.profile_photos FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "profile_photos_manage_own"
    ON public.profile_photos FOR ALL TO authenticated
    USING (profile_id = auth.uid())
    WITH CHECK (profile_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ensure preloved_listings is in the schema cache (PostgREST reload)
NOTIFY pgrst, 'reload schema';
