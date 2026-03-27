-- Add read_at (per-recipient read timestamp) and expires_at (ephemeral TTL) to messages
-- read_at supplements the existing read_by[] array with a timestamp

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS read_at timestamptz,
ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Index for TTL cleanup cron (only rows with a deadline)
CREATE INDEX IF NOT EXISTS idx_messages_expires_at
ON public.messages (expires_at)
WHERE expires_at IS NOT NULL;

-- Index for read receipt queries
CREATE INDEX IF NOT EXISTS idx_messages_read_at
ON public.messages (read_at)
WHERE read_at IS NOT NULL;

-- Update mark_messages_read to also stamp read_at
CREATE OR REPLACE FUNCTION public.mark_messages_read(
  p_thread_id uuid,
  p_user_email text
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count int;
BEGIN
  UPDATE public.messages
  SET
    read_by = array_append(read_by, p_user_email),
    read_at = COALESCE(read_at, now())
  WHERE thread_id = p_thread_id
    AND sender_email != p_user_email
    AND NOT (p_user_email = ANY(read_by));

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  UPDATE public.chat_threads
  SET unread_count = unread_count - p_user_email
  WHERE id = p_thread_id;

  RETURN updated_count;
END;
$$;

COMMENT ON COLUMN public.messages.read_at IS 'First time any recipient read the message';
COMMENT ON COLUMN public.messages.expires_at IS 'If set, message auto-deletes after this time (requires pg_cron)';
