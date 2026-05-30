-- ============================================================
-- FIX: Prevent duplicate notifications (especially for Chat)
-- and ensure read status consistency.
-- ============================================================

-- 1. Function to prevent duplicate notifications within a short window (60s)
CREATE OR REPLACE FUNCTION public.prevent_duplicate_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    recent_count INT;
BEGIN
    -- Check if an identical unread notification exists for this user in the last 60 seconds
    -- We match on user_id, type, and payload (title/body/link)
    SELECT count(*) INTO recent_count
    FROM public.notifications
    WHERE user_id = NEW.user_id
      AND type = NEW.type
      AND title = NEW.title
      AND (body = NEW.body OR (body IS NULL AND NEW.body IS NULL))
      AND (link = NEW.link OR (link IS NULL AND NEW.link IS NULL))
      AND read = false
      AND created_at > (now() - interval '60 seconds');

    IF recent_count > 0 THEN
        -- Silently drop the duplicate
        RETURN NULL;
    END IF;

    RETURN NEW;
END;
$$;

-- 2. Attach trigger
DROP TRIGGER IF EXISTS trg_prevent_duplicate_notifications ON public.notifications;
CREATE TRIGGER trg_prevent_duplicate_notifications
    BEFORE INSERT ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_duplicate_notifications();
