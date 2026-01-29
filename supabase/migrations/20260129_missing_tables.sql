-- ============================================================================
-- Missing Tables Migration
-- Run this in Supabase SQL Editor to create tables that are causing 400/404 errors
-- ============================================================================

-- 1. USER STREAKS (Gamification - daily activity tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_activity_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks" ON user_streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks" ON user_streaks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streaks" ON user_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. STORIES (Ephemeral 24-hour content)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image', -- 'image' or 'video'
  caption TEXT,
  views_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-expired stories" ON stories
  FOR SELECT USING (expires_at > now());

CREATE POLICY "Users can create own stories" ON stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories" ON stories
  FOR DELETE USING (auth.uid() = user_id);

-- 3. USER VIBES (AI-generated personality profiles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_vibes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  vibe_summary TEXT,
  personality_tags TEXT[],
  compatibility_vector JSONB,
  energy_level TEXT, -- 'chill', 'moderate', 'high', 'chaotic'
  social_style TEXT, -- 'introvert', 'ambivert', 'extrovert'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_vibes_email ON user_vibes(user_email);

ALTER TABLE user_vibes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vibes" ON user_vibes
  FOR SELECT USING (true);

CREATE POLICY "Users can update own vibes" ON user_vibes
  FOR ALL USING (auth.uid() = user_id);

-- 4. BEACON CHECK-INS (Location/event check-ins)
-- ============================================================================
CREATE TABLE IF NOT EXISTS beacon_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beacon_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  checked_in_at TIMESTAMPTZ DEFAULT now(),
  checked_out_at TIMESTAMPTZ,
  created_date TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_beacon_checkins_user ON beacon_check_ins(user_email);
CREATE INDEX IF NOT EXISTS idx_beacon_checkins_beacon ON beacon_check_ins(beacon_id);

ALTER TABLE beacon_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own check-ins" ON beacon_check_ins
  FOR SELECT USING (auth.uid() = user_id OR user_email = auth.email());

CREATE POLICY "Users can create own check-ins" ON beacon_check_ins
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_email = auth.email());

-- 5. STORY VIEWS (Track who viewed stories)
-- ============================================================================
CREATE TABLE IF NOT EXISTS story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Story owners can see views" ON story_views
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM stories WHERE stories.id = story_id AND stories.user_id = auth.uid())
  );

CREATE POLICY "Users can record views" ON story_views
  FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- ============================================================================
-- DONE! Tables created with RLS policies.
-- ============================================================================
