-- Phase 1b — chain_aggregates view + tier RPCs + helper RPCs for the useLiveTierData hook
-- ALREADY APPLIED TO PROD via Supabase MCP. Committed for parity / local dev replay.

CREATE OR REPLACE VIEW public.chain_aggregates AS
SELECT
  cp.id AS chain_id,
  cp.name,
  cp.tier,
  COUNT(b.id) AS venue_count,
  AVG(b.geo_lng)::numeric AS lng,
  AVG(b.geo_lat)::numeric AS lat,
  COALESCE(
    jsonb_agg(jsonb_build_object('id', b.id, 'title', b.title, 'lng', b.geo_lng, 'lat', b.geo_lat, 'globe_color', b.globe_color) ORDER BY b.created_at)
    FILTER (WHERE b.id IS NOT NULL),
    '[]'::jsonb
  ) AS venues
FROM public.chain_partners cp
LEFT JOIN public.beacons b ON b.chain_partner_id = cp.id AND b.is_persistent = TRUE
GROUP BY cp.id, cp.name, cp.tier;

GRANT SELECT ON public.chain_aggregates TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.partner_beacons_geojson()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(jsonb_agg(feat), '[]'::jsonb)
  )
  FROM (
    SELECT jsonb_build_object(
      'type', 'Feature',
      'id', b.id,
      'geometry', jsonb_build_object(
        'type', 'Point',
        'coordinates', jsonb_build_array(
          COALESCE(v.geo_lng, b.home_lng, b.geo_lng),
          COALESCE(v.geo_lat, b.home_lat, b.geo_lat)
        )
      ),
      'properties', jsonb_build_object(
        'tier', b.type,
        'beacon_category', b.beacon_category,
        'title', b.title,
        'globe_color', b.globe_color,
        'globe_pulse_type', b.globe_pulse_type,
        'globe_size_base', b.globe_size_base,
        'is_persistent', b.is_persistent,
        'chain_partner_id', b.chain_partner_id,
        'event_active', b.active_event_venue_id IS NOT NULL,
        'founding_partner_inquiry_id', b.founding_partner_inquiry_id,
        'city', b.city,
        'city_slug', b.city_slug
      )
    ) AS feat
    FROM public.beacons b
    LEFT JOIN public.beacons v ON v.id = b.active_event_venue_id
    WHERE b.is_persistent = TRUE
      AND (b.founding_partner_inquiry_id IS NOT NULL OR b.chain_partner_id IS NOT NULL)
      AND COALESCE(b.active, TRUE) = TRUE
  ) sub;
$$;
GRANT EXECUTE ON FUNCTION public.partner_beacons_geojson() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.chain_aggregates_geojson()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(jsonb_agg(feat), '[]'::jsonb)
  )
  FROM (
    SELECT jsonb_build_object(
      'type', 'Feature',
      'id', chain_id,
      'geometry', jsonb_build_object('type','Point','coordinates', jsonb_build_array(lng, lat)),
      'properties', jsonb_build_object(
        'tier','chain','chain_id', chain_id,'name', name,'venue_count', venue_count,'venues', venues
      )
    ) AS feat
    FROM public.chain_aggregates WHERE venue_count > 0
  ) sub;
$$;
GRANT EXECUTE ON FUNCTION public.chain_aggregates_geojson() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.founding_filled_counts()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object(
    'members', jsonb_build_object(
      'original_50', (SELECT COUNT(*) FROM public.founding_member_waitlist WHERE tier_claimed='original_50'),
      'founding',    (SELECT COUNT(*) FROM public.founding_member_waitlist WHERE tier_claimed='founding'),
      'early',       (SELECT COUNT(*) FROM public.founding_member_waitlist WHERE tier_claimed='early')
    ),
    'partners', jsonb_build_object(
      'founding_venue',    (SELECT COUNT(*) FROM public.founding_partner_inquiries WHERE tier_interest='founding_venue'    AND status='paid'),
      'founding_signal',   (SELECT COUNT(*) FROM public.founding_partner_inquiries WHERE tier_interest='founding_signal'   AND status='paid'),
      'founding_anchor',   (SELECT COUNT(*) FROM public.founding_partner_inquiries WHERE tier_interest='founding_anchor'   AND status='paid'),
      'founding_promoter', (SELECT COUNT(*) FROM public.founding_partner_inquiries WHERE tier_interest='founding_promoter' AND status='paid'),
      'founding_chain',    (SELECT COUNT(*) FROM public.founding_partner_inquiries WHERE tier_interest='founding_chain'    AND status='paid'),
      'founding_wellness', (SELECT COUNT(*) FROM public.founding_partner_inquiries WHERE tier_interest='founding_wellness' AND status='paid')
    )
  );
$$;
GRANT EXECUTE ON FUNCTION public.founding_filled_counts() TO anon, authenticated, service_role;
