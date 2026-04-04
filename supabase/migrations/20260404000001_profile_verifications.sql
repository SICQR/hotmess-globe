-- Profile verifications table for selfie/liveness/ID verification
CREATE TABLE IF NOT EXISTS profile_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('selfie', 'liveness', 'id_document', 'manual')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  selfie_url TEXT,
  pose_challenge TEXT,
  reviewer_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '1 year'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_profile_verifications_user_id ON profile_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_verifications_status ON profile_verifications(status);

-- RLS: users can insert and read their own verifications
ALTER TABLE profile_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own verifications"
  ON profile_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own verifications"
  ON profile_verifications FOR SELECT
  USING (auth.uid() = user_id);

-- Photo moderation events table
CREATE TABLE IF NOT EXISTS photo_moderation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID REFERENCES profile_photos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('auto_flagged', 'user_reported', 'admin_reviewed', 'approved', 'rejected')),
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photo_moderation_user ON photo_moderation_events(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_moderation_photo ON photo_moderation_events(photo_id);

ALTER TABLE photo_moderation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can report photos"
  ON photo_moderation_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own moderation events"
  ON photo_moderation_events FOR SELECT
  USING (auth.uid() = user_id);

-- Add verification columns to profiles if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_verified') THEN
    ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verification_level') THEN
    ALTER TABLE profiles ADD COLUMN verification_level TEXT DEFAULT 'none' CHECK (verification_level IN ('none', 'basic', 'full'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verified_at') THEN
    ALTER TABLE profiles ADD COLUMN verified_at TIMESTAMPTZ;
  END IF;
END $$;
