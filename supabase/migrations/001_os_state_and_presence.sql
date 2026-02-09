-- HOTMESS OS — Schema Migration
-- Safe, incremental. Run via Supabase dashboard or CLI.

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 0: ADD COLUMNS TO PROFILES (additive only)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Gates
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_accepted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- Profile data
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS persona TEXT,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Capabilities (derived)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_go_live BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_sell BOOLEAN DEFAULT false;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 1: CREATE PRESENCE TABLE (TTL rows)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL, -- 'SOCIAL' | 'EVENT' | 'TRAVEL'
  geo GEOGRAPHY(Point, 4326),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id)
);

-- Indexes for presence
CREATE INDEX IF NOT EXISTS presence_exp_idx ON public.presence (expires_at);
CREATE INDEX IF NOT EXISTS presence_geo_idx ON public.presence USING gist (geo);
CREATE INDEX IF NOT EXISTS presence_mode_idx ON public.presence (mode);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 2: CAPABILITY TRIGGER (derived fields)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_capabilities()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- can_go_live: requires onboarding complete
  NEW.can_go_live := (NEW.onboarding_complete = true);
  
  -- can_sell: requires onboarding + verification
  NEW.can_sell := (NEW.onboarding_complete = true AND NEW.is_verified = true);
  
  RETURN NEW;
END $$;

-- Drop existing trigger if exists, then create
DROP TRIGGER IF EXISTS trg_sync_caps ON public.profiles;
CREATE TRIGGER trg_sync_caps
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_capabilities();

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 3: RPC FUNCTIONS
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

-- Go live (upsert presence with TTL)
CREATE OR REPLACE FUNCTION public.rpc_go_live(
  p_mode TEXT, 
  p_geo GEOGRAPHY, 
  p_minutes INT
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Check capability
  IF (SELECT onboarding_complete FROM public.profiles WHERE id = auth.uid()) IS NOT TRUE THEN
    RAISE EXCEPTION 'ONBOARDING_REQUIRED';
  END IF;

  -- Upsert presence
  INSERT INTO public.presence (user_id, mode, geo, expires_at)
  VALUES (
    auth.uid(), 
    p_mode, 
    p_geo, 
    now() + make_interval(mins => p_minutes)
  )
  ON CONFLICT (user_id)
  DO UPDATE SET 
    mode = EXCLUDED.mode, 
    geo = EXCLUDED.geo, 
    expires_at = EXCLUDED.expires_at;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 4: ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable RLS on presence
ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read presence (it's public visibility)
CREATE POLICY IF NOT EXISTS "Presence is publicly viewable" 
  ON public.presence FOR SELECT 
  USING (true);

-- Policy: Users can only manage their own presence
CREATE POLICY IF NOT EXISTS "Users manage own presence" 
  ON public.presence FOR ALL 
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 5: REALTIME
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable realtime for presence table
ALTER PUBLICATION supabase_realtime ADD TABLE public.presence;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TTL CLEANUP (run via pg_cron or edge function)
-- ═══════════════════════════════════════════════════════════════════════════════

-- This should be called every minute via:
-- 1. Supabase pg_cron extension, or
-- 2. An edge function on a schedule

-- Manual cleanup function (call from cron):
CREATE OR REPLACE FUNCTION public.cleanup_expired_presence()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.presence WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END $$;

-- If pg_cron is available:
-- SELECT cron.schedule('cleanup-presence', '* * * * *', 'SELECT public.cleanup_expired_presence()');

-- ═══════════════════════════════════════════════════════════════════════════════
-- OPTIONAL: Backfill existing users (run manually with caution)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Uncomment and adjust criteria for your data:
/*
UPDATE public.profiles
SET age_verified = true
WHERE age_verified IS FALSE
  AND created_at < now() - INTERVAL '30 days';

UPDATE public.profiles
SET consent_accepted = true
WHERE consent_accepted IS FALSE
  AND created_at < now() - INTERVAL '30 days';
*/
