-- User Badges Table
-- Stores badges awarded to users for achievements (streaks, milestones, etc.)

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL REFERENCES "User"(email) ON DELETE CASCADE,
  badge_name TEXT NOT NULL,
  badge_icon TEXT,
  streak_achieved INTEGER,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique badge per user
  CONSTRAINT unique_user_badge UNIQUE (user_email, badge_name)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_badges_email ON user_badges(user_email);
CREATE INDEX IF NOT EXISTS idx_user_badges_name ON user_badges(badge_name);

-- Enable RLS
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Users can view their own badges
CREATE POLICY IF NOT EXISTS "Users can view own badges"
  ON user_badges
  FOR SELECT
  USING (auth.jwt() ->> 'email' = user_email);

-- Only service role can insert/update badges (from API)
CREATE POLICY IF NOT EXISTS "Service role can manage badges"
  ON user_badges
  FOR ALL
  USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON user_badges TO authenticated;
GRANT ALL ON user_badges TO service_role;

COMMENT ON TABLE user_badges IS 'User achievement badges for streaks and milestones';
