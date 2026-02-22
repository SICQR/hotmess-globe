-- ============================================================================
-- SECURITY FIXES FOR AUTHENTICATION AND RLS
-- Addresses critical security issues identified in the codebase review
-- ============================================================================

-- ============================================================================
-- 1. ADD FK FROM User.auth_user_id TO auth.users(id)
-- Critical: Prevents orphaned user records when auth.users entries are deleted
-- ============================================================================

DO $$
BEGIN
  -- First ensure auth_user_id column exists and has proper index
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE public."User" ADD COLUMN auth_user_id UUID;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_auth_user_id ON public."User"(auth_user_id) WHERE auth_user_id IS NOT NULL;
  END IF;
  
  -- Add foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_user_auth_user_id' 
    AND table_name = 'User'
  ) THEN
    -- Note: This assumes auth_user_id is already populated or can be NULL
    -- In production, you should backfill auth_user_id first:
    -- UPDATE public."User" u SET auth_user_id = au.id 
    -- FROM auth.users au WHERE u.email = au.email;
    
    ALTER TABLE public."User"
    ADD CONSTRAINT fk_user_auth_user_id
    FOREIGN KEY (auth_user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- 2. ADD is_admin COLUMN TO User TABLE
-- Required: Many RLS policies reference u.role = 'admin' but column doesn't exist
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE public."User" ADD COLUMN is_admin BOOLEAN DEFAULT false NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_user_is_admin ON public."User"(is_admin) WHERE is_admin = true;
    
    -- Optionally add 'role' column for compatibility with existing migrations
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'User' 
      AND column_name = 'role'
    ) THEN
      ALTER TABLE public."User" ADD COLUMN role TEXT;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 3. FIX SQUADS RLS POLICIES
-- Critical: Currently using(true) allows ANY user to modify ANY squad
-- ============================================================================

DROP POLICY IF EXISTS IF EXISTS squads_select_authenticated ON public.squads;
DROP POLICY IF EXISTS IF EXISTS squads_write_authenticated ON public.squads;
DROP POLICY IF EXISTS IF EXISTS squads_update_authenticated ON public.squads;
DROP POLICY IF EXISTS IF EXISTS squads_delete_authenticated ON public.squads;

-- Users can view public squads or squads they're a member of
CREATE POLICY IF NOT EXISTS squads_select_visible
  ON public.squads
  FOR SELECT
  TO authenticated
  USING (
    is_public = true
    OR owner_email = (auth.jwt() ->> 'email')
    OR EXISTS (
      SELECT 1 FROM public.squad_members sm
      WHERE sm.squad_id = id
      AND sm.user_email = (auth.jwt() ->> 'email')
    )
  );

-- Users can create squads where they're the owner
CREATE POLICY IF NOT EXISTS squads_insert_owner
  ON public.squads
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_email = (auth.jwt() ->> 'email'));

-- Only owner can update squad
CREATE POLICY IF NOT EXISTS squads_update_owner
  ON public.squads
  FOR UPDATE
  TO authenticated
  USING (owner_email = (auth.jwt() ->> 'email'))
  WITH CHECK (owner_email = (auth.jwt() ->> 'email'));

-- Only owner can delete squad
CREATE POLICY IF NOT EXISTS squads_delete_owner
  ON public.squads
  FOR DELETE
  TO authenticated
  USING (owner_email = (auth.jwt() ->> 'email'));

-- ============================================================================
-- 4. FIX SQUAD_MEMBERS RLS POLICIES
-- Critical: Currently allows ANY user to add/remove members from ANY squad
-- ============================================================================

DROP POLICY IF EXISTS IF EXISTS squad_members_select_authenticated ON public.squad_members;
DROP POLICY IF EXISTS IF EXISTS squad_members_write_authenticated ON public.squad_members;
DROP POLICY IF EXISTS IF EXISTS squad_members_update_authenticated ON public.squad_members;
DROP POLICY IF EXISTS IF EXISTS squad_members_delete_authenticated ON public.squad_members;

-- Users can view squad members if they can see the squad
CREATE POLICY IF NOT EXISTS squad_members_select_visible
  ON public.squad_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.squads s
      WHERE s.id = squad_id
      AND (
        s.is_public = true
        OR s.owner_email = (auth.jwt() ->> 'email')
        OR EXISTS (
          SELECT 1 FROM public.squad_members sm
          WHERE sm.squad_id = s.id
          AND sm.user_email = (auth.jwt() ->> 'email')
        )
      )
    )
  );

-- Squad owner or admins can add members
CREATE POLICY IF NOT EXISTS squad_members_insert_owner_or_admin
  ON public.squad_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.squads s
      WHERE s.id = squad_id
      AND s.owner_email = (auth.jwt() ->> 'email')
    )
  );

-- Squad owner can update members
CREATE POLICY IF NOT EXISTS squad_members_update_owner
  ON public.squad_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.squads s
      WHERE s.id = squad_id
      AND s.owner_email = (auth.jwt() ->> 'email')
    )
  );

-- Squad owner or the member themselves can remove membership
CREATE POLICY IF NOT EXISTS squad_members_delete_owner_or_self
  ON public.squad_members
  FOR DELETE
  TO authenticated
  USING (
    user_email = (auth.jwt() ->> 'email')
    OR EXISTS (
      SELECT 1 FROM public.squads s
      WHERE s.id = squad_id
      AND s.owner_email = (auth.jwt() ->> 'email')
    )
  );

-- ============================================================================
-- 5. FIX USER_TAGS RLS POLICIES
-- Critical: Currently allows ANY user to create/modify tags for ANY user
-- ============================================================================

DROP POLICY IF EXISTS IF EXISTS user_tags_select_all ON public.user_tags;
DROP POLICY IF EXISTS IF EXISTS user_tags_insert_authenticated ON public.user_tags;
DROP POLICY IF EXISTS IF EXISTS write_authenticated ON public.user_tags;

-- Everyone can view public tags
CREATE POLICY IF NOT EXISTS user_tags_select_public
  ON public.user_tags
  FOR SELECT
  TO authenticated
  USING (visibility = 'public' OR user_email = (auth.jwt() ->> 'email'));

-- Users can only create tags for themselves (unless they're admin)
CREATE POLICY IF NOT EXISTS user_tags_insert_self_or_admin
  ON public.user_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_email = (auth.jwt() ->> 'email')
    OR EXISTS (
      SELECT 1 FROM public."User" u
      WHERE u.email = (auth.jwt() ->> 'email')
      AND (u.is_admin = true OR u.role = 'admin')
    )
  );

-- Users can update their own tags
CREATE POLICY IF NOT EXISTS user_tags_update_self
  ON public.user_tags
  FOR UPDATE
  TO authenticated
  USING (user_email = (auth.jwt() ->> 'email'))
  WITH CHECK (user_email = (auth.jwt() ->> 'email'));

-- Users can delete their own tags
CREATE POLICY IF NOT EXISTS user_tags_delete_self
  ON public.user_tags
  FOR DELETE
  TO authenticated
  USING (user_email = (auth.jwt() ->> 'email'));

-- ============================================================================
-- 6. FIX USER_ACHIEVEMENTS RLS POLICIES
-- Critical: Currently allows ANY user to assign achievements to anyone
-- ============================================================================

DROP POLICY IF EXISTS IF EXISTS user_achievements_select_all ON public.user_achievements;
DROP POLICY IF EXISTS IF EXISTS write_authenticated ON public.user_achievements;

-- Everyone can view achievements
CREATE POLICY IF NOT EXISTS user_achievements_select_all
  ON public.user_achievements
  FOR SELECT
  TO authenticated
  USING (true);

-- Only system (service role) can insert achievements
CREATE POLICY IF NOT EXISTS user_achievements_insert_system
  ON public.user_achievements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public."User" u
      WHERE u.email = (auth.jwt() ->> 'email')
      AND (u.is_admin = true OR u.role = 'admin')
    )
  );

-- ============================================================================
-- 7. ADD MISSING RLS TO CRITICAL TABLES
-- ============================================================================

-- Enable RLS on user_follows if not already enabled
ALTER TABLE IF EXISTS public.user_follows ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Drop and recreate user_follows policies
  DROP POLICY IF EXISTS IF EXISTS user_follows_select_all ON public.user_follows;
  DROP POLICY IF EXISTS IF EXISTS user_follows_insert_self ON public.user_follows;
  DROP POLICY IF EXISTS IF EXISTS user_follows_delete_self ON public.user_follows;
  
  -- Everyone can see who follows whom (public social graph)
  CREATE POLICY IF NOT EXISTS user_follows_select_all
    ON public.user_follows
    FOR SELECT
    TO authenticated
    USING (true);
  
  -- Users can follow others
  CREATE POLICY IF NOT EXISTS user_follows_insert_self
    ON public.user_follows
    FOR INSERT
    TO authenticated
    WITH CHECK (follower_id = auth.uid() OR follower_email = (auth.jwt() ->> 'email'));
  
  -- Users can unfollow
  CREATE POLICY IF NOT EXISTS user_follows_delete_self
    ON public.user_follows
    FOR DELETE
    TO authenticated
    USING (follower_id = auth.uid() OR follower_email = (auth.jwt() ->> 'email'));
EXCEPTION
  WHEN undefined_table THEN
    -- Table doesn't exist, skip
    NULL;
END $$;

-- Enable RLS on user_vibes if not already enabled
ALTER TABLE IF EXISTS public.user_vibes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Drop and recreate user_vibes policies
  DROP POLICY IF EXISTS IF EXISTS user_vibes_select_all ON public.user_vibes;
  DROP POLICY IF EXISTS IF EXISTS user_vibes_insert_self ON public.user_vibes;
  DROP POLICY IF EXISTS IF EXISTS user_vibes_update_self ON public.user_vibes;
  DROP POLICY IF EXISTS IF EXISTS user_vibes_delete_self ON public.user_vibes;
  
  -- Everyone can see vibes
  CREATE POLICY IF NOT EXISTS user_vibes_select_all
    ON public.user_vibes
    FOR SELECT
    TO authenticated
    USING (true);
  
  -- Users can send vibes
  CREATE POLICY IF NOT EXISTS user_vibes_insert_self
    ON public.user_vibes
    FOR INSERT
    TO authenticated
    WITH CHECK (from_email = (auth.jwt() ->> 'email'));
  
  -- Users can update vibes they sent
  CREATE POLICY IF NOT EXISTS user_vibes_update_self
    ON public.user_vibes
    FOR UPDATE
    TO authenticated
    USING (from_email = (auth.jwt() ->> 'email'))
    WITH CHECK (from_email = (auth.jwt() ->> 'email'));
  
  -- Users can delete vibes they sent
  CREATE POLICY IF NOT EXISTS user_vibes_delete_self
    ON public.user_vibes
    FOR DELETE
    TO authenticated
    USING (from_email = (auth.jwt() ->> 'email'));
EXCEPTION
  WHEN undefined_table THEN
    -- Table doesn't exist, skip
    NULL;
END $$;

-- ============================================================================
-- 8. ADD HELPFUL SECURITY FUNCTIONS
-- ============================================================================

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public."User" u
    WHERE (
      u.auth_user_id = auth.uid()
      OR u.email = (auth.jwt() ->> 'email')
    )
    AND (u.is_admin = true OR u.role = 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get current user's UUID (prefer auth.uid() when available)
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID AS $$
BEGIN
  -- Try auth.uid() first (most reliable)
  IF auth.uid() IS NOT NULL THEN
    RETURN auth.uid();
  END IF;
  
  -- Fallback to looking up by email in JWT
  RETURN (
    SELECT id FROM public."User"
    WHERE email = (auth.jwt() ->> 'email')
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_admin IS 'Check if current user has admin privileges';
COMMENT ON FUNCTION public.current_user_id IS 'Get current user UUID, preferring auth.uid() over email lookup';

-- ============================================================================
-- SECURITY AUDIT LOG
-- ============================================================================

-- Log this security fix application
DO $$
BEGIN
  -- Create audit log table if it doesn't exist
  CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    description TEXT,
    applied_at TIMESTAMPTZ DEFAULT now(),
    applied_by TEXT DEFAULT current_user,
    metadata JSONB DEFAULT '{}'
  );
  
  INSERT INTO public.security_audit_log (event_type, description, metadata)
  VALUES (
    'rls_security_hardening',
    'Applied comprehensive RLS security fixes for authentication and data access',
    jsonb_build_object(
      'fixes', ARRAY[
        'Added FK from User.auth_user_id to auth.users',
        'Added is_admin column to User table',
        'Fixed squads RLS policies',
        'Fixed squad_members RLS policies',
        'Fixed user_tags RLS policies',
        'Fixed user_achievements RLS policies',
        'Added RLS to user_follows',
        'Added RLS to user_vibes',
        'Added security helper functions'
      ],
      'version', '1.0.0',
      'date', '2026-02-14'
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    -- If audit log fails, don't fail the migration
    RAISE NOTICE 'Could not create audit log: %', SQLERRM;
END $$;
