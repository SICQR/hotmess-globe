-- Notification stack PR 4 follow-up — retry support for CRITICAL notifications.
-- Brief: Phil cowork dispatch T7 2026-05-26.
-- Already applied live as notification_outbox_retry_2026_05_26.

ALTER TABLE notification_outbox
  ADD COLUMN IF NOT EXISTS retry_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retry_after timestamptz DEFAULT NULL;

COMMENT ON COLUMN notification_outbox.retry_count IS
  'CRITICAL retry attempt counter. 0 = first attempt; 1 = retry_1; 2 = retry_2; >=3 -> delivery_failed.';
COMMENT ON COLUMN notification_outbox.retry_after IS
  'Earliest timestamp the cron processor may attempt this row again. NULL = no backoff.';

CREATE INDEX IF NOT EXISTS notification_outbox_retry_due_idx
  ON notification_outbox (retry_after)
  WHERE retry_after IS NOT NULL;
