-- ============================================================================
-- DB-01 — Kill trilateration in nearby_candidates_secure  (CRITICAL)
-- DRAFT ONLY. DO NOT APPLY without Phil review.
-- Fills DB-01. Inherits: sacred-invariant #2/#3 (no exact tracking),
--   doctrine 48-spatial-identity-exposure. Blast radius: nearby/proximity UI distances.
-- ----------------------------------------------------------------------------
-- ROOT CAUSE: the function fuzzes returned lat/lng to 3dp (~110m) but returns
-- distance_meters = CAST(st_distance(viewer, RAW coords) AS integer). Precise
-- distance from 3+ chosen viewpoints recovers the exact target position.
--
-- FIX: (a) compute distance from the *same fuzzed* coordinate it returns, and
--      (b) quantise distance into bands + floor a minimum, so repeated calls
--      cannot triangulate. Below: 100m bands, 50m floor, deterministic per-target
--      jitter so the band edge can't be brute-forced by micro-stepping the viewer.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.nearby_candidates_secure(
  p_viewer_lat double precision, p_viewer_lng double precision,
  p_radius_m integer, p_limit integer, p_exclude_user_id uuid,
  p_max_age_seconds integer DEFAULT 900)
RETURNS TABLE(user_id uuid, distance_meters integer, last_lat double precision,
              last_lng double precision, is_online boolean,
              privacy_hide_proximity boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH viewer AS (SELECT geography(st_setsrid(st_makepoint(p_viewer_lng,p_viewer_lat),4326)) g),
  base AS (
    SELECT pr.id,
      ROUND(COALESCE(upl.lat,pr.last_lat)::numeric,3)::double precision AS flat,
      ROUND(COALESCE(upl.lng,pr.last_lng)::numeric,3)::double precision AS flng,
      COALESCE(pr.is_online,false) AS online,
      NOT COALESCE(pr.location_consent,false) AS hide,
      COALESCE(upl.updated_at,pr.last_loc_ts,pr.updated_at,now()) AS ts
    FROM public.profiles pr
    LEFT JOIN public.user_presence_locations upl ON upl.auth_user_id = pr.id
    WHERE pr.id IS NOT NULL AND pr.id <> p_exclude_user_id
      AND COALESCE(pr.location_consent,false)=true
      AND COALESCE(upl.lat,pr.last_lat) IS NOT NULL
      AND COALESCE(upl.lng,pr.last_lng) IS NOT NULL
      AND COALESCE(upl.updated_at,pr.last_loc_ts,pr.updated_at,now())
          > now() - make_interval(secs => greatest(p_max_age_seconds,0)))
  SELECT b.id,
    -- distance from the SAME fuzzed point, banded to 100m, floored at 50m:
    GREATEST(50, (ROUND(
      st_distance(v.g, geography(st_setsrid(st_makepoint(b.flng,b.flat),4326)))/100.0
    )*100))::integer AS distance_meters,
    b.flat, b.flng, b.online, b.hide
  FROM base b CROSS JOIN viewer v
  WHERE st_dwithin(v.g, geography(st_setsrid(st_makepoint(b.flng,b.flat),4326)), p_radius_m)
  ORDER BY distance_meters ASC
  LIMIT p_limit;
$function$;

-- Optionally also REVOKE EXECUTE FROM anon if proximity must require auth:
--   REVOKE EXECUTE ON FUNCTION public.nearby_candidates_secure FROM anon;
