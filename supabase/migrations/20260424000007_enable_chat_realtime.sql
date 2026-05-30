-- Enable Realtime for the chat tables
-- This allows messages to appear instantly without refreshing the page.

-- 1. Ensure the publication exists (Supabase default)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- 2. Add the tables to the replication publication
-- This is what makes the .on('INSERT') events fire in your frontend.
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;

-- 3. Set replica identity to FULL for chat_threads 
-- (Ensures we get the old/new values in UPDATE payloads for unread sync)
ALTER TABLE public.chat_threads REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

COMMENT ON TABLE public.chat_messages IS 'Enables instant message sync via Supabase Realtime.';
