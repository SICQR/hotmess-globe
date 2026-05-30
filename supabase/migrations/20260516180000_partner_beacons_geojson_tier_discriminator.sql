-- HOTFIX (Phase 3c walkthrough discovery, 2026-05-16)
--
-- partner_beacons_geojson() emitted properties.tier = beacons.type, which is
-- one of ('social','event','drop','market','radio','safety','user') — NOT a
-- founding tier. The renderer (useLiveTierData) keys on properties.tier as
-- the FoundingTier discriminator and bucketed every founding partner into
-- the default 'founding_venue' group.
--
-- Same bug broke the promoter-arc CASE clauses added in Phase 3a (the
-- b.type='founding_promoter' check never matched anything, so home_lng/
-- home_lat/displayed_* were always NULL for promoter rows).
--
-- Fix: join founding_partner_inquiries and use fi.tier_interest as the
-- canonical tier discriminator. Keep the legacy b.type as a separate
-- `beacon_type` property in case any consumer was reading it.
--
-- Already applied live to rfoftonnlwudilafhfkl. Committed to source so a
-- fresh `supabase db push` reproduces the live schema.

CREATE OR REPLACE FUNCTION public.partner_beacons_geojson()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
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
          COALESCE(v.longitude, b.home_lng, b.geo_lng),
          COALESCE(v.latitude,  b.home_lat, b.geo_lat)
        )
      ),
      'properties', jsonb_build_object(
        'tier', fi.tier_interest,
        'beacon_type', b.type,
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
        'city_slug', b.city_slug,
        'home_lng',      CASE WHEN fi.tier_interest = 'founding_promoter' THEN b.home_lng ELSE NULL END,
        'home_lat',      CASE WHEN fi.tier_interest = 'founding_promoter' THEN b.home_lat ELSE NULL END,
        'displayed_lng', CASE WHEN fi.tier_interest = 'founding_promoter'
                              THEN COALESCE(v.longitude, b.home_lng, b.geo_lng) ELSE NULL END,
        'displayed_lat', CASE WHEN fi.tier_interest = 'founding_promoter'
                              THEN COALESCE(v.latitude,  b.home_lat, b.geo_lat) ELSE NULL END,
        'active_event_venue_id', b.active_event_venue_id
      )
    ) AS feat
    FROM public.beacons b
    LEFT JOIN public.venues v ON v.id = b.active_event_venue_id
    LEFT JOIN public.founding_partner_inquiries fi ON fi.id = b.founding_partner_inquiry_id
    WHERE b.is_persistent = TRUE
      AND (b.founding_partner_inquiry_id IS NOT NULL OR b.chain_partner_id IS NOT NULL)
      AND COALESCE(b.active, TRUE) = TRUE
  ) sub;
$function$;
