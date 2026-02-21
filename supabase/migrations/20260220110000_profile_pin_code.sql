-- Profile: PIN code hash + display name
-- PIN is hashed client-side with SHA-256 before storage (never plaintext)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pin_code_hash text,
  ADD COLUMN IF NOT EXISTS display_name  text;

-- Index for quick existence check (not unique — hash collisions are astronomically rare)
CREATE INDEX IF NOT EXISTS idx_profiles_pin_set
  ON public.profiles (account_id)
  WHERE pin_code_hash IS NOT NULL;
