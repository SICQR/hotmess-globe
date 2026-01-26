-- hotmess-globe: create user_tribes table for tribe/community membership
-- Referenced by EditProfile.jsx, Connect.jsx, and Onboarding.jsx

create extension if not exists pgcrypto;

create table if not exists public.user_tribes (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  tribe_id text not null,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  unique (user_email, tribe_id)
);

create index if not exists idx_user_tribes_user_email on public.user_tribes (user_email);
create index if not exists idx_user_tribes_tribe_id on public.user_tribes (tribe_id);

-- Enable RLS
alter table public.user_tribes enable row level security;

-- Select: authenticated users can view all tribes
drop policy if exists user_tribes_select_authenticated on public.user_tribes;
create policy user_tribes_select_authenticated
  on public.user_tribes
  for select
  to authenticated
  using (true);

-- Insert: authenticated users can add their own tribes
drop policy if exists user_tribes_insert_self on public.user_tribes;
create policy user_tribes_insert_self
  on public.user_tribes
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = user_email);

-- Delete: users can delete their own tribes
drop policy if exists user_tribes_delete_self on public.user_tribes;
create policy user_tribes_delete_self
  on public.user_tribes
  for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email);

-- Keep updated_at fresh
do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    execute 'drop trigger if exists trg_user_tribes_set_updated_at on public.user_tribes';
    execute 'create trigger trg_user_tribes_set_updated_at before update on public.user_tribes for each row execute function public.set_updated_at()';
  end if;
end
$$;
