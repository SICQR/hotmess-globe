-- Enable Realtime on messages + chat_threads tables
-- Without this, postgres_changes subscriptions in L2ChatSheet don't fire

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_threads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;
  END IF;
END $$;

-- Add user_blocks to realtime so block state can sync live
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_blocks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_blocks;
  END IF;
END $$;
