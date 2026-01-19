-- hotmess-globe: activity feed table (used by Feed/Stats)

create extension if not exists pgcrypto;

create table if not exists public.activity_feed (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  activity_type text not null,
  visibility text not null default 'public' check (visibility in ('public', 'followers', 'private')),
  xp_earned integer,
  activity_data jsonb not null default '{}'::jsonb,
  location jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create index if not exists idx_activity_feed_created_date on public.activity_feed (created_date desc);
create index if not exists idx_activity_feed_user_email on public.activity_feed (user_email);
create index if not exists idx_activity_feed_visibility on public.activity_feed (visibility);

alter table public.activity_feed enable row level security;

-- Select: public items are readable; owners can read their own.
drop policy if exists activity_feed_select_visible_or_self on public.activity_feed;
create policy activity_feed_select_visible_or_self
  on public.activity_feed
  for select
  to authenticated
  using (
    visibility = 'public'
    or (auth.jwt() ->> 'email') = user_email
  );

-- Insert/Update/Delete: self only.
drop policy if exists activity_feed_insert_self on public.activity_feed;
create policy activity_feed_insert_self
  on public.activity_feed
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = user_email);

drop policy if exists activity_feed_update_self on public.activity_feed;
create policy activity_feed_update_self
  on public.activity_feed
  for update
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email)
  with check ((auth.jwt() ->> 'email') = user_email);

drop policy if exists activity_feed_delete_self on public.activity_feed;
create policy activity_feed_delete_self
  on public.activity_feed
  for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email);

-- updated_at / updated_date trigger when available.
do $$
begin
  if to_regprocedure('public.set_updated_timestamps()') is not null then
    execute 'drop trigger if exists trg_activity_feed_set_updated_timestamps on public.activity_feed';
    execute 'create trigger trg_activity_feed_set_updated_timestamps before update on public.activity_feed for each row execute function public.set_updated_timestamps()';
  end if;
end
$$;
