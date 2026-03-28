-- SoundCloud OAuth storage (server-only)
-- Stores short-lived OAuth state/PKCE data and long-lived refresh/access tokens.

create extension if not exists pgcrypto;

create table if not exists public.soundcloud_oauth_states (
  state text primary key,
  code_verifier text not null,
  redirect_to text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists idx_soundcloud_oauth_states_expires_at
  on public.soundcloud_oauth_states (expires_at);

create table if not exists public.soundcloud_oauth_tokens (
  account_key text primary key,
  access_token text,
  refresh_token text,
  token_type text,
  scope text,
  expires_at timestamptz,
  obtained_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.soundcloud_oauth_states enable row level security;
alter table public.soundcloud_oauth_tokens enable row level security;

-- Intentionally no RLS policies: only service-role access is expected.
