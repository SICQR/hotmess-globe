-- Migration: Add Stories and Location Shares tables
-- Date: 2026-01-28

-- =============================================================================
-- STORIES TABLE (24-hour ephemeral content)
-- =============================================================================

CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'text')),
  text TEXT,
  caption TEXT,
  viewed_by UUID[] DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  CONSTRAINT valid_media CHECK (
    (media_type IN ('image', 'video') AND media_url IS NOT NULL) OR
    (media_type = 'text' AND text IS NOT NULL)
  )
);

-- Index for fetching active stories
CREATE INDEX IF NOT EXISTS idx_stories_active 
  ON stories(user_id, created_at DESC) 
  WHERE expires_at > NOW();

-- Index for expiry cleanup
CREATE INDEX IF NOT EXISTS idx_stories_expiry 
  ON stories(expires_at);

-- RLS for stories
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Users can view non-expired stories
CREATE POLICY "stories_select" ON stories
  FOR SELECT
  USING (expires_at > NOW());

-- Users can create their own stories
CREATE POLICY "stories_insert" ON stories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own stories (mark as viewed)
CREATE POLICY "stories_update" ON stories
  FOR UPDATE
  USING (true);

-- Users can delete their own stories
CREATE POLICY "stories_delete" ON stories
  FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- LOCATION SHARES TABLE (Live location sharing)
-- =============================================================================

CREATE TABLE IF NOT EXISTS location_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_ids UUID[] NOT NULL DEFAULT '{}',
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  last_update TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active shares
CREATE INDEX IF NOT EXISTS idx_location_shares_active 
  ON location_shares(user_id, active) 
  WHERE active = true;

-- Index for contact lookup
CREATE INDEX IF NOT EXISTS idx_location_shares_contacts 
  ON location_shares USING GIN(contact_ids);

-- RLS for location shares
ALTER TABLE location_shares ENABLE ROW LEVEL SECURITY;

-- Users can see shares where they are owner or contact
CREATE POLICY "location_shares_select" ON location_shares
  FOR SELECT
  USING (
    auth.uid() = user_id OR 
    auth.uid() = ANY(contact_ids)
  );

-- Users can create their own shares
CREATE POLICY "location_shares_insert" ON location_shares
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own shares
CREATE POLICY "location_shares_update" ON location_shares
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own shares
CREATE POLICY "location_shares_delete" ON location_shares
  FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- VOICE MESSAGES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS voice_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  waveform_data JSONB,
  transcription TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for message lookup
CREATE INDEX IF NOT EXISTS idx_voice_messages_message 
  ON voice_messages(message_id);

-- RLS for voice messages
ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;

-- Inherit permissions from parent message
CREATE POLICY "voice_messages_select" ON voice_messages
  FOR SELECT
  USING (true);

CREATE POLICY "voice_messages_insert" ON voice_messages
  FOR INSERT
  WITH CHECK (true);

-- =============================================================================
-- USER PROFILE ADDITIONS (Face verification, etc.)
-- =============================================================================

-- Add new columns to User table if they don't exist
DO $$ 
BEGIN
  -- Face verification columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'face_verified') THEN
    ALTER TABLE "User" ADD COLUMN face_verified BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'face_verified_at') THEN
    ALTER TABLE "User" ADD COLUMN face_verified_at TIMESTAMPTZ;
  END IF;
  
  -- Telegram integration columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'telegram_id') THEN
    ALTER TABLE "User" ADD COLUMN telegram_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'telegram_first_name') THEN
    ALTER TABLE "User" ADD COLUMN telegram_first_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'telegram_photo_url') THEN
    ALTER TABLE "User" ADD COLUMN telegram_photo_url TEXT;
  END IF;
END $$;

-- =============================================================================
-- CLEANUP FUNCTION FOR EXPIRED STORIES
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS void AS $$
BEGIN
  DELETE FROM stories WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run daily via pg_cron if available)
-- SELECT cron.schedule('cleanup-stories', '0 0 * * *', 'SELECT cleanup_expired_stories()');

-- =============================================================================
-- CLEANUP FUNCTION FOR EXPIRED LOCATION SHARES
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_location_shares()
RETURNS void AS $$
BEGIN
  UPDATE location_shares 
  SET active = false 
  WHERE active = true AND end_time < NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE stories IS 'Ephemeral content that expires after 24 hours (Stories feature)';
COMMENT ON TABLE location_shares IS 'Live location sharing sessions with trusted contacts (Safety feature)';
COMMENT ON TABLE voice_messages IS 'Voice note attachments for messages';
