-- Multi-Profile Personas: Core profiles table
-- Supports MAIN (one per account) and SECONDARY (multiple) profiles

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'MAIN' CHECK (kind IN ('MAIN', 'SECONDARY')),
  type_key TEXT NOT NULL DEFAULT 'MAIN',
  type_label TEXT,
  active BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  inherit_mode TEXT NOT NULL DEFAULT 'FULL_INHERIT' 
    CHECK (inherit_mode IN ('FULL_INHERIT', 'OVERRIDE_FIELDS', 'OVERRIDE_ALL')),
  override_location_enabled BOOLEAN NOT NULL DEFAULT false,
  override_location_lat DOUBLE PRECISION,
  override_location_lng DOUBLE PRECISION,
  override_location_label TEXT,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_profiles_account_id ON public.profiles(account_id);
CREATE INDEX IF NOT EXISTS idx_profiles_active_expires ON public.profiles(account_id, active, expires_at);
CREATE INDEX IF NOT EXISTS idx_profiles_kind ON public.profiles(kind);

-- Ensure only one MAIN profile per account (soft-delete aware)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_main_unique ON public.profiles(account_id) 
  WHERE kind = 'MAIN' AND deleted_at IS NULL;

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.profiles_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_set_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_set_updated_at();

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Owner can read their own profiles
DROP POLICY IF EXISTS profiles_select_owner ON public.profiles;
CREATE POLICY profiles_select_owner
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (account_id = auth.uid());

-- Authenticated users can read active, non-expired, non-deleted profiles for discovery
DROP POLICY IF EXISTS profiles_select_discovery ON public.profiles;
CREATE POLICY profiles_select_discovery
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    active = true 
    AND deleted_at IS NULL 
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Owner can insert their own profiles
DROP POLICY IF EXISTS profiles_insert_owner ON public.profiles;
CREATE POLICY profiles_insert_owner
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (account_id = auth.uid());

-- Owner can update their own profiles
DROP POLICY IF EXISTS profiles_update_owner ON public.profiles;
CREATE POLICY profiles_update_owner
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (account_id = auth.uid())
  WITH CHECK (account_id = auth.uid());

-- Owner can delete (soft delete) their own profiles
DROP POLICY IF EXISTS profiles_delete_owner ON public.profiles;
CREATE POLICY profiles_delete_owner
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (account_id = auth.uid());
