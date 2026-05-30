-- Ensure chat participants can see their messages (Required for Realtime)
-- We use the chat_threads table to verify participation.

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view their own thread messages" ON public.chat_messages;
CREATE POLICY "Participants can view their own thread messages"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = chat_messages.thread_id
      AND (
        auth.jwt() ->> 'email' = ANY(t.participant_emails)
        OR 
        auth.uid() IN (
          SELECT id FROM public.profiles p 
          WHERE p.email = ANY(t.participant_emails)
        )
      )
    )
  );

-- Also allow inserting messages
DROP POLICY IF EXISTS "Participants can insert messages" ON public.chat_messages;
CREATE POLICY "Participants can insert messages"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = chat_messages.thread_id
      AND (
        auth.jwt() ->> 'email' = ANY(t.participant_emails)
      )
    )
  );

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
