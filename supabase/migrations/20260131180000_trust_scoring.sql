-- ============================================================================
-- AI TRUST SCORING + ANOMALY DETECTION
-- ============================================================================
-- Trust score per source determines:
-- - Fetch priority
-- - Amplification eligibility
-- - Fraud detection flags
--
-- trust = (consistency * 0.4) + (verification * 0.3) + (community_validation * 0.3)
-- ============================================================================

-- Source types
CREATE TYPE source_type AS ENUM (
  'venue_direct',      -- Venue's own integration
  'resident_advisor',  -- RA API
  'instagram_geo',     -- Instagram location data
  'google_popular',    -- Google Popular Times
  'user_checkin',      -- User-generated check-ins
  'beacon_created',    -- Beacon/event created
  'ticket_sale',       -- Ticket transaction
  'telegram_feed'      -- Telegram channel
);

-- ============================================================================
-- SOURCE TRUST SCORES
-- ============================================================================
CREATE TABLE IF NOT EXISTS source_trust (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source identity
  source_type source_type NOT NULL,
  source_id TEXT NOT NULL, -- External ID or internal reference
  business_id UUID REFERENCES businesses(id),
  
  -- Trust components (0.00 - 1.00)
  consistency_score DECIMAL(4,3) DEFAULT 0.500,   -- How stable/predictable
  verification_score DECIMAL(4,3) DEFAULT 0.000,  -- Verified identity
  community_score DECIMAL(4,3) DEFAULT 0.500,     -- User validation
  
  -- Computed trust (trigger-maintained)
  trust_score DECIMAL(4,3) GENERATED ALWAYS AS (
    (consistency_score * 0.4) + (verification_score * 0.3) + (community_score * 0.3)
  ) STORED,
  
  -- Activity tracking
  total_signals INTEGER DEFAULT 0,
  accurate_signals INTEGER DEFAULT 0, -- Confirmed by attendance
  error_signals INTEGER DEFAULT 0,
  
  -- Anomaly state
  is_flagged BOOLEAN DEFAULT FALSE,
  flagged_at TIMESTAMPTZ,
  flag_reason TEXT,
  is_throttled BOOLEAN DEFAULT FALSE,
  throttled_until TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(source_type, source_id)
);

-- ============================================================================
-- ANOMALY EVENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS anomaly_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What triggered it
  source_id UUID REFERENCES source_trust(id),
  business_id UUID REFERENCES businesses(id),
  
  -- Anomaly type
  anomaly_type TEXT NOT NULL CHECK (anomaly_type IN (
    'spike_without_checkins',    -- Sudden heat spike, no real activity
    'resale_above_threshold',    -- Ticket resale price too high
    'repeated_resales',          -- Same user reselling many tickets
    'zero_heat_amplification',   -- Amplifying with no organic activity
    'fake_event_pattern',        -- Event signals but no attendees
    'velocity_anomaly',          -- Too many signals too fast
    'geographic_mismatch',       -- Signals from wrong location
    'review_bombing',            -- Sudden negative reviews
    'trust_decay'                -- Gradual trust score decline
  )),
  
  -- Details
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details JSONB,
  
  -- Resolution
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- Auto-actions taken
  auto_action TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TRUST CALCULATION FUNCTIONS
-- ============================================================================

-- Update consistency score based on signal accuracy
CREATE OR REPLACE FUNCTION update_source_consistency(p_source_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_source source_trust%ROWTYPE;
  v_accuracy DECIMAL;
BEGIN
  SELECT * INTO v_source FROM source_trust WHERE id = p_source_id;
  
  IF v_source.total_signals < 10 THEN
    -- Not enough data, use default
    RETURN;
  END IF;
  
  v_accuracy := v_source.accurate_signals::decimal / v_source.total_signals;
  
  UPDATE source_trust
  SET 
    consistency_score = LEAST(1.0, GREATEST(0.0, v_accuracy)),
    updated_at = NOW()
  WHERE id = p_source_id;
END;
$$;

-- Update community score based on user validation
CREATE OR REPLACE FUNCTION update_community_score(p_source_id UUID, p_positive BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_current DECIMAL;
  v_delta DECIMAL := 0.02;
BEGIN
  SELECT community_score INTO v_current FROM source_trust WHERE id = p_source_id;
  
  IF p_positive THEN
    v_current := LEAST(1.0, v_current + v_delta);
  ELSE
    v_current := GREATEST(0.0, v_current - (v_delta * 2)); -- Negative weighs more
  END IF;
  
  UPDATE source_trust
  SET community_score = v_current, updated_at = NOW()
  WHERE id = p_source_id;
END;
$$;

-- ============================================================================
-- ANOMALY DETECTION FUNCTIONS
-- ============================================================================

-- Check for spike without check-ins
CREATE OR REPLACE FUNCTION detect_spike_anomaly(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_presence business_presence%ROWTYPE;
  v_has_anomaly BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_presence FROM business_presence WHERE business_id = p_business_id;
  
  -- High heat but no check-ins in last hour
  IF v_presence.heat_score > 50 AND v_presence.checkins_last_hour < 3 THEN
    v_has_anomaly := TRUE;
    
    INSERT INTO anomaly_events (business_id, anomaly_type, severity, details)
    VALUES (
      p_business_id,
      'spike_without_checkins',
      CASE WHEN v_presence.heat_score > 80 THEN 'high' ELSE 'medium' END,
      jsonb_build_object('heat', v_presence.heat_score, 'checkins', v_presence.checkins_last_hour)
    );
  END IF;
  
  RETURN v_has_anomaly;
END;
$$;

-- Check for ticket resale anomalies
CREATE OR REPLACE FUNCTION detect_resale_anomaly(p_listing_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_listing ticket_listings%ROWTYPE;
  v_seller_count INTEGER;
  v_has_anomaly BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_listing FROM ticket_listings WHERE id = p_listing_id;
  
  -- Price more than 2x original
  IF v_listing.asking_price > (v_listing.original_price * 2) THEN
    v_has_anomaly := TRUE;
    INSERT INTO anomaly_events (anomaly_type, severity, details)
    VALUES ('resale_above_threshold', 'high', jsonb_build_object(
      'listing_id', p_listing_id,
      'original', v_listing.original_price,
      'asking', v_listing.asking_price
    ));
  END IF;
  
  -- Same seller has 5+ active listings
  SELECT COUNT(*) INTO v_seller_count
  FROM ticket_listings
  WHERE seller_id = v_listing.seller_id AND status = 'active';
  
  IF v_seller_count >= 5 THEN
    v_has_anomaly := TRUE;
    INSERT INTO anomaly_events (anomaly_type, severity, details)
    VALUES ('repeated_resales', 'medium', jsonb_build_object(
      'seller_id', v_listing.seller_id,
      'active_listings', v_seller_count
    ));
  END IF;
  
  RETURN v_has_anomaly;
END;
$$;

-- Check for zero-heat amplification
CREATE OR REPLACE FUNCTION detect_zero_heat_amplification(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_presence business_presence%ROWTYPE;
BEGIN
  SELECT * INTO v_presence FROM business_presence WHERE business_id = p_business_id;
  
  IF v_presence.is_amplified AND v_presence.heat_score < 10 THEN
    INSERT INTO anomaly_events (business_id, anomaly_type, severity, details, auto_action)
    VALUES (
      p_business_id,
      'zero_heat_amplification',
      'low',
      jsonb_build_object('heat', v_presence.heat_score),
      'Amplification disabled'
    );
    
    -- Auto-disable amplification
    UPDATE business_presence
    SET is_amplified = FALSE, amplification_ends_at = NULL
    WHERE business_id = p_business_id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Auto-throttle flagged sources
CREATE OR REPLACE FUNCTION auto_throttle_source(p_source_id UUID, p_hours INTEGER DEFAULT 24)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE source_trust
  SET 
    is_throttled = TRUE,
    throttled_until = NOW() + (p_hours || ' hours')::interval,
    updated_at = NOW()
  WHERE id = p_source_id;
END;
$$;

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_source_trust_score ON source_trust(trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_source_trust_flagged ON source_trust(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_anomaly_open ON anomaly_events(status, created_at DESC) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_anomaly_business ON anomaly_events(business_id, created_at DESC);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE source_trust ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage trust"
  ON source_trust FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

CREATE POLICY "Admins can manage anomalies"
  ON anomaly_events FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
