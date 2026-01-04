-- hotmess-globe: bootstrap core tables for a fresh Supabase project
-- Creates public."User" before any RLS/policy migrations run.

create extension if not exists pgcrypto;

create table if not exists public."User" (
  id uuid primary key default gen_random_uuid(),
  email text not null,

  -- Gating / consent
  consent_accepted boolean not null default false,
  has_agreed_terms boolean not null default false,
  has_consented_data boolean not null default false,
  has_consented_gps boolean not null default false,

  -- Profile
  full_name text,
  avatar_url text,

  -- Location
  lat double precision,
  lng double precision,
  city text,

  -- Gamification
  xp integer not null default 0,

  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

-- Ensure email uniqueness for upsert(onConflict: 'email')
create unique index if not exists uniq_user_email on public."User" (email);

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

drop trigger if exists trg_user_set_updated_date on public."User";
create trigger trg_user_set_updated_date
before update on public."User"
for each row
execute function public.set_updated_date();
