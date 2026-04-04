-- hotmess-globe: add missing social tables referenced by the UI
-- Fixes PostgREST 404/PGRST205 errors for public.user_follows and public.user_vibes.

create extension if not exists pgcrypto;

-- User Follows
create table if not exists public.user_follows (
  id uuid primary key default gen_random_uuid(),
  follower_email text not null,
  following_email text not null,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (follower_email, following_email)
);

create index if not exists idx_user_follows_follower_email on public.user_follows (follower_email);
create index if not exists idx_user_follows_following_email on public.user_follows (following_email);

-- User Vibes
create table if not exists public.user_vibes (
  id uuid primary key default gen_random_uuid(),
  user_email text not null unique,
  vibe_title text,
  vibe_description text,
  vibe_color text,
  archetype text,
  traits text[],
  sweat_history jsonb,
  last_synthesized timestamptz,
  synthesis_count integer default 0,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_vibes_user_email on public.user_vibes (user_email);

-- RLS
alter table public.user_follows enable row level security;
alter table public.user_vibes enable row level security;

-- Policies: keep permissive (authenticated) to match current app behavior.

-- user_follows
drop policy if exists user_follows_select_authenticated on public.user_follows;
create policy user_follows_select_authenticated
  on public.user_follows
  for select
  to authenticated
  using (true);

drop policy if exists user_follows_insert_self on public.user_follows;
create policy user_follows_insert_self
  on public.user_follows
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = follower_email);

drop policy if exists user_follows_delete_self on public.user_follows;
create policy user_follows_delete_self
  on public.user_follows
  for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = follower_email);

-- user_vibes
drop policy if exists user_vibes_select_authenticated on public.user_vibes;
create policy user_vibes_select_authenticated
  on public.user_vibes
  for select
  to authenticated
  using (true);

drop policy if exists user_vibes_insert_self on public.user_vibes;
create policy user_vibes_insert_self
  on public.user_vibes
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = user_email);

drop policy if exists user_vibes_update_self on public.user_vibes;
create policy user_vibes_update_self
  on public.user_vibes
  for update
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email)
  with check ((auth.jwt() ->> 'email') = user_email);

-- Keep updated_at fresh if the shared trigger function exists.
do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    execute 'drop trigger if exists trg_user_follows_set_updated_at on public.user_follows';
    execute 'create trigger trg_user_follows_set_updated_at before update on public.user_follows for each row execute function public.set_updated_at()';

    execute 'drop trigger if exists trg_user_vibes_set_updated_at on public.user_vibes';
    execute 'create trigger trg_user_vibes_set_updated_at before update on public.user_vibes for each row execute function public.set_updated_at()';
  end if;
end $$;
