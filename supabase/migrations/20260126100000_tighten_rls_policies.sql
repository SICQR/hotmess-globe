-- Tighten RLS policies for security-sensitive tables
-- This migration restricts overly permissive policies on messaging and notifications

-- =============================================================================
-- NOTIFICATIONS: Users can only see/modify their own notifications
-- =============================================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS notifications_select_authenticated ON public.notifications;
DROP POLICY IF EXISTS notifications_write_authenticated ON public.notifications;
DROP POLICY IF EXISTS notifications_update_authenticated ON public.notifications;
DROP POLICY IF EXISTS notifications_delete_authenticated ON public.notifications;

-- Recreate with proper restrictions
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated
  USING (
    user_email = (auth.jwt() ->> 'email')
    OR user_email = 'admin'
  );

CREATE POLICY notifications_insert_own ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    user_email = (auth.jwt() ->> 'email')
    OR user_email = 'admin'
  );

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_email = (auth.jwt() ->> 'email'))
  WITH CHECK (user_email = (auth.jwt() ->> 'email'));

CREATE POLICY notifications_delete_own ON public.notifications
  FOR DELETE TO authenticated
  USING (user_email = (auth.jwt() ->> 'email'));

-- =============================================================================
-- CHAT_THREADS: Users can only see threads they participate in
-- =============================================================================

DROP POLICY IF EXISTS chat_threads_select_authenticated ON public.chat_threads;
DROP POLICY IF EXISTS chat_threads_write_authenticated ON public.chat_threads;
DROP POLICY IF EXISTS chat_threads_update_authenticated ON public.chat_threads;
DROP POLICY IF EXISTS chat_threads_delete_authenticated ON public.chat_threads;

CREATE POLICY chat_threads_select_participant ON public.chat_threads
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email') = ANY(participant_emails));

CREATE POLICY chat_threads_insert_participant ON public.chat_threads
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') = ANY(participant_emails));

CREATE POLICY chat_threads_update_participant ON public.chat_threads
  FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'email') = ANY(participant_emails))
  WITH CHECK ((auth.jwt() ->> 'email') = ANY(participant_emails));

CREATE POLICY chat_threads_delete_participant ON public.chat_threads
  FOR DELETE TO authenticated
  USING ((auth.jwt() ->> 'email') = ANY(participant_emails));

-- =============================================================================
-- MESSAGES: Users can only see messages in threads they participate in
-- =============================================================================

DROP POLICY IF EXISTS messages_select_authenticated ON public.messages;
DROP POLICY IF EXISTS messages_write_authenticated ON public.messages;
DROP POLICY IF EXISTS messages_update_authenticated ON public.messages;
DROP POLICY IF EXISTS messages_delete_authenticated ON public.messages;

CREATE POLICY messages_select_thread_participant ON public.messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_threads
      WHERE chat_threads.id = messages.thread_id
      AND (auth.jwt() ->> 'email') = ANY(chat_threads.participant_emails)
    )
  );

CREATE POLICY messages_insert_thread_participant ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_email = (auth.jwt() ->> 'email')
    AND EXISTS (
      SELECT 1 FROM public.chat_threads
      WHERE chat_threads.id = messages.thread_id
      AND (auth.jwt() ->> 'email') = ANY(chat_threads.participant_emails)
    )
  );

CREATE POLICY messages_update_own ON public.messages
  FOR UPDATE TO authenticated
  USING (sender_email = (auth.jwt() ->> 'email'))
  WITH CHECK (sender_email = (auth.jwt() ->> 'email'));

CREATE POLICY messages_delete_own ON public.messages
  FOR DELETE TO authenticated
  USING (sender_email = (auth.jwt() ->> 'email'));

-- =============================================================================
-- BOT_SESSIONS: Users can only see sessions they're part of
-- =============================================================================

DROP POLICY IF EXISTS bot_sessions_select_authenticated ON public.bot_sessions;
DROP POLICY IF EXISTS bot_sessions_write_authenticated ON public.bot_sessions;
DROP POLICY IF EXISTS bot_sessions_update_authenticated ON public.bot_sessions;
DROP POLICY IF EXISTS bot_sessions_delete_authenticated ON public.bot_sessions;

CREATE POLICY bot_sessions_select_participant ON public.bot_sessions
  FOR SELECT TO authenticated
  USING (
    initiator_email = (auth.jwt() ->> 'email')
    OR target_email = (auth.jwt() ->> 'email')
  );

CREATE POLICY bot_sessions_insert_initiator ON public.bot_sessions
  FOR INSERT TO authenticated
  WITH CHECK (initiator_email = (auth.jwt() ->> 'email'));

CREATE POLICY bot_sessions_update_participant ON public.bot_sessions
  FOR UPDATE TO authenticated
  USING (
    initiator_email = (auth.jwt() ->> 'email')
    OR target_email = (auth.jwt() ->> 'email')
  );

CREATE POLICY bot_sessions_delete_initiator ON public.bot_sessions
  FOR DELETE TO authenticated
  USING (initiator_email = (auth.jwt() ->> 'email'));

-- =============================================================================
-- RIGHT_NOW_STATUS: Tighten update/delete to own records only
-- =============================================================================

DROP POLICY IF EXISTS right_now_status_update_authenticated ON public.right_now_status;
DROP POLICY IF EXISTS right_now_status_delete_authenticated ON public.right_now_status;

-- Select remains open (public discovery feature)
-- Insert check should verify user_email matches
DROP POLICY IF EXISTS right_now_status_insert_authenticated ON public.right_now_status;

CREATE POLICY right_now_status_insert_own ON public.right_now_status
  FOR INSERT TO authenticated
  WITH CHECK (user_email = (auth.jwt() ->> 'email'));

CREATE POLICY right_now_status_update_own ON public.right_now_status
  FOR UPDATE TO authenticated
  USING (user_email = (auth.jwt() ->> 'email'))
  WITH CHECK (user_email = (auth.jwt() ->> 'email'));

CREATE POLICY right_now_status_delete_own ON public.right_now_status
  FOR DELETE TO authenticated
  USING (user_email = (auth.jwt() ->> 'email'));

-- =============================================================================
-- SQUADS: Tighten update/delete to squad members only
-- =============================================================================

DROP POLICY IF EXISTS squads_update_authenticated ON public.squads;
DROP POLICY IF EXISTS squads_delete_authenticated ON public.squads;

CREATE POLICY squads_update_member ON public.squads
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.squad_members
      WHERE squad_members.squad_id = squads.id
      AND squad_members.user_email = (auth.jwt() ->> 'email')
    )
  );

CREATE POLICY squads_delete_creator ON public.squads
  FOR DELETE TO authenticated
  USING (created_by = (auth.jwt() ->> 'email'));

-- =============================================================================
-- VENUE_KINGS: Tighten update to owner only (not all authenticated)
-- =============================================================================

DROP POLICY IF EXISTS venue_kings_update_authenticated ON public.venue_kings;

CREATE POLICY venue_kings_update_king ON public.venue_kings
  FOR UPDATE TO authenticated
  USING (king_email = (auth.jwt() ->> 'email'));

-- Note: Other tables with using(true) for SELECT are intentionally permissive
-- for public discovery (achievements, reviews, posts, comments, etc.)
