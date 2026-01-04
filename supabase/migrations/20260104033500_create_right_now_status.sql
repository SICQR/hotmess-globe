-- Create Right Now Status table (used by Globe/Right Now surfaces)

create extension if not exists pgcrypto;

create table if not exists public.right_now_status (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  intent text not null check (intent in ('host', 'travel', 'hotel', 'explore')),
  timeframe text not null,
  location jsonb,
  active boolean default true,
  expires_at timestamptz not null,
  preferences jsonb,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.right_now_status enable row level security;

-- Allow public browsing of active Right Now statuses (needed for Globe browse)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'right_now_status'
      and policyname = 'right_now_status_select_active'
  ) then
    create policy right_now_status_select_active
      on public.right_now_status
      for select
      using (active = true);
  end if;
end $$;

-- Require authentication for writes
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'right_now_status'
      and policyname = 'right_now_status_write_authenticated'
  ) then
    create policy right_now_status_write_authenticated
      on public.right_now_status
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'right_now_status'
      and policyname = 'right_now_status_update_authenticated'
  ) then
    create policy right_now_status_update_authenticated
      on public.right_now_status
      for update
      to authenticated
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'right_now_status'
      and policyname = 'right_now_status_delete_authenticated'
  ) then
    create policy right_now_status_delete_authenticated
      on public.right_now_status
      for delete
      to authenticated
      using (true);
  end if;
end $$;
