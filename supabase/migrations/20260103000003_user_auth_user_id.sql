-- hotmess-globe: move User ownership to auth.uid() via auth_user_id
-- This keeps the old email-based bootstrap working, but makes RLS robust.

-- 1) Add auth_user_id (nullable for back-compat)
alter table if exists public."User"
add column if not exists auth_user_id uuid;
-- 2) Indexes
create unique index if not exists uniq_user_auth_user_id
on public."User" (auth_user_id)
where auth_user_id is not null;
-- 3) Update RLS policies to auth.uid()-based (with safe fallback for legacy rows)
alter table if exists public."User" enable row level security;
drop policy if exists "user_select_self" on public."User";
create policy "user_select_self"
on public."User"
for select
to authenticated
using (
  auth.uid() = auth_user_id
  or (auth_user_id is null and (auth.jwt() ->> 'email') = email)
);
drop policy if exists "user_insert_self" on public."User";
create policy "user_insert_self"
on public."User"
for insert
to authenticated
with check (
  auth.uid() = auth_user_id
  and (auth.jwt() ->> 'email') = email
);
drop policy if exists "user_update_self" on public."User";
create policy "user_update_self"
on public."User"
for update
to authenticated
using (
  auth.uid() = auth_user_id
  or (auth_user_id is null and (auth.jwt() ->> 'email') = email)
)
with check (
  auth.uid() = auth_user_id
  and (auth.jwt() ->> 'email') = email
);
