-- =====================================================================
-- Boo-first RLS + temp location sessions + consent telemetry
-- Migration: 20260520120000_boo_first_mutual_rls
-- =====================================================================
-- Phil's exec doctrine 2026-05-20:
--   Ghosted trust model  = mutual attraction required (boo each other)
--   Safety trust model   = explicit temporary consent (trusted_contacts)
--   These are SEPARATE systems and must stay separate architecturally.
--
-- This migration:
--   1. has_mutual_boo()  helper (uuid + email variants)
--   2. chat_threads     — INSERT requires mutual (for thread_type='direct')
--   3. chat_messages    — INSERT requires mutual + thread membership
--      *DROP* "authenticated users can insert messages" — permissive hole
--   4. ghosted_location_sessions — new table: temp, mutual-gated, expires,
--      revocable. No permanent coordinates in chat history.
--   5. consent_blocks  — telemetry for blocked attempts + silent fails
--
-- OUT OF SCOPE (intentional):
--   - location_shares  — safety table. Trusted-contact consent, NOT boo.
--   - taps             — must stay open; this IS the consent action
--   - ticket_chat_threads / squad threads — separate consent models
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Mutual-boo helpers
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_mutual_boo(uid_a uuid, uid_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    uid_a IS NOT NULL
    AND uid_b IS NOT NULL
    AND uid_a <> uid_b
    AND EXISTS (
      SELECT 1 FROM public.taps
      WHERE from_user_id = uid_a AND to_user_id = uid_b AND tap_type = 'boo'
    )
    AND EXISTS (
      SELECT 1 FROM public.taps
      WHERE from_user_id = uid_b AND to_user_id = uid_a AND tap_type = 'boo'
    );
$$;

COMMENT ON FUNCTION public.has_mutual_boo(uuid, uuid) IS
  'Boo-first doctrine 2026-05-20: returns true iff both users have placed a boo tap on each other.';

GRANT EXECUTE ON FUNCTION public.has_mutual_boo(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_mutual_boo_by_email(email_a text, email_b text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.has_mutual_boo(
    (SELECT id FROM public.profiles WHERE email = email_a LIMIT 1),
    (SELECT id FROM public.profiles WHERE email = email_b LIMIT 1)
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_mutual_boo_by_email(text, text) TO authenticated;

-- Helper: every other email in the participant array must be mutual with caller
CREATE OR REPLACE FUNCTION public.all_others_mutual(participant_emails text[], me text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM unnest(participant_emails) AS other_email
    WHERE other_email <> me
      AND NOT public.has_mutual_boo_by_email(me, other_email)
  );
$$;

GRANT EXECUTE ON FUNCTION public.all_others_mutual(text[], text) TO authenticated;

-- ---------------------------------------------------------------------
-- 2. chat_threads — INSERT requires mutual (direct threads only)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "participants can insert threads"  ON public.chat_threads;
DROP POLICY IF EXISTS "chat_threads_insert_participant" ON public.chat_threads;
DROP POLICY IF EXISTS "chat_threads_insert_mutual_only" ON public.chat_threads;

CREATE POLICY chat_threads_insert_mutual_only
  ON public.chat_threads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Sender must be in the thread
    (auth.jwt() ->> 'email') = ANY(participant_emails)
    -- Direct threads: every other participant must be mutual.
    -- Squad/ticket/other thread types fall through (handled by their own
    -- consent models, not boo).
    AND (
      thread_type <> 'direct'
      OR public.all_others_mutual(participant_emails, (auth.jwt() ->> 'email'))
    )
  );

COMMENT ON POLICY chat_threads_insert_mutual_only ON public.chat_threads IS
  'Boo-first doctrine: direct threads require mutual boo with every other participant. Premium does NOT bypass.';

-- ---------------------------------------------------------------------
-- 3. chat_messages — INSERT requires mutual; drop permissive bypass
-- ---------------------------------------------------------------------
-- The existing "authenticated users can insert messages" policy lets ANY
-- authed user insert ANY message — a critical hole. Drop it, replace
-- with mutual-aware policy.
DROP POLICY IF EXISTS "authenticated users can insert messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Participants can insert messages"       ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_insert_mutual_only        ON public.chat_messages;

CREATE POLICY chat_messages_insert_mutual_only
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_email = (auth.jwt() ->> 'email')
    AND EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = chat_messages.thread_id
        AND (auth.jwt() ->> 'email') = ANY(t.participant_emails)
        AND (
          t.thread_type <> 'direct'
          OR public.all_others_mutual(t.participant_emails, (auth.jwt() ->> 'email'))
        )
    )
  );

COMMENT ON POLICY chat_messages_insert_mutual_only ON public.chat_messages IS
  'Every send re-checks mutual at write time. If either party unboos, future messages are rejected.';

-- ---------------------------------------------------------------------
-- 4. ghosted_location_sessions — temp, mutual-gated, expirable
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ghosted_location_sessions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   uuid        NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sharer_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid       NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  accuracy_m  integer,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ghosted_location_sessions_not_self CHECK (sharer_id <> recipient_id),
  CONSTRAINT ghosted_location_sessions_lat_range CHECK (lat BETWEEN -90 AND 90),
  CONSTRAINT ghosted_location_sessions_lng_range CHECK (lng BETWEEN -180 AND 180),
  CONSTRAINT ghosted_location_sessions_expiry_future CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_gls_thread ON public.ghosted_location_sessions (thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gls_recipient_active
  ON public.ghosted_location_sessions (recipient_id)
  WHERE revoked_at IS NULL;

ALTER TABLE public.ghosted_location_sessions ENABLE ROW LEVEL SECURITY;

-- INSERT: sharer must be auth.uid(), recipient must be mutual, thread must include both
DROP POLICY IF EXISTS gls_insert_mutual_only ON public.ghosted_location_sessions;
CREATE POLICY gls_insert_mutual_only
  ON public.ghosted_location_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sharer_id = auth.uid()
    AND public.has_mutual_boo(sharer_id, recipient_id)
    AND EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = thread_id
        AND t.thread_type = 'direct'
        AND (auth.jwt() ->> 'email') = ANY(t.participant_emails)
    )
  );

-- SELECT: either party in the session can read it (until expired/revoked)
DROP POLICY IF EXISTS gls_select_party ON public.ghosted_location_sessions;
CREATE POLICY gls_select_party
  ON public.ghosted_location_sessions
  FOR SELECT
  TO authenticated
  USING (
    (sharer_id = auth.uid() OR recipient_id = auth.uid())
    AND revoked_at IS NULL
    AND expires_at > now()
  );

-- UPDATE: only the sharer, only to set revoked_at
DROP POLICY IF EXISTS gls_update_sharer_revoke ON public.ghosted_location_sessions;
CREATE POLICY gls_update_sharer_revoke
  ON public.ghosted_location_sessions
  FOR UPDATE
  TO authenticated
  USING (sharer_id = auth.uid())
  WITH CHECK (sharer_id = auth.uid());

COMMENT ON TABLE public.ghosted_location_sessions IS
  'Temporary location pings between mutual-boo pairs. Auto-expires; revocable by sharer. NEVER stores coordinates in chat history.';

-- Realtime so the recipient sees revocation/expiry instantly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'ghosted_location_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ghosted_location_sessions;
  END IF;
END$$;

-- ---------------------------------------------------------------------
-- 5. consent_blocks — telemetry for blocked attempts / silent fails
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consent_blocks (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id     uuid,
  action_type   text        NOT NULL,    -- 'message' | 'share_location' | 'meet' | 'uber' | 'suggest_stop' | 'silent_insert_fail' | 'permission_denied' | 'location_session_expired'
  reason        text        NOT NULL,    -- 'no_mutual_boo' | 'expired' | 'revoked' | 'silent_fail' | 'rls_denied' | 'other'
  context       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT consent_blocks_action_check CHECK (action_type IN (
    'message','share_location','meet','uber','suggest_stop',
    'silent_insert_fail','permission_denied','location_session_expired'
  )),
  CONSTRAINT consent_blocks_reason_check CHECK (reason IN (
    'no_mutual_boo','expired','revoked','silent_fail','rls_denied','other'
  ))
);

CREATE INDEX IF NOT EXISTS idx_consent_blocks_user_time
  ON public.consent_blocks (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consent_blocks_action_time
  ON public.consent_blocks (action_type, created_at DESC);

ALTER TABLE public.consent_blocks ENABLE ROW LEVEL SECURITY;

-- INSERT: anyone authed can log their own block events
DROP POLICY IF EXISTS consent_blocks_insert_self ON public.consent_blocks;
CREATE POLICY consent_blocks_insert_self
  ON public.consent_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- SELECT: user can read their own events (no read of others)
DROP POLICY IF EXISTS consent_blocks_select_self ON public.consent_blocks;
CREATE POLICY consent_blocks_select_self
  ON public.consent_blocks
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.consent_blocks IS
  'Append-only telemetry: blocked non-mutual attempts, expired location sessions, silent insert failures, RLS denials. For abuse signal + product analytics.';

-- ---------------------------------------------------------------------
-- 6. Performance indexes for the helper lookups
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_taps_mutual_lookup
  ON public.taps (from_user_id, to_user_id, tap_type);
CREATE INDEX IF NOT EXISTS idx_taps_mutual_lookup_reverse
  ON public.taps (to_user_id, from_user_id, tap_type);
CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON public.profiles (email);
