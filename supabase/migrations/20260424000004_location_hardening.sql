-- Final schema hardening for location columns
-- Ensures all tables have the columns expected by various hooks and services

-- 1. Profiles Table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS last_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_area TEXT,
ADD COLUMN IF NOT EXISTS last_loc_ts TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS loc_accuracy_m INTEGER,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS location GEOGRAPHY(Point, 4326);

-- 2. User Presence Table
ALTER TABLE user_presence
ADD COLUMN IF NOT EXISTS last_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS last_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location GEOGRAPHY(Point, 4326),
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT true;

-- 3. Reload Schema
NOTIFY pgrst, 'reload schema';
