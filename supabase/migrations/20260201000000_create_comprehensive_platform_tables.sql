-- ============================================================================
-- HOTMESS Comprehensive Platform Tables
-- Includes: Verification, Trust Score, Stories, Live Streaming, Gifts, 
--           GHOSTED Features, Music Integration, AI Features
-- ============================================================================

-- ============================================================================
-- VERIFICATION SYSTEM
-- Multi-step user verification (Phone, Selfie, ID)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Phone Verification
  phone_verified BOOLEAN DEFAULT FALSE,
  phone_verified_at TIMESTAMPTZ,
  phone_number TEXT, -- Hashed for privacy
  
  -- Selfie Verification (Liveness check)
  selfie_verified BOOLEAN DEFAULT FALSE,
  selfie_verified_at TIMESTAMPTZ,
  selfie_confidence_score DECIMAL(5,4), -- 0.0000 to 1.0000
  selfie_liveness_passed BOOLEAN,
  
  -- ID Verification (Premium)
  id_verified BOOLEAN DEFAULT FALSE,
  id_verified_at TIMESTAMPTZ,
  id_type TEXT, -- 'passport', 'drivers_license', 'national_id'
  id_country TEXT, -- ISO country code
  age_verified BOOLEAN DEFAULT FALSE,
  
  -- Verification provider metadata
  provider TEXT, -- 'yoti', 'onfido', 'internal'
  provider_reference TEXT,
  
  -- Status
  verification_level INTEGER DEFAULT 0, -- 0: None, 1: Phone, 2: Selfie, 3: ID
  last_reverification_at TIMESTAMPTZ,
  reverification_required BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_verifications_user ON user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_level ON user_verifications(verification_level);

-- ============================================================================
-- TRUST SCORE SYSTEM
-- Reputation scoring based on user behavior (0-100)
-- ============================================================================

CREATE TABLE IF NOT EXISTS trust_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Core score
  score INTEGER NOT NULL DEFAULT 20 CHECK (score >= 0 AND score <= 100),
  tier TEXT NOT NULL DEFAULT 'new' CHECK (tier IN ('new', 'bronze', 'silver', 'gold', 'diamond')),
  
  -- Score components
  profile_completeness_score INTEGER DEFAULT 0,
  verification_score INTEGER DEFAULT 0,
  behavior_score INTEGER DEFAULT 50,
  community_score INTEGER DEFAULT 0,
  
  -- Positive factors
  positive_ratings INTEGER DEFAULT 0,
  successful_meetups INTEGER DEFAULT 0,
  response_rate DECIMAL(5,2) DEFAULT 0,
  account_age_days INTEGER DEFAULT 0,
  
  -- Negative factors
  reports_received INTEGER DEFAULT 0,
  blocks_received INTEGER DEFAULT 0,
  warnings_issued INTEGER DEFAULT 0,
  
  -- History
  score_history JSONB DEFAULT '[]', -- Array of {date, score, reason}
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_trust_scores_user ON trust_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_trust_scores_score ON trust_scores(score);
CREATE INDEX IF NOT EXISTS idx_trust_scores_tier ON trust_scores(tier);

-- Function to calculate trust tier from score
CREATE OR REPLACE FUNCTION calculate_trust_tier(score INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN score >= 91 THEN 'diamond'
    WHEN score >= 76 THEN 'gold'
    WHEN score >= 51 THEN 'silver'
    WHEN score >= 21 THEN 'bronze'
    ELSE 'new'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to update tier when score changes
CREATE OR REPLACE FUNCTION update_trust_tier()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tier := calculate_trust_tier(NEW.score);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trust_tier
BEFORE INSERT OR UPDATE OF score ON trust_scores
FOR EACH ROW EXECUTE FUNCTION update_trust_tier();

-- ============================================================================
-- STORIES SYSTEM
-- Ephemeral content (24-hour expiry)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Content
  type TEXT NOT NULL CHECK (type IN ('photo', 'video', 'text', 'music', 'location')),
  media_url TEXT,
  thumbnail_url TEXT,
  text_content TEXT,
  background_color TEXT,
  
  -- Music story
  music_track_id TEXT,
  music_title TEXT,
  music_artist TEXT,
  music_preview_url TEXT,
  
  -- Location story
  location_name TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  
  -- Interactive elements
  stickers JSONB DEFAULT '[]', -- Array of {type, position, data}
  mentions JSONB DEFAULT '[]', -- Array of {user_id, position}
  poll_options JSONB, -- {question, options: [{text, votes}]}
  link_url TEXT,
  link_text TEXT,
  
  -- Visibility
  visibility TEXT NOT NULL DEFAULT 'followers' CHECK (visibility IN ('public', 'followers', 'close_friends', 'private')),
  close_friends_only BOOLEAN DEFAULT FALSE,
  
  -- Stats
  view_count INTEGER DEFAULT 0,
  reaction_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  
  -- Timestamps
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  is_highlight BOOLEAN DEFAULT FALSE,
  highlight_category TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_stories_created ON stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_highlights ON stories(user_id, is_highlight) WHERE is_highlight = TRUE;

-- Story views tracking
CREATE TABLE IF NOT EXISTS story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(story_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer ON story_views(viewer_id);

-- Story reactions
CREATE TABLE IF NOT EXISTS story_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL, -- 'fire', 'heart', 'laugh', 'wow', 'sad'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(story_id, user_id)
);

-- ============================================================================
-- LIVE STREAMING SYSTEM
-- Real-time video streaming with gifts
-- ============================================================================

CREATE TABLE IF NOT EXISTS live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Stream info
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  stream_key TEXT NOT NULL UNIQUE,
  playback_url TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  
  -- Settings
  is_private BOOLEAN DEFAULT FALSE,
  allow_gifts BOOLEAN DEFAULT TRUE,
  allow_chat BOOLEAN DEFAULT TRUE,
  max_viewers INTEGER,
  
  -- Co-streaming
  co_host_id UUID REFERENCES auth.users(id),
  is_co_stream BOOLEAN DEFAULT FALSE,
  
  -- Stats
  peak_viewers INTEGER DEFAULT 0,
  total_viewers INTEGER DEFAULT 0,
  total_gifts_value INTEGER DEFAULT 0, -- In XP
  total_duration_seconds INTEGER DEFAULT 0,
  
  -- Recording
  recording_enabled BOOLEAN DEFAULT FALSE,
  recording_url TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_streams_user ON live_streams(user_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON live_streams(status);
CREATE INDEX IF NOT EXISTS idx_live_streams_live ON live_streams(status) WHERE status = 'live';

-- Live stream viewers
CREATE TABLE IF NOT EXISTS live_stream_viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  
  UNIQUE(stream_id, viewer_id)
);

-- ============================================================================
-- GIFTS SYSTEM
-- Virtual gifts for live streams and profiles
-- ============================================================================

CREATE TABLE IF NOT EXISTS gift_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  emoji TEXT,
  icon_url TEXT,
  animation_url TEXT,
  
  -- Pricing
  xp_cost INTEGER NOT NULL,
  tier TEXT DEFAULT 'basic' CHECK (tier IN ('basic', 'premium', 'legendary')),
  
  -- Payout (to creator)
  creator_payout_percent INTEGER DEFAULT 70, -- 70% to creator
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default gift catalog
INSERT INTO gift_catalog (name, slug, emoji, xp_cost, tier) VALUES
  ('Heart', 'heart', '❤️', 10, 'basic'),
  ('Fire', 'fire', '🔥', 25, 'basic'),
  ('Star', 'star', '⭐', 50, 'basic'),
  ('Crown', 'crown', '👑', 100, 'premium'),
  ('Diamond', 'diamond', '💎', 500, 'legendary')
ON CONFLICT (slug) DO NOTHING;

-- Sent gifts
CREATE TABLE IF NOT EXISTS gifts_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id UUID NOT NULL REFERENCES gift_catalog(id),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Context
  context_type TEXT NOT NULL CHECK (context_type IN ('stream', 'profile', 'message')),
  stream_id UUID REFERENCES live_streams(id) ON DELETE SET NULL,
  message_id UUID,
  
  -- Amounts
  quantity INTEGER DEFAULT 1,
  xp_spent INTEGER NOT NULL,
  creator_payout INTEGER NOT NULL,
  platform_fee INTEGER NOT NULL,
  
  -- Status
  payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processed', 'paid')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gifts_sent_sender ON gifts_sent(sender_id);
CREATE INDEX IF NOT EXISTS idx_gifts_sent_recipient ON gifts_sent(recipient_id);
CREATE INDEX IF NOT EXISTS idx_gifts_sent_stream ON gifts_sent(stream_id);

-- ============================================================================
-- GHOSTED (Connect) FEATURE TABLES
-- Discovery, matching, and anti-ghosting features
-- ============================================================================

-- Anti-ghosting metrics
CREATE TABLE IF NOT EXISTS ghosting_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Response metrics
  avg_response_time_minutes INTEGER,
  response_rate_percent DECIMAL(5,2),
  conversations_started INTEGER DEFAULT 0,
  conversations_ghosted INTEGER DEFAULT 0,
  
  -- Patterns
  typical_response_hours JSONB, -- {hour: count} distribution
  ghosting_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Badges
  fast_responder BOOLEAN DEFAULT FALSE,
  never_ghosts BOOLEAN DEFAULT FALSE,
  
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Match insights (AI explanations)
CREATE TABLE IF NOT EXISTS match_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Score breakdown (9 dimensions)
  total_score INTEGER NOT NULL CHECK (total_score >= 0 AND total_score <= 100),
  physical_score INTEGER DEFAULT 0,
  position_score INTEGER DEFAULT 0,
  intent_score INTEGER DEFAULT 0,
  substance_score INTEGER DEFAULT 0,
  kink_score INTEGER DEFAULT 0,
  logistics_score INTEGER DEFAULT 0,
  aftercare_score INTEGER DEFAULT 0,
  tribe_score INTEGER DEFAULT 0,
  music_score INTEGER DEFAULT 0,
  
  -- AI-generated insights
  shared_interests JSONB DEFAULT '[]',
  conversation_starters JSONB DEFAULT '[]',
  compatibility_summary TEXT,
  
  -- Dealbreaker check
  has_dealbreaker BOOLEAN DEFAULT FALSE,
  dealbreaker_reason TEXT,
  
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_a_id, user_b_id)
);

CREATE INDEX IF NOT EXISTS idx_match_insights_user_a ON match_insights(user_a_id);
CREATE INDEX IF NOT EXISTS idx_match_insights_user_b ON match_insights(user_b_id);
CREATE INDEX IF NOT EXISTS idx_match_insights_score ON match_insights(total_score DESC);

-- ============================================================================
-- MUSIC INTEGRATION (Raw Convict Records)
-- Profile music, matching, listen together
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_music_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Theme song (auto-plays on profile)
  theme_song_id TEXT, -- SoundCloud/Spotify track ID
  theme_song_title TEXT,
  theme_song_artist TEXT,
  theme_song_preview_url TEXT,
  theme_song_autoplay BOOLEAN DEFAULT TRUE,
  
  -- Favorite tracks (up to 5)
  favorite_tracks JSONB DEFAULT '[]', -- Array of {id, title, artist, source, preview_url}
  
  -- Genres
  favorite_genres JSONB DEFAULT '[]', -- Array of genre strings
  
  -- Listening stats
  total_listens INTEGER DEFAULT 0,
  last_listened_at TIMESTAMPTZ,
  
  -- Currently playing (realtime)
  currently_playing JSONB, -- {id, title, artist, started_at}
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_music_user ON user_music_preferences(user_id);

-- Listen together sessions (synchronized playback)
CREATE TABLE IF NOT EXISTS listen_together_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID, -- If in a chat
  
  -- Current track
  current_track_id TEXT,
  current_track_title TEXT,
  current_track_artist TEXT,
  current_position_ms INTEGER DEFAULT 0,
  is_playing BOOLEAN DEFAULT TRUE,
  
  -- Participants
  participant_ids JSONB DEFAULT '[]',
  max_participants INTEGER DEFAULT 2,
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- AI FEATURES
-- Conversation summaries, suggestions, moderation logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  
  -- Summary
  topics_discussed JSONB DEFAULT '[]',
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
  key_points JSONB DEFAULT '[]',
  shared_interests JSONB DEFAULT '[]',
  
  -- Suggestions
  suggested_topics JSONB DEFAULT '[]',
  suggested_next_step TEXT,
  
  -- Warnings
  red_flags JSONB DEFAULT '[]',
  requires_review BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  messages_analyzed INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_summaries_conversation ON ai_conversation_summaries(conversation_id);

-- AI moderation logs
CREATE TABLE IF NOT EXISTS ai_moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content being moderated
  content_type TEXT NOT NULL CHECK (content_type IN ('photo', 'message', 'profile', 'story', 'stream')),
  content_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Moderation result
  flagged BOOLEAN DEFAULT FALSE,
  flag_reasons JSONB DEFAULT '[]', -- Array of {reason, confidence}
  confidence_score DECIMAL(5,4),
  
  -- Actions taken
  action_taken TEXT, -- 'none', 'blur', 'remove', 'warn', 'ban'
  requires_human_review BOOLEAN DEFAULT FALSE,
  human_reviewed BOOLEAN DEFAULT FALSE,
  human_reviewer_id UUID,
  human_decision TEXT,
  
  -- Raw AI response
  ai_response JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_moderation_user ON ai_moderation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_moderation_flagged ON ai_moderation_logs(flagged) WHERE flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_ai_moderation_review ON ai_moderation_logs(requires_human_review) WHERE requires_human_review = TRUE;

-- ============================================================================
-- EMERGENCY CONTACTS
-- Safety feature for meetup check-ins
-- ============================================================================

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Contact info (encrypted in practice)
  contact_name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  relationship TEXT,
  
  -- Permissions
  can_see_location BOOLEAN DEFAULT TRUE,
  notify_on_sos BOOLEAN DEFAULT TRUE,
  notify_on_missed_checkin BOOLEAN DEFAULT TRUE,
  
  -- Order
  priority INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON emergency_contacts(user_id);

-- Meetup check-ins
CREATE TABLE IF NOT EXISTS meetup_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Meeting details
  meeting_with_user_id UUID REFERENCES auth.users(id),
  location_name TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  
  -- Check-in schedule
  scheduled_at TIMESTAMPTZ NOT NULL,
  checkin_interval_minutes INTEGER DEFAULT 30,
  next_checkin_due TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'safe', 'missed', 'sos', 'cancelled')),
  
  -- Check-in history
  checkins JSONB DEFAULT '[]', -- Array of {timestamp, status, location}
  
  -- Alerts
  alerts_sent INTEGER DEFAULT 0,
  emergency_contacts_notified BOOLEAN DEFAULT FALSE,
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetup_checkins_user ON meetup_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_meetup_checkins_active ON meetup_checkins(status) WHERE status = 'active';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_stream_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE gifts_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghosting_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_music_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE listen_together_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetup_checkins ENABLE ROW LEVEL SECURITY;

-- User Verifications: Users can read their own, admins can read all
CREATE POLICY "Users can view own verification" ON user_verifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own verification" ON user_verifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Trust Scores: Public read, system write
CREATE POLICY "Anyone can view trust scores" ON trust_scores
  FOR SELECT USING (true);

-- Stories: Based on visibility settings
CREATE POLICY "Users can create own stories" ON stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view stories based on visibility" ON stories
  FOR SELECT USING (
    user_id = auth.uid() 
    OR visibility = 'public'
    OR (visibility = 'followers' AND EXISTS (
      SELECT 1 FROM user_follows WHERE follower_id = auth.uid() AND followed_id = stories.user_id
    ))
  );

CREATE POLICY "Users can delete own stories" ON stories
  FOR DELETE USING (auth.uid() = user_id);

-- Gift Catalog: Public read
CREATE POLICY "Anyone can view gift catalog" ON gift_catalog
  FOR SELECT USING (true);

-- Gifts Sent: Users can see gifts they sent or received
CREATE POLICY "Users can view own gifts" ON gifts_sent
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send gifts" ON gifts_sent
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Emergency Contacts: Private to user
CREATE POLICY "Users can manage own emergency contacts" ON emergency_contacts
  FOR ALL USING (auth.uid() = user_id);

-- Meetup Checkins: Private to user
CREATE POLICY "Users can manage own checkins" ON meetup_checkins
  FOR ALL USING (auth.uid() = user_id);

-- Music Preferences: Public read, owner write
CREATE POLICY "Anyone can view music preferences" ON user_music_preferences
  FOR SELECT USING (true);

CREATE POLICY "Users can update own music preferences" ON user_music_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Match Insights: Both users can view
CREATE POLICY "Users can view their match insights" ON match_insights
  FOR SELECT USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- ============================================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================================

-- Enable realtime for stories (new story notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE stories;

-- Enable realtime for live streams
ALTER PUBLICATION supabase_realtime ADD TABLE live_streams;
ALTER PUBLICATION supabase_realtime ADD TABLE live_stream_viewers;

-- Enable realtime for gifts (live stream gifts)
ALTER PUBLICATION supabase_realtime ADD TABLE gifts_sent;

-- Enable realtime for meetup checkins (safety)
ALTER PUBLICATION supabase_realtime ADD TABLE meetup_checkins;
