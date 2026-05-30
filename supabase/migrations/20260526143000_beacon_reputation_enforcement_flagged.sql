-- Beacon reputation enforcement (flag-gated).
-- Wires the invisible reputation foundation (migration 20260524051452_beacon_reputation_spam_foundation)
-- into the user-visibility surface, behind a feature_flags row so it can be enabled per-env.
--
-- Per docs/GLOBE_BEACON_REPUTATION_AND_SPAM_CONTROL.md + canonical ranking-formula-spec.
--
-- Scope:
--   1) SECURITY DEFINER helper `is_owner_suppressed(uuid)` — reads RLS-locked beacon_reputation.
--      Returns true when the owner's reputation state is in the suppression set, OR when an
--      open/under-review report targets the user. Treats missing rows as NOT suppressed
--      (default 'normal' state, never-reported users are visible).
--   2) Replaces `get_nearby_ghosted` with a new signature that adds
--      `enforce_reputation boolean DEFAULT false`. When true, excludes any profile whose
--      owner is suppressed. Default false = current behaviour, zero-risk merge.
--   3) Registers the feature_flags row `beacon_reputation_enforcement` (enabled_globally=false).
--
-- Forward-compatible: future moderation tooling can flip beacon_reputation.state to
-- 'suppressed' / 'banned' / 'under_review' without touching this code.
--
-- Default OFF — no live behaviour change on merge. Flip in feature_flags table per-env.

create or replace function public.is_owner_suppressed(p_owner uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_state text;
  v_open_reports int;
begin
  if p_owner is null then
    return false;
  end if;

  select state into v_state
  from public.beacon_reputation
  where owner_id = p_owner;

  if v_state is not null and lower(v_state) in (
    'suppressed', 'banned', 'under_review', 'shadow_banned', 'quarantined'
  ) then
    return true;
  end if;

  select count(*) into v_open_reports
  from public.reports
  where target_id = p_owner
    and target_type = 'user'
    and lower(coalesce(status, '')) in ('open', 'under_review', 'pending');

  if v_open_reports > 0 then
    return true;
  end if;

  return false;
end;
$$;

revoke all on function public.is_owner_suppressed(uuid) from public;
grant execute on function public.is_owner_suppressed(uuid) to authenticated, service_role;
comment on function public.is_owner_suppressed(uuid)
  is 'Invisible trust check. True when owner is suppressed/banned/under-review or has open reports. Default-false for normal users. See GLOBE_BEACON_REPUTATION_AND_SPAM_CONTROL.md.';

drop function if exists public.get_nearby_ghosted(uuid, double precision, double precision, integer, integer);

create or replace function public.get_nearby_ghosted(
  viewer_id uuid,
  viewer_lng double precision,
  viewer_lat double precision,
  radius_meters integer default 80467,
  limit_count integer default 50,
  enforce_reputation boolean default false
)
returns table(
  id uuid,
  display_name text,
  username text,
  avatar_url text,
  is_online boolean,
  is_verified boolean,
  looking_for text[],
  last_seen timestamp with time zone,
  last_lat double precision,
  last_lng double precision,
  distance_meters double precision
)
language plpgsql
security definer
as $function$
begin
  return query
  select
    p.id,
    p.display_name,
    p.username,
    p.avatar_url,
    p.is_online,
    p.is_verified,
    p.looking_for,
    p.last_seen,
    ST_Y(p.location::geometry) as last_lat,
    ST_X(p.location::geometry) as last_lng,
    ST_Distance(
      p.location,
      ST_SetSRID(ST_MakePoint(viewer_lng, viewer_lat), 4326)::geography
    ) as distance_meters
  from profiles p
  where
    p.id != viewer_id
    and p.location_consent = true
    and (p.is_online = true or p.last_seen >= now() - interval '24 hours')
    and p.location is not null
    and ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(viewer_lng, viewer_lat), 4326)::geography,
      radius_meters
    )
    and (not enforce_reputation or not public.is_owner_suppressed(p.id))
  order by p.location <-> ST_SetSRID(ST_MakePoint(viewer_lng, viewer_lat), 4326)
  limit limit_count;
end;
$function$;

comment on function public.get_nearby_ghosted(uuid, double precision, double precision, integer, integer, boolean)
  is 'Nearby ghosted profiles. enforce_reputation flag (default false) toggles invisible suppression filter. See beacon_reputation_enforcement feature flag.';

insert into public.feature_flags (flag_key, description, enabled_globally)
values (
  'beacon_reputation_enforcement',
  'Wires beacon_reputation suppression + open-report filter into get_nearby_ghosted. Default OFF; flip per-env once moderation tooling is staffed.',
  false
)
on conflict (flag_key) do update set
  description = excluded.description,
  updated_at = now();
