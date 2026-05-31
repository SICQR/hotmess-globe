-- ============================================================================
-- 20260531120000_atmosphere_handoff_substrate.sql
--
-- Convergence Slice v1 — Infra PR 1.
--
-- D22 §4 Irreversibility Rule + D33 Memory & Permanence + D34 §4.7,
-- embodied at the schema layer.
--
-- GOVERNANCE THROUGH SHAPE, NOT GOVERNANCE THROUGH INTENTION.
--
-- This migration establishes the atmosphere schema as the substrate for
-- D22 atmospheric memory. The handoff_residue table is the only persistent
-- trace of convergence handoffs. By construction, it CANNOT be joined back
-- to a user, a beacon, a precise venue, or a precise moment. The columns
-- required for that reconstruction do not exist. A future engineer who
-- wants to reverse the forgetting has to ALTER TABLE first — a visible,
-- reviewable, doctrinal act.
--
-- D22 framing: forward secrecy for social presence. Once a handoff has
-- been recorded into this table, the source primitives (actor_id,
-- target_id, beacon_id, exact venue label, exact timestamp) have been
-- destroyed at the substrate boundary. No future query can reconstruct
-- them from this table alone.
--
-- TEST FOR THE NEXT CONTRIBUTOR: if you want to add a column to this table
-- for ranking, debugging, attribution, or trust scoring — you are asking
-- to reverse constitutional forgetting. The correct answer is no.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS atmosphere;

REVOKE ALL ON SCHEMA atmosphere FROM PUBLIC;
REVOKE ALL ON SCHEMA atmosphere FROM anon, authenticated;
GRANT USAGE ON SCHEMA atmosphere TO authenticated;
GRANT USAGE ON SCHEMA atmosphere TO service_role;

-- ----------------------------------------------------------------------------
-- atmosphere.handoff_residue — aggregate counter table.
-- Columns are exhaustive. The ABSENCE of identifying columns IS the doctrine.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS atmosphere.handoff_residue (
  hour_bucket        timestamptz NOT NULL,
  venue_class        text NOT NULL,
  beacon_kind        text NOT NULL CHECK (beacon_kind IN ('ticket','preloved','other')),
  resolution_state   text NOT NULL CHECK (resolution_state IN (
    'passed_on','sorted','covered','claimed',
    'going_together','heading_there','picked_up','handed_over'
  )),
  count              integer NOT NULL DEFAULT 1 CHECK (count > 0),
  PRIMARY KEY (hour_bucket, venue_class, beacon_kind, resolution_state)
);

COMMENT ON TABLE atmosphere.handoff_residue IS
  'D22 §4 atmospheric residue. Aggregate-only. No identifying columns by design. Write path is atmosphere.record_handoff() exclusively.';

REVOKE ALL ON atmosphere.handoff_residue FROM PUBLIC;
REVOKE ALL ON atmosphere.handoff_residue FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON atmosphere.handoff_residue TO service_role;

-- RLS on, zero policies = locked to client roles. service_role bypasses RLS.
ALTER TABLE atmosphere.handoff_residue ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS handoff_residue_recent_idx
  ON atmosphere.handoff_residue (hour_bucket DESC, venue_class);

-- ----------------------------------------------------------------------------
-- atmosphere._classify_venue — coarse venue bucketing.
-- The ONLY function in the substrate that touches a raw venue label.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION atmosphere._classify_venue(p_venue_label text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_venue_label IS NULL OR p_venue_label = '' THEN 'unknown'
    WHEN p_venue_label ILIKE ANY (ARRAY['%fold%','%fire%','%eagle%','%xxl%','%dalston superstore%','%vauxhall%','%berghain%','%queer%','%club%']) THEN 'nightlife'
    WHEN p_venue_label ILIKE ANY (ARRAY['%cafe%','%coffee%','%brunch%','%bakery%']) THEN 'daytime_social'
    WHEN p_venue_label ILIKE ANY (ARRAY['%home%','%flat%','%residence%']) THEN 'residential'
    WHEN p_venue_label ILIKE ANY (ARRAY['%tube%','%station%','%bus%','%train%']) THEN 'transit'
    WHEN p_venue_label ILIKE ANY (ARRAY['%shop%','%store%','%market%','%boutique%']) THEN 'retail'
    WHEN p_venue_label ILIKE ANY (ARRAY['%care%','%aftercare%','%recovery%','%sauna%','%gym%']) THEN 'care'
    WHEN p_venue_label ILIKE ANY (ARRAY['%park%','%common%','%heath%','%canal%','%square%']) THEN 'outdoor'
    ELSE 'unknown'
  END;
$$;

REVOKE ALL ON FUNCTION atmosphere._classify_venue(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION atmosphere._classify_venue(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION atmosphere._classify_venue(text) TO service_role;

-- ----------------------------------------------------------------------------
-- atmosphere.record_handoff — THE ONLY write path into handoff_residue.
-- Exhaustive 3-arg signature. SECURITY DEFINER, locked search_path.
-- Time quantised to hour, venue bucketed at boundary, raw inputs destroyed.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION atmosphere.record_handoff(
  p_venue_label      text,
  p_beacon_kind      text,
  p_resolution_state text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = atmosphere, pg_temp
AS $$
DECLARE
  v_hour  timestamptz := date_trunc('hour', now());
  v_class text;
BEGIN
  IF p_beacon_kind NOT IN ('ticket','preloved','other') THEN
    RETURN;
  END IF;
  IF p_resolution_state NOT IN (
    'passed_on','sorted','covered','claimed',
    'going_together','heading_there','picked_up','handed_over'
  ) THEN
    RETURN;
  END IF;

  v_class := atmosphere._classify_venue(p_venue_label);

  INSERT INTO atmosphere.handoff_residue (hour_bucket, venue_class, beacon_kind, resolution_state, count)
  VALUES (v_hour, v_class, p_beacon_kind, p_resolution_state, 1)
  ON CONFLICT (hour_bucket, venue_class, beacon_kind, resolution_state)
  DO UPDATE SET count = atmosphere.handoff_residue.count + 1;
END;
$$;

COMMENT ON FUNCTION atmosphere.record_handoff(text, text, text) IS
  'D22 §4 substrate write boundary. Quantises time to hour, classifies venue, destroys identifying inputs.';

REVOKE ALL ON FUNCTION atmosphere.record_handoff(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION atmosphere.record_handoff(text, text, text) TO authenticated, service_role;

-- ============================================================================
-- public.record_handoff_atmosphere — PostgREST-facing wrapper.
--
-- The atmosphere schema is deliberately not exposed to PostgREST. This
-- wrapper forwards the three bucketed primitives across the schema boundary.
-- Signature is identical to atmosphere.record_handoff. Adding a parameter
-- here without also adding it to the underlying function is a runtime
-- error. That coupling is intentional.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.record_handoff_atmosphere(
  p_venue_label      text,
  p_beacon_kind      text,
  p_resolution_state text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, atmosphere, pg_temp
AS $$
BEGIN
  PERFORM atmosphere.record_handoff(p_venue_label, p_beacon_kind, p_resolution_state);
END;
$$;

COMMENT ON FUNCTION public.record_handoff_atmosphere(text, text, text) IS
  'PostgREST-facing wrapper for atmosphere.record_handoff. Exhaustive 3-arg signature.';

REVOKE ALL ON FUNCTION public.record_handoff_atmosphere(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_handoff_atmosphere(text, text, text) TO authenticated, anon, service_role;
