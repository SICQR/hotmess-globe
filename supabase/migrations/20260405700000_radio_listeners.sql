-- Radio listeners tracking table for LIVE MODE
-- Records which users are actively listening to which radio shows.
-- Rows auto-expire when the user stops listening (expires_at set).

CREATE TABLE IF NOT EXISTS radio_listeners (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  show_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NULL,
  PRIMARY KEY (user_id, show_id)
);

ALTER TABLE radio_listeners ENABLE ROW LEVEL SECURITY;

-- Users can read all listener records (needed for LIVE MODE counts)
CREATE POLICY "Anyone can read radio listeners"
  ON radio_listeners FOR SELECT
  USING (true);

-- Users can only manage their own listener state
CREATE POLICY "Users manage own listener state"
  ON radio_listeners FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own listener state"
  ON radio_listeners FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own listener state"
  ON radio_listeners FOR DELETE
  USING (auth.uid() = user_id);

-- Index for efficient querying of active listeners
CREATE INDEX IF NOT EXISTS idx_radio_listeners_active
  ON radio_listeners (updated_at DESC)
  WHERE expires_at IS NULL OR expires_at > now();

-- Add live_mode columns to user_presence if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_presence' AND column_name = 'live_mode') THEN
    ALTER TABLE user_presence ADD COLUMN live_mode BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_presence' AND column_name = 'live_context_type') THEN
    ALTER TABLE user_presence ADD COLUMN live_context_type TEXT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_presence' AND column_name = 'live_venue_slug') THEN
    ALTER TABLE user_presence ADD COLUMN live_venue_slug TEXT NULL;
  END IF;
END $$;
