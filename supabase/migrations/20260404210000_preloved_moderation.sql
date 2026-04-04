-- HOTMESS Preloved Moderation System
-- Tables for: cases, actions, seller restrictions, image flags
-- Admin-only access via is_admin() helper

begin;

-- =========================================================
-- TABLES
-- =========================================================

create table if not exists public.moderation_cases (
  id uuid primary key default gen_random_uuid(),
  target_type text not null, -- listing, seller, image, chat_context
  target_id uuid not null,
  state text not null default 'open', -- open, investigating, actioned, dismissed
  priority text not null default 'normal', -- low, normal, high, urgent
  assigned_to uuid references auth.users(id) on delete set null,
  opened_by uuid references auth.users(id) on delete set null,
  reason_code text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.moderation_cases(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  action_type text not null, -- clear, review, remove, warn, restrict, suspend, ban
  reason_code text not null,
  note text,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.seller_restrictions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  restriction_type text not null, -- listings_blocked, chat_restricted, suspended, banned
  reason_code text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.listing_image_flags (
  id uuid primary key default gen_random_uuid(),
  listing_image_id uuid not null references public.preloved_listing_images(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason_code text not null,
  note text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- TRIGGERS
-- =========================================================

drop trigger if exists trg_moderation_cases_updated_at on public.moderation_cases;
create trigger trg_moderation_cases_updated_at
before update on public.moderation_cases
for each row
execute function public.set_updated_at();

-- =========================================================
-- INDEXES
-- =========================================================

create index if not exists idx_moderation_cases_state
on public.moderation_cases (state, priority, created_at desc);

create index if not exists idx_moderation_cases_target
on public.moderation_cases (target_type, target_id);

create index if not exists idx_moderation_actions_case
on public.moderation_actions (case_id, created_at desc);

create index if not exists idx_seller_restrictions_seller
on public.seller_restrictions (seller_id, restriction_type);

create index if not exists idx_listing_image_flags_image
on public.listing_image_flags (listing_image_id);

-- =========================================================
-- RLS — admin-only access
-- =========================================================

alter table public.moderation_cases enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.seller_restrictions enable row level security;
alter table public.listing_image_flags enable row level security;

-- Clean existing
drop policy if exists "admins can manage moderation cases" on public.moderation_cases;
drop policy if exists "admins can manage moderation actions" on public.moderation_actions;
drop policy if exists "admins can manage seller restrictions" on public.seller_restrictions;
drop policy if exists "admins can manage listing image flags" on public.listing_image_flags;

create policy "admins can manage moderation cases"
on public.moderation_cases
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "admins can manage moderation actions"
on public.moderation_actions
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "admins can manage seller restrictions"
on public.seller_restrictions
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "admins can manage listing image flags"
on public.listing_image_flags
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

commit;
