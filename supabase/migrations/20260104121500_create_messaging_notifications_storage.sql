-- hotmess-globe: messaging + notifications tables and storage bucket used by the UI

create extension if not exists pgcrypto;

-- Add missing columns to existing tables before creating indexes
do $$
begin
  -- chat_threads
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'chat_threads') then
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'chat_threads' and column_name = 'created_date') then
      alter table public.chat_threads add column created_date timestamptz not null default now();
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'chat_threads' and column_name = 'updated_date') then
      alter table public.chat_threads add column updated_date timestamptz not null default now();
    end if;
  end if;
  
  -- messages
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'messages') then
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'messages' and column_name = 'created_date') then
      alter table public.messages add column created_date timestamptz not null default now();
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'messages' and column_name = 'updated_date') then
      alter table public.messages add column updated_date timestamptz not null default now();
    end if;
  end if;
  
  -- bot_sessions
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'bot_sessions') then
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'bot_sessions' and column_name = 'created_date') then
      alter table public.bot_sessions add column created_date timestamptz not null default now();
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'bot_sessions' and column_name = 'updated_date') then
      alter table public.bot_sessions add column updated_date timestamptz not null default now();
    end if;
  end if;
  
  -- notifications
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'notifications') then
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'notifications' and column_name = 'created_date') then
      alter table public.notifications add column created_date timestamptz not null default now();
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'notifications' and column_name = 'updated_date') then
      alter table public.notifications add column updated_date timestamptz not null default now();
    end if;
  end if;
end $$;

-- Chat threads
create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  participant_emails text[] not null,
  thread_type text not null default 'dm',
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  unread_count jsonb not null default '{}'::jsonb,
  muted_by text[] not null default '{}'::text[],
  telegram_chat_id text,
  last_message text,
  last_message_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists idx_chat_threads_active on public.chat_threads (active);
create index if not exists idx_chat_threads_type on public.chat_threads (thread_type);
create index if not exists idx_chat_threads_last_message_at on public.chat_threads (last_message_at);
create index if not exists idx_chat_threads_participants_gin on public.chat_threads using gin (participant_emails);
create index if not exists idx_chat_threads_metadata_gin on public.chat_threads using gin (metadata);

-- Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_email text not null,
  sender_name text,
  content text,
  message_type text not null default 'text',
  metadata jsonb not null default '{}'::jsonb,
  media_urls text[],
  read_by text[] not null default '{}'::text[],
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists idx_messages_thread_id on public.messages (thread_id);
create index if not exists idx_messages_created_date on public.messages (created_date);

-- Bot sessions (Telegram handshake)
create table if not exists public.bot_sessions (
  id uuid primary key default gen_random_uuid(),
  initiator_email text not null,
  target_email text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  telegram_chat_id text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists idx_bot_sessions_initiator on public.bot_sessions (initiator_email);
create index if not exists idx_bot_sessions_target on public.bot_sessions (target_email);
create index if not exists idx_bot_sessions_status on public.bot_sessions (status);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  type text not null,
  title text not null,
  message text not null,
  link text,
  metadata jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists idx_notifications_user_email on public.notifications (user_email);
create index if not exists idx_notifications_read on public.notifications (read);
create index if not exists idx_notifications_created_date on public.notifications (created_date);

-- updated_at / updated_date trigger
create or replace function public.set_updated_timestamps()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.updated_date = now();
  return new;
end;
$$;

drop trigger if exists trg_chat_threads_set_updated_timestamps on public.chat_threads;
create trigger trg_chat_threads_set_updated_timestamps
before update on public.chat_threads
for each row execute function public.set_updated_timestamps();

drop trigger if exists trg_messages_set_updated_timestamps on public.messages;
create trigger trg_messages_set_updated_timestamps
before update on public.messages
for each row execute function public.set_updated_timestamps();

drop trigger if exists trg_bot_sessions_set_updated_timestamps on public.bot_sessions;
create trigger trg_bot_sessions_set_updated_timestamps
before update on public.bot_sessions
for each row execute function public.set_updated_timestamps();

drop trigger if exists trg_notifications_set_updated_timestamps on public.notifications;
create trigger trg_notifications_set_updated_timestamps
before update on public.notifications
for each row execute function public.set_updated_timestamps();

-- RLS
alter table public.chat_threads enable row level security;
alter table public.messages enable row level security;
alter table public.bot_sessions enable row level security;
alter table public.notifications enable row level security;

-- Policies (intentionally permissive to match existing UI expectations)

drop policy if exists chat_threads_select_authenticated on public.chat_threads;
create policy chat_threads_select_authenticated
  on public.chat_threads
  for select
  to authenticated
  using (true);

drop policy if exists chat_threads_write_authenticated on public.chat_threads;
create policy chat_threads_write_authenticated
  on public.chat_threads
  for insert
  to authenticated
  with check (true);

drop policy if exists chat_threads_update_authenticated on public.chat_threads;
create policy chat_threads_update_authenticated
  on public.chat_threads
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists chat_threads_delete_authenticated on public.chat_threads;
create policy chat_threads_delete_authenticated
  on public.chat_threads
  for delete
  to authenticated
  using (true);


drop policy if exists messages_select_authenticated on public.messages;
create policy messages_select_authenticated
  on public.messages
  for select
  to authenticated
  using (true);

drop policy if exists messages_write_authenticated on public.messages;
create policy messages_write_authenticated
  on public.messages
  for insert
  to authenticated
  with check (true);

drop policy if exists messages_update_authenticated on public.messages;
create policy messages_update_authenticated
  on public.messages
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists messages_delete_authenticated on public.messages;
create policy messages_delete_authenticated
  on public.messages
  for delete
  to authenticated
  using (true);


drop policy if exists bot_sessions_select_authenticated on public.bot_sessions;
create policy bot_sessions_select_authenticated
  on public.bot_sessions
  for select
  to authenticated
  using (true);

drop policy if exists bot_sessions_write_authenticated on public.bot_sessions;
create policy bot_sessions_write_authenticated
  on public.bot_sessions
  for insert
  to authenticated
  with check (true);

drop policy if exists bot_sessions_update_authenticated on public.bot_sessions;
create policy bot_sessions_update_authenticated
  on public.bot_sessions
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists bot_sessions_delete_authenticated on public.bot_sessions;
create policy bot_sessions_delete_authenticated
  on public.bot_sessions
  for delete
  to authenticated
  using (true);


drop policy if exists notifications_select_authenticated on public.notifications;
create policy notifications_select_authenticated
  on public.notifications
  for select
  to authenticated
  using (true);

drop policy if exists notifications_write_authenticated on public.notifications;
create policy notifications_write_authenticated
  on public.notifications
  for insert
  to authenticated
  with check (true);

drop policy if exists notifications_update_authenticated on public.notifications;
create policy notifications_update_authenticated
  on public.notifications
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists notifications_delete_authenticated on public.notifications;
create policy notifications_delete_authenticated
  on public.notifications
  for delete
  to authenticated
  using (true);

-- Storage bucket for uploads (Profile avatar + chat media)
-- Note: requires Supabase Storage to be enabled in the project.
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do update set public = excluded.public;

-- NOTE: Storage object policies are managed outside of SQL migrations in many Supabase projects.
-- If uploads still fail with RLS errors, create policies for bucket_id='uploads' in the dashboard.
