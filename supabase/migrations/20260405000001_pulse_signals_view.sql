-- Unified pulse_signals VIEW for the Pulse globe
-- Normalizes all live signals into one queryable surface.
-- Source tables: right_now_status, label_releases, beacons, preloved_listings

CREATE OR REPLACE VIEW public.pulse_signals AS

-- 1. Users who are live right now
SELECT
  'user_' || rns.id::text AS id,
  'user_live'::text AS signal_type,
  COALESCE(p.display_name, 'Someone') AS title,
  rns.intent AS subtitle,
  (rns.location->>'lat')::float8 AS lat,
  (rns.location->>'lng')::float8 AS lng,
  'right_now_status'::text AS source_table,
  rns.id AS source_id,
  rns.created_at AS starts_at,
  rns.expires_at,
  4 AS priority,
  jsonb_build_object(
    'user_id', rns.user_id,
    'avatar_url', p.avatar_url,
    'intent', rns.intent
  ) AS metadata,
  CASE
    WHEN rns.expires_at > now() THEN 'live'
    WHEN rns.expires_at > now() - interval '1 hour' THEN 'fading'
    ELSE 'expired'
  END AS state
FROM public.right_now_status rns
LEFT JOIN public.profiles p ON p.id = rns.user_id
WHERE rns.expires_at > now() - interval '1 hour'

UNION ALL

-- 2. Music drops (label releases)
SELECT
  'music_' || lr.id::text AS id,
  'music_drop'::text AS signal_type,
  lr.title,
  'Smash Daddys' AS subtitle,
  NULL::float8 AS lat,
  NULL::float8 AS lng,
  'label_releases'::text AS source_table,
  lr.id AS source_id,
  lr.release_date AS starts_at,
  lr.release_date + interval '24 hours' AS expires_at,
  1 AS priority,
  jsonb_build_object(
    'artwork_url', lr.artwork_url,
    'catalog_number', lr.catalog_number,
    'preview_url', lr.preview_url,
    'stem_pack_url', lr.stem_pack_url
  ) AS metadata,
  CASE
    WHEN lr.release_date + interval '24 hours' > now() THEN 'live'
    WHEN lr.release_date + interval '48 hours' > now() THEN 'fading'
    ELSE 'expired'
  END AS state
FROM public.label_releases lr
WHERE lr.is_active = true
  AND lr.release_date > now() - interval '48 hours'

UNION ALL

-- 3. Events / beacons
SELECT
  'beacon_' || b.id::text AS id,
  CASE
    WHEN b.type = 'event' OR b.kind = 'event' THEN 'event'
    ELSE 'beacon'
  END AS signal_type,
  COALESCE(b.metadata->>'title', b.metadata->>'name', 'Signal') AS title,
  b.metadata->>'address' AS subtitle,
  b.geo_lat AS lat,
  b.geo_lng AS lng,
  'beacons'::text AS source_table,
  b.id AS source_id,
  b.starts_at,
  b.ends_at AS expires_at,
  2 AS priority,
  jsonb_build_object(
    'kind', b.kind,
    'type', b.type,
    'beacon_category', b.beacon_category,
    'image_url', b.metadata->>'image_url',
    'owner_id', b.owner_id
  ) AS metadata,
  CASE
    WHEN b.ends_at IS NULL OR b.ends_at > now() THEN 'live'
    WHEN b.ends_at > now() - interval '1 hour' THEN 'fading'
    ELSE 'expired'
  END AS state
FROM public.beacons b
WHERE (b.ends_at IS NULL OR b.ends_at > now() - interval '1 hour')
  AND b.status = 'active'

UNION ALL

-- 4. Preloved listings (market drops)
SELECT
  'listing_' || pl.id::text AS id,
  'market_drop'::text AS signal_type,
  pl.title,
  pl.seller_name AS subtitle,
  NULL::float8 AS lat,
  NULL::float8 AS lng,
  'preloved_listings'::text AS source_table,
  pl.id AS source_id,
  pl.created_at AS starts_at,
  NULL::timestamptz AS expires_at,
  5 AS priority,
  jsonb_build_object(
    'price', pl.price,
    'image_urls', pl.image_urls,
    'seller_name', pl.seller_name
  ) AS metadata,
  'live'::text AS state
FROM public.preloved_listings pl
WHERE pl.status = 'live';

-- RLS: view inherits source table policies, but add explicit for safety
-- Views don't have RLS directly — queries through the view use source table RLS.
-- No additional policy needed.

COMMENT ON VIEW public.pulse_signals IS 'Unified signal layer for Pulse globe. Merges right_now_status, label_releases, beacons, and preloved_listings into a normalized signal stream with priority ordering and expiry states.';
