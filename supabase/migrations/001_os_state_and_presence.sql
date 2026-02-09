-- HOTMESS OS — Complete Auth + State Migration
-- Supabase-first identity system. Run in Supabase SQL Editor.
-- 
-- This replaces any partial migrations. Safe to run multiple times (uses IF NOT EXISTS).

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 0: EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 1: PROFILES TABLE (auth.users.id = profiles.id)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY, -- MUST equal auth.users.id
  username TEXT UNIQUE,
  email TEXT,
  avatar_url TEXT,

  -- Provider sync (for display / linking)
  google_sub TEXT,
  tg_id BIGINT UNIQUE,
  tg_username TEXT,

  -- Gates (HARD REQUIREMENTS)
  age_verified BOOLEAN NOT NULL DEFAULT false,
  consent_accepted BOOLEAN NOT NULL DEFAULT false,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,

  -- Consents & prefs
  consents_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  location_opt_in BOOLEAN NOT NULL DEFAULT false,
  telegram_opt_in BOOLEAN NOT NULL DEFAULT false,
  push_opt_in BOOLEAN NOT NULL DEFAULT false,

  -- Roles & access
  persona TEXT CHECK (persona IN ('listener', 'social', 'creator', 'organizer')) DEFAULT 'listener',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_level TEXT CHECK (verification_level IN ('none', 'basic', 'full')) NOT NULL DEFAULT 'none',
  role_flags JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Capabilities (derived from flags)
  can_go_live BOOLEAN NOT NULL DEFAULT false,
  can_sell BOOLEAN NOT NULL DEFAULT false,

  -- System
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add columns if table already exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS google_sub TEXT,
  ADD COLUMN IF NOT EXISTS tg_id BIGINT UNIQUE,
  ADD COLUMN IF NOT EXISTS tg_username TEXT,
  ADD COLUMN IF NOT EXISTS age_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_accepted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consents_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS location_opt_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS telegram_opt_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_opt_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS persona TEXT DEFAULT 'listener',
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_level TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS role_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS can_go_live BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_sell BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 2: PROFILE CONSTRAINTS (enforce in DB, not UI)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Username must exist BEFORE onboarding_complete can become true
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_onboarding_requires_username
    CHECK (onboarding_complete = false OR username IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Verification level must match is_verified
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_verified_level_consistency
    CHECK (
      (is_verified = false AND verification_level = 'none')
      OR
      (is_verified = true AND verification_level IN ('basic', 'full'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 3: AUTO-SYNC TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_profiles_touch ON public.profiles;
CREATE TRIGGER trg_profiles_touch
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Capability sync trigger (derived fields)
CREATE OR REPLACE FUNCTION public.sync_capabilities()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- can_go_live: requires onboarding + verified + location opt-in
  NEW.can_go_live := (
    NEW.onboarding_complete = true 
    AND NEW.is_verified = true 
    AND NEW.location_opt_in = true
  );
  
  -- can_sell: requires onboarding + full verification
  NEW.can_sell := (
    NEW.onboarding_complete = true 
    AND NEW.is_verified = true 
    AND NEW.verification_level = 'full'
  );
  
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_caps ON public.profiles;
CREATE TRIGGER trg_sync_caps
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_capabilities();

-- Auto-create profile on Supabase Auth user creation
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  v_email := NEW.email;

  INSERT INTO public.profiles (id, email, avatar_url, consents_json)
  VALUES (
    NEW.id,
    v_email,
    NULL,
    '{}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_created();

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 4: PRESENCE TABLE (Right Now = TTL rows)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  mode TEXT NOT NULL CHECK (mode IN ('right_now', 'at_event', 'broadcasting', 'SOCIAL', 'EVENT', 'TRAVEL')),
  
  -- Location (precise, server-only; client gets jittered/banded)
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  -- PostGIS geography for spatial queries (optional)
  geo GEOGRAPHY(Point, 4326),

  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('live', 'hidden', 'expired')) DEFAULT 'live',

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active Right Now per user (prevents beacon spam)
DROP INDEX IF EXISTS presence_one_live_right_now;
CREATE UNIQUE INDEX presence_one_live_right_now
  ON public.presence(user_id)
  WHERE (status = 'live' AND expires_at > now());

CREATE INDEX IF NOT EXISTS presence_expires_at_idx ON public.presence(expires_at);
CREATE INDEX IF NOT EXISTS presence_user_id_idx ON public.presence(user_id);
CREATE INDEX IF NOT EXISTS presence_geo_idx ON public.presence USING gist (geo);
CREATE INDEX IF NOT EXISTS presence_mode_idx ON public.presence(mode);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 5: BEACONS TABLE (Globe truth)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.beacons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('social', 'event', 'drop', 'market', 'radio', 'safety')),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,

  starts_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ,
  intensity INT NOT NULL DEFAULT 1,

  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'nearby', 'verified_only', 'admin_only')) DEFAULT 'public',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_beacons_touch ON public.beacons;
CREATE TRIGGER trg_beacons_touch
  BEFORE UPDATE ON public.beacons
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 6: PRESENCE → BEACON SYNC
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_presence_to_beacon()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only right_now -> social beacon
  IF (NEW.mode IN ('right_now', 'SOCIAL')) THEN
    INSERT INTO public.beacons (type, owner_id, lat, lng, starts_at, ends_at, intensity, visibility, metadata)
    VALUES (
      'social',
      NEW.user_id,
      NEW.lat,
      NEW.lng,
      NEW.started_at,
      NEW.expires_at,
      1,
      CASE WHEN (SELECT is_verified FROM public.profiles p WHERE p.id = NEW.user_id) THEN 'nearby' ELSE 'admin_only' END,
      jsonb_build_object('presence_id', NEW.id)
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_presence_sync ON public.presence;
CREATE TRIGGER trg_presence_sync
  AFTER INSERT ON public.presence
  FOR EACH ROW EXECUTE FUNCTION public.sync_presence_to_beacon();

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 7: RPC FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Viewer state (single source of truth for boot)
CREATE OR REPLACE FUNCTION public.rpc_viewer_state()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE 
  p public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid();
  
  IF NOT FOUND THEN 
    RETURN 'BLOCKED'; 
  END IF;
  
  IF p.age_verified IS NOT TRUE THEN 
    RETURN 'AGE_REQUIRED'; 
  END IF;
  
  IF p.consent_accepted IS NOT TRUE THEN 
    RETURN 'CONSENT_REQUIRED'; 
  END IF;
  
  IF p.onboarding_complete IS NOT TRUE THEN 
    RETURN 'ONBOARDING_REQUIRED'; 
  END IF;
  
  RETURN 'OS_READY';
END $$;

-- Go live (upsert presence with TTL) - ENFORCES verification
CREATE OR REPLACE FUNCTION public.rpc_go_live(
  p_mode TEXT, 
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_minutes INT DEFAULT 60
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;
  
  IF v_profile.onboarding_complete IS NOT TRUE THEN
    RAISE EXCEPTION 'ONBOARDING_REQUIRED';
  END IF;
  
  IF v_profile.is_verified IS NOT TRUE THEN
    RAISE EXCEPTION 'VERIFICATION_REQUIRED';
  END IF;
  
  IF v_profile.location_opt_in IS NOT TRUE THEN
    RAISE EXCEPTION 'LOCATION_OPT_IN_REQUIRED';
  END IF;

  -- Upsert presence
  INSERT INTO public.presence (user_id, mode, lat, lng, geo, expires_at, status)
  VALUES (
    auth.uid(), 
    p_mode, 
    p_lat,
    p_lng,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    now() + make_interval(mins => p_minutes),
    'live'
  )
  ON CONFLICT (user_id) WHERE (status = 'live' AND expires_at > now())
  DO UPDATE SET 
    mode = EXCLUDED.mode, 
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    geo = EXCLUDED.geo,
    expires_at = EXCLUDED.expires_at;
END $$;

-- Stop live (expire presence)
CREATE OR REPLACE FUNCTION public.rpc_stop_live()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.presence
  SET status = 'expired'
  WHERE user_id = auth.uid() AND status = 'live';
END $$;

-- TTL expiry job (call from cron/edge function)
CREATE OR REPLACE FUNCTION public.expire_presence_and_beacons()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Expire presence rows
  UPDATE public.presence
  SET status = 'expired'
  WHERE status = 'live' AND expires_at <= now();

  -- Delete expired social beacons
  DELETE FROM public.beacons b
  WHERE b.type = 'social'
    AND b.ends_at IS NOT NULL 
    AND b.ends_at <= now();
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 8: ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beacons ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES --

DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;
CREATE POLICY "profiles_read_own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- PRESENCE POLICIES --

DROP POLICY IF EXISTS "presence_read_own" ON public.presence;
CREATE POLICY "presence_read_own"
  ON public.presence FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "presence_read_live" ON public.presence;
CREATE POLICY "presence_read_live"
  ON public.presence FOR SELECT
  USING (status = 'live' AND expires_at > now());

DROP POLICY IF EXISTS "presence_insert_verified" ON public.presence;
CREATE POLICY "presence_insert_verified"
  ON public.presence FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (SELECT p.onboarding_complete FROM public.profiles p WHERE p.id = auth.uid()) = true
    AND (SELECT p.is_verified FROM public.profiles p WHERE p.id = auth.uid()) = true
    AND (SELECT p.location_opt_in FROM public.profiles p WHERE p.id = auth.uid()) = true
    AND expires_at > now()
  );

DROP POLICY IF EXISTS "presence_update_own" ON public.presence;
CREATE POLICY "presence_update_own"
  ON public.presence FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "presence_delete_own" ON public.presence;
CREATE POLICY "presence_delete_own"
  ON public.presence FOR DELETE
  USING (user_id = auth.uid());

-- BEACONS POLICIES --

DROP POLICY IF EXISTS "beacons_read_public" ON public.beacons;
CREATE POLICY "beacons_read_public"
  ON public.beacons FOR SELECT
  USING (visibility = 'public');

DROP POLICY IF EXISTS "beacons_read_nearby" ON public.beacons;
CREATE POLICY "beacons_read_nearby"
  ON public.beacons FOR SELECT
  USING (visibility IN ('public', 'nearby'));

DROP POLICY IF EXISTS "beacons_read_verified" ON public.beacons;
CREATE POLICY "beacons_read_verified"
  ON public.beacons FOR SELECT
  USING (
    visibility = 'verified_only'
    AND (SELECT p.is_verified FROM public.profiles p WHERE p.id = auth.uid()) = true
  );

DROP POLICY IF EXISTS "beacons_read_admin" ON public.beacons;
CREATE POLICY "beacons_read_admin"
  ON public.beacons FOR SELECT
  USING (
    visibility = 'admin_only'
    AND COALESCE((SELECT (p.role_flags->>'admin')::boolean FROM public.profiles p WHERE p.id = auth.uid()), false) = true
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 9: SAFETY INCIDENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'acknowledged', 'resolved')) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS safety_incidents_user_idx ON public.safety_incidents(user_id);
CREATE INDEX IF NOT EXISTS safety_incidents_status_idx ON public.safety_incidents(status);

-- Safety RLS
ALTER TABLE public.safety_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "safety_read_own" ON public.safety_incidents;
CREATE POLICY "safety_read_own"
  ON public.safety_incidents FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "safety_read_admin" ON public.safety_incidents;
CREATE POLICY "safety_read_admin"
  ON public.safety_incidents FOR SELECT
  USING (
    COALESCE((SELECT (p.role_flags->>'admin')::boolean FROM public.profiles p WHERE p.id = auth.uid()), false) = true
  );

DROP POLICY IF EXISTS "safety_insert_own" ON public.safety_incidents;
CREATE POLICY "safety_insert_own"
  ON public.safety_incidents FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "safety_update_own" ON public.safety_incidents;
CREATE POLICY "safety_update_own"
  ON public.safety_incidents FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Panic start RPC
CREATE OR REPLACE FUNCTION public.panic_start(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- Create safety incident
  INSERT INTO public.safety_incidents (user_id, lat, lng, status)
  VALUES (v_uid, p_lat, p_lng, 'active')
  RETURNING id INTO v_id;

  -- Create safety beacon (admin_only visibility)
  INSERT INTO public.beacons (type, owner_id, lat, lng, starts_at, intensity, visibility, metadata)
  VALUES (
    'safety',
    v_uid,
    p_lat,
    p_lng,
    now(),
    10,
    'admin_only',
    jsonb_build_object('incident_id', v_id)
  );

  RETURN v_id;
END $$;

-- Panic resolve RPC
CREATE OR REPLACE FUNCTION public.panic_resolve()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- Resolve incident
  UPDATE public.safety_incidents
  SET status = 'resolved', resolved_at = now()
  WHERE user_id = v_uid AND status IN ('active', 'acknowledged');

  -- Remove safety beacon
  DELETE FROM public.beacons
  WHERE type = 'safety' AND owner_id = v_uid;
END $$;

-- Admin acknowledge RPC
CREATE OR REPLACE FUNCTION public.admin_ack_incident(p_incident_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_is_admin BOOLEAN;
BEGIN
  SELECT COALESCE((role_flags->>'admin')::boolean, false)
  INTO v_is_admin
  FROM public.profiles
  WHERE id = v_uid;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  UPDATE public.safety_incidents
  SET status = 'acknowledged'
  WHERE id = p_incident_id AND status = 'active';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 10: REALTIME
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable realtime for key tables
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.presence;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.beacons;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_incidents;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 11: PUBLIC PROFILE VIEW (safe fields only)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  id, 
  username, 
  avatar_url, 
  persona, 
  is_verified, 
  verification_level, 
  last_seen_at
FROM public.profiles;

-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE. Run via Supabase Dashboard SQL Editor.
-- 
-- Next: Set up pg_cron or Edge Function to call expire_presence_and_beacons()
-- every 1-2 minutes.
-- ═══════════════════════════════════════════════════════════════════════════════
