-- Unify Globe beacons with type field
-- LAW 3 (partial): Globe renders only beacons with different types
-- Types: social (Right Now presence), event, market, radio, safety

-- Add type field to Beacon table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'Beacon'
                 AND column_name = 'type') THEN
    ALTER TABLE public."Beacon" ADD COLUMN type text;
  END IF;
END $$;

-- Add expires_at for TTL beacons (e.g., Right Now, temporary events)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'Beacon'
                 AND column_name = 'expires_at') THEN
    ALTER TABLE public."Beacon" ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

-- Add lat/lng for beacon location (if not already present from other migrations)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'Beacon'
                 AND column_name = 'lat') THEN
    ALTER TABLE public."Beacon" ADD COLUMN lat double precision;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'Beacon'
                 AND column_name = 'lng') THEN
    ALTER TABLE public."Beacon" ADD COLUMN lng double precision;
  END IF;
END $$;

-- Add metadata JSONB for flexible beacon data
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'Beacon'
                 AND column_name = 'metadata') THEN
    ALTER TABLE public."Beacon" ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create index for type queries
CREATE INDEX IF NOT EXISTS idx_beacon_type_active 
ON public."Beacon" (type, active, status)
WHERE active = true;

-- Create index for expiring beacons
CREATE INDEX IF NOT EXISTS idx_beacon_expires_at
ON public."Beacon" (expires_at)
WHERE expires_at IS NOT NULL;

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_beacon_location
ON public."Beacon" (lat, lng)
WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- Add trigger to automatically deactivate expired beacons
CREATE OR REPLACE FUNCTION public.check_beacon_expiry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If expires_at has passed, mark as inactive
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at < NOW() AND NEW.active = true THEN
    NEW.active = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_beacon_check_expiry ON public."Beacon";
CREATE TRIGGER trg_beacon_check_expiry
  BEFORE UPDATE ON public."Beacon"
  FOR EACH ROW
  EXECUTE FUNCTION public.check_beacon_expiry();

-- Migrate existing kind values to type
UPDATE public."Beacon"
SET type = CASE
  WHEN kind IN ('event', 'party', 'concert') THEN 'event'
  WHEN kind IN ('product', 'marketplace') THEN 'market'
  WHEN kind IN ('radio', 'show', 'broadcast') THEN 'radio'
  WHEN kind = 'social' THEN 'social'
  ELSE 'event' -- default fallback
END
WHERE type IS NULL AND kind IS NOT NULL;

-- Set default type for beacons without kind or type
UPDATE public."Beacon"
SET type = 'event'
WHERE type IS NULL;

-- Add check constraint for valid beacon types
ALTER TABLE public."Beacon" 
DROP CONSTRAINT IF EXISTS beacon_type_check;

ALTER TABLE public."Beacon"
ADD CONSTRAINT beacon_type_check 
CHECK (type IN ('social', 'event', 'market', 'radio', 'safety'));

-- Function to cleanup expired beacons (call via cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_beacons()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deactivated_count integer;
BEGIN
  -- Mark expired beacons as inactive
  UPDATE public."Beacon"
  SET active = false
  WHERE active = true
  AND expires_at IS NOT NULL
  AND expires_at < NOW();
  
  GET DIAGNOSTICS deactivated_count = ROW_COUNT;
  
  -- Optionally delete old inactive beacons (older than 30 days)
  DELETE FROM public."Beacon"
  WHERE active = false
  AND expires_at IS NOT NULL
  AND expires_at < NOW() - INTERVAL '30 days';
  
  RETURN deactivated_count;
END;
$$;

-- Add comments documenting the beacon type system
COMMENT ON COLUMN public."Beacon".type IS 'Beacon type: social (Right Now presence), event, market, radio, safety. Globe renders all types.';
COMMENT ON COLUMN public."Beacon".expires_at IS 'Optional TTL for temporary beacons (e.g., Right Now presence). Auto-deactivates when expires.';
COMMENT ON COLUMN public."Beacon".metadata IS 'Flexible JSONB field for beacon-specific data (e.g., Right Now intent, product details, safety status)';
COMMENT ON FUNCTION public.cleanup_expired_beacons IS 'Background job to cleanup expired beacons. Call via cron.';
