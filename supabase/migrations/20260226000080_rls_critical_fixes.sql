-- ═══════════════════════════════════════════════════════════════════
-- RLS CRITICAL FIXES — Production Readiness
-- Audit date: 2026-02-25
-- Fixes: 4 blocking + 2 missing INSERT policies + user_favorites table
-- ═══════════════════════════════════════════════════════════════════

-- ─── Fix 1: notifications ────────────────────────────────────────────────────
-- BEFORE: SELECT using(true) → any auth user reads ALL notifications
-- AFTER:  SELECT restricted to own user_email rows

DROP POLICY IF EXISTS messages_select_authenticated ON public.notifications;
DROP POLICY IF EXISTS notifications_select_authenticated ON public.notifications;
DROP POLICY IF EXISTS notifications_select_all ON public.notifications;

CREATE POLICY notifications_select_own
  ON public.notifications
  FOR SELECT TO authenticated
  USING ((auth.jwt()->>'email') = user_email);

-- Keep insert/update scoped to own rows as well
DROP POLICY IF EXISTS notifications_insert_authenticated ON public.notifications;
CREATE POLICY notifications_insert_own
  ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt()->>'email') = user_email);

DROP POLICY IF EXISTS notifications_update_authenticated ON public.notifications;
CREATE POLICY notifications_update_own
  ON public.notifications
  FOR UPDATE TO authenticated
  USING ((auth.jwt()->>'email') = user_email)
  WITH CHECK ((auth.jwt()->>'email') = user_email);


-- ─── Fix 2: right_now_status ─────────────────────────────────────────────────
-- BEFORE: UPDATE/DELETE using(true) → any auth user can modify/delete any row
-- AFTER:  All writes restricted to owner via user_email

DROP POLICY IF EXISTS right_now_status_update_authenticated ON public.right_now_status;
DROP POLICY IF EXISTS right_now_status_delete_authenticated ON public.right_now_status;
DROP POLICY IF EXISTS right_now_status_insert_authenticated ON public.right_now_status;
DROP POLICY IF EXISTS right_now_status_all_authenticated ON public.right_now_status;

-- Preserve broad read (intents are semi-public by design)
DROP POLICY IF EXISTS right_now_status_select_authenticated ON public.right_now_status;
DROP POLICY IF EXISTS right_now_status_select_active ON public.right_now_status;
CREATE POLICY right_now_status_select_active
  ON public.right_now_status
  FOR SELECT TO authenticated
  USING (active = true);

-- Restrict writes to owner only
DROP POLICY IF EXISTS right_now_status_own_write ON public.right_now_status;
CREATE POLICY right_now_status_own_write
  ON public.right_now_status
  FOR ALL TO authenticated
  USING ((auth.jwt()->>'email') = user_email)
  WITH CHECK ((auth.jwt()->>'email') = user_email);


-- ─── Fix 3: venue_kings ──────────────────────────────────────────────────────
-- BEFORE: UPDATE using(true) → any auth user can steal any venue king
-- AFTER:  UPDATE restricted to king_email owner

DROP POLICY IF EXISTS venue_kings_update_authenticated ON public.venue_kings;

CREATE POLICY venue_kings_update_own
  ON public.venue_kings
  FOR UPDATE TO authenticated
  USING ((auth.jwt()->>'email') = king_email)
  WITH CHECK ((auth.jwt()->>'email') = king_email);

-- INSERT: only authenticated users claim venues (no spoofing another email)
DROP POLICY IF EXISTS venue_kings_insert_authenticated ON public.venue_kings;
CREATE POLICY venue_kings_insert_own
  ON public.venue_kings
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt()->>'email') = king_email);

-- DELETE: only own rows
CREATE POLICY venue_kings_delete_own
  ON public.venue_kings
  FOR DELETE TO authenticated
  USING ((auth.jwt()->>'email') = king_email);


-- ─── Fix 4: emergency_locations ──────────────────────────────────────────────
-- BEFORE: ALL using(true) → any auth user can overwrite/delete an SOS broadcast
-- AFTER:  READ is open (needed for SOS helpers); WRITE restricted to owner
--         emergency_id is set to auth.uid()::text when creating an emergency

DROP POLICY IF EXISTS emergency_locations_all_authenticated ON public.emergency_locations;
DROP POLICY IF EXISTS emergency_locations_select_authenticated ON public.emergency_locations;

-- SOS helpers need to read to find the person in distress
CREATE POLICY emergency_locations_read
  ON public.emergency_locations
  FOR SELECT TO authenticated
  USING (true);

-- Only the user who created the emergency location can write to it
CREATE POLICY emergency_locations_own_insert
  ON public.emergency_locations
  FOR INSERT TO authenticated
  WITH CHECK (emergency_id = auth.uid()::text);

CREATE POLICY emergency_locations_own_update
  ON public.emergency_locations
  FOR UPDATE TO authenticated
  USING (emergency_id = auth.uid()::text)
  WITH CHECK (emergency_id = auth.uid()::text);

CREATE POLICY emergency_locations_own_delete
  ON public.emergency_locations
  FOR DELETE TO authenticated
  USING (emergency_id = auth.uid()::text);


-- ─── Fix 5: video_calls INSERT ───────────────────────────────────────────────
-- BEFORE: No INSERT policy → fail-closed, video calls cannot be created
-- AFTER:  Caller can create calls for themselves only

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'video_calls' AND policyname = 'video_calls_insert_own'
  ) THEN
    EXECUTE 'CREATE POLICY video_calls_insert_own
      ON public.video_calls
      FOR INSERT TO authenticated
      WITH CHECK (caller_id = auth.uid())';
  END IF;
END $$;


-- ─── Fix 6: rtc_signals INSERT ───────────────────────────────────────────────
-- BEFORE: No INSERT policy → fail-closed, WebRTC signalling is broken
-- AFTER:  Sender can insert signals from their own user_id

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rtc_signals' AND policyname = 'rtc_signals_insert_own'
  ) THEN
    EXECUTE 'CREATE POLICY rtc_signals_insert_own
      ON public.rtc_signals
      FOR INSERT TO authenticated
      WITH CHECK (from_user_id = auth.uid())';
  END IF;
END $$;


-- ─── Fix 7: user_favorites table ─────────────────────────────────────────────
-- L2FavoritesSheet queries this table but it was never created in any migration

CREATE TABLE IF NOT EXISTS public.user_favorites (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  favoriting_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  favorited_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (favoriting_id, favorited_id)
);

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_favorites_favoriting
  ON public.user_favorites (favoriting_id);

CREATE INDEX IF NOT EXISTS idx_user_favorites_favorited
  ON public.user_favorites (favorited_id);

-- Owner can read and manage their own favorites
DROP POLICY IF EXISTS user_favorites_own ON public.user_favorites;
CREATE POLICY user_favorites_own
  ON public.user_favorites
  FOR ALL TO authenticated
  USING (favoriting_id = auth.uid())
  WITH CHECK (favoriting_id = auth.uid());
