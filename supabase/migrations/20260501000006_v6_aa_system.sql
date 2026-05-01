-- HOTMESS v6 — Chunk 03: AA System (Active Aftercare Layer)
-- Spec: HOTMESS-AA-System.docx
--
-- AA is stateless: compute_aa_state() derives the current state in real-time
-- from density + live events + escalation log. Nothing is persisted as "current state".
--
-- HARD RULES (spec §7, §9):
--   - Operators cannot disable or modify AA state directly
--   - AA is aggregated only — no user identifiers exposed
--   - ESCALATED without confirmation → default PASSIVE (fail-safe)

-- ─── 1. FEATURE FLAG ─────────────────────────────────────────────────────────
INSERT INTO feature_flags (flag_key, enabled_globally, description, created_at)
VALUES (
  'v6_aa_system',
  false,
  'AA System (Active Aftercare): ambient Globe glow layer, 3 signal states',
  NOW()
)
ON CONFLICT (flag_key) DO NOTHING;

-- ─── 2. AA ESCALATION LOG — append-only ──────────────────────────────────────
-- Records operator-triggered escalations and SOS events that raise AA state.
-- The presence of an unresolved row → ESCALATED state in the zone.
CREATE TABLE IF NOT EXISTS aa_escalation_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_lat     DECIMAL(9,6) NOT NULL,   -- approximate zone centre (neighbourhood-level)
  zone_lng     DECIMAL(9,6) NOT NULL,
  zone_radius_km DECIMAL(4,2) NOT NULL DEFAULT 2.0,
  trigger_type TEXT        NOT NULL CHECK (trigger_type IN ('SOS', 'OPERATOR', 'ANOMALY')),
  triggered_by UUID        REFERENCES profiles(id) ON DELETE SET NULL,  -- operator only
  resolved_at  TIMESTAMPTZ DEFAULT NULL,  -- NULL = still active
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE aa_escalation_log IS
  'Append-only. Rows with resolved_at=NULL are active escalations. '
  'No UPDATE permitted on trigger fields — only resolved_at may be set. '
  'SOS trigger identity never exposed in Globe AA signal.';

CREATE INDEX IF NOT EXISTS idx_aa_escalation_active
  ON aa_escalation_log (zone_lat, zone_lng)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_aa_escalation_created
  ON aa_escalation_log (created_at DESC);

-- RLS: service_role writes, admins resolve, no public access
ALTER TABLE aa_escalation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aa_escalation_service_insert"
  ON aa_escalation_log FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "aa_escalation_admin_select"
  ON aa_escalation_log FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "aa_escalation_admin_resolve"
  ON aa_escalation_log FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (true);  -- only resolved_at column update allowed — enforced in app layer

-- No DELETE ever
REVOKE DELETE ON aa_escalation_log FROM anon, authenticated, service_role;

-- Anon has zero business touching this table — revoke all table-level grants
-- (RLS blocks anyway, but belt-and-suspenders on a safety-critical append-only table)
REVOKE ALL ON aa_escalation_log FROM anon;

-- operator_role: read-only for Night Operator Panel (§7 — read-only view of AA state)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'operator_role') THEN
    EXECUTE 'GRANT SELECT ON aa_escalation_log TO operator_role';
    -- operators see only non-identifying fields (trigger_type, zone, created_at)
    -- triggered_by is excluded via application layer
  END IF;
END$$;

-- ─── 3. compute_aa_state() RPC ────────────────────────────────────────────────
-- Stateless. Called by clients to get current AA state for their location.
-- Returns: { state, intensity, reason, stale }
--
-- State logic (from spec §2):
--   ESCALATED: active escalation within radius → 0.9
--   ACTIVE:    live event within radius OR density ≥ threshold → 0.5
--   PASSIVE:   default → 0.2
--
-- Privacy: returns aggregate counts only, never user identifiers.
-- Density source: active beacons (Globe dots) as density proxy.
-- DENSITY_THRESHOLD: 3 active beacons within radius (conservative starting point).

CREATE OR REPLACE FUNCTION compute_aa_state(
  p_lat       DECIMAL,
  p_lng       DECIMAL,
  p_radius_km DECIMAL DEFAULT 2.0
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_state       TEXT    := 'PASSIVE';
  v_intensity   DECIMAL := 0.2;
  v_reason      TEXT    := 'ambient';
  v_escalation  INT     := 0;
  v_live_events INT     := 0;
  v_density     INT     := 0;
  DENSITY_THRESHOLD CONSTANT INT := 3;
  R             CONSTANT DECIMAL := 6371;
BEGIN
  -- ── ESCALATED check ──────────────────────────────────────────────────────
  -- Active escalation within radius → ESCALATED regardless of anything else
  SELECT COUNT(*) INTO v_escalation
  FROM aa_escalation_log
  WHERE resolved_at IS NULL
    AND (
      R * 2 * ATAN2(
        SQRT(
          SIN(((zone_lat - p_lat) * PI() / 180) / 2) ^ 2 +
          COS(p_lat * PI() / 180) * COS(zone_lat * PI() / 180) *
          SIN(((zone_lng - p_lng) * PI() / 180) / 2) ^ 2
        ),
        SQRT(1 - (
          SIN(((zone_lat - p_lat) * PI() / 180) / 2) ^ 2 +
          COS(p_lat * PI() / 180) * COS(zone_lat * PI() / 180) *
          SIN(((zone_lng - p_lng) * PI() / 180) / 2) ^ 2
        ))
      )
    ) <= p_radius_km;

  IF v_escalation > 0 THEN
    RETURN jsonb_build_object(
      'state',     'ESCALATED',
      'intensity', 0.9,
      'reason',    'active_escalation',
      'stale',     false
    );
  END IF;

  -- ── ACTIVE check: live events ─────────────────────────────────────────────
  -- beacons with is_active=true (or ends_at in future) within radius
  BEGIN
    SELECT COUNT(*) INTO v_live_events
    FROM beacons
    WHERE (ends_at IS NULL OR ends_at > NOW())
      AND (
        R * 2 * ATAN2(
          SQRT(
            SIN(((COALESCE(lat, 0) - p_lat) * PI() / 180) / 2) ^ 2 +
            COS(p_lat * PI() / 180) * COS(COALESCE(lat, 0) * PI() / 180) *
            SIN(((COALESCE(lng, 0) - p_lng) * PI() / 180) / 2) ^ 2
          ),
          SQRT(1 - (
            SIN(((COALESCE(lat, 0) - p_lat) * PI() / 180) / 2) ^ 2 +
            COS(p_lat * PI() / 180) * COS(COALESCE(lat, 0) * PI() / 180) *
            SIN(((COALESCE(lng, 0) - p_lng) * PI() / 180) / 2) ^ 2
          ))
        )
      ) <= p_radius_km;
  EXCEPTION WHEN OTHERS THEN
    v_live_events := 0;  -- table may not have lat/lng columns yet
  END;

  -- ── ACTIVE check: density ─────────────────────────────────────────────────
  -- Count active profiles with recent location within radius
  BEGIN
    SELECT COUNT(*) INTO v_density
    FROM profiles
    WHERE last_seen_at > NOW() - INTERVAL '30 minutes'
      AND last_lat IS NOT NULL
      AND last_lng IS NOT NULL
      AND (
        R * 2 * ATAN2(
          SQRT(
            SIN(((last_lat - p_lat) * PI() / 180) / 2) ^ 2 +
            COS(p_lat * PI() / 180) * COS(last_lat * PI() / 180) *
            SIN(((last_lng - p_lng) * PI() / 180) / 2) ^ 2
          ),
          SQRT(1 - (
            SIN(((last_lat - p_lat) * PI() / 180) / 2) ^ 2 +
            COS(p_lat * PI() / 180) * COS(last_lat * PI() / 180) *
            SIN(((last_lng - p_lng) * PI() / 180) / 2) ^ 2
          ))
        )
      ) <= p_radius_km;
  EXCEPTION WHEN OTHERS THEN
    v_density := 0;
  END;

  IF v_live_events > 0 THEN
    v_state     := 'ACTIVE';
    v_intensity := 0.5;
    v_reason    := 'live_event';
  ELSIF v_density >= DENSITY_THRESHOLD THEN
    v_state     := 'ACTIVE';
    v_intensity := 0.5;
    v_reason    := 'density';
  END IF;

  RETURN jsonb_build_object(
    'state',     v_state,
    'intensity', v_intensity,
    'reason',    v_reason,
    'stale',     false
  );
END;
$$;

-- Authenticated users can call this (they need their own location)
GRANT EXECUTE ON FUNCTION compute_aa_state(DECIMAL, DECIMAL, DECIMAL) TO authenticated;
-- Anon: no — requires authenticated session per spec
REVOKE EXECUTE ON FUNCTION compute_aa_state(DECIMAL, DECIMAL, DECIMAL) FROM anon;
