-- Fix: avoid false-deny RLS caused by email casing mismatches.
--
-- Symptoms:
-- - PostgREST UPDATE returning 0 rows (Supabase client surfaces as 406 Not Acceptable)
-- - SELECT/INSERT failing unexpectedly for authenticated users
--
-- Root cause:
-- - Policies compared (auth.jwt() ->> 'email') to user_email with case-sensitive equality.
--
-- This migration normalizes comparisons by lowercasing both sides.

alter table if exists public.safety_checkins enable row level security;
alter table if exists public.trusted_contacts enable row level security;

-- safety_checkins

drop policy if exists safety_checkins_select_self on public.safety_checkins;
drop policy if exists safety_checkins_insert_self on public.safety_checkins;
drop policy if exists safety_checkins_update_self on public.safety_checkins;
drop policy if exists safety_checkins_delete_self on public.safety_checkins;

create policy safety_checkins_select_self
  on public.safety_checkins
  for select
  to authenticated
  using (lower((auth.jwt() ->> 'email')) = lower(user_email));

create policy safety_checkins_insert_self
  on public.safety_checkins
  for insert
  to authenticated
  with check (lower((auth.jwt() ->> 'email')) = lower(user_email));

create policy safety_checkins_update_self
  on public.safety_checkins
  for update
  to authenticated
  using (lower((auth.jwt() ->> 'email')) = lower(user_email))
  with check (lower((auth.jwt() ->> 'email')) = lower(user_email));

create policy safety_checkins_delete_self
  on public.safety_checkins
  for delete
  to authenticated
  using (lower((auth.jwt() ->> 'email')) = lower(user_email));

-- trusted_contacts

drop policy if exists trusted_contacts_select_self on public.trusted_contacts;
drop policy if exists trusted_contacts_write_self on public.trusted_contacts;

create policy trusted_contacts_select_self
  on public.trusted_contacts
  for select
  to authenticated
  using (lower((auth.jwt() ->> 'email')) = lower(user_email));

create policy trusted_contacts_write_self
  on public.trusted_contacts
  for all
  to authenticated
  using (lower((auth.jwt() ->> 'email')) = lower(user_email))
  with check (lower((auth.jwt() ->> 'email')) = lower(user_email));
