-- ============================================================================
-- BUSINESS PRESENCE SYSTEM
-- ============================================================================
-- The Globe is Cultural Real Estate, not a map.
-- Businesses don't "list" — they OCCUPY PRESENCE.
-- 
-- 4 Presence States:
-- 1. AMBIENT (organic, free) — earned through real activity
-- 2. AMPLIFIED (paid) — boost what's already happening
-- 3. SIGNAL (paid, time-boxed) — "Doors Open", "Peak Hour"
-- 4. LANDMARK (earned, not bought) — iconic status
-- ============================================================================

-- Business roles (stackable)
CREATE TYPE business_role AS ENUM (
  'venue',
  'event_promoter',
  'brand',
  'seller_physical',
  'seller_digital',
  'creator',
  'ticket_issuer',
  'ticket_reseller'
);

-- Presence levels
CREATE TYPE presence_level AS ENUM (
  'ambient',
  'amplified',
  'signal',
  'landmark'
);

-- Signal moment types
CREATE TYPE signal_moment_type AS ENUM (
  'doors_open',
  'peak_hour',
  'final_call',
  'tonight_only',
  'drop_live',
  'custom'
);

-- Verification status
CREATE TYPE business_verification_status AS ENUM (
  'unverified',
  'pending',
  'verified',
  'trusted'  -- Earned over time
);

-- ============================================================================
-- BUSINESSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  cover_url TEXT,
  
  -- Roles (array, stackable)
  roles business_role[] NOT NULL DEFAULT '{}',
  
  -- Location
  location_geo GEOGRAPHY(POINT, 4326),
  city_id UUID REFERENCES cities(id),
  address TEXT,
  
  -- Verification & Trust
  verification_status business_verification_status DEFAULT 'unverified',
  verified_at TIMESTAMPTZ,
  
  -- Reputation (computed, updated by triggers)
  reputation_score INTEGER DEFAULT 0 CHECK (reputation_score >= 0 AND reputation_score <= 1000),
  total_checkins INTEGER DEFAULT 0,
  total_events INTEGER DEFAULT 0,
  safety_violations INTEGER DEFAULT 0,
  
  -- Ownership
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  team_members UUID[] DEFAULT '{}',
  
  -- Billing
  stripe_customer_id TEXT,
  subscription_tier TEXT DEFAULT 'free', -- free | pro | premium
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- BUSINESS PRESENCE (Real-time state)
-- ============================================================================
CREATE TABLE IF NOT EXISTS business_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  city_id UUID REFERENCES cities(id),
  
  -- Current presence state
  presence_level presence_level DEFAULT 'ambient',
  
  -- Heat (0-100, computed from activity)
  heat_score INTEGER DEFAULT 0 CHECK (heat_score >= 0 AND heat_score <= 100),
  
  -- Activity tracking (for heat calculation)
  checkins_last_hour INTEGER DEFAULT 0,
  active_users_nearby INTEGER DEFAULT 0,
  active_chats INTEGER DEFAULT 0,
  
  -- Amplification (paid boost)
  is_amplified BOOLEAN DEFAULT FALSE,
  amplification_ends_at TIMESTAMPTZ,
  amplification_multiplier DECIMAL(3,2) DEFAULT 1.0,
  
  -- Landmark status (earned)
  is_landmark BOOLEAN DEFAULT FALSE,
  landmark_earned_at TIMESTAMPTZ,
  landmark_icon_url TEXT,
  landmark_animation TEXT, -- CSS animation name
  
  -- Last activity
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(business_id, city_id)
);

-- ============================================================================
-- BUSINESS SIGNALS (Time-boxed moments)
-- ============================================================================
CREATE TABLE IF NOT EXISTS business_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Signal type
  signal_type signal_moment_type NOT NULL,
  custom_label TEXT, -- For 'custom' type
  
  -- Visual
  intensity INTEGER DEFAULT 50 CHECK (intensity >= 0 AND intensity <= 100),
  color_override TEXT, -- Hex color
  
  -- Timing
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  
  -- Scarcity (limited per area per time)
  city_id UUID REFERENCES cities(id),
  
  -- Billing
  cost_credits INTEGER DEFAULT 0,
  paid_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: max 90 min duration
  CONSTRAINT signal_max_duration CHECK (ends_at - starts_at <= INTERVAL '90 minutes')
);

-- ============================================================================
-- BUSINESS ANALYTICS (What they see in dashboard)
-- ============================================================================
CREATE TABLE IF NOT EXISTS business_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Activity
  total_views INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  checkins INTEGER DEFAULT 0,
  
  -- Engagement
  profile_clicks INTEGER DEFAULT 0,
  message_starts INTEGER DEFAULT 0,
  event_clicks INTEGER DEFAULT 0,
  
  -- Heat
  peak_heat_score INTEGER DEFAULT 0,
  avg_heat_score INTEGER DEFAULT 0,
  
  -- Conversions
  ticket_sales INTEGER DEFAULT 0,
  product_sales INTEGER DEFAULT 0,
  
  -- Chemistry overlap
  matches_in_radius INTEGER DEFAULT 0,
  
  UNIQUE(business_id, date)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(city_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_businesses_roles ON businesses USING GIN(roles);
CREATE INDEX IF NOT EXISTS idx_businesses_geo ON businesses USING GIST(location_geo);
CREATE INDEX IF NOT EXISTS idx_business_presence_heat ON business_presence(heat_score DESC);
CREATE INDEX IF NOT EXISTS idx_business_presence_level ON business_presence(presence_level);
CREATE INDEX IF NOT EXISTS idx_business_signals_active ON business_signals(is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_business_signals_city ON business_signals(city_id, starts_at);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_analytics_daily ENABLE ROW LEVEL SECURITY;

-- Public read for businesses (discovery)
CREATE POLICY "Public can view businesses"
  ON businesses FOR SELECT
  USING (deleted_at IS NULL AND verification_status != 'unverified');

-- Owner/team can manage
CREATE POLICY "Owners can manage businesses"
  ON businesses FOR ALL
  USING (
    auth.uid() = owner_id OR
    auth.uid() = ANY(team_members)
  );

-- Public read for presence (globe)
CREATE POLICY "Public can view presence"
  ON business_presence FOR SELECT
  USING (TRUE);

-- Owner can update presence
CREATE POLICY "Owners can update presence"
  ON business_presence FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses
      WHERE owner_id = auth.uid() OR auth.uid() = ANY(team_members)
    )
  );

-- Signals: public read, owner write
CREATE POLICY "Public can view signals"
  ON business_signals FOR SELECT
  USING (is_active = TRUE AND starts_at <= NOW() AND ends_at > NOW());

CREATE POLICY "Owners can manage signals"
  ON business_signals FOR ALL
  USING (
    business_id IN (
      SELECT id FROM businesses
      WHERE owner_id = auth.uid() OR auth.uid() = ANY(team_members)
    )
  );

-- Analytics: owner only
CREATE POLICY "Owners can view analytics"
  ON business_analytics_daily FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses
      WHERE owner_id = auth.uid() OR auth.uid() = ANY(team_members)
    )
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Calculate heat score based on activity
CREATE OR REPLACE FUNCTION calculate_business_heat(p_business_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_heat INTEGER := 0;
  v_checkins INTEGER;
  v_active_users INTEGER;
  v_chats INTEGER;
  v_is_amplified BOOLEAN;
  v_multiplier DECIMAL;
BEGIN
  SELECT 
    checkins_last_hour,
    active_users_nearby,
    active_chats,
    is_amplified,
    COALESCE(amplification_multiplier, 1.0)
  INTO v_checkins, v_active_users, v_chats, v_is_amplified, v_multiplier
  FROM business_presence
  WHERE business_id = p_business_id
  LIMIT 1;
  
  -- Base heat from activity
  v_heat := LEAST(100, (
    (v_checkins * 3) +
    (v_active_users * 2) +
    (v_chats * 5)
  ));
  
  -- Apply amplification multiplier if active
  IF v_is_amplified AND v_multiplier > 1.0 THEN
    v_heat := LEAST(100, ROUND(v_heat * v_multiplier));
  END IF;
  
  RETURN v_heat;
END;
$$;

-- Update heat score (called periodically)
CREATE OR REPLACE FUNCTION update_business_heat()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.heat_score := calculate_business_heat(NEW.business_id);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_business_heat
  BEFORE UPDATE ON business_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_business_heat();

-- Activate/deactivate signals based on time
CREATE OR REPLACE FUNCTION update_signal_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.starts_at <= NOW() AND NEW.ends_at > NOW() THEN
    NEW.is_active := TRUE;
  ELSE
    NEW.is_active := FALSE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_signal_status
  BEFORE INSERT OR UPDATE ON business_signals
  FOR EACH ROW
  EXECUTE FUNCTION update_signal_status();

-- Check landmark eligibility (called manually or by cron)
CREATE OR REPLACE FUNCTION check_landmark_eligibility(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_reputation INTEGER;
  v_checkins INTEGER;
  v_events INTEGER;
  v_violations INTEGER;
  v_age_days INTEGER;
BEGIN
  SELECT 
    reputation_score,
    total_checkins,
    total_events,
    safety_violations,
    EXTRACT(DAY FROM NOW() - created_at)
  INTO v_reputation, v_checkins, v_events, v_violations, v_age_days
  FROM businesses
  WHERE id = p_business_id;
  
  -- Landmark criteria:
  -- - 90+ days old
  -- - 500+ reputation
  -- - 1000+ checkins
  -- - 10+ events
  -- - 0 safety violations
  IF v_age_days >= 90 
     AND v_reputation >= 500 
     AND v_checkins >= 1000 
     AND v_events >= 10 
     AND v_violations = 0 THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE businesses IS 'Business entities - venues, promoters, brands, sellers';
COMMENT ON TABLE business_presence IS 'Real-time presence state for globe visualization';
COMMENT ON TABLE business_signals IS 'Time-boxed signal moments (paid)';
COMMENT ON COLUMN business_presence.heat_score IS 'Activity heat 0-100, drives glow intensity';
COMMENT ON COLUMN business_presence.is_landmark IS 'Earned status, cannot be bought';
