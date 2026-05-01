-- =============================================================================
-- V6 CHUNK 05 — meet_sessions table
-- =============================================================================

CREATE TABLE IF NOT EXISTS meet_sessions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  thread_id         uuid,
  meetpoint_lat     double precision,
  meetpoint_lng     double precision,
  meetpoint_label   text,
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','committed','moving','arrived','found','timeout','cancelled')),
  met_at            timestamptz,
  silence_until     timestamptz,           -- notifications suppressed until this time
  extended          boolean NOT NULL DEFAULT false,
  closed_at         timestamptz,
  meta              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE meet_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='meet_sessions' AND policyname='meet_sessions_participants'
  ) THEN
    CREATE POLICY meet_sessions_participants ON meet_sessions
      FOR ALL USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);
  END IF;
END $$;
