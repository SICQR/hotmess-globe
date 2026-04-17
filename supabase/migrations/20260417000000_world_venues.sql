-- World Venues: curated editorial venue dataset for globe feature
-- Separate from `venues` table (operator-owned business accounts)
-- Generated: 2026-04-17

create table if not exists public.world_venues (
  id text primary key,
  name text not null,
  city text not null,
  country text not null,
  neighborhood text,
  address text,
  latitude double precision,
  longitude double precision,
  website_url text,
  instagram_url text,
  google_maps_url text,
  source_urls jsonb default '[]'::jsonb,
  venue_type text check (venue_type in ('bar','club','sauna','cafe','event_space','mixed')),
  opening_hours jsonb,
  vibe_tags text[] default '{}',
  price_band text check (price_band in ('$','$$','$$$','unknown')),
  description_short text,
  description_long text,
  phone text,
  email text,
  accessibility_notes text,
  cashless_or_cash text,
  last_verified_at timestamptz default now(),
  confidence_score integer check (confidence_score between 0 and 100),
  verification_status text check (verification_status in ('verified','partial','needs_manual_review')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.world_venue_events (
  id text primary key,
  venue_id text references public.world_venues(id) on delete cascade,
  venue_name text,
  city text,
  title text not null,
  start_datetime timestamptz,
  end_datetime timestamptz,
  event_url text,
  ticket_url text,
  promoter text,
  description text,
  tags text[] default '{}',
  source_url text,
  last_verified_at timestamptz default now(),
  confidence_score integer check (confidence_score between 0 and 100),
  created_at timestamptz default now()
);

create index if not exists idx_world_venues_city on public.world_venues(city);
create index if not exists idx_world_venues_verification on public.world_venues(verification_status);
create index if not exists idx_world_venues_type on public.world_venues(venue_type);
create index if not exists idx_world_venues_location on public.world_venues(latitude, longitude) where latitude is not null;
create index if not exists idx_world_venue_events_venue on public.world_venue_events(venue_id);
create index if not exists idx_world_venue_events_start on public.world_venue_events(start_datetime);
create index if not exists idx_world_venue_events_upcoming on public.world_venue_events(start_datetime) where start_datetime > now();

alter table public.world_venues enable row level security;
alter table public.world_venue_events enable row level security;

create policy "world_venues_public_read" on public.world_venues for select using (true);
create policy "world_venue_events_public_read" on public.world_venue_events for select using (true);

create policy "world_venues_admin_write" on public.world_venues
  for all using (auth.uid() in (select id from public.profiles where role = 'admin'));

create policy "world_venue_events_admin_write" on public.world_venue_events
  for all using (auth.uid() in (select id from public.profiles where role = 'admin'));

create or replace function public.set_world_venues_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists world_venues_updated_at on public.world_venues;
create trigger world_venues_updated_at
  before update on public.world_venues
  for each row execute function public.set_world_venues_updated_at();

create or replace view public.verified_world_venues as
  select * from public.world_venues where verification_status = 'verified';

create or replace view public.upcoming_world_events as
  select e.*, v.latitude, v.longitude, v.neighborhood, v.venue_type, v.vibe_tags
  from public.world_venue_events e
  join public.world_venues v on v.id = e.venue_id
  where e.start_datetime > now()
  order by e.start_datetime asc;
