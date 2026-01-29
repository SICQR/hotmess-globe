-- Extend list_profiles_secure to expose safe profile metadata stored in auth.users
-- (e.g. photos + seller fields) without requiring the service role key.

-- NOTE: Postgres does not allow CREATE OR REPLACE to change a function's return
-- row type (OUT parameters). Drop first, then recreate.
drop function if exists public.list_profiles_secure(integer, integer);

create function public.list_profiles_secure(
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
  last_loc_ts timestamptz,
  photos jsonb,
  seller_tagline text,
  seller_bio text,
  shop_banner_url text
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
    u.last_loc_ts,
    au.raw_user_meta_data->'photos' as photos,
    au.raw_user_meta_data->>'seller_tagline' as seller_tagline,
    au.raw_user_meta_data->>'seller_bio' as seller_bio,
    au.raw_user_meta_data->>'shop_banner_url' as shop_banner_url
  from public."User" u
  left join public.user_private_profile upp
    on upp.auth_user_id = u.auth_user_id
  left join auth.users au
    on au.id = u.auth_user_id
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
