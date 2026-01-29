-- Production Ready Tables
-- Rate limits, analytics, push subscriptions, gamification

-- Rate limits table (for Redis fallback)
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_key TEXT NOT NULL UNIQUE,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_bucket_key ON rate_limits(bucket_key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id, timestamp DESC);

-- Daily check-ins for gamification
CREATE TABLE IF NOT EXISTS user_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  xp_earned INTEGER DEFAULT 0,
  streak_day INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT user_checkins_unique UNIQUE (user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_user_checkins_user ON user_checkins(user_id, checkin_date DESC);

-- XP balances
CREATE TABLE IF NOT EXISTS xp_balances (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  last_checkin_date DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- XP transaction history
CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON xp_transactions(user_id, created_at DESC);

-- Badges
CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  category TEXT,
  xp_required INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User badges
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT user_badges_unique UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);

-- Function to clean up old rate limits
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < now() - INTERVAL '1 hour';
END;
$$;

-- Update max streak trigger
CREATE OR REPLACE FUNCTION update_max_streak()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_streak > NEW.max_streak THEN
    NEW.max_streak = NEW.current_streak;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_max_streak ON xp_balances;
CREATE TRIGGER trigger_update_max_streak
  BEFORE UPDATE ON xp_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_max_streak();

-- Add XP function
CREATE OR REPLACE FUNCTION add_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE(new_total INTEGER, new_streak INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_checkin DATE;
  v_current_streak INTEGER;
  v_is_consecutive BOOLEAN;
BEGIN
  -- Get current balance
  SELECT last_checkin_date, current_streak INTO v_last_checkin, v_current_streak
  FROM xp_balances WHERE user_id = p_user_id;
  
  -- Check if streak continues
  v_is_consecutive := v_last_checkin IS NOT NULL AND v_last_checkin = CURRENT_DATE - INTERVAL '1 day';
  
  -- Update or insert balance
  INSERT INTO xp_balances (user_id, total_xp, current_streak, last_checkin_date)
  VALUES (p_user_id, p_amount, CASE WHEN v_is_consecutive THEN COALESCE(v_current_streak, 0) + 1 ELSE 1 END, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp = xp_balances.total_xp + p_amount,
    current_streak = CASE 
      WHEN xp_balances.last_checkin_date = CURRENT_DATE - INTERVAL '1 day' THEN xp_balances.current_streak + 1
      WHEN xp_balances.last_checkin_date = CURRENT_DATE THEN xp_balances.current_streak
      ELSE 1
    END,
    last_checkin_date = CURRENT_DATE;
  
  -- Record transaction
  INSERT INTO xp_transactions (user_id, amount, reason, metadata)
  VALUES (p_user_id, p_amount, p_reason, p_metadata);
  
  -- Return new values
  RETURN QUERY
  SELECT total_xp, current_streak FROM xp_balances WHERE user_id = p_user_id;
END;
$$;

-- RLS Policies
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Rate limits are internal only
CREATE POLICY "Service role manages rate limits"
  ON rate_limits FOR ALL USING (true);

-- Analytics events
CREATE POLICY "Users can insert own events"
  ON analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view own events"
  ON analytics_events FOR SELECT
  USING (auth.uid() = user_id);

-- User checkins
CREATE POLICY "Users can view own checkins"
  ON user_checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkins"
  ON user_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- XP balances
CREATE POLICY "Users can view own balance"
  ON xp_balances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view leaderboard"
  ON xp_balances FOR SELECT
  USING (true);

-- XP transactions
CREATE POLICY "Users can view own transactions"
  ON xp_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Badges
CREATE POLICY "Anyone can view badges"
  ON badges FOR SELECT
  USING (true);

-- User badges
CREATE POLICY "Anyone can view user badges"
  ON user_badges FOR SELECT
  USING (true);

CREATE POLICY "Users can view own badges"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);

-- Seed initial badges
INSERT INTO badges (id, name, description, category, xp_required) VALUES
  ('first_checkin', 'First Steps', 'Complete your first daily check-in', 'engagement', 0),
  ('streak_7', 'Week Warrior', 'Maintain a 7-day check-in streak', 'engagement', 0),
  ('streak_30', 'Monthly Master', 'Maintain a 30-day check-in streak', 'engagement', 0),
  ('profile_complete', 'Profile Pro', 'Complete your profile 100%', 'profile', 0),
  ('first_match', 'First Spark', 'Get your first match', 'social', 0),
  ('match_10', 'Social Butterfly', 'Get 10 matches', 'social', 0),
  ('xp_100', 'Rising Star', 'Earn 100 XP', 'xp', 100),
  ('xp_500', 'Hot Shot', 'Earn 500 XP', 'xp', 500),
  ('xp_1000', 'Legend', 'Earn 1000 XP', 'xp', 1000)
ON CONFLICT (id) DO NOTHING;
