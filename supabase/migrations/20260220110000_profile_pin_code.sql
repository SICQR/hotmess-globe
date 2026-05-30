-- Profile: PIN code hash + display name
-- PIN is hashed client-side with SHA-256 before storage (never plaintext)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pin_code_hash text,
  ADD COLUMN IF NOT EXISTS display_name  text;

-- Index for quick existence check (only if account_id column exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'account_id') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_pin_set ON public.profiles (account_id) WHERE pin_code_hash IS NOT NULL;
  END IF;
END $$;
