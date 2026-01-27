-- Telegram Integration Tables
-- Stores Telegram user connections and notification preferences

-- Telegram users linked to app accounts
CREATE TABLE IF NOT EXISTS telegram_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_id TEXT NOT NULL UNIQUE,
  chat_id TEXT NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  notifications_enabled BOOLEAN DEFAULT true,
  muted_until TIMESTAMPTZ,
  linked_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT telegram_users_user_id_unique UNIQUE (user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_telegram_users_user_id ON telegram_users(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_users_telegram_id ON telegram_users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_telegram_users_chat_id ON telegram_users(chat_id);

-- Temporary tokens for linking Telegram accounts
CREATE TABLE IF NOT EXISTS telegram_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT telegram_link_tokens_user_id_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_token ON telegram_link_tokens(token);

-- Notification queue for Telegram
CREATE TABLE IF NOT EXISTS telegram_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_telegram_queue_status ON telegram_notification_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_telegram_queue_user_id ON telegram_notification_queue(user_id);

-- RLS Policies
ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_link_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_notification_queue ENABLE ROW LEVEL SECURITY;

-- Users can only see their own Telegram connection
CREATE POLICY "Users can view own telegram connection"
  ON telegram_users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own telegram connection"
  ON telegram_users FOR DELETE
  USING (auth.uid() = user_id);

-- Link tokens are only accessible to the owner
CREATE POLICY "Users can view own link tokens"
  ON telegram_link_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Notification queue is internal only (service role)
CREATE POLICY "Service role can manage queue"
  ON telegram_notification_queue FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_telegram_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM telegram_link_tokens
  WHERE expires_at < now();
END;
$$;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_telegram_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_telegram_users_updated_at
  BEFORE UPDATE ON telegram_users
  FOR EACH ROW
  EXECUTE FUNCTION update_telegram_users_updated_at();
