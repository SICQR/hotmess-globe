-- ============================================================================
-- Production-Ready Database Tables
-- Includes: Rate Limits, Analytics, Push Notifications, Checkins, XP
-- ============================================================================

-- ============================================================================
-- Rate Limits Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits (window_start);

-- Auto-cleanup old rate limit records (run via cron)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Analytics Events Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for querying
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events (event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events (user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events (timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events (session_id);

-- Partition by month for large datasets (optional)
-- CREATE INDEX IF NOT EXISTS idx_analytics_events_month ON analytics_events (DATE_TRUNC('month', timestamp));

-- ============================================================================
-- Push Subscriptions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL, -- Contains p256dh and auth keys
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions (user_id);

-- ============================================================================
-- User Check-ins Table (Daily Check-in Gamification)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  streak INTEGER NOT NULL DEFAULT 0,
  max_streak INTEGER NOT NULL DEFAULT 0,
  last_checkin TIMESTAMPTZ,
  total_checkins INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to track max streak
CREATE OR REPLACE FUNCTION update_max_streak()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.streak > COALESCE(NEW.max_streak, 0) THEN
    NEW.max_streak := NEW.streak;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_max_streak
BEFORE INSERT OR UPDATE ON user_checkins
FOR EACH ROW EXECUTE FUNCTION update_max_streak();

-- ============================================================================
-- XP Balances Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS xp_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_xp_balances_balance ON xp_balances (balance DESC);

-- ============================================================================
-- XP Transactions Table (Audit Log) - Add missing columns
-- ============================================================================

-- Add user_id column to existing xp_transactions table
ALTER TABLE IF EXISTS xp_transactions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS balance_after INTEGER;

-- Indexes (skip if columns don't exist)
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON xp_transactions (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_xp_transactions_source ON xp_transactions (source) WHERE source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created ON xp_transactions (created_at);

-- ============================================================================
-- Function: Add XP with Transaction Logging
-- ============================================================================

CREATE OR REPLACE FUNCTION add_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_source TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE(new_balance INTEGER, transaction_id UUID) AS $$
DECLARE
  v_balance INTEGER;
  v_tx_id UUID;
BEGIN
  -- Upsert balance
  INSERT INTO xp_balances (user_id, balance, lifetime_earned)
  VALUES (p_user_id, p_amount, p_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = xp_balances.balance + p_amount,
    lifetime_earned = xp_balances.lifetime_earned + GREATEST(p_amount, 0),
    updated_at = NOW()
  RETURNING balance INTO v_balance;
  
  -- Log transaction
  INSERT INTO xp_transactions (user_id, amount, source, description, balance_after)
  VALUES (p_user_id, p_amount, p_source, p_description, v_balance)
  RETURNING id INTO v_tx_id;
  
  RETURN QUERY SELECT v_balance, v_tx_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Badges Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY, -- e.g., '7-day-streak', 'profile-complete'
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  color TEXT,
  rarity TEXT DEFAULT 'common', -- common, uncommon, rare, epic, legendary
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Badges (earned badges)
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges (user_id);

-- ============================================================================
-- Insert Default Badges
-- ============================================================================

INSERT INTO badges (id, name, description, icon_url, color, rarity) VALUES
  ('7-day-streak', '7-Day Streak', 'Checked in 7 days in a row', '/icons/badges/streak-7.png', '#FF1493', 'uncommon'),
  ('14-day-streak', '2-Week Warrior', 'Checked in 14 days in a row', '/icons/badges/streak-14.png', '#00D9FF', 'rare'),
  ('30-day-streak', 'Monthly Legend', 'Checked in 30 days in a row', '/icons/badges/streak-30.png', '#39FF14', 'epic'),
  ('90-day-streak', 'Quarterly Champion', 'Checked in 90 days in a row', '/icons/badges/streak-90.png', '#B026FF', 'legendary'),
  ('profile-complete', 'Profile Complete', 'Completed your profile 100%', '/icons/badges/profile.png', '#FFEB3B', 'common'),
  ('first-match', 'First Match', 'Connected with your first match', '/icons/badges/match.png', '#FF1493', 'common'),
  ('high-roller', 'High Roller', 'Earned 10,000 XP', '/icons/badges/xp-10k.png', '#FFD700', 'rare'),
  ('night-owl', 'Night Owl', 'Active between midnight and 4am', '/icons/badges/night.png', '#B026FF', 'uncommon'),
  ('early-bird', 'Early Bird', 'Active between 5am and 8am', '/icons/badges/morning.png', '#00D9FF', 'uncommon'),
  ('social-butterfly', 'Social Butterfly', 'Sent 100 messages', '/icons/badges/messages.png', '#FF6B35', 'rare')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Rate Limits (service role only)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Analytics Events (service role only for insert, users can read their own)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own analytics" ON analytics_events
  FOR SELECT USING (auth.uid() = user_id);

-- Push Subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own push subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- User Checkins
ALTER TABLE user_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own checkins" ON user_checkins
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own checkins" ON user_checkins
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own checkins" ON user_checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- XP Balances
ALTER TABLE xp_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own XP balance" ON xp_balances
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public leaderboard" ON xp_balances
  FOR SELECT USING (true); -- Allow viewing for leaderboards

-- XP Transactions
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own XP transactions" ON xp_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Badges (public read)
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public badges" ON badges FOR SELECT USING (true);

-- User Badges
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own badges" ON user_badges
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public badge showcase" ON user_badges
  FOR SELECT USING (true); -- Allow viewing others' badges

-- ============================================================================
-- Grants for service role
-- ============================================================================

GRANT ALL ON rate_limits TO service_role;
GRANT ALL ON analytics_events TO service_role;
GRANT ALL ON push_subscriptions TO service_role;
GRANT ALL ON user_checkins TO service_role;
GRANT ALL ON xp_balances TO service_role;
GRANT ALL ON xp_transactions TO service_role;
GRANT ALL ON badges TO service_role;
GRANT ALL ON user_badges TO service_role;
