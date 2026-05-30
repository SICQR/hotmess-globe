-- Trigger: increment unread_count JSONB for all participants except sender on new chat_message
CREATE OR REPLACE FUNCTION public.increment_thread_unread_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  participant text;
  thread_participants text[];
BEGIN
  SELECT participant_emails INTO thread_participants
  FROM public.chat_threads
  WHERE id = NEW.thread_id;

  FOREACH participant IN ARRAY COALESCE(thread_participants, '{}') LOOP
    IF participant <> NEW.sender_email THEN
      UPDATE public.chat_threads
      SET
        unread_count = jsonb_set(
          COALESCE(unread_count, '{}'),
          ARRAY[participant],
          to_jsonb(COALESCE((unread_count ->> participant)::int, 0) + 1)
        ),
        last_message    = LEFT(NEW.content, 80),
        last_message_at = NEW.created_at,
        updated_at      = now()
      WHERE id = NEW.thread_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_unread ON public.chat_messages;
CREATE TRIGGER trg_increment_unread
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.increment_thread_unread_count();
