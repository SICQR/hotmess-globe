DO $$
BEGIN
  -- Audio metadata table (snake_case)
  IF to_regclass('public.audio_metadata') IS NOT NULL THEN
    ALTER TABLE public.audio_metadata
      ADD COLUMN IF NOT EXISTS soundcloud_urn text;
  END IF;

  -- Audio metadata table (PascalCase quoted)
  IF to_regclass('public."AudioMetadata"') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public."AudioMetadata" ADD COLUMN IF NOT EXISTS soundcloud_urn text';
  END IF;

  -- Beacon tables: allow top-level columns if you want them (optional)
  IF to_regclass('public.beacons') IS NOT NULL THEN
    ALTER TABLE public.beacons
      ADD COLUMN IF NOT EXISTS soundcloud_urn text;
  END IF;

  IF to_regclass('public."Beacon"') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public."Beacon" ADD COLUMN IF NOT EXISTS soundcloud_urn text';
  END IF;
END $$;
