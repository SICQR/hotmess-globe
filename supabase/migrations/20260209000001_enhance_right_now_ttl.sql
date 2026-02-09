-- Enhance Right Now presence with proper TTL cleanup
-- LAW 2: "Right Now" is presence rows with TTL, not UI toggles
-- When expires_at passes → user disappears automatically

-- Add auth_user_id to right_now_status for better indexing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'right_now_status'
                 AND column_name = 'auth_user_id') THEN
    ALTER TABLE public.right_now_status ADD COLUMN auth_user_id uuid;
    -- Backfill from User table where possible
    UPDATE public.right_now_status rns
    SET auth_user_id = u.auth_user_id
    FROM public."User" u
    WHERE rns.user_email = u.email
    AND rns.auth_user_id IS NULL;
  END IF;
END $$;

-- Create index for efficient presence queries
CREATE INDEX IF NOT EXISTS idx_right_now_status_active_expires 
ON public.right_now_status (active, expires_at)
WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_right_now_status_auth_user_id
ON public.right_now_status (auth_user_id)
WHERE auth_user_id IS NOT NULL;

-- Add trigger to automatically set active = false when expires_at passes
-- This happens on SELECT, not continuously (lightweight)
CREATE OR REPLACE FUNCTION public.check_right_now_expiry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If expires_at has passed, mark as inactive
  IF NEW.expires_at < NOW() AND NEW.active = true THEN
    NEW.active = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_right_now_status_check_expiry ON public.right_now_status;
CREATE TRIGGER trg_right_now_status_check_expiry
  BEFORE UPDATE ON public.right_now_status
  FOR EACH ROW
  EXECUTE FUNCTION public.check_right_now_expiry();

-- Add function to cleanup expired rows (call via cron or manually)
CREATE OR REPLACE FUNCTION public.cleanup_expired_right_now()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Mark expired rows as inactive
  UPDATE public.right_now_status
  SET active = false
  WHERE active = true
  AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Optionally delete old inactive rows (older than 7 days)
  DELETE FROM public.right_now_status
  WHERE active = false
  AND expires_at < NOW() - INTERVAL '7 days';
  
  RETURN deleted_count;
END;
$$;

-- Add helper function to upsert presence with TTL
-- This is the canonical way to "go Right Now"
CREATE OR REPLACE FUNCTION public.upsert_right_now_presence(
  p_intent text,
  p_timeframe text,
  p_location jsonb DEFAULT NULL,
  p_preferences jsonb DEFAULT NULL,
  p_ttl_minutes integer DEFAULT 60
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_email text;
  v_auth_user_id uuid;
  v_status_id uuid;
BEGIN
  -- Validate TTL is positive integer
  IF p_ttl_minutes < 1 OR p_ttl_minutes > 1440 THEN
    RAISE EXCEPTION 'TTL must be between 1 and 1440 minutes';
  END IF;
  
  -- Get current user
  SELECT auth.email() INTO v_user_email;
  SELECT auth.uid() INTO v_auth_user_id;
  
  IF v_user_email IS NULL OR v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Deactivate any existing Right Now status for this user
  UPDATE public.right_now_status
  SET active = false
  WHERE auth_user_id = v_auth_user_id
  AND active = true;
  
  -- Insert new status with TTL (use make_interval for safety)
  INSERT INTO public.right_now_status (
    user_email,
    auth_user_id,
    intent,
    timeframe,
    location,
    preferences,
    active,
    expires_at,
    created_by,
    created_at,
    updated_at
  )
  VALUES (
    v_user_email,
    v_auth_user_id,
    p_intent,
    p_timeframe,
    p_location,
    p_preferences,
    true,
    NOW() + make_interval(mins => p_ttl_minutes),
    v_user_email,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_status_id;
  
  RETURN v_status_id;
END;
$$;

-- Add function to stop "Right Now" (deactivate presence)
CREATE OR REPLACE FUNCTION public.stop_right_now_presence()
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_auth_user_id uuid;
  v_updated integer;
BEGIN
  SELECT auth.uid() INTO v_auth_user_id;
  
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  UPDATE public.right_now_status
  SET active = false
  WHERE auth_user_id = v_auth_user_id
  AND active = true;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  RETURN v_updated > 0;
END;
$$;

-- Add comment documenting the contract
COMMENT ON TABLE public.right_now_status IS 'LAW 2: Right Now is presence rows with TTL. If row exists and expires_at > now → user is visible. If expires → disappears automatically.';
COMMENT ON COLUMN public.right_now_status.expires_at IS 'LAW 2: When this timestamp passes, user disappears from Right Now automatically';
COMMENT ON FUNCTION public.upsert_right_now_presence IS 'Canonical way to "go Right Now" with TTL. Deactivates previous status and creates new one.';
COMMENT ON FUNCTION public.stop_right_now_presence IS 'Manually stop Right Now presence (user goes invisible)';
COMMENT ON FUNCTION public.cleanup_expired_right_now IS 'Background job to cleanup expired presence rows. Call via cron.';
