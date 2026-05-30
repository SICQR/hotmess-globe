-- hotmess-globe: grant admin role to a specific user email

-- Add role column if missing
alter table if exists public."User"
add column if not exists role text not null default 'member';

-- Best-effort: link to auth.users if the user already exists
insert into public."User" (email, role, auth_user_id)
values (
  'scanme@sicqr.com',
  'admin',
  (select id from auth.users where email = 'scanme@sicqr.com' limit 1)
)
on conflict (email)
do update set
  role = 'admin',
  auth_user_id = coalesce(public."User".auth_user_id, excluded.auth_user_id),
  updated_date = now();
