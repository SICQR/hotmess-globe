-- v6 Chunk 07: Night Operator Panel tables
-- operator_venues, operator_audit_log, safety_switches,
-- operator_system_beacons, safety_broadcasts

-- ── operator_venues ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS operator_venues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id    UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'operator'
                CHECK (role IN ('operator','manager','safety')),
  granted_by  UUID REFERENCES auth.users(id),
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at  TIMESTAMPTZ,
  UNIQUE (user_id, venue_id)
);

ALTER TABLE operator_venues ENABLE ROW LEVEL SECURITY;

-- Operators can see their own rows
CREATE POLICY "operator_venues_self_select"
  ON operator_venues FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can see all
CREATE POLICY "operator_venues_admin_select"
  ON operator_venues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can insert/update/delete
CREATE POLICY "operator_venues_admin_write"
  ON operator_venues FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── operator_audit_log ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS operator_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  venue_id    UUID,
  event_id    UUID,
  action_type TEXT NOT NULL
                CHECK (action_type IN (
                  'beacon_drop','beacon_expire','zone_update',
                  'momentum_advance','system_beacon_push','incentive_beacon',
                  'kill_switch_on','kill_switch_off','sos_broadcast','end_event'
                )),
  scope       TEXT NOT NULL DEFAULT 'venue'
                CHECK (scope IN ('venue','event','city','global')),
  payload     JSONB NOT NULL DEFAULT '{}',
  outcome     TEXT NOT NULL DEFAULT 'success'
                CHECK (outcome IN ('success','denied','error')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE operator_audit_log ENABLE ROW LEVEL SECURITY;

-- Operators see their own entries
CREATE POLICY "audit_log_self_select"
  ON operator_audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- Admins see all
CREATE POLICY "audit_log_admin_select"
  ON operator_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Authenticated users with an active operator_venues row can insert
CREATE POLICY "audit_log_operator_insert"
  ON operator_audit_log FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      EXISTS (
        SELECT 1 FROM operator_venues
        WHERE user_id = auth.uid()
          AND revoked_at IS NULL
      )
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- No UPDATE or DELETE for any role — permanent record
-- (no UPDATE/DELETE policies = blocked for all)

-- ── safety_switches ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS safety_switches (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key            TEXT NOT NULL
                   CHECK (key IN ('ghosted_grid','beacon_drops','new_messages','global')),
  scope          TEXT NOT NULL
                   CHECK (scope IN ('venue','event','city','global')),
  scope_id       UUID,
  active         BOOLEAN NOT NULL DEFAULT false,
  set_by         UUID REFERENCES auth.users(id),
  set_at         TIMESTAMPTZ,
  reason         TEXT,
  auto_expires_at TIMESTAMPTZ,
  UNIQUE (key, scope, scope_id)
);

ALTER TABLE safety_switches ENABLE ROW LEVEL SECURITY;

-- Admins and operators can read
CREATE POLICY "safety_switches_read"
  ON safety_switches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM operator_venues
      WHERE user_id = auth.uid() AND revoked_at IS NULL
    )
  );

-- Only admins write (row-level via API for venue-scoped operators)
CREATE POLICY "safety_switches_admin_write"
  ON safety_switches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── operator_system_beacons ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS operator_system_beacons (
  venue_id          UUID PRIMARY KEY REFERENCES venues(id) ON DELETE CASCADE,
  last_pushed_at    TIMESTAMPTZ,
  active_beacon_id  UUID,
  push_count_today  INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE operator_system_beacons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_beacons_operator_select"
  ON operator_system_beacons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM operator_venues
      WHERE user_id = auth.uid()
        AND venue_id = operator_system_beacons.venue_id
        AND revoked_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "system_beacons_admin_write"
  ON operator_system_beacons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── safety_broadcasts ─────────────────────────────────────────────────────────
-- SOS broadcast records (referenced in NOP spec, also by SOSPage)
CREATE TABLE IF NOT EXISTS safety_broadcasts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    UUID REFERENCES venues(id),
  event_id    UUID,
  broadcast_by UUID NOT NULL REFERENCES auth.users(id),
  message     TEXT NOT NULL DEFAULT 'Safety alert from venue staff.',
  radius_m    INTEGER NOT NULL DEFAULT 500,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE safety_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "safety_broadcasts_admin_select"
  ON safety_broadcasts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
    OR auth.uid() = broadcast_by
  );

CREATE POLICY "safety_broadcasts_insert"
  ON safety_broadcasts FOR INSERT
  WITH CHECK (auth.uid() = broadcast_by);

-- ── Index for kill-switch middleware lookups ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_safety_switches_key_scope
  ON safety_switches (key, scope, scope_id);

CREATE INDEX IF NOT EXISTS idx_operator_audit_log_venue
  ON operator_audit_log (venue_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operator_venues_user
  ON operator_venues (user_id, revoked_at);
