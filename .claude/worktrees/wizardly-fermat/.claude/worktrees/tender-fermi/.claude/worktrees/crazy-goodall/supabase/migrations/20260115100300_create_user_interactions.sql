-- hotmess-globe: track user interactions (scan/like/etc) for AI + analytics + organizer dashboards

create extension if not exists pgcrypto;

create table if not exists public.user_interactions (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  interaction_type text not null,
  beacon_id uuid references public."Beacon"(id) on delete set null,
  beacon_kind text,
  beacon_mode text,
  metadata jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create index if not exists idx_user_interactions_user_email on public.user_interactions (user_email);
create index if not exists idx_user_interactions_beacon_id on public.user_interactions (beacon_id);
create index if not exists idx_user_interactions_created_date on public.user_interactions (created_date desc);

alter table public.user_interactions enable row level security;

-- Select: permissive for authenticated (existing UI expects to aggregate interactions client-side).
drop policy if exists user_interactions_select_authenticated on public.user_interactions;
create policy user_interactions_select_authenticated
  on public.user_interactions
  for select
  to authenticated
  using (true);

-- Insert: self only.
drop policy if exists user_interactions_insert_self on public.user_interactions;
create policy user_interactions_insert_self
  on public.user_interactions
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = user_email);

-- Update/Delete: owner only.
drop policy if exists user_interactions_update_self on public.user_interactions;
create policy user_interactions_update_self
  on public.user_interactions
  for update
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email)
  with check ((auth.jwt() ->> 'email') = user_email);

drop policy if exists user_interactions_delete_self on public.user_interactions;
create policy user_interactions_delete_self
  on public.user_interactions
  for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email);

-- updated_at / updated_date trigger when available.
do $$
begin
  if to_regprocedure('public.set_updated_timestamps()') is not null then
    execute 'drop trigger if exists trg_user_interactions_set_updated_timestamps on public.user_interactions';
    execute 'create trigger trg_user_interactions_set_updated_timestamps before update on public.user_interactions for each row execute function public.set_updated_timestamps()';
  end if;
end
$$;
