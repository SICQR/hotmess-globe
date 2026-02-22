-- emergency_locations: real-time table for SOS location broadcasting.
-- One row per active emergency, upserted every few seconds by the client.
-- Contacts and admins subscribe to this via Supabase Realtime.

CREATE TABLE IF NOT EXISTS public.emergency_locations (
  emergency_id  text             PRIMARY KEY,
  lat           double precision NOT NULL,
  lng           double precision NOT NULL,
  updated_at    timestamptz      NOT NULL DEFAULT now(),
  created_at    timestamptz      NOT NULL DEFAULT now()
);

-- Enable realtime so contacts can subscribe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'emergency_locations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_locations;
  END IF;
END
$$;

-- Auto-clean rows older than 48 h (emergencies should never last that long)
CREATE OR REPLACE FUNCTION public.expire_emergency_locations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.emergency_locations
  WHERE updated_at < now() - interval '48 hours';
END;
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.emergency_locations ENABLE ROW LEVEL SECURITY;

-- Any authenticated user may upsert (the owner writes their own row)
CREATE POLICY IF NOT EXISTS "emergency_locations: authenticated upsert"
  ON public.emergency_locations
  FOR ALL
  TO authenticated
  USING  (true)
  WITH CHECK (true);
