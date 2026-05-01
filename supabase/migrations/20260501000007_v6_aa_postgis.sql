-- HOTMESS v6 — Chunk 03 follow-up: AA System PostGIS upgrade
-- Fixes three issues found during co-founder review:
--
--   1. BUGFIX: beacons query used wrong column names (lat/lng → latitude/longitude).
--      ACTIVE state from live events has never fired. Silent bug.
--
--   2. PERF: profiles density check was Haversine over float8 cols.
--      profiles has a geography column (location) — use ST_DWithin with GiST index.
--
--   3. CORRECTNESS: all Haversine replaced with PostGIS ST_DWithin.
--      Haversine in SQL is functional but inconsistent with the codebase
--      (PostGIS 3.3 already live). ST_DWithin is index-eligible and accurate.
--
-- aa_escalation_log has very few rows in practice — inline ST_MakePoint is fine.
-- beacons: no stored geography col, compute inline (few live events at any time).
-- profiles: existing `location geography` col — add GiST index here.

-- ─── 1. GiST index on profiles.location ──────────────────────────────────────
-- Enables ST_DWithin to use the index for density queries.
-- Non-concurrent CREATE INDEX is safe in a migration context.
CREATE INDEX IF NOT EXISTS idx_profiles_location_gist
  ON profiles USING GIST (location);

-- ─── 2. Replace compute_aa_state — PostGIS version ───────────────────────────
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

  -- Pre-compute caller's point once — reused in all three checks
  v_point   geography := ST_MakePoint(p_lng::float8, p_lat::float8)::geography;
  v_radius  DECIMAL   := p_radius_km * 1000.0;   -- metres
BEGIN
  -- ── ESCALATED check ──────────────────────────────────────────────────────
  -- Active escalation within radius → ESCALATED regardless of anything else.
  -- aa_escalation_log has very few active rows; inline ST_MakePoint is fine.
  SELECT COUNT(*) INTO v_escalation
  FROM aa_escalation_log
  WHERE resolved_at IS NULL
    AND ST_DWithin(
      ST_MakePoint(zone_lng::float8, zone_lat::float8)::geography,
      v_point,
      v_radius
    );

  IF v_escalation > 0 THEN
    RETURN jsonb_build_object(
      'state',     'ESCALATED',
      'intensity', 0.9,
      'reason',    'active_escalation',
      'stale',     false
    );
  END IF;

  -- ── ACTIVE check: live events ─────────────────────────────────────────────
  -- FIX: beacons uses `latitude`/`longitude` columns, not `lat`/`lng`.
  -- The previous Haversine version silently caught column-not-found and
  -- always returned v_live_events = 0. This is the fix.
  BEGIN
    SELECT COUNT(*) INTO v_live_events
    FROM beacons
    WHERE (ends_at IS NULL OR ends_at > NOW())
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND ST_DWithin(
        ST_MakePoint(longitude::float8, latitude::float8)::geography,
        v_point,
        v_radius
      );
  EXCEPTION WHEN OTHERS THEN
    v_live_events := 0;  -- defensive: schema may change
  END;

  -- ── ACTIVE check: density ─────────────────────────────────────────────────
  -- Uses profiles.location geography column + GiST index (idx_profiles_location_gist).
  -- ST_DWithin with a geography index is significantly faster than Haversine
  -- over float8 columns at scale.
  BEGIN
    SELECT COUNT(*) INTO v_density
    FROM profiles
    WHERE last_seen_at > NOW() - INTERVAL '30 minutes'
      AND location IS NOT NULL
      AND ST_DWithin(location, v_point, v_radius);
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

-- Re-apply grants (CREATE OR REPLACE can drop them in some PG versions)
GRANT EXECUTE ON FUNCTION compute_aa_state(DECIMAL, DECIMAL, DECIMAL) TO authenticated;
REVOKE EXECUTE ON FUNCTION compute_aa_state(DECIMAL, DECIMAL, DECIMAL) FROM anon;
