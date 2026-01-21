-- Fix: allow users to update (check out) their own safety check-ins.
-- Without an UPDATE policy, PostgREST updates can return 406 (no rows) under RLS.

alter table if exists public.safety_checkins enable row level security;

drop policy if exists safety_checkins_update_self on public.safety_checkins;
create policy safety_checkins_update_self
  on public.safety_checkins
  for update
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email)
  with check ((auth.jwt() ->> 'email') = user_email);
