-- Adult Content Classification System
-- Ensures legal compliance (2257) and proper content gating

-- Content ratings enum
DO $$ BEGIN
  CREATE TYPE content_rating AS ENUM ('sfw', 'suggestive', 'nsfw', 'xxx');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add content rating to products
ALTER TABLE "Product" 
ADD COLUMN IF NOT EXISTS content_rating content_rating DEFAULT 'sfw',
ADD COLUMN IF NOT EXISTS age_verified_only boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_2257 boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS compliance_docs jsonb DEFAULT '{}';

-- Age verification records
CREATE TABLE IF NOT EXISTS age_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES "User"(id) ON DELETE CASCADE,
  verified_at timestamptz DEFAULT now(),
  method text NOT NULL, -- 'id_check', 'payment', 'manual'
  provider text, -- Third party verification provider
  verification_data jsonb DEFAULT '{}', -- Encrypted/hashed reference
  expires_at timestamptz, -- Some verifications expire
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  created_at timestamptz DEFAULT now()
);

-- 2257 compliance records (for adult content creators)
CREATE TABLE IF NOT EXISTS compliance_2257 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  legal_name text NOT NULL,
  date_of_birth date NOT NULL,
  id_document_type text NOT NULL, -- 'passport', 'drivers_license', 'national_id'
  id_document_number_hash text NOT NULL, -- Hashed for security
  id_verified_at timestamptz,
  custodian_name text DEFAULT 'HOTMESS Platform Ltd',
  custodian_address text,
  records_location text, -- Where physical/digital records stored
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(seller_id)
);

-- Content flags for moderation
CREATE TABLE IF NOT EXISTS content_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL, -- 'product', 'photo', 'message'
  content_id uuid NOT NULL,
  flagged_by uuid REFERENCES "User"(id),
  reason text NOT NULL,
  details text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by uuid REFERENCES "User"(id),
  reviewed_at timestamptz,
  action_taken text,
  created_at timestamptz DEFAULT now()
);

-- Adult content access log (for compliance)
CREATE TABLE IF NOT EXISTS adult_content_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES "User"(id),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  accessed_at timestamptz DEFAULT now(),
  age_verification_id uuid REFERENCES age_verifications(id),
  ip_hash text -- Hashed IP for compliance, not tracking
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_age_verifications_user ON age_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_age_verifications_status ON age_verifications(status);
CREATE INDEX IF NOT EXISTS idx_compliance_2257_seller ON compliance_2257(seller_id);
CREATE INDEX IF NOT EXISTS idx_content_flags_status ON content_flags(status);
CREATE INDEX IF NOT EXISTS idx_adult_access_log_user ON adult_content_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_product_rating ON "Product"(content_rating);

-- RLS Policies
ALTER TABLE age_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_2257 ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE adult_content_access_log ENABLE ROW LEVEL SECURITY;

-- Users can see their own verification
CREATE POLICY "Users view own age verification"
  ON age_verifications FOR SELECT
  USING (auth.uid() = user_id);

-- Only admins can insert/update verifications
CREATE POLICY "Service role manages verifications"
  ON age_verifications FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Sellers can view their own 2257 records
CREATE POLICY "Sellers view own 2257"
  ON compliance_2257 FOR SELECT
  USING (auth.uid() = seller_id);

-- Anyone can create a flag
CREATE POLICY "Users can flag content"
  ON content_flags FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users see their own flags
CREATE POLICY "Users view own flags"
  ON content_flags FOR SELECT
  USING (auth.uid() = flagged_by);

-- Access log - users see own, service sees all
CREATE POLICY "Users view own access log"
  ON adult_content_access_log FOR SELECT
  USING (auth.uid() = user_id);

-- Function to check if user is age verified
CREATE OR REPLACE FUNCTION is_age_verified(check_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM age_verifications
    WHERE user_id = check_user_id
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if seller has 2257 compliance
CREATE OR REPLACE FUNCTION has_2257_compliance(check_seller_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM compliance_2257
    WHERE seller_id = check_seller_id
    AND id_verified_at IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
