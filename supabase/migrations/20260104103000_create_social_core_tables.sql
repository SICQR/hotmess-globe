-- hotmess-globe: add core social/gamification tables required by the UI
-- These tables back Profile/Connect/Squads features in Supabase.

create extension if not exists pgcrypto;

-- Achievements (public read)
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  color text,
  xp_required integer,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User achievements (used on Profile)
create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  achievement_id uuid references public.achievements(id) on delete set null,
  unlocked_date timestamptz default now(),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_user_achievements_user_email on public.user_achievements (user_email);
create index if not exists idx_user_achievements_achievement_id on public.user_achievements (achievement_id);

-- Squads (public read)
create table if not exists public.squads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  interest text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Squad members (authenticated read)
create table if not exists public.squad_members (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid references public.squads(id) on delete cascade,
  user_email text not null,
  role text default 'member' check (role in ('owner', 'admin', 'member')),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (squad_id, user_email)
);
create index if not exists idx_squad_members_squad_id on public.squad_members (squad_id);
create index if not exists idx_squad_members_user_email on public.squad_members (user_email);

-- User tags (authenticated read; used for compatibility)
create table if not exists public.user_tags (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  tag_id text not null,
  is_essential boolean not null default false,
  is_dealbreaker boolean not null default false,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_email, tag_id)
);
create index if not exists idx_user_tags_user_email on public.user_tags (user_email);
create index if not exists idx_user_tags_tag_id on public.user_tags (tag_id);

-- RLS
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.squads enable row level security;
alter table public.squad_members enable row level security;
alter table public.user_tags enable row level security;

-- Public read policies (achievements, squads)
drop policy if exists achievements_select_public on public.achievements;
create policy achievements_select_public
  on public.achievements
  for select
  to anon, authenticated
  using (true);

drop policy if exists squads_select_public on public.squads;
create policy squads_select_public
  on public.squads
  for select
  to anon, authenticated
  using (true);

-- Authenticated read/write policies
-- NOTE: These are intentionally permissive for authenticated users to match
-- the existing app behavior (e.g. viewing other users' tags/achievements).

drop policy if exists user_achievements_select_authenticated on public.user_achievements;
create policy user_achievements_select_authenticated
  on public.user_achievements
  for select
  to authenticated
  using (true);

drop policy if exists user_achievements_write_authenticated on public.user_achievements;
create policy user_achievements_write_authenticated
  on public.user_achievements
  for insert
  to authenticated
  with check (true);

drop policy if exists squads_write_authenticated on public.squads;
create policy squads_write_authenticated
  on public.squads
  for insert
  to authenticated
  with check (true);

drop policy if exists squads_update_authenticated on public.squads;
create policy squads_update_authenticated
  on public.squads
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists squads_delete_authenticated on public.squads;
create policy squads_delete_authenticated
  on public.squads
  for delete
  to authenticated
  using (true);

drop policy if exists squad_members_select_authenticated on public.squad_members;
create policy squad_members_select_authenticated
  on public.squad_members
  for select
  to authenticated
  using (true);

drop policy if exists squad_members_write_authenticated on public.squad_members;
create policy squad_members_write_authenticated
  on public.squad_members
  for insert
  to authenticated
  with check (true);

drop policy if exists user_tags_select_authenticated on public.user_tags;
create policy user_tags_select_authenticated
  on public.user_tags
  for select
  to authenticated
  using (true);

drop policy if exists user_tags_write_authenticated on public.user_tags;
create policy user_tags_write_authenticated
  on public.user_tags
  for insert
  to authenticated
  with check (true);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_achievements_set_updated_at on public.achievements;
create trigger trg_achievements_set_updated_at
before update on public.achievements
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_achievements_set_updated_at on public.user_achievements;
create trigger trg_user_achievements_set_updated_at
before update on public.user_achievements
for each row execute function public.set_updated_at();

drop trigger if exists trg_squads_set_updated_at on public.squads;
create trigger trg_squads_set_updated_at
before update on public.squads
for each row execute function public.set_updated_at();

drop trigger if exists trg_squad_members_set_updated_at on public.squad_members;
create trigger trg_squad_members_set_updated_at
before update on public.squad_members
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_tags_set_updated_at on public.user_tags;
create trigger trg_user_tags_set_updated_at
before update on public.user_tags
for each row execute function public.set_updated_at();
