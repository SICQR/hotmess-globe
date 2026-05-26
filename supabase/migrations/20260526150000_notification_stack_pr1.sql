-- Notification stack PR 1 — schema foundation (Phil brief 2026-05-26)
-- Three changes:
--   1. notification_channel + telegram_chat_id + telegram_link_token on profiles
--   2. push_subscriptions table (browser push) with RLS
--   3. dedup_key on notification_outbox (Phase 2 prep)
-- Already applied live as `notification_stack_pr1_schema_2026_05_26`.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notification_channel text DEFAULT 'none'
    CHECK (notification_channel IN ('none', 'whatsapp', 'telegram')),
  ADD COLUMN IF NOT EXISTS telegram_chat_id bigint DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS telegram_link_token text DEFAULT NULL;

COMMENT ON COLUMN profiles.notification_channel IS
  'User-selected external notification channel. none = in-app only.';
COMMENT ON COLUMN profiles.telegram_chat_id IS
  'Telegram chat_id written after /start TOKEN. NULL until user connects @HOTMESSBot.';
COMMENT ON COLUMN profiles.telegram_link_token IS
  'One-time UUID for Telegram deep-link connection. Cleared by bot webhook after use.';

CREATE INDEX IF NOT EXISTS profiles_telegram_link_token_idx
  ON profiles (telegram_link_token) WHERE telegram_link_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_telegram_chat_id_idx
  ON profiles (telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own push subs read"
  ON push_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "own push subs write"
  ON push_subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "own push subs update"
  ON push_subscriptions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own push subs delete"
  ON push_subscriptions FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "service role push subs all"
  ON push_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE notification_outbox
  ADD COLUMN IF NOT EXISTS dedup_key text DEFAULT NULL;

COMMENT ON COLUMN notification_outbox.dedup_key IS
  'Optional idempotency key. Phase 2 deduplication for beacon_nearby and broadcasts.';

CREATE INDEX IF NOT EXISTS notification_outbox_dedup_recent_idx
  ON notification_outbox (dedup_key, created_at DESC)
  WHERE dedup_key IS NOT NULL;
