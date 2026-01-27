-- Premium Content Tables Migration
-- Creates tables for premium content unlocks and subscriptions

-- =============================================================================
-- Premium Unlocks Table
-- Tracks individual content purchases (photos, videos, posts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS premium_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  unlock_type TEXT NOT NULL CHECK (unlock_type IN ('photo', 'video', 'post', 'subscription')),
  item_id TEXT,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  price_xp INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_email, owner_email, unlock_type, item_id)
);

-- Indexes for premium_unlocks
CREATE INDEX IF NOT EXISTS idx_premium_unlocks_user_email ON premium_unlocks(user_email);
CREATE INDEX IF NOT EXISTS idx_premium_unlocks_owner_email ON premium_unlocks(owner_email);
CREATE INDEX IF NOT EXISTS idx_premium_unlocks_lookup ON premium_unlocks(user_email, owner_email, unlock_type, item_id);

-- =============================================================================
-- Premium Subscriptions Table (content creator subscriptions)
-- Different from Stripe membership subscriptions
-- =============================================================================
CREATE TABLE IF NOT EXISTS creator_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_email TEXT NOT NULL,
  creator_email TEXT NOT NULL,
  tier TEXT DEFAULT 'basic' CHECK (tier IN ('basic', 'premium', 'vip')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  renewed_at TIMESTAMPTZ,
  price_xp_monthly INTEGER NOT NULL DEFAULT 500,
  auto_renew BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subscriber_email, creator_email)
);

-- Indexes for creator_subscriptions
CREATE INDEX IF NOT EXISTS idx_creator_subscriptions_subscriber ON creator_subscriptions(subscriber_email);
CREATE INDEX IF NOT EXISTS idx_creator_subscriptions_creator ON creator_subscriptions(creator_email);
CREATE INDEX IF NOT EXISTS idx_creator_subscriptions_status ON creator_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_creator_subscriptions_active ON creator_subscriptions(creator_email, status) WHERE status = 'active';

-- =============================================================================
-- XP Transactions Table
-- Tracks all XP transfers for auditing
-- =============================================================================
CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_email TEXT,
  to_email TEXT,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'unlock', 'subscription', 'reward', 'refund', 'adjustment')),
  reference_type TEXT,
  reference_id TEXT,
  platform_fee INTEGER DEFAULT 0,
  net_amount INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for xp_transactions
CREATE INDEX IF NOT EXISTS idx_xp_transactions_from ON xp_transactions(from_email);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_to ON xp_transactions(to_email);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created ON xp_transactions(created_at);

-- =============================================================================
-- Add premium-related fields to User table
-- =============================================================================
DO $$
BEGIN
  -- Add subscription_price_xp for premium creators
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'subscription_price_xp'
  ) THEN
    ALTER TABLE "User" ADD COLUMN subscription_price_xp INTEGER DEFAULT 500;
  END IF;

  -- Add creator_bio for creator profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'creator_bio'
  ) THEN
    ALTER TABLE "User" ADD COLUMN creator_bio TEXT;
  END IF;

  -- Add organizer_bio for organizer profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'organizer_bio'
  ) THEN
    ALTER TABLE "User" ADD COLUMN organizer_bio TEXT;
  END IF;

  -- Add premium_bio for premium profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'premium_bio'
  ) THEN
    ALTER TABLE "User" ADD COLUMN premium_bio TEXT;
  END IF;

  -- Add venue_partnerships JSONB for organizers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'venue_partnerships'
  ) THEN
    ALTER TABLE "User" ADD COLUMN venue_partnerships JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add premium_perks JSONB for premium profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'premium_perks'
  ) THEN
    ALTER TABLE "User" ADD COLUMN premium_perks JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add organizer_rating for organizers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'organizer_rating'
  ) THEN
    ALTER TABLE "User" ADD COLUMN organizer_rating DECIMAL(3,2);
  END IF;

  -- Add verified_organizer flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'verified_organizer'
  ) THEN
    ALTER TABLE "User" ADD COLUMN verified_organizer BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add booking_email for organizers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'booking_email'
  ) THEN
    ALTER TABLE "User" ADD COLUMN booking_email TEXT;
  END IF;

  -- Add genres array for creators
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'genres'
  ) THEN
    ALTER TABLE "User" ADD COLUMN genres TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- =============================================================================
-- Row Level Security Policies
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE premium_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

-- Premium Unlocks: Users can view their own unlocks
CREATE POLICY "Users can view own unlocks"
  ON premium_unlocks FOR SELECT
  USING (
    user_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid())
    OR owner_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid())
  );

-- Premium Unlocks: Users can create their own unlocks (via API)
CREATE POLICY "Users can create own unlocks"
  ON premium_unlocks FOR INSERT
  WITH CHECK (
    user_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid())
  );

-- Subscriptions: Users can view their own subscriptions (as subscriber or creator)
CREATE POLICY "Users can view own subscriptions"
  ON creator_subscriptions FOR SELECT
  USING (
    subscriber_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid())
    OR creator_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid())
  );

-- Subscriptions: Users can manage their own subscriptions
CREATE POLICY "Users can manage own subscriptions"
  ON creator_subscriptions FOR UPDATE
  USING (
    subscriber_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid())
  );

-- XP Transactions: Users can view their own transactions
CREATE POLICY "Users can view own xp transactions"
  ON xp_transactions FOR SELECT
  USING (
    from_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid())
    OR to_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid())
  );

-- =============================================================================
-- Trigger for subscription updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_subscription_updated_at ON creator_subscriptions;
CREATE TRIGGER trigger_subscription_updated_at
  BEFORE UPDATE ON creator_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- =============================================================================
-- Comments
-- =============================================================================
COMMENT ON TABLE premium_unlocks IS 'Tracks individual premium content purchases';
COMMENT ON TABLE creator_subscriptions IS 'Tracks monthly subscriptions to premium creators';
COMMENT ON TABLE xp_transactions IS 'Audit log for all XP transfers';
