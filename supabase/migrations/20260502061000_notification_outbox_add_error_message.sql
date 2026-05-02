-- Round 3 Part 4.2: persist failure reasons so we can debug push/email/SMS
-- handler errors after the fact. The May-2 push failure (row 76eb6b32) was
-- impossible to root-cause because no error_message was stored.
ALTER TABLE notification_outbox ADD COLUMN IF NOT EXISTS error_message text;
