-- Add email column to profiles (needed for chat participant lookups)
-- profiles.id = auth.users.id, so we can backfill from auth.users

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill email from auth.users
UPDATE public.profiles p
  SET email = u.email
  FROM auth.users u
  WHERE u.id = p.id AND p.email IS NULL;

-- Index for email lookups (chat participant resolution)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);

-- Trigger to auto-populate email on new profile inserts
CREATE OR REPLACE FUNCTION public.profiles_sync_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.email IS NULL THEN
    SELECT email INTO NEW.email FROM auth.users WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_sync_email ON public.profiles;
CREATE TRIGGER trg_profiles_sync_email
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_sync_email();

-- Patch handle_auth_user_created to also set account_id = id for new users
-- (completeOnboarding in BootGuardContext queries by account_id)
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, account_id, email, avatar_url, consents_json)
  VALUES (NEW.id, NEW.id, NEW.email, NULL, '{}'::jsonb)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        account_id = COALESCE(profiles.account_id, EXCLUDED.id);
  RETURN NEW;
END;
$$;

-- Backfill account_id for any existing profiles that are still NULL
UPDATE public.profiles p SET account_id = p.id WHERE p.account_id IS NULL AND p.id IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);

-- Allow authenticated users to read all profiles (needed for chat & grid)
-- Safe to add: IF NOT EXISTS guards prevent duplicates
DO $$ BEGIN
  CREATE POLICY "profiles_select_all_authenticated"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
