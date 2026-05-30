-- HOTMESS v6 — Chunk 01: Runtime Isolation
-- Migration: isolation_audit_log
-- Spec: HOTMESS-RuntimeEnforcement.docx §8
--
-- Append-only log of every isolation violation.
-- No UPDATE or DELETE ever. Alert fires on any row inserted.

CREATE TABLE IF NOT EXISTS isolation_audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT        NOT NULL
                CHECK (event_type IN (
                  'BLOCKED_FIELD_ACCESS',
                  'AI_BLOCKED_FIELD_DETECTED',
                  'RLS_DENY'
                )),
  service     TEXT        NOT NULL,
  field       TEXT        NOT NULL,
  user_id     UUID,
  request_id  TEXT,
  stack_trace TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for weekly review queries
CREATE INDEX IF NOT EXISTS idx_isolation_audit_event_type
  ON isolation_audit_log (event_type);

CREATE INDEX IF NOT EXISTS idx_isolation_audit_service
  ON isolation_audit_log (service);

CREATE INDEX IF NOT EXISTS idx_isolation_audit_created_at
  ON isolation_audit_log (created_at DESC);

-- RLS: enable row-level security
ALTER TABLE isolation_audit_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users (service_role) can INSERT + SELECT.
-- No UPDATE. No DELETE. Ever.
CREATE POLICY "isolation_audit_service_insert"
  ON isolation_audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "isolation_audit_admin_select"
  ON isolation_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Hard revoke UPDATE and DELETE for all roles
REVOKE UPDATE ON isolation_audit_log FROM anon, authenticated, service_role;
REVOKE DELETE ON isolation_audit_log FROM anon, authenticated, service_role;

-- Operator RLS enforcement: block individual user data
-- (Spec: HOTMESS-RuntimeEnforcement.docx §6)
-- operator_role cannot read individual user location from profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'operator_role'
  ) THEN
    CREATE ROLE operator_role;
  END IF;
END$$;

-- Operator: no individual location
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
    AND policyname = 'operator_no_individual_location'
  ) THEN
    CREATE POLICY operator_no_individual_location ON profiles
      FOR SELECT TO operator_role
      USING (false);
  END IF;
END$$;

-- Operator: revoke all on care tables (idempotent — tables may not exist yet)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'support_preferences',
    'lifestyle_preferences',
    'backup_contacts',
    'safety_alerts'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('REVOKE ALL ON TABLE %I FROM operator_role', t);
    END IF;
  END LOOP;
END$$;

-- Venue aggregate stats view for operator_role
-- (operators see aggregates, never individual records)
-- Created only when meet_sessions table exists (Chunk 05 creates it).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'meet_sessions'
  ) THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW venue_aggregate_stats AS
        SELECT
          venue_id,
          COUNT(*)          AS checkin_count,
          MAX(created_at)   AS peak_time
        FROM meet_sessions
        GROUP BY venue_id
    $view$;
    EXECUTE 'GRANT SELECT ON venue_aggregate_stats TO operator_role';
  END IF;
END$$;
