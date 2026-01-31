-- ============================================================================
-- EVENT BEACON PRICING SYSTEM
-- Phase 4: Marketplace Enhancement
-- ============================================================================

-- Add event beacon fields to Beacon table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = '"Beacon"' AND column_name = 'beacon_tier'
  ) THEN
    ALTER TABLE "Beacon" ADD COLUMN beacon_tier TEXT 
      DEFAULT 'standard' CHECK (beacon_tier IN ('standard', 'featured', 'spotlight'));
    ALTER TABLE "Beacon" ADD COLUMN expires_at TIMESTAMPTZ;
    ALTER TABLE "Beacon" ADD COLUMN promoter_id UUID REFERENCES "User"(id);
    ALTER TABLE "Beacon" ADD COLUMN purchase_price DECIMAL(10,2);
    ALTER TABLE "Beacon" ADD COLUMN duration_hours INT;
  END IF;
END $$;

-- Event beacon pricing table
CREATE TABLE IF NOT EXISTS event_beacon_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL CHECK (tier IN ('standard', 'featured', 'spotlight')),
  duration_hours INT NOT NULL,
  price_gbp DECIMAL(10,2) NOT NULL,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tier, duration_hours)
);

-- Beacon purchase history
CREATE TABLE IF NOT EXISTS beacon_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beacon_id UUID REFERENCES "Beacon"(id) ON DELETE CASCADE,
  purchaser_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  duration_hours INT NOT NULL,
  price_paid DECIMAL(10,2) NOT NULL,
  payment_method TEXT, -- 'stripe', 'admin_comp', etc.
  payment_intent_id TEXT,
  purchased_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default pricing
INSERT INTO event_beacon_pricing (tier, duration_hours, price_gbp, features) VALUES
-- Standard tier
('standard', 3, 25.00, '{"placement": "map", "badge": false, "push": false}'),
('standard', 6, 40.00, '{"placement": "map", "badge": false, "push": false}'),
('standard', 9, 60.00, '{"placement": "map", "badge": false, "push": false}'),
-- Featured tier
('featured', 3, 50.00, '{"placement": "map", "homepage": true, "badge": "featured", "push": false}'),
('featured', 6, 80.00, '{"placement": "map", "homepage": true, "badge": "featured", "push": false}'),
('featured', 9, 120.00, '{"placement": "map", "homepage": true, "badge": "featured", "push": false}'),
-- Spotlight tier
('spotlight', 3, 75.00, '{"placement": "map", "homepage": true, "badge": "spotlight", "push_notification": true}'),
('spotlight', 6, 120.00, '{"placement": "map", "homepage": true, "badge": "spotlight", "push_notification": true}'),
('spotlight', 9, 180.00, '{"placement": "map", "homepage": true, "badge": "spotlight", "push_notification": true}')
ON CONFLICT (tier, duration_hours) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_beacon_tier ON "Beacon"(beacon_tier);
CREATE INDEX IF NOT EXISTS idx_beacon_expires ON "Beacon"(expires_at);
CREATE INDEX IF NOT EXISTS idx_beacon_promoter ON "Beacon"(promoter_id);
CREATE INDEX IF NOT EXISTS idx_beacon_purchases_beacon ON beacon_purchases(beacon_id);
CREATE INDEX IF NOT EXISTS idx_beacon_purchases_purchaser ON beacon_purchases(purchaser_id);

-- RLS
ALTER TABLE event_beacon_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE beacon_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read beacon pricing"
  ON event_beacon_pricing FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can view own beacon purchases"
  ON beacon_purchases FOR SELECT
  USING (auth.uid() = purchaser_id);

CREATE POLICY "Service role full access beacon pricing"
  ON event_beacon_pricing FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access beacon purchases"
  ON beacon_purchases FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to auto-expire beacons
CREATE OR REPLACE FUNCTION expire_old_beacons()
RETURNS void AS $$
BEGIN
  UPDATE "Beacon"
  SET beacon_tier = 'standard',
      expires_at = NULL
  WHERE expires_at IS NOT NULL 
    AND expires_at < now()
    AND beacon_tier IN ('featured', 'spotlight');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TODO: Set up cron job to run expire_old_beacons() every hour
-- Example: SELECT cron.schedule('expire-beacons', '0 * * * *', 'SELECT expire_old_beacons()');
