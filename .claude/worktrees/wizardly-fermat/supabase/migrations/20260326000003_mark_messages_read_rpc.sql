-- mark_messages_read: clear unread JSONB key for user + stamp read_by on chat_messages
CREATE OR REPLACE FUNCTION public.mark_messages_read(
  p_thread_id   uuid,
  p_user_email  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.chat_threads
  SET
    unread_count = unread_count - p_user_email,
    updated_at   = now()
  WHERE id = p_thread_id;

  UPDATE public.chat_messages
  SET read_by = array_append(read_by, p_user_email)
  WHERE thread_id    = p_thread_id
    AND sender_email <> p_user_email
    AND NOT (p_user_email = ANY(COALESCE(read_by, '{}')));
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_messages_read(uuid, text) TO authenticated;

-- get_thread_unread_count
CREATE OR REPLACE FUNCTION public.get_thread_unread_count(
  p_thread_id  uuid,
  p_user_email text
)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (unread_count ->> p_user_email)::int,
    0
  )
  FROM public.chat_threads
  WHERE id = p_thread_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_thread_unread_count(uuid, text) TO authenticated;

-- get_total_unread_count
CREATE OR REPLACE FUNCTION public.get_total_unread_count(p_user_email text)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(
    COALESCE((unread_count ->> p_user_email)::int, 0)
  ), 0)::int
  FROM public.chat_threads
  WHERE p_user_email = ANY(participant_emails);
$$;

GRANT EXECUTE ON FUNCTION public.get_total_unread_count(text) TO authenticated;
