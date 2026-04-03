-- Pre-fix: Add visibility column to beacons if missing
-- This must run before 001_os_state_and_presence.sql which references it
-- Skip if beacons is a view (already migrated)

DO $$
BEGIN
  -- Only alter if beacons is a table, not a view
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'beacons' AND table_type = 'BASE TABLE'
  ) THEN
    ALTER TABLE beacons ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
  END IF;
END $$;
