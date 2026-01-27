-- Ticket Verification System
-- Creates tables for ticket verification, fraud detection, and seller trust scores

-- ============================================
-- TICKET VERIFICATION REQUESTS
-- ============================================
CREATE TABLE IF NOT EXISTS ticket_verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES ticket_listings(id) ON DELETE CASCADE,
  seller_email TEXT NOT NULL,
  
  -- Proof documents (stored as JSON array)
  proofs JSONB NOT NULL DEFAULT '[]',
  
  -- Confirmation details (partially encrypted)
  confirmation_details JSONB NOT NULL DEFAULT '{}',
  
  -- Fraud check results
  fraud_check_id UUID,
  fraud_check_passed BOOLEAN,
  fraud_risk_score INTEGER,
  
  -- Status and review
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  verification_level TEXT CHECK (verification_level IN ('basic', 'verified', 'premium')),
  
  -- Review details
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  reject_reason TEXT,
  
  -- Flag details
  flagged_by TEXT,
  flagged_at TIMESTAMPTZ,
  flag_reason TEXT,
  
  -- Auto-approval
  auto_approve_eligible BOOLEAN DEFAULT false,
  auto_approve_at TIMESTAMPTZ,
  
  -- Timestamps
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TICKET FRAUD CHECKS
-- ============================================
CREATE TABLE IF NOT EXISTS ticket_fraud_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES ticket_listings(id) ON DELETE CASCADE,
  
  -- Risk assessment
  risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  passed BOOLEAN NOT NULL DEFAULT false,
  requires_manual_review BOOLEAN DEFAULT false,
  
  -- Check results
  checks JSONB NOT NULL DEFAULT '[]',
  warnings TEXT[] DEFAULT '{}',
  
  -- Timestamps
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TICKET SELLERS (Trust & History)
-- ============================================
CREATE TABLE IF NOT EXISTS ticket_sellers (
  email TEXT PRIMARY KEY,
  
  -- Identity verification
  id_verified BOOLEAN DEFAULT false,
  id_verified_at TIMESTAMPTZ,
  id_verification_method TEXT,
  
  -- Trust metrics
  trust_score INTEGER NOT NULL DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
  
  -- Sales history
  total_sales INTEGER DEFAULT 0,
  total_listings INTEGER DEFAULT 0,
  successful_sales INTEGER DEFAULT 0,
  
  -- Verification history
  total_verifications INTEGER DEFAULT 0,
  successful_verifications INTEGER DEFAULT 0,
  last_verification_at TIMESTAMPTZ,
  
  -- Ratings
  average_rating DECIMAL(3,2),
  total_ratings INTEGER DEFAULT 0,
  
  -- Disputes
  disputes_filed INTEGER DEFAULT 0,
  disputes_won INTEGER DEFAULT 0,
  disputes_lost INTEGER DEFAULT 0,
  
  -- Limits
  max_active_listings INTEGER DEFAULT 5,
  max_ticket_value INTEGER DEFAULT 500, -- in GBP
  
  -- Status
  suspended BOOLEAN DEFAULT false,
  suspended_reason TEXT,
  suspended_until TIMESTAMPTZ,
  
  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- FRAUD BLACKLIST
-- ============================================
CREATE TABLE IF NOT EXISTS fraud_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('order_reference', 'email_domain', 'ip_address', 'device_fingerprint', 'pattern')),
  pattern TEXT NOT NULL,
  reason TEXT,
  added_by TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- FRAUD LOG
-- ============================================
CREATE TABLE IF NOT EXISTS fraud_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  user_email TEXT,
  listing_id UUID,
  reason TEXT,
  reviewer TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ADD VERIFICATION COLUMNS TO TICKET_LISTINGS
-- ============================================
DO $$
BEGIN
  -- Add verification columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_listings' AND column_name = 'verification_status') THEN
    ALTER TABLE ticket_listings ADD COLUMN verification_status TEXT DEFAULT 'unverified';
    ALTER TABLE ticket_listings ADD COLUMN verification_request_id UUID REFERENCES ticket_verification_requests(id);
    ALTER TABLE ticket_listings ADD COLUMN verified_at TIMESTAMPTZ;
    ALTER TABLE ticket_listings ADD COLUMN verified_by TEXT;
    ALTER TABLE ticket_listings ADD COLUMN fraud_check_id UUID REFERENCES ticket_fraud_checks(id);
    ALTER TABLE ticket_listings ADD COLUMN fraud_check_status TEXT;
    ALTER TABLE ticket_listings ADD COLUMN fraud_risk_score INTEGER;
    ALTER TABLE ticket_listings ADD COLUMN rejection_reason TEXT;
  END IF;
END $$;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_verification_requests_listing ON ticket_verification_requests(listing_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_seller ON ticket_verification_requests(seller_email);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON ticket_verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_pending ON ticket_verification_requests(status, submitted_at) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_fraud_checks_listing ON ticket_fraud_checks(listing_id);
CREATE INDEX IF NOT EXISTS idx_fraud_checks_risk ON ticket_fraud_checks(risk_score);

CREATE INDEX IF NOT EXISTS idx_sellers_trust ON ticket_sellers(trust_score);
CREATE INDEX IF NOT EXISTS idx_sellers_verified ON ticket_sellers(id_verified) WHERE id_verified = true;

CREATE INDEX IF NOT EXISTS idx_blacklist_active ON fraud_blacklist(type, active) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_listings_verification ON ticket_listings(verification_status);
CREATE INDEX IF NOT EXISTS idx_listings_verified ON ticket_listings(verification_status, status) WHERE verification_status = 'verified';

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Verification Requests
ALTER TABLE ticket_verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view own verification requests"
  ON ticket_verification_requests FOR SELECT
  USING (auth.jwt() ->> 'email' = seller_email);

CREATE POLICY "Sellers can create verification requests"
  ON ticket_verification_requests FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = seller_email);

CREATE POLICY "Admins can view all verification requests"
  ON ticket_verification_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "User" 
      WHERE email = auth.jwt() ->> 'email' 
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can update verification requests"
  ON ticket_verification_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "User" 
      WHERE email = auth.jwt() ->> 'email' 
      AND role IN ('admin', 'moderator')
    )
  );

-- Fraud Checks
ALTER TABLE ticket_fraud_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full fraud check access"
  ON ticket_fraud_checks FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins can view fraud checks"
  ON ticket_fraud_checks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "User" 
      WHERE email = auth.jwt() ->> 'email' 
      AND role IN ('admin', 'moderator')
    )
  );

-- Ticket Sellers
ALTER TABLE ticket_sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own seller profile"
  ON ticket_sellers FOR SELECT
  USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Public can view basic seller info"
  ON ticket_sellers FOR SELECT
  USING (true); -- Allow all to see trust scores etc.

CREATE POLICY "Service role can manage sellers"
  ON ticket_sellers FOR ALL
  USING (auth.role() = 'service_role');

-- Fraud Blacklist
ALTER TABLE fraud_blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full blacklist access"
  ON fraud_blacklist FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins can manage blacklist"
  ON fraud_blacklist FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "User" 
      WHERE email = auth.jwt() ->> 'email' 
      AND role = 'admin'
    )
  );

-- Fraud Log
ALTER TABLE fraud_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full fraud log access"
  ON fraud_log FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins can view fraud log"
  ON fraud_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "User" 
      WHERE email = auth.jwt() ->> 'email' 
      AND role = 'admin'
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_verification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER verification_requests_updated_at
  BEFORE UPDATE ON ticket_verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_verification_updated_at();

CREATE TRIGGER sellers_updated_at
  BEFORE UPDATE ON ticket_sellers
  FOR EACH ROW
  EXECUTE FUNCTION update_verification_updated_at();

-- Function to check if QR code has been used elsewhere
CREATE OR REPLACE FUNCTION check_qr_duplicate(qr_hash TEXT, exclude_listing_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM ticket_verification_requests
  WHERE confirmation_details->>'qr_code_hash' = qr_hash
    AND (exclude_listing_id IS NULL OR listing_id != exclude_listing_id)
    AND status != 'rejected';
  
  RETURN duplicate_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get seller verification summary
CREATE OR REPLACE FUNCTION get_seller_verification_summary(seller_email_param TEXT)
RETURNS TABLE (
  total_listings BIGINT,
  pending_verifications BIGINT,
  approved_verifications BIGINT,
  rejected_verifications BIGINT,
  trust_score INTEGER,
  can_list_more BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM ticket_listings WHERE seller_email = seller_email_param)::BIGINT as total_listings,
    (SELECT COUNT(*) FROM ticket_verification_requests WHERE seller_email = seller_email_param AND status = 'pending')::BIGINT as pending_verifications,
    (SELECT COUNT(*) FROM ticket_verification_requests WHERE seller_email = seller_email_param AND status = 'approved')::BIGINT as approved_verifications,
    (SELECT COUNT(*) FROM ticket_verification_requests WHERE seller_email = seller_email_param AND status = 'rejected')::BIGINT as rejected_verifications,
    COALESCE((SELECT ts.trust_score FROM ticket_sellers ts WHERE ts.email = seller_email_param), 50)::INTEGER as trust_score,
    (SELECT COUNT(*) FROM ticket_listings WHERE seller_email = seller_email_param AND status IN ('active', 'pending_verification') < COALESCE((SELECT max_active_listings FROM ticket_sellers WHERE email = seller_email_param), 5))::BOOLEAN as can_list_more;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE ticket_verification_requests IS 'Stores ticket verification submissions with proof documents and review history';
COMMENT ON TABLE ticket_fraud_checks IS 'Stores automated fraud check results for ticket listings';
COMMENT ON TABLE ticket_sellers IS 'Stores seller trust scores, verification status, and limits';
COMMENT ON TABLE fraud_blacklist IS 'Stores patterns and identifiers associated with fraudulent activity';
COMMENT ON TABLE fraud_log IS 'Audit log for fraud-related events and actions';
