-- Fix profiles RLS to use account_id if it exists, otherwise skip
-- The profiles table links to auth.users via account_id

-- Drop old policies first
DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

-- Create policies conditionally based on which column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'account_id'
  ) THEN
    EXECUTE 'CREATE POLICY "profiles_read_own" ON public.profiles FOR SELECT USING (account_id = auth.uid())';
    EXECUTE 'CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (account_id = auth.uid()) WITH CHECK (account_id = auth.uid())';
    EXECUTE 'CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (account_id = auth.uid())';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'id'
  ) THEN
    EXECUTE 'CREATE POLICY "profiles_read_own" ON public.profiles FOR SELECT USING (id = auth.uid())';
    EXECUTE 'CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid())';
    EXECUTE 'CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid())';
  END IF;
END $$;
