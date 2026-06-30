-- ============================================================================
-- DB-01 (CRITICAL) — Band nearby distance to defeat trilateration
-- DRAFT MIGRATION — committed to branch fix/db-criticals. DO NOT APPLY to prod.
-- Phil applies manually after review. Rewrites a live anti-stalking function.
-- Inherits: sacred-invariant #2/#3 (no exact tracking), 48-spatial-identity-exposure.
-- Fixes finding DB-01. Blast radius: Nearby/proximity surface distance display.
-- ----------------------------------------------------------------------------
-- ROOT CAUSE: prior fn fuzzed returned lat/lng to 3dp but returned
--   distance_meters = CAST(st_distance(viewer, RAW coords) AS integer).
--   Precise per-metre distance from chosen viewpoints recovers exact position.
-- FIX: return a coarse BAND. distance_meters snaps to the band floor (so any
--   numeric caller only ever sees 0/500/1000/2000/5000), and a new distance_band
--   text label is returned for the UI. Distance is computed from the FUZZED
--   coordinate, not raw. A sub-band viewer move cannot change the output.
-- BANDS (Phil sign-off): <500m | 500m–1km | 1–2km | 2–5km | 5km+
-- ============================================================================

CREATE OR REPLACE FUNCTION public.nearby_candidates_secure(
  p_viewer_lat double precision, p_viewer_lng double precision,
  p_radius_m integer, p_limit integer, p_exclude_user_id uuid,
  p_max_age_seconds integer DEFAULT 900)
RETURNS TABLE(
  user_id uuid,
  distance_meters integer,      -- banded FLOOR: 0 / 500 / 1000 / 2000 / 5000
  distance_band text,           -- NEW: '<500m' | '500m-1km' | '1-2km' | '2-5km' | '5km+'
  last_lat double precision,    -- fuzzed to 3dp (~110m)
  last_lng double precision,
  is_online boolean,
  privacy_hide_proximity boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH viewer AS (
    SELECT geography(st_setsrid(st_makepoint(p_viewer_lng, p_viewer_lat), 4326)) AS g
  ),
  base AS (
    SELECT pr.id,
      ROUND(COALESCE(upl.lat, pr.last_lat)::numeric, 3)::double precision AS flat,
      ROUND(COALESCE(upl.lng, pr.last_lng)::numeric, 3)::double precision AS flng,
      COALESCE(pr.is_online, false) AS online,
      NOT COALESCE(pr.location_consent, false) AS hide
    FROM public.profiles pr
    LEFT JOIN public.user_presence_locations upl ON upl.auth_user_id = pr.id
    WHERE pr.id IS NOT NULL
      AND pr.id <> p_exclude_user_id
      AND COALESCE(pr.location_consent, false) = true
      AND COALESCE(upl.lat, pr.last_lat) IS NOT NULL
      AND COALESCE(upl.lng, pr.last_lng) IS NOT NULL
      AND COALESCE(upl.updated_at, pr.last_loc_ts, pr.updated_at, now())
          > now() - make_interval(secs => greatest(p_max_age_seconds, 0))
  ),
  measured AS (
    SELECT b.*,
      st_distance(v.g, geography(st_setsrid(st_makepoint(b.flng, b.flat), 4326))) AS d
    FROM base b CROSS JOIN viewer v
    WHERE st_dwithin(v.g, geography(st_setsrid(st_makepoint(b.flng, b.flat), 4326)), p_radius_m)
  )
  SELECT
    m.id AS user_id,
    CASE
      WHEN m.d < 500   THEN 0
      WHEN m.d < 1000  THEN 500
      WHEN m.d < 2000  THEN 1000
      WHEN m.d < 5000  THEN 2000
      ELSE 5000
    END AS distance_meters,
    CASE
      WHEN m.d < 500   THEN '<500m'
      WHEN m.d < 1000  THEN '500m-1km'
      WHEN m.d < 2000  THEN '1-2km'
      WHEN m.d < 5000  THEN '2-5km'
      ELSE '5km+'
    END AS distance_band,
    m.flat AS last_lat,
    m.flng AS last_lng,
    m.online AS is_online,
    m.hide AS privacy_hide_proximity
  FROM measured m
  ORDER BY m.d ASC          -- order by true distance, expose only the band
  LIMIT p_limit;
$function$;

-- NOTE FOR FRONTEND (DB-01 UI work, separate task): Nearby cards must render
-- `distance_band` (e.g. "<500m"), not the raw "320m". distance_meters is now a
-- coarse floor for any legacy numeric sort only.
-- Optional hard lock: REVOKE EXECUTE ON FUNCTION public.nearby_candidates_secure FROM anon;
