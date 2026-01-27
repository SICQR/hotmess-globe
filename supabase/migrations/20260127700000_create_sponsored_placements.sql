-- Create sponsored_placements table for business advertising
-- This table stores all paid advertising placements: globe pins, banners, and event sponsorships

CREATE TABLE IF NOT EXISTS sponsored_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Business info
  business_email TEXT NOT NULL REFERENCES "User"(email) ON DELETE CASCADE,
  business_name TEXT,
  
  -- Plan and placement info
  plan_id TEXT NOT NULL,
  plan_name TEXT,
  placement_type TEXT NOT NULL CHECK (placement_type IN ('globe_pin', 'banner', 'event_sponsor')),
  
  -- Campaign details
  name TEXT,
  description TEXT,
  image_url TEXT,
  destination_url TEXT,
  city TEXT,
  
  -- Targeting
  placement_location TEXT, -- For banners: 'homepage', 'events', 'social', 'all'
  target_radius_km INTEGER,
  
  -- Payment info
  amount_paid INTEGER NOT NULL DEFAULT 0, -- Amount in pence
  currency TEXT NOT NULL DEFAULT 'gbp',
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  paid_at TIMESTAMPTZ,
  
  -- Status and dates
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'expired', 'refunded', 'payment_failed')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ NOT NULL,
  
  -- Analytics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  
  -- Related entities
  beacon_id UUID REFERENCES "Beacon"(id) ON DELETE SET NULL,
  event_id UUID,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sponsored_placements_business_email 
  ON sponsored_placements(business_email);

CREATE INDEX IF NOT EXISTS idx_sponsored_placements_status 
  ON sponsored_placements(status);

CREATE INDEX IF NOT EXISTS idx_sponsored_placements_placement_type 
  ON sponsored_placements(placement_type);

CREATE INDEX IF NOT EXISTS idx_sponsored_placements_dates 
  ON sponsored_placements(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_sponsored_placements_active 
  ON sponsored_placements(status, end_date) 
  WHERE status = 'active';

-- Enable RLS
ALTER TABLE sponsored_placements ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Businesses can view their own placements
CREATE POLICY "Users can view own sponsored placements"
  ON sponsored_placements FOR SELECT
  USING (auth.jwt() ->> 'email' = business_email);

-- Businesses can insert their own placements (via checkout flow)
CREATE POLICY "Users can create own sponsored placements"
  ON sponsored_placements FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = business_email);

-- Businesses can update their own placements (name, description, etc)
CREATE POLICY "Users can update own sponsored placements"
  ON sponsored_placements FOR UPDATE
  USING (auth.jwt() ->> 'email' = business_email);

-- Service role can do everything (for webhooks)
CREATE POLICY "Service role has full access to sponsored placements"
  ON sponsored_placements FOR ALL
  USING (auth.role() = 'service_role');

-- Admins can view all placements
CREATE POLICY "Admins can view all sponsored placements"
  ON sponsored_placements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "User" 
      WHERE email = auth.jwt() ->> 'email' 
      AND role = 'admin'
    )
  );

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_sponsored_placements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sponsored_placements_updated_at
  BEFORE UPDATE ON sponsored_placements
  FOR EACH ROW
  EXECUTE FUNCTION update_sponsored_placements_updated_at();

-- Function to increment impressions (called from API)
CREATE OR REPLACE FUNCTION increment_sponsorship_impressions(placement_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE sponsored_placements
  SET impressions = impressions + 1
  WHERE id = placement_id
    AND status = 'active'
    AND end_date > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment clicks (called from API)
CREATE OR REPLACE FUNCTION increment_sponsorship_clicks(placement_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE sponsored_placements
  SET clicks = clicks + 1
  WHERE id = placement_id
    AND status = 'active'
    AND end_date > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add is_sponsored column to Beacon table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Beacon' AND column_name = 'is_sponsored'
  ) THEN
    ALTER TABLE "Beacon" ADD COLUMN is_sponsored BOOLEAN DEFAULT false;
    ALTER TABLE "Beacon" ADD COLUMN sponsorship_id UUID REFERENCES sponsored_placements(id) ON DELETE SET NULL;
    ALTER TABLE "Beacon" ADD COLUMN destination_url TEXT;
  END IF;
END $$;

-- Create index for sponsored beacons
CREATE INDEX IF NOT EXISTS idx_beacon_sponsored 
  ON "Beacon"(is_sponsored) 
  WHERE is_sponsored = true;

COMMENT ON TABLE sponsored_placements IS 'Stores paid advertising placements: globe pins, banners, and event sponsorships';
