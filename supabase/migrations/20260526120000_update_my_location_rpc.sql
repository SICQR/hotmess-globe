-- Allow the authenticated user to write their own location point.
-- Security: SECURITY DEFINER + explicit auth.uid() check; clients cannot
-- impersonate other users. Coarsens to 4-decimal precision (~11m) by
-- default to satisfy the "approximate by default" doctrine.
CREATE OR REPLACE FUNCTION public.update_my_location(
  p_lng double precision,
  p_lat double precision
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION not authenticated;
  END IF;
  IF p_lng IS NULL OR p_lat IS NULL THEN
    RAISE EXCEPTION lng/lat required;
  END IF;
  IF p_lng < -180 OR p_lng > 180 OR p_lat < -90 OR p_lat > 90 THEN
    RAISE EXCEPTION lng/lat out of range;
  END IF;
  UPDATE profiles
  SET
    location = ST_SetSRID(ST_MakePoint(
      round(p_lng::numeric, 4)::double precision,
      round(p_lat::numeric, 4)::double precision
    ), 4326)::geography,
    last_seen = NOW(),
    is_online = true,
    location_consent = true
  WHERE id = v_uid;
END;
$func$;

REVOKE ALL ON FUNCTION public.update_my_location(double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_location(double precision, double precision) TO authenticated;
