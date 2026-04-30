-- RPC for Ghosted NEARBY tab (PostGIS sorting)
CREATE OR REPLACE FUNCTION get_nearby_ghosted(
  viewer_id uuid,
  viewer_lng double precision,
  viewer_lat double precision,
  radius_meters integer DEFAULT 10000,
  limit_count integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  display_name text,
  username text,
  avatar_url text,
  is_online boolean,
  is_verified boolean,
  looking_for text[],
  last_seen timestamptz,
  last_lat double precision,
  last_lng double precision,
  distance_meters float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.username,
    p.avatar_url,
    p.is_online,
    p.is_verified,
    p.looking_for,
    p.last_seen,
    ST_Y(COALESCE(up.location, p.location)::geometry) as last_lat,
    ST_X(COALESCE(up.location, p.location)::geometry) as last_lng,
    ST_Distance(
      COALESCE(up.location, p.location),
      ST_SetSRID(ST_MakePoint(viewer_lng, viewer_lat), 4326)::geography
    ) as distance_meters
  FROM profiles p
  LEFT JOIN user_presence up ON up.user_id = p.id
  WHERE
    p.id != viewer_id
    AND p.location_consent = true
    AND (p.is_online = true OR p.last_seen >= now() - interval '24 hours')
    AND COALESCE(up.location, p.location) IS NOT NULL
    AND ST_DWithin(
      COALESCE(up.location, p.location),
      ST_SetSRID(ST_MakePoint(viewer_lng, viewer_lat), 4326)::geography,
      radius_meters
    )
  ORDER BY COALESCE(up.location, p.location) <-> ST_SetSRID(ST_MakePoint(viewer_lng, viewer_lat), 4326)
  LIMIT limit_count;
END;
$$;
