-- Add release/countdown fields to canonical public."Beacon"

DO $$
BEGIN
  IF to_regclass('public."Beacon"') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public."Beacon"
      ADD COLUMN IF NOT EXISTS release_slug text,
      ADD COLUMN IF NOT EXISTS release_title text,
      ADD COLUMN IF NOT EXISTS release_at timestamptz,
      ADD COLUMN IF NOT EXISTS end_at timestamptz,
      ADD COLUMN IF NOT EXISTS shopify_handle text';

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_beacon_release_slug ON public."Beacon"(release_slug)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_beacon_release_at ON public."Beacon"(release_at)';
  END IF;
END $$;
