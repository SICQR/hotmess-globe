-- Add public_attributes JSONB to profiles for display-safe fields
-- that other users can see (body_type, position, looking_for, height_cm, orientation, pronouns)
-- Sensitive fields (HIV status, kinks) stay in user_private_profile (self-only RLS)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS public_attributes JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.public_attributes IS
  'Display-safe profile attributes visible to other authenticated users. '
  'Keys: body_type, position, looking_for (array), height_cm, sexual_orientation, pronouns, hosting';
