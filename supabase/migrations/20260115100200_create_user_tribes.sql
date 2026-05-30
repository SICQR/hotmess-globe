-- hotmess-globe: user tribes taxonomy selections (used by Onboarding/EditProfile/Connect)

create extension if not exists pgcrypto;

create table if not exists public.user_tribes (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  tribe_id text not null,
  tribe_label text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  unique (user_email, tribe_id)
);

create index if not exists idx_user_tribes_user_email on public.user_tribes (user_email);
create index if not exists idx_user_tribes_tribe_id on public.user_tribes (tribe_id);

alter table public.user_tribes enable row level security;

-- Select: authenticated users can read tribes (needed for discovery ranking).
drop policy if exists user_tribes_select_authenticated on public.user_tribes;
create policy user_tribes_select_authenticated
  on public.user_tribes
  for select
  to authenticated
  using (true);

-- Writes: self only.
drop policy if exists user_tribes_insert_self on public.user_tribes;
create policy user_tribes_insert_self
  on public.user_tribes
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = user_email);

drop policy if exists user_tribes_update_self on public.user_tribes;
create policy user_tribes_update_self
  on public.user_tribes
  for update
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email)
  with check ((auth.jwt() ->> 'email') = user_email);

drop policy if exists user_tribes_delete_self on public.user_tribes;
create policy user_tribes_delete_self
  on public.user_tribes
  for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email);

-- updated_at / updated_date trigger when available.
do $$
begin
  if to_regprocedure('public.set_updated_timestamps()') is not null then
    execute 'drop trigger if exists trg_user_tribes_set_updated_timestamps on public.user_tribes';
    execute 'create trigger trg_user_tribes_set_updated_timestamps before update on public.user_tribes for each row execute function public.set_updated_timestamps()';
  end if;
end
$$;
