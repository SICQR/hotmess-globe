-- =============================================================================
-- V6 PRE-04 SCHEMA PREREQS
-- Branch: feat/v6-pre-04-schema-prereqs
-- Decision: Option B — extend trusted_contacts with role column (backup-contacts-storage.md)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. trusted_contacts: add role column + backup limit trigger
-- ---------------------------------------------------------------------------

ALTER TABLE trusted_contacts
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'trusted'
  CHECK (role IN ('trusted', 'backup'));

COMMENT ON COLUMN trusted_contacts.role IS
  'Contact role. trusted = standard contact, backup = Care As Kink backup (max 2 per user). See docs/v6-decisions/backup-contacts-storage.md';

-- Trigger function: cap backup contacts at 2 per user
CREATE OR REPLACE FUNCTION check_backup_contacts_limit()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.role = 'backup' THEN
    IF (
      SELECT COUNT(*)
      FROM trusted_contacts
      WHERE user_id = NEW.user_id
        AND role = 'backup'
        AND id != COALESCE(NEW.id, gen_random_uuid())
    ) >= 2 THEN
      RAISE EXCEPTION 'max_backup_contacts_exceeded';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_backup_contacts_limit ON trusted_contacts;
CREATE TRIGGER enforce_backup_contacts_limit
  BEFORE INSERT OR UPDATE OF role ON trusted_contacts
  FOR EACH ROW EXECUTE FUNCTION check_backup_contacts_limit();

-- ---------------------------------------------------------------------------
-- 2. user_sessions table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_sessions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at            timestamptz NOT NULL DEFAULT now(),
  land_time             timestamptz,
  movement_start_at     timestamptz,
  movement_last_update  timestamptz,
  expires_at            timestamptz,
  meta                  jsonb NOT NULL DEFAULT '{}',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='user_sessions' AND policyname='user_sessions_owner_only'
  ) THEN
    CREATE POLICY user_sessions_owner_only ON user_sessions
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. meet_outcomes table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS meet_outcomes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid REFERENCES user_sessions(id) ON DELETE SET NULL,
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  outcome_type  text NOT NULL CHECK (outcome_type IN ('found', 'timeout', 'cancelled', 'get_out')),
  triggered_at  timestamptz NOT NULL DEFAULT now(),
  meta          jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE meet_outcomes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='meet_outcomes' AND policyname='meet_outcomes_owner_only'
  ) THEN
    CREATE POLICY meet_outcomes_owner_only ON meet_outcomes
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
