-- Create missing moderation + activity tables used by the UI (Base44 compatibility)

create extension if not exists pgcrypto;

-- Reports (moderation queue)
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_email text not null,
  reported_item_type text not null,
  reported_item_id text not null,
  reason text not null,
  details text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text
);

create index if not exists idx_reports_status_created_date on public.reports (status, created_date desc);
create index if not exists idx_reports_reporter_email on public.reports (reporter_email);

alter table public.reports enable row level security;

-- Select: reporters can see their own reports; admins can see all
drop policy if exists reports_select_reporter_or_admin on public.reports;
create policy reports_select_reporter_or_admin
on public.reports
for select
to authenticated
using (
  (auth.jwt() ->> 'email') = reporter_email
  or exists (
    select 1
    from public."User" u
    where u.email = (auth.jwt() ->> 'email')
      and u.role = 'admin'
  )
);

-- Insert: reporter_email must match
drop policy if exists reports_insert_reporter on public.reports;
create policy reports_insert_reporter
on public.reports
for insert
to authenticated
with check ((auth.jwt() ->> 'email') = reporter_email);

-- Update/Delete: admins only
drop policy if exists reports_update_admin on public.reports;
create policy reports_update_admin
on public.reports
for update
to authenticated
using (
  exists (
    select 1
    from public."User" u
    where u.email = (auth.jwt() ->> 'email')
      and u.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public."User" u
    where u.email = (auth.jwt() ->> 'email')
      and u.role = 'admin'
  )
);

drop policy if exists reports_delete_admin on public.reports;
drop policy if exists reports_delete_admin_only on public.reports;
create policy reports_delete_admin_only
on public.reports
for delete
to authenticated
using (
  exists (
    select 1
    from public."User" u
    where u.email = (auth.jwt() ->> 'email')
      and u.role = 'admin'
  )
);

-- User Activity (globe/grid visibility tracking)
-- The UI and realtime subscriptions reference the CamelCase table name: "UserActivity"
create table if not exists public."UserActivity" (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  lat double precision,
  lng double precision,
  city text,
  visible boolean not null default true,
  activity_type text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text
);

create index if not exists idx_useractivity_user_email on public."UserActivity" (user_email);
create index if not exists idx_useractivity_visible_created_date on public."UserActivity" (visible, created_date desc);

alter table public."UserActivity" enable row level security;

-- Select: anyone authenticated can see visible activities; owners can see their own; admins can see all
drop policy if exists useractivity_select_visible_or_owner_or_admin on public."UserActivity";
create policy useractivity_select_visible_or_owner_or_admin
on public."UserActivity"
for select
to authenticated
using (
  visible = true
  or (auth.jwt() ->> 'email') = user_email
  or exists (
    select 1
    from public."User" u
    where u.email = (auth.jwt() ->> 'email')
      and u.role = 'admin'
  )
);

-- Insert: must be self
drop policy if exists useractivity_insert_owner on public."UserActivity";
create policy useractivity_insert_owner
on public."UserActivity"
for insert
to authenticated
with check ((auth.jwt() ->> 'email') = user_email);

-- Update/Delete: owner or admin
drop policy if exists useractivity_update_owner_or_admin on public."UserActivity";
create policy useractivity_update_owner_or_admin
on public."UserActivity"
for update
to authenticated
using (
  (auth.jwt() ->> 'email') = user_email
  or exists (
    select 1
    from public."User" u
    where u.email = (auth.jwt() ->> 'email')
      and u.role = 'admin'
  )
)
with check (
  (auth.jwt() ->> 'email') = user_email
  or exists (
    select 1
    from public."User" u
    where u.email = (auth.jwt() ->> 'email')
      and u.role = 'admin'
  )
);

drop policy if exists useractivity_delete_owner_or_admin on public."UserActivity";
create policy useractivity_delete_owner_or_admin
on public."UserActivity"
for delete
to authenticated
using (
  (auth.jwt() ->> 'email') = user_email
  or exists (
    select 1
    from public."User" u
    where u.email = (auth.jwt() ->> 'email')
      and u.role = 'admin'
  )
);

-- Compatibility endpoint: some code tries /user_activities; expose a view that maps to "UserActivity".
-- This view is simple and should be updatable.
create or replace view public.user_activities as
select * from public."UserActivity";
