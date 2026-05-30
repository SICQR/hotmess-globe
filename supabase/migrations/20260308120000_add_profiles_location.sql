-- Add missing location column to profiles (referenced by L2EditProfileSheet)
-- The SELECT and UPDATE in L2EditProfileSheet included `location` but the column
-- was never added, causing silent Supabase errors and preventing profile saves.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location TEXT;

-- Backfill from public_attributes if location was stored there
UPDATE public.profiles
  SET location = (public_attributes->>'location')
  WHERE location IS NULL AND public_attributes ? 'location';

COMMENT ON COLUMN public.profiles.location IS
  'Display location string, e.g. "London" or "Berlin, Germany". User-entered city/area.';
