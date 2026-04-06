-- Movement sessions — first-class presence state for HOTMESS
-- Users share approximate journeys; others can intercept with Boo/Message/Suggest Stop

-- Movement sessions
CREATE TABLE IF NOT EXISTS movement_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  origin_area TEXT,
  destination_label TEXT,
  destination_place_id UUID NULL,
  eta_minutes INTEGER,
  visibility TEXT NOT NULL DEFAULT 'chats_only'
    CHECK (visibility IN ('off', 'chats_only', 'live_mode', 'public_live')),
  share_until TEXT NOT NULL DEFAULT 'arrival'
    CHECK (share_until IN ('15_min', '30_min', '60_min', 'arrival')),
  active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE movement_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own movement" ON movement_sessions FOR ALL USING (auth.uid() = user_id);

-- Index for active sessions lookup
CREATE INDEX IF NOT EXISTS idx_movement_sessions_active ON movement_sessions (active, user_id) WHERE active = true;

-- Movement updates (coarse position breadcrumbs)
CREATE TABLE IF NOT EXISTS movement_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES movement_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approx_lat DOUBLE PRECISION,
  approx_lng DOUBLE PRECISION,
  heading_degrees INTEGER,
  eta_minutes INTEGER,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE movement_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own updates" ON movement_updates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Read visible updates" ON movement_updates FOR SELECT USING (true);

-- Index for latest update per session
CREATE INDEX IF NOT EXISTS idx_movement_updates_session ON movement_updates (session_id, timestamp DESC);

-- Safe public view — joins session + latest update + profile, privacy-filtered
CREATE OR REPLACE VIEW public_movement_presence AS
SELECT
  ms.id AS session_id,
  ms.user_id,
  p.display_name,
  p.avatar_url,
  p.verified AS is_verified,
  ms.origin_area,
  ms.destination_label,
  ms.eta_minutes,
  ms.visibility,
  ms.started_at,
  mu.approx_lat,
  mu.approx_lng,
  mu.heading_degrees,
  mu.eta_minutes AS latest_eta,
  mu.timestamp AS last_update
FROM movement_sessions ms
JOIN profiles p ON p.id = ms.user_id
LEFT JOIN LATERAL (
  SELECT * FROM movement_updates
  WHERE session_id = ms.id
  ORDER BY timestamp DESC LIMIT 1
) mu ON true
WHERE ms.active = true
  AND (ms.expires_at IS NULL OR ms.expires_at > now())
  AND ms.stopped_at IS NULL
  AND ms.arrived_at IS NULL
  AND p.is_visible = true;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_movement_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_movement_updated ON movement_sessions;
CREATE TRIGGER trg_movement_updated BEFORE UPDATE ON movement_sessions
  FOR EACH ROW EXECUTE FUNCTION update_movement_updated_at();
