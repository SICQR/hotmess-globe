-- P0 (Cowork audit 2026-05-18): block silent UPDATE status='failed' writes from
-- process.js so it stops racing dispatch.js. process.js's silent catch hid the
-- root cause of 14 historical WA 401s + Glen's SOS bounce. This trigger forces
-- the proper variant (dispatch.js sets error_message explicitly), so process.js
-- now leaves rows queued for dispatch.js to handle properly.

CREATE OR REPLACE FUNCTION public.block_silent_failed_writes_on_outbox()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'failed'
     AND (NEW.error_message IS NULL OR length(trim(NEW.error_message)) = 0)
     AND OLD.status IN ('queued', 'pending')
  THEN
    RAISE EXCEPTION 'silent_failed_write_blocked: notification_outbox row % cannot be marked status=failed without error_message.', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notification_outbox_block_silent_failures ON public.notification_outbox;
CREATE TRIGGER notification_outbox_block_silent_failures
  BEFORE UPDATE ON public.notification_outbox
  FOR EACH ROW
  EXECUTE FUNCTION public.block_silent_failed_writes_on_outbox();
