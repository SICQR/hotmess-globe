-- hotmess-globe: expand public."Beacon" fields used by the UI and tighten public visibility for shadow beacons

create extension if not exists pgcrypto;

-- Add missing columns referenced throughout the UI.
alter table if exists public."Beacon"
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists intensity double precision,
  add column if not exists xp_scan integer,
  add column if not exists sponsored boolean not null default false,
  add column if not exists image_url text,
  add column if not exists video_url text,
  add column if not exists capacity integer,
  add column if not exists ticket_url text,
  add column if not exists is_shadow boolean not null default false,
  add column if not exists is_verified boolean not null default false;

create index if not exists idx_beacon_lat_lng on public."Beacon" (lat, lng);
create index if not exists idx_beacon_shadow on public."Beacon" (is_shadow);

-- Replace the overly-simple public select policy with one that:
-- - allows public browsing of non-shadow published beacons
-- - allows owners to see their own beacons (including shadow)
-- - allows admins to see everything
alter table if exists public."Beacon" enable row level security;

drop policy if exists "beacon_select_public" on public."Beacon";
drop policy if exists beacon_select_public on public."Beacon";

drop policy if exists beacon_select_visible_or_owner_or_admin on public."Beacon";
create policy beacon_select_visible_or_owner_or_admin
on public."Beacon"
for select
to anon, authenticated
using (
  (
    active = true
    and status = 'published'
    and coalesce(is_shadow, false) = false
  )
  or (
    (auth.jwt() ->> 'email') = owner_email
  )
  or exists (
    select 1
    from public."User" u
    where u.email = (auth.jwt() ->> 'email')
      and u.role = 'admin'
  )
);
