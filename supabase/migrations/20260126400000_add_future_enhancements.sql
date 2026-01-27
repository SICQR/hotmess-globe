-- Future Enhancements Migration
-- Multi-tier subscriptions, Creator collaboration, Organizer analytics, Recommendations

-- =============================================================================
-- MULTI-TIER PREMIUM SUBSCRIPTIONS
-- =============================================================================

-- Add subscription tier configuration to User table
DO $$
BEGIN
  -- Tier pricing configuration (JSONB: { basic: 500, premium: 1000, vip: 2500 })
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'subscription_tier_prices'
  ) THEN
    ALTER TABLE "User" ADD COLUMN subscription_tier_prices JSONB DEFAULT '{"basic": 500, "premium": 1000, "vip": 2500}'::jsonb;
  END IF;

  -- Tier perks configuration (JSONB per tier)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'subscription_tier_perks'
  ) THEN
    ALTER TABLE "User" ADD COLUMN subscription_tier_perks JSONB DEFAULT '{
      "basic": ["Access to basic premium content", "Monthly exclusive updates"],
      "premium": ["Access to all premium content", "Direct messaging priority", "Weekly exclusive content"],
      "vip": ["Access to all content", "1-on-1 chat sessions", "Behind-the-scenes access", "Custom content requests"]
    }'::jsonb;
  END IF;

  -- Content tier requirement (which tier needed to view)
  -- Will be added to photos JSONB structure
END $$;

-- =============================================================================
-- CREATOR COLLABORATION TOOLS
-- =============================================================================

-- Collaboration requests table
CREATE TABLE IF NOT EXISTS collaboration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_email TEXT NOT NULL,
  creator_email TEXT NOT NULL,
  event_id UUID,  -- Optional: link to specific event
  collaboration_type TEXT DEFAULT 'general' CHECK (collaboration_type IN ('general', 'event', 'music', 'feature', 'collab_track')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
  message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  response_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(requester_email, creator_email, event_id, collaboration_type)
);

-- Indexes for collaboration_requests
CREATE INDEX IF NOT EXISTS idx_collab_requester ON collaboration_requests(requester_email);
CREATE INDEX IF NOT EXISTS idx_collab_creator ON collaboration_requests(creator_email);
CREATE INDEX IF NOT EXISTS idx_collab_status ON collaboration_requests(status);
CREATE INDEX IF NOT EXISTS idx_collab_pending ON collaboration_requests(creator_email, status) WHERE status = 'pending';

-- Collaboration history (successful collaborations)
CREATE TABLE IF NOT EXISTS collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_emails TEXT[] NOT NULL,  -- Array of collaborating creators
  collaboration_type TEXT NOT NULL,
  title TEXT,
  description TEXT,
  event_id UUID,
  release_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collaborations_creators ON collaborations USING GIN(creator_emails);

-- =============================================================================
-- ORGANIZER ANALYTICS DASHBOARD
-- =============================================================================

-- Analytics snapshots table (daily aggregates for faster queries)
CREATE TABLE IF NOT EXISTS organizer_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_email TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  total_events INTEGER DEFAULT 0,
  upcoming_events INTEGER DEFAULT 0,
  past_events INTEGER DEFAULT 0,
  total_rsvps INTEGER DEFAULT 0,
  total_checkins INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  unique_attendees INTEGER DEFAULT 0,
  avg_attendance_rate DECIMAL(5,2) DEFAULT 0,
  top_event_id UUID,
  category_breakdown JSONB DEFAULT '{}'::jsonb,
  hourly_breakdown JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organizer_email, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_organizer ON organizer_analytics_snapshots(organizer_email);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON organizer_analytics_snapshots(snapshot_date);

-- =============================================================================
-- ADVANCED DISTANCE-BASED RECOMMENDATIONS
-- =============================================================================

-- User interaction tracking for ML - add missing columns to existing table
ALTER TABLE IF EXISTS user_interactions
  ADD COLUMN IF NOT EXISTS target_email TEXT,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS distance_km DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS lat DECIMAL(10,6),
  ADD COLUMN IF NOT EXISTS lng DECIMAL(10,6);

CREATE INDEX IF NOT EXISTS idx_interactions_target ON user_interactions(target_email) WHERE target_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interactions_type ON user_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_interactions_created ON user_interactions(created_at);

-- Location clusters (hotspots)
CREATE TABLE IF NOT EXISTS location_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  lat DECIMAL(10,6) NOT NULL,
  lng DECIMAL(10,6) NOT NULL,
  radius_meters INTEGER DEFAULT 500,
  city TEXT,
  neighborhood TEXT,
  venue_ids UUID[] DEFAULT '{}',
  active_user_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clusters_location ON location_clusters(lat, lng);

-- =============================================================================
-- AI-POWERED PROFILE MATCHING
-- =============================================================================

-- Match scores cache (precomputed compatibility)
CREATE TABLE IF NOT EXISTS match_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  match_email TEXT NOT NULL,
  overall_score DECIMAL(5,2) NOT NULL,
  distance_score DECIMAL(5,2) DEFAULT 0,
  interest_score DECIMAL(5,2) DEFAULT 0,
  compatibility_score DECIMAL(5,2) DEFAULT 0,
  activity_score DECIMAL(5,2) DEFAULT 0,
  ml_score DECIMAL(5,2) DEFAULT 0,  -- ML-predicted score
  explanation TEXT,
  factors JSONB DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  UNIQUE(user_email, match_email)
);

CREATE INDEX IF NOT EXISTS idx_match_user ON match_scores(user_email);
CREATE INDEX IF NOT EXISTS idx_match_score ON match_scores(user_email, overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_match_expires ON match_scores(expires_at);

-- User preference learning (tracks what user responds to)
CREATE TABLE IF NOT EXISTS user_preferences_learned (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL UNIQUE,
  preferred_age_range INT4RANGE,
  preferred_distance_km INTEGER,
  preferred_profile_types TEXT[] DEFAULT '{}',
  preferred_interests TEXT[] DEFAULT '{}',
  preferred_archetypes TEXT[] DEFAULT '{}',
  interaction_weights JSONB DEFAULT '{}'::jsonb,  -- Learned weights from interactions
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pref_user ON user_preferences_learned(user_email);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE collaboration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizer_analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences_learned ENABLE ROW LEVEL SECURITY;

-- Collaboration requests: Users can view/manage their own
CREATE POLICY "Users can view own collab requests"
  ON collaboration_requests FOR SELECT
  USING (
    requester_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid())
    OR creator_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can create collab requests"
  ON collaboration_requests FOR INSERT
  WITH CHECK (
    requester_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can update own collab requests"
  ON collaboration_requests FOR UPDATE
  USING (
    requester_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid())
    OR creator_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid())
  );

-- Collaborations: Public read, participants can create
CREATE POLICY "Anyone can view collaborations"
  ON collaborations FOR SELECT
  USING (true);

-- Analytics: Organizers can view their own
CREATE POLICY "Organizers can view own analytics"
  ON organizer_analytics_snapshots FOR SELECT
  USING (
    organizer_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid())
  );

-- Interactions: Users can view/create their own
CREATE POLICY "Users can view own interactions"
  ON user_interactions FOR SELECT
  USING (
    user_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can create own interactions"
  ON user_interactions FOR INSERT
  WITH CHECK (
    user_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid())
  );

-- Location clusters: Public read
CREATE POLICY "Anyone can view location clusters"
  ON location_clusters FOR SELECT
  USING (true);

-- Match scores: Users can view their own
CREATE POLICY "Users can view own match scores"
  ON match_scores FOR SELECT
  USING (
    user_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid())
  );

-- Preferences: Users can view/manage their own
CREATE POLICY "Users can view own preferences"
  ON user_preferences_learned FOR SELECT
  USING (
    user_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can update own preferences"
  ON user_preferences_learned FOR UPDATE
  USING (
    user_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid())
  );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update collaboration_requests updated_at
CREATE OR REPLACE FUNCTION update_collab_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_collab_updated_at ON collaboration_requests;
CREATE TRIGGER trigger_collab_updated_at
  BEFORE UPDATE ON collaboration_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_collab_updated_at();

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE collaboration_requests IS 'Tracks collaboration requests between creators';
COMMENT ON TABLE collaborations IS 'Completed collaborations between creators';
COMMENT ON TABLE organizer_analytics_snapshots IS 'Daily aggregated analytics for event organizers';
COMMENT ON TABLE user_interactions IS 'Tracks user interactions for ML recommendations';
COMMENT ON TABLE location_clusters IS 'Geographic clusters/hotspots for nearby recommendations';
COMMENT ON TABLE match_scores IS 'Cached compatibility scores between users';
COMMENT ON TABLE user_preferences_learned IS 'ML-learned user preferences from interactions';
