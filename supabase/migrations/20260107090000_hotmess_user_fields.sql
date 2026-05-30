-- hotmess-globe: expand public."User" to cover Hotmess core/public fields
-- and add private tables for sensitive profile data.

create extension if not exists pgcrypto;

-- 1) Expand the public profile surface (readable by authenticated users per existing policy)
alter table if exists public."User"
  add column if not exists username text,
  add column if not exists display_name text,
  add column if not exists age integer,
  add column if not exists account_status text not null default 'active',
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists last_seen timestamptz,
  add column if not exists country_code text,
  add column if not exists distance_visible boolean not null default true,
  add column if not exists looking_right_now boolean not null default false,
  add column if not exists travel_mode text,
  add column if not exists travel_start date,
  add column if not exists travel_end date,
  add column if not exists bio text,
  add column if not exists profile_type text not null default 'standard',
  add column if not exists membership_tier text not null default 'basic',
  add column if not exists social_links jsonb not null default '{}'::jsonb,
  add column if not exists event_preferences text[] not null default '{}'::text[],
  add column if not exists emergency_message text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists uniq_user_username
  on public."User" (username)
  where username is not null;

create index if not exists idx_user_city on public."User" (city);
create index if not exists idx_user_profile_type on public."User" (profile_type);
create index if not exists idx_user_last_seen on public."User" (last_seen);

-- Keep updated_at fresh (updated_date is handled by the existing trigger)
do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    execute 'drop trigger if exists trg_user_set_updated_at on public."User"';
    execute 'create trigger trg_user_set_updated_at before update on public."User" for each row execute function public.set_updated_at()';
  end if;
end
$$;

-- 2) Private profile (owner-only)
-- Stores sensitive fields from the Hotmess User Fields spec.
create table if not exists public.user_private_profile (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  email text,

  -- Core identity / verification
  phone text,
  date_of_birth date,

  -- Physical profile
  height_cm integer,
  weight_kg integer,
  body_type text,
  hair text,
  body_hair text,
  ethnicity text[] not null default '{}'::text[],
  eye_color text,
  tattoos text,
  piercings text,

  -- Identity / orientation
  gender_identity text,
  pronouns text,
  pronouns_custom text,
  sexual_orientation text,
  cis_trans text,

  -- Relationship / intent
  looking_for text[] not null default '{}'::text[],
  relationship_status text,
  play_style text,
  hosting text,
  time_horizon text,

  -- Preferences / roles
  position text,
  experience_level text,
  condom_preference text,
  safer_sex_notes text,
  sti_status text,
  last_tested date,

  -- Kink profile
  kink_friendly boolean,
  kink_role text,
  kink_experience_level text,
  kinks text[] not null default '{}'::text[],
  hard_limits text[] not null default '{}'::text[],
  soft_limits text[] not null default '{}'::text[],
  consent_style text,

  -- Chem-friendly (opt-in)
  chem_friendly text,
  substances text[] not null default '{}'::text[],
  use_context text,
  frequency text,
  chem_boundaries text,
  harm_reduction_aware boolean,

  -- Lifestyle signals
  smoking text,
  drinking text,
  fitness text,
  diet text,
  scene_affinity text[] not null default '{}'::text[],

  -- Media and expression
  private_album_urls text[] not null default '{}'::text[],
  turn_ons text,
  turn_offs text,
  voice_intro_url text,
  verification_selfie_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create index if not exists idx_user_private_profile_email on public.user_private_profile (email);

alter table public.user_private_profile enable row level security;

drop policy if exists user_private_profile_select_self on public.user_private_profile;
create policy user_private_profile_select_self
  on public.user_private_profile
  for select
  to authenticated
  using (auth.uid() = auth_user_id);

drop policy if exists user_private_profile_insert_self on public.user_private_profile;
create policy user_private_profile_insert_self
  on public.user_private_profile
  for insert
  to authenticated
  with check (auth.uid() = auth_user_id);

drop policy if exists user_private_profile_update_self on public.user_private_profile;
create policy user_private_profile_update_self
  on public.user_private_profile
  for update
  to authenticated
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

-- Keep updated timestamps fresh.
do $$
begin
  if to_regprocedure('public.set_updated_timestamps()') is not null then
    execute 'drop trigger if exists trg_user_private_profile_set_updated_timestamps on public.user_private_profile';
    execute 'create trigger trg_user_private_profile_set_updated_timestamps before update on public.user_private_profile for each row execute function public.set_updated_timestamps()';
  end if;
end
$$;

-- 3) Privacy controls (owner-only)
create table if not exists public.user_privacy_settings (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  profile_visibility text not null default 'everyone',
  age_range_min integer not null default 18,
  age_range_max integer,
  content_filters text[] not null default '{}'::text[],

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

alter table public.user_privacy_settings enable row level security;

drop policy if exists user_privacy_settings_select_self on public.user_privacy_settings;
create policy user_privacy_settings_select_self
  on public.user_privacy_settings
  for select
  to authenticated
  using (auth.uid() = auth_user_id);

drop policy if exists user_privacy_settings_insert_self on public.user_privacy_settings;
create policy user_privacy_settings_insert_self
  on public.user_privacy_settings
  for insert
  to authenticated
  with check (auth.uid() = auth_user_id);

drop policy if exists user_privacy_settings_update_self on public.user_privacy_settings;
create policy user_privacy_settings_update_self
  on public.user_privacy_settings
  for update
  to authenticated
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

-- Keep updated timestamps fresh.
do $$
begin
  if to_regprocedure('public.set_updated_timestamps()') is not null then
    execute 'drop trigger if exists trg_user_privacy_settings_set_updated_timestamps on public.user_privacy_settings';
    execute 'create trigger trg_user_privacy_settings_set_updated_timestamps before update on public.user_privacy_settings for each row execute function public.set_updated_timestamps()';
  end if;
end
$$;
