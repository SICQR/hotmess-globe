-- Private presence/location storage + secure nearby RPC (V1.5)
-- Goal: keep precise coords in a private table (RLS), and expose only bucketed coords + distances via RPC.

create extension if not exists postgis;

create table if not exists public.user_presence_locations (
  auth_user_id uuid primary key,
  lat double precision,
  lng double precision,
  accuracy_m integer,
  updated_at timestamptz not null default now()
);

-- Fast geo queries (only for rows with coords)
create index if not exists idx_user_presence_locations_geog
on public.user_presence_locations
using gist (geography(st_setsrid(st_makepoint(lng, lat), 4326)))
where lat is not null and lng is not null;

create index if not exists idx_user_presence_locations_updated_at
on public.user_presence_locations (updated_at);

alter table public.user_presence_locations enable row level security;

-- Owner can read their own stored location
drop policy if exists "upl_select_own" on public.user_presence_locations;
create policy "upl_select_own"
  on public.user_presence_locations
  for select
  to authenticated
  using (auth.uid() = auth_user_id);

-- Owner can upsert/update their own location
drop policy if exists "upl_write_own" on public.user_presence_locations;
create policy "upl_write_own"
  on public.user_presence_locations
  for insert
  to authenticated
  with check (auth.uid() = auth_user_id);

drop policy if exists "upl_update_own" on public.user_presence_locations;
create policy "upl_update_own"
  on public.user_presence_locations
  for update
  to authenticated
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

-- Nearby candidates RPC: SECURITY DEFINER so we can read presence coords without granting them broadly.
-- Returns bucketed coords only (3dp ~= 100m), plus distance.
create or replace function public.nearby_candidates_secure(
  p_viewer_lat double precision,
  p_viewer_lng double precision,
  p_radius_m integer,
  p_limit integer,
  p_exclude_user_id uuid,
  p_max_age_seconds integer default 900
)
returns table(
  user_id uuid,
  distance_meters integer,
  last_lat double precision,
  last_lng double precision,
  is_online boolean,
  privacy_hide_proximity boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with viewer as (
    select geography(st_setsrid(st_makepoint(p_viewer_lng, p_viewer_lat), 4326)) as g
  )
  select
    u.auth_user_id as user_id,
    cast(st_distance(
      v.g,
      geography(st_setsrid(st_makepoint(coalesce(p.lng, u.last_lng), coalesce(p.lat, u.last_lat)), 4326))
    ) as integer) as distance_meters,
    round(coalesce(p.lat, u.last_lat)::numeric, 3)::double precision as last_lat,
    round(coalesce(p.lng, u.last_lng)::numeric, 3)::double precision as last_lng,
    u.is_online,
    u.privacy_hide_proximity
  from public."User" u
  left join public.user_presence_locations p
    on p.auth_user_id = u.auth_user_id
  cross join viewer v
  where
    u.auth_user_id is not null
    and u.auth_user_id <> p_exclude_user_id
    and u.privacy_hide_proximity = false
    and coalesce(p.lat, u.last_lat) is not null
    and coalesce(p.lng, u.last_lng) is not null
    and coalesce(p.updated_at, u.last_loc_ts, u.updated_at, now()) > now() - make_interval(secs => greatest(p_max_age_seconds, 0))
    and st_dwithin(
      v.g,
      geography(st_setsrid(st_makepoint(coalesce(p.lng, u.last_lng), coalesce(p.lat, u.last_lat)), 4326)),
      p_radius_m
    )
  order by distance_meters asc
  limit p_limit;
$$;

revoke all on function public.nearby_candidates_secure(double precision, double precision, integer, integer, uuid, integer) from public;
-- Allow authenticated callers (server uses service role anyway).
grant execute on function public.nearby_candidates_secure(double precision, double precision, integer, integer, uuid, integer) to authenticated;
