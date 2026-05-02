CREATE TABLE IF NOT EXISTS processed_webhook_sessions (
  stripe_event_id text PRIMARY KEY,
  stripe_session_id text,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  result jsonb
);
CREATE INDEX IF NOT EXISTS idx_pws_session ON processed_webhook_sessions(stripe_session_id);
ALTER TABLE processed_webhook_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON processed_webhook_sessions FROM anon, authenticated;
GRANT ALL ON processed_webhook_sessions TO service_role;
