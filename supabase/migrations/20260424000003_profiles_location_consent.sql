-- Add location_consent columns directly to the profiles table for maximum reliability
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS location_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS location_consent_at TIMESTAMPTZ;

-- Ensure RLS allows users to update these columns on their own profile
DROP POLICY IF EXISTS "Users can update own profile location" ON profiles;
CREATE POLICY "Users can update own profile location" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Force reload schema cache
NOTIFY pgrst, 'reload schema';
