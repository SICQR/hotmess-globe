-- ============================================================================
-- CREATOR ECONOMY
-- Phase 6: Major Features
-- ============================================================================

-- Add creator fields to User table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = '"User"' AND column_name = 'is_creator'
  ) THEN
    ALTER TABLE "User" ADD COLUMN is_creator BOOLEAN DEFAULT false;
    ALTER TABLE "User" ADD COLUMN creator_subscription_price DECIMAL(10,2);
    ALTER TABLE "User" ADD COLUMN creator_bio TEXT;
    ALTER TABLE "User" ADD COLUMN creator_verified BOOLEAN DEFAULT false;
    ALTER TABLE "User" ADD COLUMN creator_tier TEXT CHECK (creator_tier IN ('starter', 'established', 'elite'));
  END IF;
END $$;

-- Creator subscriptions
CREATE TABLE IF NOT EXISTS creator_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  price_paid DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'paused')),
  stripe_subscription_id TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  UNIQUE(creator_id, subscriber_id)
);

-- Pay-per-view content
CREATE TABLE IF NOT EXISTS ppv_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('photo', 'video', 'photo_set', 'message')),
  content_url TEXT, -- Encrypted/protected
  preview_url TEXT,
  thumbnail_url TEXT,
  unlock_count INT DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PPV purchases
CREATE TABLE IF NOT EXISTS ppv_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES ppv_content(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  price_paid DECIMAL(10,2) NOT NULL,
  payment_method TEXT, -- 'stripe', 'xp', etc.
  payment_intent_id TEXT,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(content_id, buyer_id)
);

-- Creator tips
CREATE TABLE IF NOT EXISTS creator_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  tipper_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  payment_method TEXT,
  payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Custom content requests
CREATE TABLE IF NOT EXISTS custom_content_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  price_offered DECIMAL(10,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
  creator_response TEXT,
  content_id UUID REFERENCES ppv_content(id), -- When completed
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Creator earnings (audit log)
CREATE TABLE IF NOT EXISTS creator_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('subscription', 'ppv', 'tip', 'custom')),
  source_id UUID, -- ID of subscription/purchase/tip
  gross_amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'paid', 'hold')),
  payout_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_is_creator ON "User"(is_creator) WHERE is_creator = true;
CREATE INDEX IF NOT EXISTS idx_creator_subs_creator ON creator_subscriptions(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_subs_subscriber ON creator_subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_creator_subs_status ON creator_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_ppv_content_creator ON ppv_content(creator_id);
CREATE INDEX IF NOT EXISTS idx_ppv_purchases_buyer ON ppv_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_ppv_purchases_creator ON ppv_purchases(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_tips_creator ON creator_tips(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_tips_tipper ON creator_tips(tipper_id);
CREATE INDEX IF NOT EXISTS idx_custom_requests_creator ON custom_content_requests(creator_id);
CREATE INDEX IF NOT EXISTS idx_custom_requests_requester ON custom_content_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_creator_earnings_creator ON creator_earnings(creator_id);

-- RLS
ALTER TABLE creator_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppv_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppv_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_content_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_earnings ENABLE ROW LEVEL SECURITY;

-- Creators can view their own subscriptions
CREATE POLICY "Creators can view own subscriptions"
  ON creator_subscriptions FOR SELECT
  USING (auth.uid() = creator_id);

-- Subscribers can view their own subscriptions
CREATE POLICY "Subscribers can view own subscriptions"
  ON creator_subscriptions FOR SELECT
  USING (auth.uid() = subscriber_id);

-- Creators can manage their own content
CREATE POLICY "Creators can manage own content"
  ON ppv_content FOR ALL
  USING (auth.uid() = creator_id);

-- Buyers can view purchased content
CREATE POLICY "Buyers can view purchased content"
  ON ppv_purchases FOR SELECT
  USING (auth.uid() = buyer_id);

-- Creators can view tips received
CREATE POLICY "Creators can view received tips"
  ON creator_tips FOR SELECT
  USING (auth.uid() = creator_id);

-- Tippers can view tips given (unless anonymous)
CREATE POLICY "Tippers can view given tips"
  ON creator_tips FOR SELECT
  USING (auth.uid() = tipper_id);

-- Custom request policies
CREATE POLICY "Creators can view requests"
  ON custom_content_requests FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Requesters can view own requests"
  ON custom_content_requests FOR SELECT
  USING (auth.uid() = requester_id);

CREATE POLICY "Creators can update requests"
  ON custom_content_requests FOR UPDATE
  USING (auth.uid() = creator_id);

-- Creators can view own earnings
CREATE POLICY "Creators can view own earnings"
  ON creator_earnings FOR SELECT
  USING (auth.uid() = creator_id);

-- Service role full access
CREATE POLICY "Service role full access creator_subscriptions"
  ON creator_subscriptions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access ppv_content"
  ON ppv_content FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access ppv_purchases"
  ON ppv_purchases FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access creator_tips"
  ON creator_tips FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access custom_content_requests"
  ON custom_content_requests FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access creator_earnings"
  ON creator_earnings FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to calculate platform fee (20%)
CREATE OR REPLACE FUNCTION calculate_creator_earning(
  p_gross_amount DECIMAL
)
RETURNS TABLE (
  gross DECIMAL,
  platform_fee DECIMAL,
  net DECIMAL
) AS $$
BEGIN
  RETURN QUERY SELECT 
    p_gross_amount,
    ROUND(p_gross_amount * 0.20, 2) AS platform_fee,
    ROUND(p_gross_amount * 0.80, 2) AS net;
END;
$$ LANGUAGE plpgsql;
