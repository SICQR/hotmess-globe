-- T-10: Fix profile_overrides FK — references profiles (not "User" which doesn't exist)
-- Original migration 20260129100200 used REFERENCES "User"(id) which silently failed.
-- This creates the table properly with profiles FK and correct RLS.

CREATE TABLE IF NOT EXISTS public.profile_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  override_value JSONB NOT NULL,
  inherit_from_main BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (profile_id, field_name)
);

CREATE INDEX IF NOT EXISTS idx_profile_overrides_profile ON public.profile_overrides(profile_id);

ALTER TABLE public.profile_overrides ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own overrides (profiles.id = auth.uid() in our schema)
DROP POLICY IF EXISTS "Users manage own overrides" ON public.profile_overrides;
CREATE POLICY "Users manage own overrides"
  ON public.profile_overrides FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());
