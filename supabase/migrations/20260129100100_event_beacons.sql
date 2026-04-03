-- Event Beacons System
-- Tiered, time-limited promotional beacons for events on the globe

-- Beacon tiers with pricing
CREATE TABLE IF NOT EXISTS beacon_tiers (
  id text PRIMARY KEY,
  name text NOT NULL,
  duration_hours int NOT NULL,
  price_cents int NOT NULL,
  features jsonb DEFAULT '{}',
  max_radius_km int DEFAULT 50,
  priority int DEFAULT 1, -- Higher = more prominent
  created_at timestamptz DEFAULT now()
);

-- Insert default tiers
INSERT INTO beacon_tiers (id, name, duration_hours, price_cents, features, max_radius_km, priority) VALUES
  ('basic_3h', 'Basic 3hr', 3, 999, '{"pulse": false, "highlight": false}', 25, 1),
  ('standard_6h', 'Standard 6hr', 6, 1999, '{"pulse": true, "highlight": false}', 50, 2),
  ('premium_9h', 'Premium 9hr', 9, 3999, '{"pulse": true, "highlight": true}', 100, 3),
  ('featured_12h', 'Featured 12hr', 12, 7999, '{"pulse": true, "highlight": true, "featured_slot": true}', 200, 4),
  ('spotlight_24h', 'Spotlight 24hr', 24, 14999, '{"pulse": true, "highlight": true, "featured_slot": true, "push_notification": true}', 500, 5)
ON CONFLICT (id) DO NOTHING;

-- Extend existing Beacon table for events
ALTER TABLE "Beacon"
ADD COLUMN IF NOT EXISTS event_title text,
ADD COLUMN IF NOT EXISTS event_description text,
ADD COLUMN IF NOT EXISTS event_start timestamptz,
ADD COLUMN IF NOT EXISTS event_end timestamptz,
ADD COLUMN IF NOT EXISTS ticket_url text,
ADD COLUMN IF NOT EXISTS ticket_price_cents int,
ADD COLUMN IF NOT EXISTS venue_name text,
ADD COLUMN IF NOT EXISTS venue_address text,
ADD COLUMN IF NOT EXISTS promoter_id uuid REFERENCES "User"(id),
ADD COLUMN IF NOT EXISTS tier_id text REFERENCES beacon_tiers(id),
ADD COLUMN IF NOT EXISTS beacon_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS view_count int DEFAULT 0,
ADD COLUMN IF NOT EXISTS click_count int DEFAULT 0,
ADD COLUMN IF NOT EXISTS rsvp_count int DEFAULT 0;

-- Beacon purchases / orders
CREATE TABLE IF NOT EXISTS beacon_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beacon_id uuid REFERENCES "Beacon"(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES "User"(id),
  tier_id text NOT NULL REFERENCES beacon_tiers(id),
  amount_cents int NOT NULL,
  currency text DEFAULT 'GBP',
  payment_intent_id text, -- Stripe
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  activated_at timestamptz, -- When beacon went live
  expires_at timestamptz, -- When beacon expires
  created_at timestamptz DEFAULT now()
);

-- Event RSVPs
CREATE TABLE IF NOT EXISTS event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beacon_id uuid NOT NULL REFERENCES "Beacon"(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  status text DEFAULT 'going' CHECK (status IN ('interested', 'going', 'maybe')),
  notified boolean DEFAULT false, -- Reminder sent
  created_at timestamptz DEFAULT now(),
  UNIQUE(beacon_id, user_id)
);

-- Promoter analytics
CREATE TABLE IF NOT EXISTS promoter_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beacon_id uuid NOT NULL REFERENCES "Beacon"(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'view', 'click', 'rsvp', 'share', 'ticket_click'
  user_id uuid REFERENCES "User"(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_beacon_promoter ON "Beacon"(promoter_id);
CREATE INDEX IF NOT EXISTS idx_beacon_tier ON "Beacon"(tier_id);
CREATE INDEX IF NOT EXISTS idx_beacon_expires ON "Beacon"(beacon_expires_at);
CREATE INDEX IF NOT EXISTS idx_beacon_featured ON "Beacon"(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_beacon_purchases_user ON beacon_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_beacon ON event_rsvps(beacon_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user ON event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_promoter_analytics_beacon ON promoter_analytics(beacon_id);

-- RLS
ALTER TABLE beacon_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE beacon_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoter_analytics ENABLE ROW LEVEL SECURITY;

-- Everyone can see tiers
CREATE POLICY "Public read beacon tiers"
  ON beacon_tiers FOR SELECT
  USING (true);

-- Users see own purchases
CREATE POLICY "Users view own purchases"
  ON beacon_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Users can RSVP
CREATE POLICY "Users manage RSVPs"
  ON event_rsvps FOR ALL
  USING (auth.uid() = user_id);

-- Promoters see own analytics
CREATE POLICY "Promoters view own analytics"
  ON promoter_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Beacon" 
      WHERE id = promoter_analytics.beacon_id 
      AND promoter_id = auth.uid()
    )
  );

-- Function to activate a beacon after payment
CREATE OR REPLACE FUNCTION activate_event_beacon(
  p_purchase_id uuid
)
RETURNS uuid AS $$
DECLARE
  v_purchase beacon_purchases%ROWTYPE;
  v_tier beacon_tiers%ROWTYPE;
  v_beacon_id uuid;
BEGIN
  -- Get purchase
  SELECT * INTO v_purchase FROM beacon_purchases WHERE id = p_purchase_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase not found';
  END IF;

  -- Get tier
  SELECT * INTO v_tier FROM beacon_tiers WHERE id = v_purchase.tier_id;
  
  -- Update beacon with expiry
  UPDATE "Beacon"
  SET 
    beacon_expires_at = now() + (v_tier.duration_hours || ' hours')::interval,
    is_featured = (v_tier.features->>'featured_slot')::boolean
  WHERE id = v_purchase.beacon_id
  RETURNING id INTO v_beacon_id;

  -- Update purchase
  UPDATE beacon_purchases
  SET 
    payment_status = 'completed',
    activated_at = now(),
    expires_at = now() + (v_tier.duration_hours || ' hours')::interval
  WHERE id = p_purchase_id;

  RETURN v_beacon_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active event beacons in radius
CREATE OR REPLACE FUNCTION get_active_event_beacons(
  p_lat double precision,
  p_lng double precision,
  p_radius_km int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  event_title text,
  venue_name text,
  event_start timestamptz,
  latitude double precision,
  longitude double precision,
  tier_id text,
  is_featured boolean,
  distance_km double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.event_title,
    b.venue_name,
    b.event_start,
    b.latitude,
    b.longitude,
    b.tier_id,
    b.is_featured,
    (
      6371 * acos(
        cos(radians(p_lat)) * cos(radians(b.latitude)) * 
        cos(radians(b.longitude) - radians(p_lng)) + 
        sin(radians(p_lat)) * sin(radians(b.latitude))
      )
    ) as distance_km
  FROM "Beacon" b
  WHERE 
    b.beacon_type = 'event'
    AND b.beacon_expires_at > now()
    AND (
      6371 * acos(
        cos(radians(p_lat)) * cos(radians(b.latitude)) * 
        cos(radians(b.longitude) - radians(p_lng)) + 
        sin(radians(p_lat)) * sin(radians(b.latitude))
      )
    ) <= p_radius_km
  ORDER BY b.is_featured DESC, distance_km ASC;
END;
$$ LANGUAGE plpgsql;
