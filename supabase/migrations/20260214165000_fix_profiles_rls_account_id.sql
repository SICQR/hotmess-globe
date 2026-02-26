-- Fix profiles RLS to use account_id instead of id
-- The profiles table links to auth.users via account_id, not id

-- Drop old policies that use id
DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Create new policies using account_id
CREATE POLICY "profiles_read_own"
  ON public.profiles FOR SELECT
  USING (account_id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (account_id = auth.uid())
  WITH CHECK (account_id = auth.uid());

-- Allow insert for new users
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (account_id = auth.uid());
