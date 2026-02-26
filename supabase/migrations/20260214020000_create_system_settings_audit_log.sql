-- system_settings table for safety switch and other config
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT UNIQUE NOT NULL,
  value JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings" ON system_settings FOR SELECT USING (true);
CREATE POLICY "Service role can manage" ON system_settings FOR ALL USING (auth.role() = 'service_role');

GRANT SELECT ON system_settings TO authenticated;
GRANT ALL ON system_settings TO service_role;

-- audit_log table for tracking admin actions
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  action TEXT,
  target TEXT,
  reason TEXT,
  admin_id UUID,
  admin_email TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_audit_log_type ON audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log" ON audit_log FOR SELECT 
  USING (EXISTS (SELECT 1 FROM "User" WHERE auth_user_id = auth.uid() AND is_admin = true));
CREATE POLICY "Service role can manage audit log" ON audit_log FOR ALL USING (auth.role() = 'service_role');

GRANT SELECT ON audit_log TO authenticated;
GRANT ALL ON audit_log TO service_role;

-- Add is_admin column to User if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE "User" ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
END $$;
