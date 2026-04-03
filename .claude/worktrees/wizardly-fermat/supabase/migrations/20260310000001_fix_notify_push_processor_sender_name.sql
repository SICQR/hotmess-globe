-- Fix: notify_push_processor trigger had two bugs:
-- 1. Referenced NEW.sender_name which doesn't exist on messages table
-- 2. Called net.http_post without exception handling — if pg_net extension
--    is not installed, the entire INSERT fails. Wrapped in BEGIN/EXCEPTION.
CREATE OR REPLACE FUNCTION public.notify_push_processor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payload jsonb;
BEGIN
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'messages',
    'schema', 'public',
    'record', jsonb_build_object(
      'id', NEW.id,
      'thread_id', NEW.thread_id,
      'sender_email', NEW.sender_email,
      'content', NEW.content,
      'message_type', NEW.message_type,
      'media_urls', NEW.media_urls,
      'created_at', NEW.created_at
    ),
    'old_record', null
  );

  BEGIN
    PERFORM net.http_post(
      url := 'https://klsywpvncqqglhnhrjbh.supabase.co/functions/v1/push-processor',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := payload
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_push_processor: push failed (%), message INSERT proceeds', SQLERRM;
  END;

  RETURN NEW;
END;
$$;
