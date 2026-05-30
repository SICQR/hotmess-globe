-- hotmess-globe: tighten notification_outbox policies so only admins can target the special 'admin' recipient

alter table if exists public.notification_outbox enable row level security;

-- Replace insert policy: allow self inserts; allow 'admin' only for admin users.
drop policy if exists notification_outbox_insert_authenticated on public.notification_outbox;
create policy notification_outbox_insert_authenticated
  on public.notification_outbox
  for insert
  to authenticated
  with check (
    user_email = (auth.jwt() ->> 'email')
    or (
      user_email = 'admin'
      and exists (
        select 1
        from public."User" u
        where u.email = (auth.jwt() ->> 'email')
          and u.role = 'admin'
      )
    )
  );

-- Replace select policy similarly.
drop policy if exists notification_outbox_select_self_or_admin on public.notification_outbox;
create policy notification_outbox_select_self_or_admin
  on public.notification_outbox
  for select
  to authenticated
  using (
    user_email = (auth.jwt() ->> 'email')
    or (
      user_email = 'admin'
      and exists (
        select 1
        from public."User" u
        where u.email = (auth.jwt() ->> 'email')
          and u.role = 'admin'
      )
    )
  );
