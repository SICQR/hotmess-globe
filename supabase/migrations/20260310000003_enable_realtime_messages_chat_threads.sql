-- Enable realtime on messages and chat_threads.
-- The prior migration (20260309000001) existed locally but was never applied
-- to production — so postgres_changes subscriptions for chat were silently
-- receiving nothing. This is the critical fix for real-time chat delivery.
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_blocks;
