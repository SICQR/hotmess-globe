-- Profiles list RPC (secure, authenticated)
-- Purpose: allow the app/server to fetch discoverable profiles without needing the service role key.
-- This is SECURITY DEFINER and only executable by the Supabase `authenticated` role.

create or replace function public.list_profiles_secure(
  p_offset integer default 0,
  p_limit integer default 40
)
returns table(
  auth_user_id uuid,
  email text,
  full_name text,
  avatar_url text,
  subscription_tier text,
  last_lat double precision,
  last_lng double precision,
  city text,
  bio text,
  profile_type text,
  last_loc_ts timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.auth_user_id,
    u.email,
    u.full_name,
    u.avatar_url,
    u.subscription_tier,
    u.last_lat,
    u.last_lng,
    u.city,
    u.bio,
    u.profile_type,
    u.last_loc_ts
  from public."User" u
  left join public.user_private_profile upp
    on upp.auth_user_id = u.auth_user_id
  where
    u.auth_user_id is not null
    and u.last_lat is not null
    and u.last_lng is not null
    and not (
      lower(coalesce(upp.gender_identity, '')) like '%female%'
      or lower(coalesce(upp.gender_identity, '')) like '%woman%'
      or lower(coalesce(upp.gender_identity, '')) = 'f'
    )
  order by coalesce(u.last_loc_ts, u.updated_at, now()) desc nulls last
  offset greatest(p_offset, 0)
  limit least(greatest(p_limit, 1), 60);
$$;

revoke all on function public.list_profiles_secure(integer, integer) from public;
grant execute on function public.list_profiles_secure(integer, integer) to authenticated;
