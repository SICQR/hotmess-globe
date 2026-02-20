-- Pre-fix: Add visibility column to beacons if missing
-- This must run before 001_os_state_and_presence.sql which references it

ALTER TABLE beacons ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
