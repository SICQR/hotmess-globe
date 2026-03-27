-- Seed launch release beacons (idempotent) into canonical public."Beacon"
-- Creates two records only if they do not already exist.

DO $$
BEGIN
  IF to_regclass('public."Beacon"') IS NULL THEN
    RETURN;
  END IF;

  -- HNHMESS
  INSERT INTO public."Beacon" (
    kind,
    status,
    active,
    title,
    release_slug,
    release_title,
    release_at
  )
  SELECT
    'release',
    'published',
    true,
    'HNHMESS',
    'hnhmess',
    'HNHMESS',
    '2026-01-10T00:00:00Z'::timestamptz
  WHERE NOT EXISTS (
    SELECT 1 FROM public."Beacon" b WHERE b.release_slug = 'hnhmess'
  );

  -- Now That's What I Call A HOTMESS Vol. 1
  INSERT INTO public."Beacon" (
    kind,
    status,
    active,
    title,
    release_slug,
    release_title,
    release_at
  )
  SELECT
    'release',
    'published',
    true,
    'Now That''s What I Call A HOTMESS Vol. 1',
    'now-thats-what-i-call-a-hotmess-vol1',
    'Now That''s What I Call A HOTMESS Vol. 1',
    '2026-01-10T00:00:00Z'::timestamptz
  WHERE NOT EXISTS (
    SELECT 1 FROM public."Beacon" b WHERE b.release_slug = 'now-thats-what-i-call-a-hotmess-vol1'
  );
END $$;
