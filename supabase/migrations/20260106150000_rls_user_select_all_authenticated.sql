-- hotmess-globe: allow authenticated users to read other users' profiles
-- Needed for Connect discovery, messaging user lists, and Nearby People.
-- Keeps insert/update restricted to self (auth_user_id/email) via existing policies.

alter table if exists public."User" enable row level security;

-- Additional SELECT policy: authenticated users can view profiles.
-- NOTE: This exposes profile rows (including email) to authenticated users.
-- Tighten later by switching to a public view/RPC that only returns safe fields.
drop policy if exists "user_select_authenticated_all" on public."User";
create policy "user_select_authenticated_all"
  on public."User"
  for select
  to authenticated
  using (true);
