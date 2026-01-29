-- Creator Economy System
-- Subscriptions, PPV, custom content, and payouts

-- Creator profiles
CREATE TABLE IF NOT EXISTS creator_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE UNIQUE,
  creator_name text,
  creator_bio text,
  banner_url text,
  subscription_price_cents int DEFAULT 999, -- £9.99 default
  tips_enabled boolean DEFAULT true,
  custom_content_enabled boolean DEFAULT true,
  min_custom_price_cents int DEFAULT 500,
  payout_method text, -- 'stripe', 'paypal', 'wise'
  payout_details jsonb DEFAULT '{}',
  is_verified_creator boolean DEFAULT false,
  verified_at timestamptz,
  total_earnings_cents bigint DEFAULT 0,
  subscriber_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Creator content
CREATE TABLE IF NOT EXISTS creator_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('post', 'photo', 'video', 'audio', 'bundle')),
  title text,
  description text,
  media_urls jsonb DEFAULT '[]',
  thumbnail_url text,
  is_free boolean DEFAULT false,
  is_ppv boolean DEFAULT false, -- Pay per view
  ppv_price_cents int,
  is_subscriber_only boolean DEFAULT true,
  view_count int DEFAULT 0,
  like_count int DEFAULT 0,
  comment_count int DEFAULT 0,
  is_published boolean DEFAULT true,
  published_at timestamptz DEFAULT now(),
  content_rating content_rating DEFAULT 'sfw',
  created_at timestamptz DEFAULT now()
);

-- Subscriptions to creators
CREATE TABLE IF NOT EXISTS creator_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  price_cents int NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  stripe_subscription_id text,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(subscriber_id, creator_id)
);

-- PPV purchases
CREATE TABLE IF NOT EXISTS content_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES creator_content(id) ON DELETE CASCADE,
  price_cents int NOT NULL,
  payment_status text DEFAULT 'completed',
  purchased_at timestamptz DEFAULT now(),
  UNIQUE(buyer_id, content_id)
);

-- Tips
CREATE TABLE IF NOT EXISTS creator_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipper_id uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  amount_cents int NOT NULL,
  message text,
  is_anonymous boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Custom content requests
CREATE TABLE IF NOT EXISTS custom_content_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  request_description text NOT NULL,
  price_cents int NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'in_progress', 'delivered', 'refunded')),
  deadline timestamptz,
  delivered_content_id uuid REFERENCES creator_content(id),
  payment_intent_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payout records
CREATE TABLE IF NOT EXISTS creator_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  amount_cents int NOT NULL,
  platform_fee_cents int NOT NULL, -- 20% platform fee
  net_amount_cents int NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payout_method text NOT NULL,
  transaction_id text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Content likes
CREATE TABLE IF NOT EXISTS content_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES creator_content(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, content_id)
);

-- Content comments
CREATE TABLE IF NOT EXISTS content_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES creator_content(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creator_profiles_user ON creator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_content_creator ON creator_content(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_content_published ON creator_content(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_subs_subscriber ON creator_subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_creator_subs_creator ON creator_subscriptions(creator_id);
CREATE INDEX IF NOT EXISTS idx_content_purchases_buyer ON content_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_creator_tips_creator ON creator_tips(creator_id);
CREATE INDEX IF NOT EXISTS idx_custom_requests_creator ON custom_content_requests(creator_id);
CREATE INDEX IF NOT EXISTS idx_payouts_creator ON creator_payouts(creator_id);

-- RLS
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_content_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_comments ENABLE ROW LEVEL SECURITY;

-- Public can view verified creators
CREATE POLICY "Public view verified creators"
  ON creator_profiles FOR SELECT
  USING (is_verified_creator = true);

-- Creators manage own profile
CREATE POLICY "Creators manage own profile"
  ON creator_profiles FOR ALL
  USING (auth.uid() = user_id);

-- Content visibility based on subscription
CREATE POLICY "View content if subscribed or free"
  ON creator_content FOR SELECT
  USING (
    is_free = true
    OR EXISTS (
      SELECT 1 FROM creator_subscriptions
      WHERE subscriber_id = auth.uid()
      AND creator_id = creator_content.creator_id
      AND status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM content_purchases
      WHERE buyer_id = auth.uid()
      AND content_id = creator_content.id
    )
    OR EXISTS (
      SELECT 1 FROM creator_profiles
      WHERE id = creator_content.creator_id
      AND user_id = auth.uid()
    )
  );

-- Creators manage own content
CREATE POLICY "Creators manage own content"
  ON creator_content FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM creator_profiles
      WHERE id = creator_content.creator_id
      AND user_id = auth.uid()
    )
  );

-- Users manage own subscriptions
CREATE POLICY "Users manage own subscriptions"
  ON creator_subscriptions FOR ALL
  USING (auth.uid() = subscriber_id);

-- Creators see their subscribers
CREATE POLICY "Creators view their subscribers"
  ON creator_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM creator_profiles
      WHERE id = creator_subscriptions.creator_id
      AND user_id = auth.uid()
    )
  );

-- Function to check if user has access to content
CREATE OR REPLACE FUNCTION can_view_creator_content(
  p_user_id uuid,
  p_content_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_content creator_content%ROWTYPE;
  v_is_creator boolean;
  v_is_subscribed boolean;
  v_has_purchased boolean;
BEGIN
  SELECT * INTO v_content FROM creator_content WHERE id = p_content_id;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Free content
  IF v_content.is_free THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is the creator
  SELECT EXISTS (
    SELECT 1 FROM creator_profiles 
    WHERE id = v_content.creator_id AND user_id = p_user_id
  ) INTO v_is_creator;
  
  IF v_is_creator THEN
    RETURN TRUE;
  END IF;
  
  -- Check subscription
  SELECT EXISTS (
    SELECT 1 FROM creator_subscriptions
    WHERE subscriber_id = p_user_id
    AND creator_id = v_content.creator_id
    AND status = 'active'
  ) INTO v_is_subscribed;
  
  IF v_is_subscribed AND NOT v_content.is_ppv THEN
    RETURN TRUE;
  END IF;
  
  -- Check PPV purchase
  IF v_content.is_ppv THEN
    SELECT EXISTS (
      SELECT 1 FROM content_purchases
      WHERE buyer_id = p_user_id AND content_id = p_content_id
    ) INTO v_has_purchased;
    
    RETURN v_has_purchased;
  END IF;
  
  RETURN v_is_subscribed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate creator earnings
CREATE OR REPLACE FUNCTION calculate_creator_earnings(p_creator_id uuid)
RETURNS TABLE (
  total_cents bigint,
  subscriptions_cents bigint,
  ppv_cents bigint,
  tips_cents bigint,
  custom_cents bigint,
  platform_fee_cents bigint,
  net_cents bigint
) AS $$
DECLARE
  v_subs bigint;
  v_ppv bigint;
  v_tips bigint;
  v_custom bigint;
  v_total bigint;
  v_fee bigint;
BEGIN
  -- Subscription revenue
  SELECT COALESCE(SUM(price_cents), 0) INTO v_subs
  FROM creator_subscriptions
  WHERE creator_id = p_creator_id AND status = 'active';
  
  -- PPV revenue
  SELECT COALESCE(SUM(cp.price_cents), 0) INTO v_ppv
  FROM content_purchases cp
  JOIN creator_content cc ON cc.id = cp.content_id
  WHERE cc.creator_id = p_creator_id;
  
  -- Tips
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_tips
  FROM creator_tips
  WHERE creator_id = p_creator_id;
  
  -- Custom content
  SELECT COALESCE(SUM(price_cents), 0) INTO v_custom
  FROM custom_content_requests
  WHERE creator_id = p_creator_id AND status = 'delivered';
  
  v_total := v_subs + v_ppv + v_tips + v_custom;
  v_fee := v_total * 0.20; -- 20% platform fee
  
  RETURN QUERY SELECT 
    v_total,
    v_subs,
    v_ppv,
    v_tips,
    v_custom,
    v_fee,
    v_total - v_fee;
END;
$$ LANGUAGE plpgsql;
