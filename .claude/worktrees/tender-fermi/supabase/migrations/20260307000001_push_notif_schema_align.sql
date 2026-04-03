-- 20260307000001_push_notif_schema_align.sql
-- Align push_subscriptions and notification_outbox with actual code usage.
--
-- push_subscriptions: API code stores endpoint/keys as separate columns + user_email.
-- notification_outbox: API code stores user_email, title, message, metadata flat (not in payload jsonb).

-- ─────────────────────────────────────────────
-- push_subscriptions: add flat columns
-- ─────────────────────────────────────────────
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS user_email    text,
  ADD COLUMN IF NOT EXISTS endpoint      text,
  ADD COLUMN IF NOT EXISTS keys          jsonb,
  ADD COLUMN IF NOT EXISTS created_at    timestamptz DEFAULT now();

-- Index for lookup by user_email (used by process.js)
CREATE INDEX IF NOT EXISTS idx_push_subs_user_email ON public.push_subscriptions(user_email);
CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint   ON public.push_subscriptions(endpoint);

-- ─────────────────────────────────────────────
-- notification_outbox: add flat columns
-- ─────────────────────────────────────────────
ALTER TABLE public.notification_outbox
  ADD COLUMN IF NOT EXISTS user_email text,
  ADD COLUMN IF NOT EXISTS title      text,
  ADD COLUMN IF NOT EXISTS message    text,
  ADD COLUMN IF NOT EXISTS metadata   jsonb;

-- Allow 'queued' as a status alias for 'pending' (both used in code)
-- (No constraint change needed — status is free text, process.js queries both)

-- Index for fast lookup of pending/queued rows by user_email
CREATE INDEX IF NOT EXISTS idx_notif_outbox_user_email ON public.notification_outbox(user_email);
CREATE INDEX IF NOT EXISTS idx_notif_outbox_status_email ON public.notification_outbox(status, user_email)
  WHERE status IN ('pending', 'queued');
