-- location_shares: real-time location sharing for the safety LiveLocationShare feature.
-- A user can share their live GPS position with selected trusted contacts for a
-- configurable duration. Only one active share per user is allowed at a time.

CREATE TABLE IF NOT EXISTS public.location_shares (
  id               uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid             NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Array of user IDs (auth.users) who can see the live location
  contact_ids      uuid[]           NOT NULL DEFAULT '{}',
  start_time       timestamptz      NOT NULL DEFAULT now(),
  end_time         timestamptz      NOT NULL,
  duration_minutes int              NOT NULL CHECK (duration_minutes > 0),
  current_lat      double precision,
  current_lng      double precision,
  last_update      timestamptz,
  active           boolean          NOT NULL DEFAULT true,
  created_at       timestamptz      NOT NULL DEFAULT now()
);

-- Only one active share per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_location_shares_active_user
  ON public.location_shares (user_id)
  WHERE active = true;

-- Fast lookup for contacts checking if someone is sharing with them
CREATE INDEX IF NOT EXISTS idx_location_shares_contact_ids
  ON public.location_shares USING GIN (contact_ids);

CREATE INDEX IF NOT EXISTS idx_location_shares_user_active
  ON public.location_shares (user_id, active);

-- Auto-expire: mark shares inactive once end_time passes
CREATE OR REPLACE FUNCTION public.expire_location_shares()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.location_shares
  SET    active = false
  WHERE  active = true
    AND  end_time < now();
END;
$$;

-- Enable realtime so LiveLocationShare.jsx can subscribe to updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'location_shares'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.location_shares;
  END IF;
END
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.location_shares ENABLE ROW LEVEL SECURITY;

-- Sharer can do everything with their own record
CREATE POLICY IF NOT EXISTS "location_shares: owner full access"
  ON public.location_shares
  FOR ALL
  TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Contacts can SELECT shares where they are listed and the share is active
CREATE POLICY IF NOT EXISTS "location_shares: contacts can view active shares"
  ON public.location_shares
  FOR SELECT
  TO authenticated
  USING (
    active = true
    AND auth.uid() = ANY(contact_ids)
  );
