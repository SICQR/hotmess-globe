-- hotmess-globe: create push_subscriptions table for Web Push API

create extension if not exists pgcrypto;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  user_email text,
  endpoint text not null,
  keys jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_push_subscriptions_user_email on public.push_subscriptions (user_email);
create index if not exists idx_push_subscriptions_endpoint on public.push_subscriptions (endpoint);

-- Enable RLS
alter table public.push_subscriptions enable row level security;

-- Users can only manage their own subscriptions
drop policy if exists push_subscriptions_select_self on public.push_subscriptions;
create policy push_subscriptions_select_self
  on public.push_subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists push_subscriptions_insert_self on public.push_subscriptions;
create policy push_subscriptions_insert_self
  on public.push_subscriptions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists push_subscriptions_update_self on public.push_subscriptions;
create policy push_subscriptions_update_self
  on public.push_subscriptions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists push_subscriptions_delete_self on public.push_subscriptions;
create policy push_subscriptions_delete_self
  on public.push_subscriptions
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Keep updated_at fresh
do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    execute 'drop trigger if exists trg_push_subscriptions_set_updated_at on public.push_subscriptions';
    execute 'create trigger trg_push_subscriptions_set_updated_at before update on public.push_subscriptions for each row execute function public.set_updated_at()';
  end if;
end
$$;
