-- hotmess-globe: create minimal tables required by the frontend
-- Creates public."Beacon" and public."EventRSVP" with minimal columns used by the app.

-- Ensure UUID generator exists (Supabase typically has this already).
create extension if not exists pgcrypto;

-- 1) Beacon
create table if not exists public."Beacon" (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),

  active boolean not null default true,
  status text not null default 'draft',
  kind text,

  title text,
  description text,
  venue_name text,
  city text,
  mode text,

  event_date timestamptz,

  owner_email text
);

create index if not exists idx_beacon_active_status on public."Beacon" (active, status);
create index if not exists idx_beacon_kind_event_date on public."Beacon" (kind, event_date);
create index if not exists idx_beacon_city on public."Beacon" (city);

-- Keep updated_date fresh.
create or replace function public.set_updated_date()
returns trigger
language plpgsql
as $$
begin
  new.updated_date = now();
  return new;
end;
$$;

drop trigger if exists trg_beacon_set_updated_date on public."Beacon";
create trigger trg_beacon_set_updated_date
before update on public."Beacon"
for each row
execute function public.set_updated_date();

-- Default owner_email to the auth email if client didn't set it.
create or replace function public.set_owner_email_from_jwt()
returns trigger
language plpgsql
as $$
begin
  if new.owner_email is null or new.owner_email = '' then
    new.owner_email = auth.jwt() ->> 'email';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_beacon_set_owner_email on public."Beacon";
create trigger trg_beacon_set_owner_email
before insert on public."Beacon"
for each row
execute function public.set_owner_email_from_jwt();

-- 2) EventRSVP
create table if not exists public."EventRSVP" (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),

  event_id uuid not null references public."Beacon"(id) on delete cascade,
  user_email text not null
);

create unique index if not exists uniq_eventrsvp_event_user on public."EventRSVP" (event_id, user_email);
create index if not exists idx_eventrsvp_user_email on public."EventRSVP" (user_email);
create index if not exists idx_eventrsvp_event_id on public."EventRSVP" (event_id);

-- RLS policies (match the app expectations)
alter table public."Beacon" enable row level security;

drop policy if exists "beacon_select_public" on public."Beacon";
create policy "beacon_select_public"
on public."Beacon"
for select
to anon, authenticated
using (active = true and status = 'published');

drop policy if exists "beacon_insert_owner" on public."Beacon";
create policy "beacon_insert_owner"
on public."Beacon"
for insert
to authenticated
with check ((auth.jwt() ->> 'email') = owner_email);

drop policy if exists "beacon_update_owner" on public."Beacon";
create policy "beacon_update_owner"
on public."Beacon"
for update
to authenticated
using ((auth.jwt() ->> 'email') = owner_email)
with check ((auth.jwt() ->> 'email') = owner_email);

drop policy if exists "beacon_delete_owner" on public."Beacon";
create policy "beacon_delete_owner"
on public."Beacon"
for delete
to authenticated
using ((auth.jwt() ->> 'email') = owner_email);

alter table public."EventRSVP" enable row level security;

drop policy if exists "eventrsvp_select_authenticated" on public."EventRSVP";
create policy "eventrsvp_select_authenticated"
on public."EventRSVP"
for select
to authenticated
using (true);

drop policy if exists "eventrsvp_insert_self" on public."EventRSVP";
create policy "eventrsvp_insert_self"
on public."EventRSVP"
for insert
to authenticated
with check ((auth.jwt() ->> 'email') = user_email);

drop policy if exists "eventrsvp_delete_self" on public."EventRSVP";
create policy "eventrsvp_delete_self"
on public."EventRSVP"
for delete
to authenticated
using ((auth.jwt() ->> 'email') = user_email);
