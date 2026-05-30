-- ════════════════════════════════════════════════════════════════════════════
-- Sprint 0 closeout brief #02 — Founding cohort reentry campaign.
--
--   1. Allow 'paused' status on notification_outbox (audit-trail use).
--   2. reentry_tokens table — HMAC-SHA256 single-use, 30-day TTL.
--   3. cohort_locks row used by assign_founding_status_slot() for serialization.
--   4. assign_founding_status_slot(profile_id) — atomic slot assignment via
--      SELECT ... FOR UPDATE on cohort_locks. Idempotent.
--   5. Grandfather Dean Davies into original_50 spot #1 (cofounder lock,
--      Sat 16 May 2026). Idempotent — only writes if founding_status is NULL.
-- ════════════════════════════════════════════════════════════════════════════

-- (1) Allow 'paused' on notification_outbox so reentry queue rows can sit
-- inert until Phil-preview gate passes. Existing cron filters on
-- status='queued'/'pending', so 'paused' rows are silently ignored.
ALTER TABLE notification_outbox DROP CONSTRAINT notification_outbox_status_check;
ALTER TABLE notification_outbox ADD CONSTRAINT notification_outbox_status_check
  CHECK (status = ANY (ARRAY['queued','pending','sent','failed','paused']));

-- (2) reentry_tokens
CREATE TABLE IF NOT EXISTS reentry_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash  text UNIQUE NOT NULL,
  expires_at  timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at  timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS reentry_tokens_profile_id_idx ON reentry_tokens(profile_id);
CREATE INDEX IF NOT EXISTS reentry_tokens_expires_at_idx ON reentry_tokens(expires_at);

-- (3) cohort_locks (single-row table used for SELECT ... FOR UPDATE)
CREATE TABLE IF NOT EXISTS cohort_locks (
  cohort_name      text PRIMARY KEY,
  last_assigned_at timestamptz DEFAULT now()
);
INSERT INTO cohort_locks (cohort_name) VALUES ('founding_status_assignment')
  ON CONFLICT (cohort_name) DO NOTHING;

-- (4) assign_founding_status_slot — atomic, idempotent.
-- Race rules per brief #02:
--   - First 50 with non-null founding_status → original_50 (Dean is #1 by grandfather)
--   - Next 115 → founding
--   - All others → early
CREATE OR REPLACE FUNCTION assign_founding_status_slot(p_profile_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_existing       text;
  v_o50_count      int;
  v_founding_count int;
  v_assigned       text;
BEGIN
  -- Fast-path: profile already has a slot, return it
  SELECT founding_status INTO v_existing FROM profiles WHERE id = p_profile_id;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- Serialize on the cohort lock row. While this lock is held, no other
  -- caller can observe stale counts that would let two profiles share
  -- spot 50 of original_50 or spot 115 of founding.
  PERFORM 1 FROM cohort_locks WHERE cohort_name = 'founding_status_assignment' FOR UPDATE;

  -- Re-check after acquiring the lock (someone else may have just assigned us)
  SELECT founding_status INTO v_existing FROM profiles WHERE id = p_profile_id;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- Count current allocations under the lock
  SELECT COUNT(*) INTO v_o50_count FROM profiles WHERE founding_status = 'original_50';
  IF v_o50_count < 50 THEN
    v_assigned := 'original_50';
  ELSE
    SELECT COUNT(*) INTO v_founding_count FROM profiles WHERE founding_status = 'founding';
    IF v_founding_count < 115 THEN
      v_assigned := 'founding';
    ELSE
      v_assigned := 'early';
    END IF;
  END IF;

  UPDATE profiles
    SET founding_status = v_assigned
    WHERE id = p_profile_id;

  UPDATE cohort_locks
    SET last_assigned_at = now()
    WHERE cohort_name = 'founding_status_assignment';

  RETURN v_assigned;
END;
$$;

REVOKE ALL ON FUNCTION assign_founding_status_slot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION assign_founding_status_slot(uuid) TO authenticated, service_role;

-- (5) Grandfather Dean — cofounder-locked Sat 16 May 2026.
-- Idempotent: only updates if founding_status is currently NULL.
-- profile id resolved from `auth.users.email='deanod1980@icloud.com'` join.
UPDATE profiles
   SET founding_status     = 'original_50',
       username            = COALESCE(username, 'mr_messy'),
       username_locked_at  = COALESCE(username_locked_at, now())
 WHERE id = '10a5232a-867a-4e48-bceb-d24a291c0d61'
   AND founding_status IS NULL;
