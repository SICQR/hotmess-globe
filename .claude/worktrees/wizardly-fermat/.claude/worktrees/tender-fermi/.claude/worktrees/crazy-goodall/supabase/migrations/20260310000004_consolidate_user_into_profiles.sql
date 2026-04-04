-- Consolidate dual user model: make profiles the canonical table
-- Adds location + privacy columns from "User" into profiles,
-- copies existing data, and rewires the nearby_candidates_secure RPC.

-- 1. Add missing location/privacy columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_lat double precision,
  ADD COLUMN IF NOT EXISTS last_lng double precision,
  ADD COLUMN IF NOT EXISTS last_loc_ts timestamptz,
  ADD COLUMN IF NOT EXISTS loc_accuracy_m integer,
  ADD COLUMN IF NOT EXISTS privacy_hide_proximity boolean NOT NULL DEFAULT false;

-- 2. Copy location data from "User" into profiles where a matching row exists
-- Match on profiles.id = "User".auth_user_id (both are auth.uid())
UPDATE public.profiles p
SET
  last_lat = COALESCE(p.last_lat, u.last_lat),
  last_lng = COALESCE(p.last_lng, u.last_lng),
  last_loc_ts = COALESCE(p.last_loc_ts, u.last_loc_ts),
  loc_accuracy_m = COALESCE(p.loc_accuracy_m, u.loc_accuracy_m),
  privacy_hide_proximity = COALESCE(u.privacy_hide_proximity, false),
  is_online = COALESCE(p.is_online, u.is_online, false),
  last_seen = COALESCE(p.last_seen, u.last_seen)
FROM public."User" u
WHERE u.auth_user_id = p.id
  AND u.auth_user_id IS NOT NULL;

-- 3. Add spatial index on profiles for proximity queries
CREATE INDEX IF NOT EXISTS idx_profiles_geog
ON public.profiles
USING gist (geography(st_setsrid(st_makepoint(last_lng, last_lat), 4326)))
WHERE last_lat IS NOT NULL AND last_lng IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_last_loc_ts
ON public.profiles (last_loc_ts);

-- 4. Update nearby_candidates_secure RPC to read from profiles instead of "User"
CREATE OR REPLACE FUNCTION public.nearby_candidates_secure(
  p_viewer_lat double precision,
  p_viewer_lng double precision,
  p_radius_m integer,
  p_limit integer,
  p_exclude_user_id uuid,
  p_max_age_seconds integer default 900
)
RETURNS TABLE(
  user_id uuid,
  distance_meters integer,
  last_lat double precision,
  last_lng double precision,
  is_online boolean,
  privacy_hide_proximity boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH viewer AS (
    SELECT geography(st_setsrid(st_makepoint(p_viewer_lng, p_viewer_lat), 4326)) AS g
  )
  SELECT
    pr.id AS user_id,
    CAST(st_distance(
      v.g,
      geography(st_setsrid(st_makepoint(
        COALESCE(upl.lng, pr.last_lng),
        COALESCE(upl.lat, pr.last_lat)
      ), 4326))
    ) AS integer) AS distance_meters,
    ROUND(COALESCE(upl.lat, pr.last_lat)::numeric, 3)::double precision AS last_lat,
    ROUND(COALESCE(upl.lng, pr.last_lng)::numeric, 3)::double precision AS last_lng,
    pr.is_online,
    pr.privacy_hide_proximity
  FROM public.profiles pr
  LEFT JOIN public.user_presence_locations upl
    ON upl.auth_user_id = pr.id
  CROSS JOIN viewer v
  WHERE
    pr.id IS NOT NULL
    AND pr.id <> p_exclude_user_id
    AND pr.privacy_hide_proximity = false
    AND COALESCE(upl.lat, pr.last_lat) IS NOT NULL
    AND COALESCE(upl.lng, pr.last_lng) IS NOT NULL
    AND COALESCE(upl.updated_at, pr.last_loc_ts, pr.updated_at, now()) > now() - make_interval(secs => greatest(p_max_age_seconds, 0))
    AND st_dwithin(
      v.g,
      geography(st_setsrid(st_makepoint(
        COALESCE(upl.lng, pr.last_lng),
        COALESCE(upl.lat, pr.last_lat)
      ), 4326)),
      p_radius_m
    )
  ORDER BY distance_meters ASC
  LIMIT p_limit;
$$;

-- Keep existing grants
REVOKE ALL ON FUNCTION public.nearby_candidates_secure(double precision, double precision, integer, integer, uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.nearby_candidates_secure(double precision, double precision, integer, integer, uuid, integer) TO authenticated;
