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
-- Telegram Integration Tables
-- Stores Telegram user connections and notification preferences

-- Telegram users linked to app accounts
CREATE TABLE IF NOT EXISTS telegram_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_id TEXT NOT NULL UNIQUE,
  chat_id TEXT NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  notifications_enabled BOOLEAN DEFAULT true,
  muted_until TIMESTAMPTZ,
  linked_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT telegram_users_user_id_unique UNIQUE (user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_telegram_users_user_id ON telegram_users(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_users_telegram_id ON telegram_users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_telegram_users_chat_id ON telegram_users(chat_id);

-- Temporary tokens for linking Telegram accounts
CREATE TABLE IF NOT EXISTS telegram_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT telegram_link_tokens_user_id_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_token ON telegram_link_tokens(token);

-- Notification queue for Telegram
CREATE TABLE IF NOT EXISTS telegram_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_telegram_queue_status ON telegram_notification_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_telegram_queue_user_id ON telegram_notification_queue(user_id);

-- RLS Policies
ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_link_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_notification_queue ENABLE ROW LEVEL SECURITY;

-- Users can only see their own Telegram connection
CREATE POLICY "Users can view own telegram connection"
  ON telegram_users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own telegram connection"
  ON telegram_users FOR DELETE
  USING (auth.uid() = user_id);

-- Link tokens are only accessible to the owner
CREATE POLICY "Users can view own link tokens"
  ON telegram_link_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Notification queue is internal only (service role)
CREATE POLICY "Service role can manage queue"
  ON telegram_notification_queue FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_telegram_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM telegram_link_tokens
  WHERE expires_at < now();
END;
$$;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_telegram_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_telegram_users_updated_at ON telegram_users;
CREATE TRIGGER trigger_telegram_users_updated_at
  BEFORE UPDATE ON telegram_users
  FOR EACH ROW
  EXECUTE FUNCTION update_telegram_users_updated_at();
-- Video Calling / WebRTC Tables

-- Video call sessions
CREATE TABLE IF NOT EXISTS video_calls (
  id TEXT PRIMARY KEY,
  caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ringing', 'active', 'ended', 'rejected', 'missed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  end_reason TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_video_calls_caller ON video_calls(caller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_calls_callee ON video_calls(callee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_calls_status ON video_calls(status) WHERE status IN ('pending', 'ringing', 'active');

-- RTC signaling messages (ephemeral, cleaned up after calls)
CREATE TABLE IF NOT EXISTS rtc_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN DEFAULT false
);

-- Index for receiving signals
CREATE INDEX IF NOT EXISTS idx_rtc_signals_recipient ON rtc_signals(to_user_id, created_at DESC) WHERE NOT processed;
CREATE INDEX IF NOT EXISTS idx_rtc_signals_call ON rtc_signals(call_id, created_at);

-- Enable realtime for signaling
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'rtc_signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE rtc_signals;
  END IF;
END $$;

-- RLS Policies
ALTER TABLE video_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE rtc_signals ENABLE ROW LEVEL SECURITY;

-- Users can view calls they're part of
CREATE POLICY "Users can view own calls"
  ON video_calls FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Users can only see signals addressed to them
CREATE POLICY "Users can view signals addressed to them"
  ON rtc_signals FOR SELECT
  USING (auth.uid() = to_user_id);

-- Users can mark signals as processed
CREATE POLICY "Users can update own signals"
  ON rtc_signals FOR UPDATE
  USING (auth.uid() = to_user_id);

-- Cleanup function for old signals (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_rtc_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete signals older than 5 minutes
  DELETE FROM rtc_signals
  WHERE created_at < now() - INTERVAL '5 minutes';
  
  -- Mark calls as missed if pending for more than 1 minute
  UPDATE video_calls
  SET status = 'missed', ended_at = now()
  WHERE status IN ('pending', 'ringing')
  AND created_at < now() - INTERVAL '1 minute';
END;
$$;

-- Calculate call duration on end
CREATE OR REPLACE FUNCTION calculate_call_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('ended', 'rejected', 'missed', 'failed') AND NEW.ended_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_call_duration ON video_calls;
CREATE TRIGGER trigger_calculate_call_duration
  BEFORE UPDATE ON video_calls
  FOR EACH ROW
  WHEN (NEW.ended_at IS NOT NULL)
  EXECUTE FUNCTION calculate_call_duration();
-- Match Probability System Tables
-- Stores embeddings, scoring config, and optional caching

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Profile embeddings for semantic matching
CREATE TABLE IF NOT EXISTS profile_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  source_text TEXT, -- The concatenated text used to generate the embedding
  model_version TEXT DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT profile_embeddings_user_unique UNIQUE (user_id)
);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_profile_embeddings_vector ON profile_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_profile_embeddings_user ON profile_embeddings(user_id);

-- Scoring configuration (weights for each dimension)
CREATE TABLE IF NOT EXISTS scoring_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  weights JSONB NOT NULL DEFAULT '{
    "travel": 20,
    "roleCompat": 15,
    "kinkOverlap": 15,
    "intent": 10,
    "semantic": 12,
    "lifestyle": 10,
    "activity": 8,
    "completeness": 8,
    "chem": 3,
    "hosting": 3
  }',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default config if not exists
INSERT INTO scoring_config (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- Optional: Match score cache for expensive calculations
CREATE TABLE IF NOT EXISTS match_score_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score DECIMAL(5,2) NOT NULL,
  breakdown JSONB,
  travel_time_minutes INTEGER,
  computed_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '1 hour',
  
  CONSTRAINT match_score_cache_unique UNIQUE (user_id, target_user_id)
);

CREATE INDEX IF NOT EXISTS idx_match_score_cache_user ON match_score_cache(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_match_score_cache_expiry ON match_score_cache(expires_at) WHERE expires_at > now();

-- RLS Policies
ALTER TABLE profile_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_score_cache ENABLE ROW LEVEL SECURITY;

-- Users can only see their own embeddings
CREATE POLICY "Users can view own embeddings"
  ON profile_embeddings FOR SELECT
  USING (auth.uid() = user_id);

-- Scoring config is readable by all authenticated users
CREATE POLICY "Authenticated users can view scoring config"
  ON scoring_config FOR SELECT
  USING (auth.role() = 'authenticated');

-- Match cache is readable for own matches
CREATE POLICY "Users can view own match scores"
  ON match_score_cache FOR SELECT
  USING (auth.uid() = user_id);

-- Function to update embedding timestamp
CREATE OR REPLACE FUNCTION update_embedding_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_embedding_timestamp ON profile_embeddings;
CREATE TRIGGER trigger_update_embedding_timestamp
  BEFORE UPDATE ON profile_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_embedding_timestamp();

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_match_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM match_score_cache
  WHERE expires_at < now();
END;
$$;

-- Function to compute cosine similarity between two users
CREATE OR REPLACE FUNCTION get_embedding_similarity(user1_id UUID, user2_id UUID)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_similarity DECIMAL;
BEGIN
  SELECT 1 - (e1.embedding <=> e2.embedding) INTO v_similarity
  FROM profile_embeddings e1, profile_embeddings e2
  WHERE e1.user_id = user1_id AND e2.user_id = user2_id;
  
  RETURN COALESCE(v_similarity, 0.5);
END;
$$;
