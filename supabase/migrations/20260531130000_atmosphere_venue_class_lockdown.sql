-- ============================================================================
-- 20260531130000_atmosphere_venue_class_lockdown.sql
--
-- Convergence Slice v1 — Infra PR 2 (hardening follow-up to PR #739).
--
-- Lock the venue classifier output domain at the type level.
--
-- WHY:
-- The atmosphere.handoff_residue table previously declared venue_class as
-- text. The CHECK constraint validated beacon_kind and resolution_state
-- only. Without an explicit boundary on venue_class, a future contributor
-- extending _classify_venue could add a finer-grained label (e.g.
-- 'fold_club' instead of 'nightlife') and smuggle individual venue
-- identity back through a class that LOOKS coarse but isn't. The
-- classifier was the only soft spot in the substrate chain.
--
-- THIS MIGRATION:
-- Moves venue_class onto a fixed PostgreSQL enum (atmosphere.venue_class_kind).
-- Adding a class now requires ALTER TYPE — a visible, reviewable, doctrinal
-- act in a migration file. The class SET is the doctrinal contract; the
-- classifier function is the implementation.
--
-- TEST FOR THE NEXT CONTRIBUTOR: if you find yourself wanting to add a
-- new enum value to atmosphere.venue_class_kind, ask whether the new value
-- is genuinely coarse atmospheric texture, or whether it sneaks venue
-- identity back through the substrate. The doctrinal check: would the
-- new value distinguish "Eagle London" from "Fold" inside the residue
-- table? If yes, refuse it.
-- ============================================================================

CREATE TYPE atmosphere.venue_class_kind AS ENUM (
  'unknown',
  'nightlife',
  'daytime_social',
  'residential',
  'transit',
  'retail',
  'care',
  'outdoor'
);

ALTER TABLE atmosphere.handoff_residue
  ALTER COLUMN venue_class TYPE atmosphere.venue_class_kind
  USING venue_class::atmosphere.venue_class_kind;

DROP FUNCTION atmosphere._classify_venue(text);

CREATE FUNCTION atmosphere._classify_venue(p_venue_label text)
RETURNS atmosphere.venue_class_kind
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_venue_label IS NULL OR p_venue_label = '' THEN 'unknown'::atmosphere.venue_class_kind
    WHEN p_venue_label ILIKE ANY (ARRAY['%fold%','%fire%','%eagle%','%xxl%','%dalston superstore%','%vauxhall%','%berghain%','%queer%','%club%']) THEN 'nightlife'::atmosphere.venue_class_kind
    WHEN p_venue_label ILIKE ANY (ARRAY['%cafe%','%coffee%','%brunch%','%bakery%']) THEN 'daytime_social'::atmosphere.venue_class_kind
    WHEN p_venue_label ILIKE ANY (ARRAY['%home%','%flat%','%residence%']) THEN 'residential'::atmosphere.venue_class_kind
    WHEN p_venue_label ILIKE ANY (ARRAY['%tube%','%station%','%bus%','%train%']) THEN 'transit'::atmosphere.venue_class_kind
    WHEN p_venue_label ILIKE ANY (ARRAY['%shop%','%store%','%market%','%boutique%']) THEN 'retail'::atmosphere.venue_class_kind
    WHEN p_venue_label ILIKE ANY (ARRAY['%care%','%aftercare%','%recovery%','%sauna%','%gym%']) THEN 'care'::atmosphere.venue_class_kind
    WHEN p_venue_label ILIKE ANY (ARRAY['%park%','%common%','%heath%','%canal%','%square%']) THEN 'outdoor'::atmosphere.venue_class_kind
    ELSE 'unknown'::atmosphere.venue_class_kind
  END;
$$;

REVOKE ALL ON FUNCTION atmosphere._classify_venue(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION atmosphere._classify_venue(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION atmosphere._classify_venue(text) TO service_role;

-- atmosphere.record_handoff re-typed to pin v_class to the enum.
-- Signature unchanged.
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
  v_class atmosphere.venue_class_kind;
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

COMMENT ON TYPE atmosphere.venue_class_kind IS
  'D22 §4 + D33: locked atmospheric venue classes. Adding a class requires ALTER TYPE, which is a visible doctrinal act. The class set is the contract.';
