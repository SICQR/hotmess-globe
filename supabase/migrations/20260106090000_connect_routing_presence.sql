-- Proximity-by-travel-time foundation (Connect)
-- Adds presence/location fields to public."User", plus routing cache + rate limiting + nearby RPC.

create extension if not exists postgis;

-- 1) Presence + tier fields
alter table if exists public."User"
  add column if not exists last_lat double precision,
  add column if not exists last_lng double precision,
  add column if not exists last_loc_ts timestamptz,
  add column if not exists loc_accuracy_m integer,
  add column if not exists is_online boolean not null default false,
  add column if not exists subscription_tier text not null default 'FREE',
  add column if not exists default_travel_mode text not null default 'WALK',
  add column if not exists privacy_hide_proximity boolean not null default false;

-- Keep legacy columns in sync if they exist (optional): lat/lng/location_timestamp
-- (We update these in application code; no trigger needed.)

create index if not exists idx_user_last_loc_ts on public."User" (last_loc_ts);
create index if not exists idx_user_subscription_tier on public."User" (subscription_tier);
create index if not exists idx_user_default_travel_mode on public."User" (default_travel_mode);
create index if not exists idx_user_privacy_hide_proximity on public."User" (privacy_hide_proximity);

-- Geo index for fast nearby queries.
create index if not exists idx_user_last_location_geog
on public."User"
using gist (geography(st_setsrid(st_makepoint(last_lng, last_lat), 4326)))
where last_lat is not null and last_lng is not null;

-- 2) Routing cache
create table if not exists public.routing_cache (
  cache_key text primary key,
  origin_bucket text not null,
  dest_bucket text not null,
  mode text not null,
  duration_seconds integer not null,
  distance_meters integer not null,
  computed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  provider text not null
);

create index if not exists idx_routing_cache_expires_at on public.routing_cache (expires_at);
create index if not exists idx_routing_cache_lookup on public.routing_cache (origin_bucket, dest_bucket, mode);

-- 3) Simple DB-backed rate limiting
create table if not exists public.routing_rate_limits (
  bucket_key text primary key,
  user_id uuid,
  ip text,
  window_start timestamptz not null,
  window_seconds integer not null,
  max_requests integer not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_routing_rate_limits_user on public.routing_rate_limits (user_id, window_start);
create index if not exists idx_routing_rate_limits_ip on public.routing_rate_limits (ip, window_start);

create or replace function public.check_routing_rate_limit(
  p_bucket_key text,
  p_user_id uuid,
  p_ip text,
  p_window_seconds integer,
  p_max_requests integer
)
returns table(allowed boolean, remaining integer)
language plpgsql
as $$
begin
  insert into public.routing_rate_limits(bucket_key, user_id, ip, window_start, window_seconds, max_requests, request_count, updated_at)
  values (p_bucket_key, p_user_id, p_ip, now(), p_window_seconds, p_max_requests, 1, now())
  on conflict (bucket_key)
  do update set
    request_count = public.routing_rate_limits.request_count + 1,
    updated_at = now();

  return query
    select
      (request_count <= max_requests) as allowed,
      greatest(max_requests - request_count, 0) as remaining
    from public.routing_rate_limits
    where bucket_key = p_bucket_key;
end;
$$;

-- 4) Nearby candidates RPC (distance only)
create or replace function public.nearby_candidates(
  p_viewer_lat double precision,
  p_viewer_lng double precision,
  p_radius_m integer,
  p_limit integer,
  p_exclude_user_id uuid
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
as $$
  select
    u.auth_user_id as user_id,
    cast(st_distance(
      geography(st_setsrid(st_makepoint(p_viewer_lng, p_viewer_lat), 4326)),
      geography(st_setsrid(st_makepoint(u.last_lng, u.last_lat), 4326))
    ) as integer) as distance_meters,
    u.last_lat,
    u.last_lng,
    u.is_online,
    u.privacy_hide_proximity
  from public."User" u
  where
    u.auth_user_id is not null
    and u.auth_user_id <> p_exclude_user_id
    and u.privacy_hide_proximity = false
    and u.last_lat is not null
    and u.last_lng is not null
    and st_dwithin(
      geography(st_setsrid(st_makepoint(p_viewer_lng, p_viewer_lat), 4326)),
      geography(st_setsrid(st_makepoint(u.last_lng, u.last_lat), 4326)),
      p_radius_m
    )
  order by distance_meters asc
  limit p_limit;
$$;
