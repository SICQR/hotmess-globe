-- Premium Content System Tables
-- Migration: 20260128000001_premium_content.sql
-- Description: Tables for premium content unlocks and subscriptions
--
-- TO RUN THIS MIGRATION:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Copy this entire file and paste into a new query
-- 3. Click "Run" to execute
-- 4. Verify with: SELECT table_name FROM information_schema.tables 
--    WHERE table_schema = 'public' AND table_name IN 
--    ('subscriptions', 'premium_unlocks', 'premium_content', 'xp_transactions');
--
-- REQUIRED FOR: Premium profiles, XP purchasing, creator subscriptions
-- ENVIRONMENT: Set VITE_XP_PURCHASING_ENABLED=true to enable these features


-- Premium content unlocks table
CREATE TABLE IF NOT EXISTS premium_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  unlock_type TEXT NOT NULL CHECK (unlock_type IN ('photo', 'video', 'post', 'subscription')),
  item_id TEXT,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  price_xp INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_email, owner_email, unlock_type, item_id)
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_email TEXT NOT NULL,
  creator_email TEXT NOT NULL,
  tier TEXT DEFAULT 'basic' CHECK (tier IN ('basic', 'premium', 'vip')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  price_xp_monthly INTEGER DEFAULT 0,
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subscriber_email, creator_email)
);

-- Premium content metadata (for tracking what content is premium)
CREATE TABLE IF NOT EXISTS premium_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('photo', 'video', 'post')),
  content_url TEXT,
  preview_url TEXT,
  price_xp INTEGER DEFAULT 50,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  unlock_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- XP Transactions log (for auditing)
CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  amount INTEGER NOT NULL, -- positive for credit, negative for debit
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'purchase', 'sale', 'subscription', 'reward', 'refund', 'adjustment'
  )),
  reference_type TEXT, -- 'premium_unlock', 'subscription', 'product', etc.
  reference_id TEXT,
  counterparty_email TEXT,
  platform_fee INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_premium_unlocks_user ON premium_unlocks(user_email);
CREATE INDEX IF NOT EXISTS idx_premium_unlocks_owner ON premium_unlocks(owner_email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON subscriptions(subscriber_email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_creator ON subscriptions(creator_email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_premium_content_owner ON premium_content(owner_email);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON xp_transactions(user_email);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created ON xp_transactions(created_at);

-- Add profile type columns to User table if they don't exist
DO $$
BEGIN
  -- subscription_price_xp for premium profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'subscription_price_xp'
  ) THEN
    ALTER TABLE "User" ADD COLUMN subscription_price_xp INTEGER DEFAULT 500;
  END IF;

  -- creator_bio for creator profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'creator_bio'
  ) THEN
    ALTER TABLE "User" ADD COLUMN creator_bio TEXT;
  END IF;

  -- organizer_bio for organizer profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'organizer_bio'
  ) THEN
    ALTER TABLE "User" ADD COLUMN organizer_bio TEXT;
  END IF;

  -- venue_partnerships for organizers (JSONB array)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'venue_partnerships'
  ) THEN
    ALTER TABLE "User" ADD COLUMN venue_partnerships JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- is_verified flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE "User" ADD COLUMN is_verified BOOLEAN DEFAULT false;
  END IF;
END
$$;

-- Row Level Security (RLS) policies

-- Premium unlocks: users can see their own unlocks
ALTER TABLE premium_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own unlocks"
  ON premium_unlocks FOR SELECT
  USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY IF NOT EXISTS "Content owners can view their sales"
  ON premium_unlocks FOR SELECT
  USING (auth.jwt() ->> 'email' = owner_email);

-- Subscriptions: users can see their own subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.jwt() ->> 'email' = subscriber_email OR auth.jwt() ->> 'email' = creator_email);

-- Premium content: public read, owner write
ALTER TABLE premium_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Anyone can view active premium content metadata"
  ON premium_content FOR SELECT
  USING (is_active = true);

CREATE POLICY IF NOT EXISTS "Owners can manage their content"
  ON premium_content FOR ALL
  USING (auth.jwt() ->> 'email' = owner_email);

-- XP transactions: users can view their own
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own transactions"
  ON xp_transactions FOR SELECT
  USING (auth.jwt() ->> 'email' = user_email);

-- Function to automatically expire subscriptions
CREATE OR REPLACE FUNCTION expire_subscriptions()
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to count active subscribers for a creator
CREATE OR REPLACE FUNCTION get_subscriber_count(creator TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM subscriptions
    WHERE creator_email = creator
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has unlocked content
CREATE OR REPLACE FUNCTION has_unlocked_content(
  viewer TEXT,
  content_owner TEXT,
  content_type TEXT,
  content_id TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM premium_unlocks
    WHERE user_email = viewer
      AND owner_email = content_owner
      AND unlock_type = content_type
      AND (item_id = content_id OR item_id IS NULL)
      AND (expires_at IS NULL OR expires_at > NOW())
  ) OR EXISTS (
    SELECT 1 FROM subscriptions
    WHERE subscriber_email = viewer
      AND creator_email = content_owner
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE premium_unlocks IS 'Records of individual premium content unlocks';
COMMENT ON TABLE subscriptions IS 'Creator subscription relationships';
COMMENT ON TABLE premium_content IS 'Metadata for premium content items';
COMMENT ON TABLE xp_transactions IS 'Audit log for all XP transactions';
