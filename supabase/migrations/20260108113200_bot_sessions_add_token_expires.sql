-- Add token-based session fields for Telegram bot handshakes (feed entry)

alter table public.bot_sessions
  add column if not exists token text;

alter table public.bot_sessions
  add column if not exists expires_at timestamptz;

create unique index if not exists idx_bot_sessions_token on public.bot_sessions (token);
