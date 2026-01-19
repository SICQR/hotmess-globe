-- hotmess-globe: minimal RLS policies to unblock the app
-- Paste into Supabase SQL editor.
-- Assumptions:
-- - Your tables use the same names as the legacy entities (e.g. "User", "Beacon").
-- - "User" rows are keyed by an email column.
-- - You want logged-in users to be able to read/update their own profile.
--
-- NOTE: This is intentionally minimal and may need tightening for production.

-- 1) User table: allow a logged-in user to select/update/upsert their own row by email
alter table if exists public."User" enable row level security;

drop policy if exists "user_select_self" on public."User";
create policy "user_select_self"
on public."User"
for select
to authenticated
using ((auth.jwt() ->> 'email') = email);

drop policy if exists "user_update_self" on public."User";
create policy "user_update_self"
on public."User"
for update
to authenticated
using ((auth.jwt() ->> 'email') = email)
with check ((auth.jwt() ->> 'email') = email);

drop policy if exists "user_insert_self" on public."User";
create policy "user_insert_self"
on public."User"
for insert
to authenticated
with check ((auth.jwt() ->> 'email') = email);

-- 2) Beacon table: common pattern for publicly visible content
-- Adjust columns/conditions to match your schema.
alter table if exists public."Beacon" enable row level security;

drop policy if exists "beacon_select_public" on public."Beacon";
create policy "beacon_select_public"
on public."Beacon"
for select
to anon, authenticated
using (active = true and status = 'published');

-- If you want only authenticated users to create/update their own beacons,
-- you will need an owner column (e.g. owner_email) and matching policies.

-- 3) EventRSVP table: allow authenticated users to RSVP and read RSVP counts
-- Assumptions:
-- - The table has a user_email column containing the RSVP owner's email.
-- NOTE: The Events page currently loads *all* RSVPs (for popularity sorting).
-- This policy allows any authenticated user to read RSVPs. Tighten later by
-- replacing this with an aggregate RPC/view that only exposes counts.
alter table if exists public."EventRSVP" enable row level security;

drop policy if exists "eventrsvp_select_authenticated" on public."EventRSVP";
create policy "eventrsvp_select_authenticated"
on public."EventRSVP"
for select
to authenticated
using (true);

drop policy if exists "eventrsvp_insert_self" on public."EventRSVP";
create policy "eventrsvp_insert_self"
on public."EventRSVP"
for insert
to authenticated
with check ((auth.jwt() ->> 'email') = user_email);

drop policy if exists "eventrsvp_update_self" on public."EventRSVP";
create policy "eventrsvp_update_self"
on public."EventRSVP"
for update
to authenticated
using ((auth.jwt() ->> 'email') = user_email)
with check ((auth.jwt() ->> 'email') = user_email);

drop policy if exists "eventrsvp_delete_self" on public."EventRSVP";
create policy "eventrsvp_delete_self"
on public."EventRSVP"
for delete
to authenticated
using ((auth.jwt() ->> 'email') = user_email);
