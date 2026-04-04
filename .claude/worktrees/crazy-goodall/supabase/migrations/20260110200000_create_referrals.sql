-- Referral Program Tables
-- Track referrals for viral growth

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_email TEXT NOT NULL,
  referred_email TEXT NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reward_claimed BOOLEAN DEFAULT false,
  reward_amount INTEGER DEFAULT 500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(referred_email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_email);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- RLS Policies
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their referrals (as referrer)
CREATE POLICY "Users can view own referrals"
  ON referrals
  FOR SELECT
  TO authenticated
  USING (referrer_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid()));

-- System can insert referrals
CREATE POLICY "System can create referrals"
  ON referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add referral_code to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- Function to generate referral code on user creation
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(
      SUBSTRING(REPLACE(SPLIT_PART(NEW.email, '@', 1), '.', ''), 1, 6) ||
      SUBSTRING(MD5(RANDOM()::TEXT), 1, 4)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate referral codes
DROP TRIGGER IF EXISTS user_referral_code_trigger ON "User";
CREATE TRIGGER user_referral_code_trigger
  BEFORE INSERT ON "User"
  FOR EACH ROW
  EXECUTE FUNCTION generate_referral_code();

-- Function to process referral completion
CREATE OR REPLACE FUNCTION process_referral_completion()
RETURNS TRIGGER AS $$
DECLARE
  referrer_record RECORD;
BEGIN
  -- Find pending referral for this user
  SELECT * INTO referrer_record
  FROM referrals
  WHERE referred_email = NEW.email
    AND status = 'pending';
  
  IF FOUND THEN
    -- Mark referral as completed
    UPDATE referrals
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = referrer_record.id;
    
    -- Update referrer's count
    UPDATE "User"
    SET referral_count = referral_count + 1
    WHERE email = referrer_record.referrer_email;
    
    -- Set referred_by for new user
    NEW.referred_by := referrer_record.referrer_email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to process referrals on user creation
DROP TRIGGER IF EXISTS user_referral_completion_trigger ON "User";
CREATE TRIGGER user_referral_completion_trigger
  BEFORE INSERT ON "User"
  FOR EACH ROW
  EXECUTE FUNCTION process_referral_completion();

COMMENT ON TABLE referrals IS 'Tracks user referrals for viral growth program';
