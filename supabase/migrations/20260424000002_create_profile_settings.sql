-- Create profile_settings table for location consent and other preferences
CREATE TABLE IF NOT EXISTS profile_settings (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  location_consent BOOLEAN DEFAULT false,
  location_consent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE profile_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view own settings" ON profile_settings;
CREATE POLICY "Users can view own settings" ON profile_settings
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own settings" ON profile_settings;
CREATE POLICY "Users can update own settings" ON profile_settings
  FOR ALL USING (auth.uid() = id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profile_settings_updated ON profile_settings;
CREATE TRIGGER trg_profile_settings_updated
  BEFORE UPDATE ON profile_settings
  FOR EACH ROW EXECUTE FUNCTION update_settings_updated_at();
