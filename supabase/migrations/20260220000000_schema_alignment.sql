-- HOTMESS Schema Alignment Migration
-- Purpose: Add missing tables, columns, and compatibility views
-- Generated: 2026-02-20
-- SAFE: Non-destructive, adds only

-- =====================================================
-- PART 1: Add missing columns to existing tables
-- =====================================================

-- Add kind and mode columns to beacons (fallback to type)
ALTER TABLE beacons ADD COLUMN IF NOT EXISTS kind text;
ALTER TABLE beacons ADD COLUMN IF NOT EXISTS mode text;

-- Backfill kind from type where null
UPDATE beacons SET kind = type WHERE kind IS NULL AND type IS NOT NULL;

-- Add index for kind queries
CREATE INDEX IF NOT EXISTS idx_beacons_kind ON beacons(kind);
CREATE INDEX IF NOT EXISTS idx_beacons_mode ON beacons(mode);

-- =====================================================
-- PART 2: Create compatibility views for case mismatches
-- =====================================================

-- View: Beacon (PascalCase) -> beacons
CREATE OR REPLACE VIEW "Beacon" AS SELECT * FROM beacons;

-- View: User (PascalCase) -> users  
CREATE OR REPLACE VIEW "User" AS SELECT * FROM users;

-- View: City (PascalCase) -> cities
CREATE OR REPLACE VIEW "City" AS SELECT * FROM cities;

-- View: EventRSVP -> event_rsvps (if exists, otherwise stub)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_rsvps') THEN
    EXECUTE 'CREATE OR REPLACE VIEW "EventRSVP" AS SELECT * FROM event_rsvps';
  END IF;
END $$;

-- =====================================================
-- PART 3: Create compatibility views for table name mismatches
-- =====================================================

-- View: presence -> user_presence
CREATE OR REPLACE VIEW presence AS 
SELECT 
  user_id,
  last_seen_at,
  status,
  location,
  metadata,
  -- Add expires_at computed from last_seen_at + 10 minutes
  last_seen_at + interval '10 minutes' AS expires_at
FROM user_presence;

-- View: right_now_status -> right_now_posts with active filter
CREATE OR REPLACE VIEW right_now_status AS
SELECT 
  id,
  name,
  city,
  country,
  latitude,
  longitude,
  vibe_tag,
  style,
  status,
  host_id,
  venue_id,
  visibility,
  crowd_count,
  metadata,
  created_at,
  updated_at,
  expires_at,
  deleted_at,
  -- Compute active: not deleted and not expired
  (deleted_at IS NULL AND (expires_at IS NULL OR expires_at > now())) AS active,
  -- Add created_date alias
  created_at AS created_date
FROM right_now_posts;

-- =====================================================
-- PART 4: Create missing tables (P0 Critical)
-- =====================================================

-- beacon_checkins: Track user check-ins to beacons
CREATE TABLE IF NOT EXISTS beacon_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beacon_id uuid REFERENCES beacons(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  checked_in_at timestamptz DEFAULT now(),
  checked_out_at timestamptz,
  location jsonb,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  created_date timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beacon_checkins_beacon ON beacon_checkins(beacon_id);
CREATE INDEX IF NOT EXISTS idx_beacon_checkins_user ON beacon_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_beacon_checkins_created ON beacon_checkins(created_at DESC);

-- Enable RLS
ALTER TABLE beacon_checkins ENABLE ROW LEVEL SECURITY;

-- RLS: Users can read all check-ins, write own
CREATE POLICY IF NOT EXISTS IF NOT EXISTS "Anyone can read beacon_checkins" ON beacon_checkins
  FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS IF NOT EXISTS "Users can insert own check-ins" ON beacon_checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS IF NOT EXISTS "Users can update own check-ins" ON beacon_checkins
  FOR UPDATE USING (auth.uid() = user_id);

-- user_activities: Track user activity feed
CREATE TABLE IF NOT EXISTS user_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  target_id uuid,
  target_type text,
  metadata jsonb,
  visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_date timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_visible ON user_activities(visible) WHERE visible = true;
CREATE INDEX IF NOT EXISTS idx_user_activities_created ON user_activities(created_at DESC);

ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS IF NOT EXISTS "Anyone can read visible activities" ON user_activities
  FOR SELECT USING (visible = true);
CREATE POLICY IF NOT EXISTS IF NOT EXISTS "Users can insert own activities" ON user_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_intents: Track user intent signals (discovery)
CREATE TABLE IF NOT EXISTS user_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  intent_type text NOT NULL,
  target_city text,
  target_vibe text,
  metadata jsonb,
  visible boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_date timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_intents_user ON user_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_intents_visible ON user_intents(visible) WHERE visible = true;
CREATE INDEX IF NOT EXISTS idx_user_intents_created ON user_intents(created_at DESC);

ALTER TABLE user_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS IF NOT EXISTS "Anyone can read visible intents" ON user_intents
  FOR SELECT USING (visible = true);
CREATE POLICY IF NOT EXISTS IF NOT EXISTS "Users can manage own intents" ON user_intents
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- PART 5: Create missing tables (P1 Core Features)
-- =====================================================

-- user_follows: Social following
CREATE TABLE IF NOT EXISTS user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS IF NOT EXISTS "Anyone can read follows" ON user_follows
  FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS IF NOT EXISTS "Users can follow/unfollow" ON user_follows
  FOR ALL USING (auth.uid() = follower_id);

-- cart_items: Shopping cart
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_type text NOT NULL, -- 'shopify', 'preloved', 'ticket'
  quantity integer DEFAULT 1,
  variant_id text,
  price_cents integer,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS IF NOT EXISTS "Users can manage own cart" ON cart_items
  FOR ALL USING (auth.uid() = user_id);

-- preloved_listings: User marketplace listings
CREATE TABLE IF NOT EXISTS preloved_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price_cents integer NOT NULL,
  currency text DEFAULT 'GBP',
  category text,
  condition text,
  images jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'draft', -- draft, active, sold, removed
  location_city text,
  location_country text,
  shipping_available boolean DEFAULT false,
  local_pickup boolean DEFAULT true,
  views integer DEFAULT 0,
  saves integer DEFAULT 0,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preloved_seller ON preloved_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_preloved_status ON preloved_listings(status);
CREATE INDEX IF NOT EXISTS idx_preloved_category ON preloved_listings(category);
CREATE INDEX IF NOT EXISTS idx_preloved_created ON preloved_listings(created_at DESC);

ALTER TABLE preloved_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS IF NOT EXISTS "Anyone can read active listings" ON preloved_listings
  FOR SELECT USING (status = 'active' OR auth.uid() = seller_id);
CREATE POLICY IF NOT EXISTS IF NOT EXISTS "Sellers can manage own listings" ON preloved_listings
  FOR ALL USING (auth.uid() = seller_id);

-- trusted_contacts: Safety contacts
CREATE TABLE IF NOT EXISTS trusted_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_name text NOT NULL,
  contact_phone text,
  contact_email text,
  relationship text,
  notify_on_sos boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trusted_contacts_user ON trusted_contacts(user_id);

ALTER TABLE trusted_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS IF NOT EXISTS "Users can manage own contacts" ON trusted_contacts
  FOR ALL USING (auth.uid() = user_id);

-- safety_checkins: Safety check-in history
CREATE TABLE IF NOT EXISTS safety_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL, -- 'safe', 'sos', 'scheduled'
  location jsonb,
  message text,
  notified_contacts jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_safety_checkins_user ON safety_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_checkins_created ON safety_checkins(created_at DESC);

ALTER TABLE safety_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS IF NOT EXISTS "Users can read own checkins" ON safety_checkins
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS IF NOT EXISTS "Users can insert own checkins" ON safety_checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- notification_outbox: Pending notifications queue
CREATE TABLE IF NOT EXISTS notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  channel text NOT NULL, -- 'push', 'email', 'sms'
  payload jsonb NOT NULL,
  status text DEFAULT 'pending', -- pending, sent, failed
  scheduled_for timestamptz DEFAULT now(),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending ON notification_outbox(status, scheduled_for) 
  WHERE status = 'pending';

ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;

-- Only service role can access outbox
CREATE POLICY IF NOT EXISTS IF NOT EXISTS "Service role only" ON notification_outbox
  FOR ALL USING (false);

-- =====================================================
-- PART 6: Add created_date alias to tables missing it
-- =====================================================

-- These views wrap existing tables to add created_date alias

-- Note: Cannot modify existing tables easily, so we update app to use created_at
-- However, for backwards compat we can create function-based index or triggers

-- For now, add column where safe
ALTER TABLE cities ADD COLUMN IF NOT EXISTS created_date timestamptz;
UPDATE cities SET created_date = created_at WHERE created_date IS NULL;

-- Add trigger to sync created_date
CREATE OR REPLACE FUNCTION sync_created_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_date := COALESCE(NEW.created_date, NEW.created_at, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sync_cities_created_date') THEN
    CREATE TRIGGER sync_cities_created_date
      BEFORE INSERT OR UPDATE ON cities
      FOR EACH ROW EXECUTE FUNCTION sync_created_date();
  END IF;
END $$;

-- =====================================================
-- PART 7: Grant permissions for anon role
-- =====================================================

GRANT SELECT ON "Beacon" TO anon, authenticated;
GRANT SELECT ON "User" TO anon, authenticated;
GRANT SELECT ON "City" TO anon, authenticated;
GRANT SELECT ON presence TO anon, authenticated;
GRANT SELECT ON right_now_status TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON beacon_checkins TO authenticated;
GRANT SELECT, INSERT ON user_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_intents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_follows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cart_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON preloved_listings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON trusted_contacts TO authenticated;
GRANT SELECT, INSERT ON safety_checkins TO authenticated;

-- =====================================================
-- DONE
-- =====================================================
