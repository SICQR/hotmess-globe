-- GDPR Compliance Tables
-- Tables for tracking data export requests and account deletions

-- Data Export Requests Table
CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'json',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  download_url TEXT,
  expires_at TIMESTAMPTZ
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_data_export_user_email ON data_export_requests(user_email);
CREATE INDEX IF NOT EXISTS idx_data_export_status ON data_export_requests(status);

-- RLS Policies for data_export_requests
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own export requests
CREATE POLICY "Users can view own export requests"
  ON data_export_requests
  FOR SELECT
  TO authenticated
  USING (user_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid()));

-- Users can insert their own export requests
CREATE POLICY "Users can create own export requests"
  ON data_export_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid()));

-- Account Deletion Requests Table
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  retention_period_days INTEGER DEFAULT 30
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_account_deletion_user_email ON account_deletion_requests(user_email);
CREATE INDEX IF NOT EXISTS idx_account_deletion_status ON account_deletion_requests(status);

-- RLS Policies for account_deletion_requests
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own deletion requests
CREATE POLICY "Users can view own deletion requests"
  ON account_deletion_requests
  FOR SELECT
  TO authenticated
  USING (user_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid()));

-- Users can insert their own deletion requests
CREATE POLICY "Users can create own deletion requests"
  ON account_deletion_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid()));

-- GDPR Consent Tracking Table
CREATE TABLE IF NOT EXISTS gdpr_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  consent_type TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_user_email ON gdpr_consents(user_email);
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_type ON gdpr_consents(consent_type);

-- RLS Policies for gdpr_consents
ALTER TABLE gdpr_consents ENABLE ROW LEVEL SECURITY;

-- Users can view their own consents
CREATE POLICY "Users can view own consents"
  ON gdpr_consents
  FOR SELECT
  TO authenticated
  USING (user_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid()));

-- Users can manage their own consents
CREATE POLICY "Users can manage own consents"
  ON gdpr_consents
  FOR ALL
  TO authenticated
  USING (user_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid()));

-- Comments for documentation
COMMENT ON TABLE data_export_requests IS 'Tracks GDPR data export requests from users';
COMMENT ON TABLE account_deletion_requests IS 'Tracks GDPR right to be forgotten requests';
COMMENT ON TABLE gdpr_consents IS 'Tracks user consent for various data processing activities';
