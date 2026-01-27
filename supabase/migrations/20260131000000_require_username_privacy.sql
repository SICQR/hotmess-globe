-- Migration: Require username for privacy
-- This migration:
-- 1. Adds a flag to track users who need to set a username
-- 2. Backfills usernames for existing users who don't have one
-- 3. Adds validation for username format

-- 1) Add flag for users who need to set username
ALTER TABLE IF EXISTS public."User"
  ADD COLUMN IF NOT EXISTS username_required boolean NOT NULL DEFAULT false;

-- 2) Backfill usernames for existing users without one
-- Generate username from email prefix + random suffix to ensure uniqueness
-- Users will be prompted to change this on next login

-- First, update users without username to have username_required = true
UPDATE public."User"
SET username_required = true
WHERE username IS NULL OR username = '';

-- Generate temporary usernames for users who don't have one
-- Format: email_prefix_XXXX where XXXX is a random 4-character suffix
DO $$
DECLARE
  user_record RECORD;
  new_username TEXT;
  email_prefix TEXT;
  random_suffix TEXT;
  counter INTEGER;
BEGIN
  FOR user_record IN 
    SELECT id, email FROM public."User" 
    WHERE (username IS NULL OR username = '') 
      AND email IS NOT NULL
  LOOP
    -- Extract email prefix (before @)
    email_prefix := LOWER(SPLIT_PART(user_record.email, '@', 1));
    -- Remove non-alphanumeric characters except underscores
    email_prefix := REGEXP_REPLACE(email_prefix, '[^a-z0-9_]', '', 'g');
    -- Truncate to 12 chars to leave room for suffix
    email_prefix := LEFT(email_prefix, 12);
    -- Ensure minimum 3 chars
    IF LENGTH(email_prefix) < 3 THEN
      email_prefix := 'user';
    END IF;
    
    counter := 0;
    LOOP
      -- Generate random 4-char suffix
      random_suffix := LOWER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 4));
      new_username := email_prefix || '_' || random_suffix;
      
      -- Check if username is unique
      BEGIN
        UPDATE public."User"
        SET username = new_username
        WHERE id = user_record.id
          AND NOT EXISTS (
            SELECT 1 FROM public."User" u2 
            WHERE LOWER(u2.username) = LOWER(new_username) 
              AND u2.id != user_record.id
          );
        
        IF FOUND THEN
          EXIT; -- Success, exit loop
        END IF;
      EXCEPTION WHEN unique_violation THEN
        -- Username already exists, try again
      END;
      
      counter := counter + 1;
      IF counter > 10 THEN
        -- Fallback: use id-based username
        new_username := 'user_' || SUBSTRING(user_record.id::TEXT FROM 1 FOR 8);
        UPDATE public."User" SET username = new_username WHERE id = user_record.id;
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- 3) Add check constraint for username format (when set)
-- Must be 3-20 alphanumeric chars and underscores
ALTER TABLE public."User"
  DROP CONSTRAINT IF EXISTS chk_username_format;

ALTER TABLE public."User"
  ADD CONSTRAINT chk_username_format
  CHECK (
    username IS NULL 
    OR (
      LENGTH(username) >= 3 
      AND LENGTH(username) <= 20 
      AND username ~ '^[a-zA-Z0-9_]+$'
    )
  );

-- 4) Add index for username lookups (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_user_username_lower 
  ON public."User" (LOWER(username))
  WHERE username IS NOT NULL;

-- 5) Create a function to validate username availability
CREATE OR REPLACE FUNCTION public.check_username_available(p_username TEXT, p_exclude_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check format
  IF p_username IS NULL OR LENGTH(p_username) < 3 OR LENGTH(p_username) > 20 THEN
    RETURN FALSE;
  END IF;
  
  IF NOT (p_username ~ '^[a-zA-Z0-9_]+$') THEN
    RETURN FALSE;
  END IF;
  
  -- Check reserved usernames
  IF LOWER(p_username) IN ('admin', 'hotmess', 'support', 'help', 'moderator', 'mod', 'system', 'null', 'undefined') THEN
    RETURN FALSE;
  END IF;
  
  -- Check uniqueness
  IF p_exclude_user_id IS NULL THEN
    RETURN NOT EXISTS (
      SELECT 1 FROM public."User" 
      WHERE LOWER(username) = LOWER(p_username)
    );
  ELSE
    RETURN NOT EXISTS (
      SELECT 1 FROM public."User" 
      WHERE LOWER(username) = LOWER(p_username)
        AND auth_user_id != p_exclude_user_id
    );
  END IF;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_username_available(TEXT, UUID) TO authenticated;

-- 6) Add comment explaining the username_required flag
COMMENT ON COLUMN public."User".username_required IS 
  'True if user was backfilled with auto-generated username and should be prompted to set their own.';

-- 7) Log migration
DO $$
DECLARE
  backfilled_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backfilled_count 
  FROM public."User" 
  WHERE username_required = true;
  
  RAISE NOTICE 'Username privacy migration complete. % users backfilled and flagged.', backfilled_count;
END $$;
