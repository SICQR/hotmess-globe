-- HOTMESS Preloved
-- Draft migration for Supabase / Postgres
-- Notes:
-- 1) Review with counsel before launch
-- 2) Assumes public.chat_threads exists
-- 3) Assumes public.profiles may exist for admin/mod roles; admin helper is optional

begin;

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- =========================================================
-- ENUMS
-- =========================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'preloved_listing_status') then
    create type public.preloved_listing_status as enum (
      'draft',
      'live',
      'paused',
      'sold',
      'removed',
      'moderation_hold'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'preloved_delivery_type') then
    create type public.preloved_delivery_type as enum (
      'pickup',
      'shipping',
      'both'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'preloved_condition') then
    create type public.preloved_condition as enum (
      'new',
      'like_new',
      'good',
      'worn',
      'used'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'preloved_category') then
    create type public.preloved_category as enum (
      'clothing',
      'accessories',
      'art',
      'music',
      'equipment',
      'gear',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'moderation_state') then
    create type public.moderation_state as enum (
      'clear',
      'flagged',
      'under_review',
      'removed'
    );
  end if;
end $$;

-- =========================================================
-- TABLES
-- =========================================================

create table if not exists public.preloved_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,

  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 10 and 1200),

  category public.preloved_category not null,
  item_condition public.preloved_condition not null,

  price_gbp integer not null check (price_gbp > 0),
  delivery_type public.preloved_delivery_type not null,

  suburb_or_area text,
  location_bucket text,
  distance_km numeric(6,2),

  status public.preloved_listing_status not null default 'draft',
  moderation public.moderation_state not null default 'clear',

  is_18_only boolean not null default true,
  open_to_offers boolean not null default false,

  pickup_notes text,
  shipping_notes text,

  listing_tags text[] not null default '{}',
  cover_image_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  sold_at timestamptz,
  removed_at timestamptz
);

create table if not exists public.preloved_listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.preloved_listings(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (listing_id, sort_order)
);

create table if not exists public.preloved_listing_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.preloved_listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table if not exists public.preloved_listing_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.preloved_listings(id) on delete cascade,
  reason text not null,
  details text,
  created_at timestamptz not null default now()
);

create table if not exists public.preloved_listing_threads (
  listing_id uuid not null references public.preloved_listings(id) on delete cascade,
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (listing_id, thread_id, buyer_id)
);

create table if not exists public.preloved_listing_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.preloved_listings(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =========================================================
-- FUNCTIONS
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.can_publish_preloved_listing(l public.preloved_listings)
returns boolean
language sql
stable
as $$
  select
    l.title is not null
    and char_length(l.title) >= 3
    and l.description is not null
    and char_length(l.description) >= 10
    and l.price_gbp > 0
    and l.cover_image_url is not null
    and l.category is not null
    and l.item_condition is not null
    and l.delivery_type is not null;
$$;

create or replace function public.enforce_preloved_publish_rules()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'live' and not public.can_publish_preloved_listing(new) then
    raise exception 'Listing is incomplete and cannot be published';
  end if;

  if new.status = 'live' and old.status is distinct from 'live' and new.published_at is null then
    new.published_at = now();
  end if;

  if new.status = 'sold' and old.status is distinct from 'sold' and new.sold_at is null then
    new.sold_at = now();
  end if;

  if new.status = 'removed' and old.status is distinct from 'removed' and new.removed_at is null then
    new.removed_at = now();
  end if;

  return new;
end;
$$;

-- Optional helper. Requires public.profiles(id, role) if you use it.
create or replace function public.is_admin(u uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = u
      and role in ('admin', 'moderator')
  );
$$;

-- =========================================================
-- TRIGGERS
-- =========================================================

drop trigger if exists trg_preloved_listings_updated_at on public.preloved_listings;
create trigger trg_preloved_listings_updated_at
before update on public.preloved_listings
for each row
execute function public.set_updated_at();

drop trigger if exists trg_enforce_preloved_publish_rules on public.preloved_listings;
create trigger trg_enforce_preloved_publish_rules
before insert or update on public.preloved_listings
for each row
execute function public.enforce_preloved_publish_rules();

-- =========================================================
-- INDEXES
-- =========================================================

create index if not exists idx_preloved_listings_status_moderation
on public.preloved_listings (status, moderation, published_at desc);

create index if not exists idx_preloved_listings_seller
on public.preloved_listings (seller_id, created_at desc);

create index if not exists idx_preloved_listings_category
on public.preloved_listings (category, published_at desc);

create index if not exists idx_preloved_listing_images_listing
on public.preloved_listing_images (listing_id, sort_order);

create index if not exists idx_preloved_listing_threads_listing
on public.preloved_listing_threads (listing_id);

create index if not exists idx_preloved_listing_threads_buyer
on public.preloved_listing_threads (buyer_id, created_at desc);

create index if not exists idx_preloved_listings_title_trgm
on public.preloved_listings
using gin (title gin_trgm_ops);

create index if not exists idx_preloved_listings_description_trgm
on public.preloved_listings
using gin (description gin_trgm_ops);

-- =========================================================
-- RLS
-- =========================================================

alter table public.preloved_listings enable row level security;
alter table public.preloved_listing_images enable row level security;
alter table public.preloved_listing_saves enable row level security;
alter table public.preloved_listing_reports enable row level security;
alter table public.preloved_listing_threads enable row level security;
alter table public.preloved_listing_events enable row level security;

-- Clean existing policies if rerun
drop policy if exists "public can view live preloved listings" on public.preloved_listings;
drop policy if exists "seller can view own preloved listings" on public.preloved_listings;
drop policy if exists "seller can insert own preloved listings" on public.preloved_listings;
drop policy if exists "seller can update own preloved listings" on public.preloved_listings;
drop policy if exists "seller can delete own non-live preloved listings" on public.preloved_listings;
drop policy if exists "admins can view all preloved listings" on public.preloved_listings;
drop policy if exists "admins can update all preloved listings" on public.preloved_listings;

drop policy if exists "public can view images for visible preloved listings" on public.preloved_listing_images;
drop policy if exists "seller can manage own listing images" on public.preloved_listing_images;

drop policy if exists "user can view own saves" on public.preloved_listing_saves;
drop policy if exists "user can insert own saves" on public.preloved_listing_saves;
drop policy if exists "user can delete own saves" on public.preloved_listing_saves;

drop policy if exists "user can create listing reports" on public.preloved_listing_reports;

drop policy if exists "buyer and seller can view listing thread links" on public.preloved_listing_threads;
drop policy if exists "buyer can create listing thread link" on public.preloved_listing_threads;

drop policy if exists "seller can view own listing events" on public.preloved_listing_events;

-- Listings
create policy "public can view live preloved listings"
on public.preloved_listings
for select
using (
  status = 'live'
  and moderation = 'clear'
);

create policy "seller can view own preloved listings"
on public.preloved_listings
for select
to authenticated
using (seller_id = auth.uid());

create policy "seller can insert own preloved listings"
on public.preloved_listings
for insert
to authenticated
with check (seller_id = auth.uid());

create policy "seller can update own preloved listings"
on public.preloved_listings
for update
to authenticated
using (seller_id = auth.uid())
with check (seller_id = auth.uid());

create policy "seller can delete own non-live preloved listings"
on public.preloved_listings
for delete
to authenticated
using (
  seller_id = auth.uid()
  and status in ('draft', 'paused')
);

-- Optional admin policies; comment out if you do not use public.profiles(role)
create policy "admins can view all preloved listings"
on public.preloved_listings
for select
to authenticated
using (public.is_admin(auth.uid()));

create policy "admins can update all preloved listings"
on public.preloved_listings
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Images
create policy "public can view images for visible preloved listings"
on public.preloved_listing_images
for select
using (
  exists (
    select 1
    from public.preloved_listings l
    where l.id = listing_id
      and l.status = 'live'
      and l.moderation = 'clear'
  )
);

create policy "seller can manage own listing images"
on public.preloved_listing_images
for all
to authenticated
using (
  exists (
    select 1
    from public.preloved_listings l
    where l.id = listing_id
      and l.seller_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.preloved_listings l
    where l.id = listing_id
      and l.seller_id = auth.uid()
  )
);

-- Saves
create policy "user can view own saves"
on public.preloved_listing_saves
for select
to authenticated
using (user_id = auth.uid());

create policy "user can insert own saves"
on public.preloved_listing_saves
for insert
to authenticated
with check (user_id = auth.uid());

create policy "user can delete own saves"
on public.preloved_listing_saves
for delete
to authenticated
using (user_id = auth.uid());

-- Reports
create policy "user can create listing reports"
on public.preloved_listing_reports
for insert
to authenticated
with check (reporter_id = auth.uid());

-- Thread links
create policy "buyer and seller can view listing thread links"
on public.preloved_listing_threads
for select
to authenticated
using (
  buyer_id = auth.uid()
  or seller_id = auth.uid()
);

create policy "buyer can create listing thread link"
on public.preloved_listing_threads
for insert
to authenticated
with check (
  buyer_id = auth.uid()
);

-- Events
create policy "seller can view own listing events"
on public.preloved_listing_events
for select
to authenticated
using (
  exists (
    select 1
    from public.preloved_listings l
    where l.id = listing_id
      and l.seller_id = auth.uid()
  )
);

commit;
