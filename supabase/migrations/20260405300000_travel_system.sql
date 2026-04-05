-- HOTMESS Travel System — Location → Route → Book → Share → Arrive
-- Tables: travel_sessions, travel_updates, travel_preferences
-- Run on prod (rfoftonnlwudilafhfkl)

-- ════════════════════════════════════════════════════════════════��══
-- travel_sessions — one row per journey attempt
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS travel_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_thread_id uuid REFERENCES chat_threads(id) ON DELETE SET NULL,
  -- Destination
  destination_type text NOT NULL DEFAULT 'postcode', -- postcode | venue | pin | pulse_place
  destination_label text NOT NULL,
  destination_lat double precision,
  destination_lng double precision,
  -- Origin
  origin_lat double precision,
  origin_lng double precision,
  -- Route
  mode text NOT NULL DEFAULT 'ride', -- walk | bike | ride
  provider text, -- uber | bolt | lime | santander | null
  eta_minutes integer,
  estimated_cost_min numeric(8,2),
  estimated_cost_max numeric(8,2),
  distance_km numeric(8,2),
  -- State
  status text NOT NULL DEFAULT 'created', -- created | routing | booked | en_route | nearby | arrived | cancelled
  share_mode text NOT NULL DEFAULT 'eta_only', -- off | eta_only | live_journey
  -- Sharing
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider_booking_ref text,
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '4 hours'),
  arrived_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_travel_sessions_user ON travel_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_sessions_status ON travel_sessions(status) WHERE status NOT IN ('arrived', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_travel_sessions_recipient ON travel_sessions(recipient_user_id) WHERE recipient_user_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════
-- travel_updates — status changes + ETA updates during journey
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS travel_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  travel_session_id uuid NOT NULL REFERENCES travel_sessions(id) ON DELETE CASCADE,
  status text NOT NULL, -- routing | booked | en_route | nearby | arrived | cancelled | eta_update
  eta_minutes integer,
  message text, -- "Driver assigned" / "2 min away" / custom
  provider_payload jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_updates_session ON travel_updates(travel_session_id);

-- ═══════════════════════════════════════════════════════════════════
-- travel_preferences — per-user defaults
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS travel_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  share_default text NOT NULL DEFAULT 'eta_only', -- off | eta_only | live_journey
  route_visibility text NOT NULL DEFAULT 'eta_only', -- eta_only | live_route | ask
  preferred_modes text[] NOT NULL DEFAULT '{ride,walk}',
  auto_share_mode text NOT NULL DEFAULT 'ask', -- off | ask | trusted_only
  safety_overlay_enabled boolean NOT NULL DEFAULT false,
  preferred_ride_provider text, -- uber | bolt | null
  preferred_bike_provider text, -- lime | santander | null
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- RLS Policies
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE travel_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_preferences ENABLE ROW LEVEL SECURITY;

-- travel_sessions: owner full access, recipient read-only if shared
CREATE POLICY travel_sessions_owner ON travel_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY travel_sessions_recipient ON travel_sessions
  FOR SELECT USING (
    auth.uid() = recipient_user_id
    AND share_mode != 'off'
    AND status NOT IN ('cancelled')
    AND expires_at > now()
  );

-- travel_updates: readable if you own the session or are the recipient
CREATE POLICY travel_updates_read ON travel_updates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM travel_sessions ts
      WHERE ts.id = travel_updates.travel_session_id
      AND (ts.user_id = auth.uid() OR (ts.recipient_user_id = auth.uid() AND ts.share_mode != 'off'))
    )
  );

CREATE POLICY travel_updates_write ON travel_updates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM travel_sessions ts
      WHERE ts.id = travel_updates.travel_session_id
      AND ts.user_id = auth.uid()
    )
  );

-- travel_preferences: own data only
CREATE POLICY travel_prefs_owner ON travel_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Service role bypass for all tables
CREATE POLICY travel_sessions_service ON travel_sessions
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY travel_updates_service ON travel_updates
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY travel_prefs_service ON travel_preferences
  FOR ALL USING (auth.role() = 'service_role');
