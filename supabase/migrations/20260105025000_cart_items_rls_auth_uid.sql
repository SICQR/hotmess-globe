-- Fix cart_items RLS: use auth.uid() ownership (more reliable than JWT email claim)

alter table public.cart_items
  add column if not exists auth_user_id uuid;

-- Backfill auth_user_id from auth.users when possible
update public.cart_items ci
set auth_user_id = au.id
from auth.users au
where ci.auth_user_id is null
  and ci.user_email is not null
  and lower(au.email) = lower(ci.user_email);

alter table public.cart_items
  alter column auth_user_id set default auth.uid();

create unique index if not exists uq_cart_items_auth_user_product
  on public.cart_items (auth_user_id, product_id)
  where auth_user_id is not null;

-- Replace RLS policies
alter table public.cart_items enable row level security;

drop policy if exists cart_items_select_owner on public.cart_items;
create policy cart_items_select_owner
on public.cart_items
for select
to authenticated
using (
  auth.uid() = auth_user_id
  or (auth_user_id is null and lower(auth.jwt() ->> 'email') = lower(user_email))
);

drop policy if exists cart_items_insert_owner on public.cart_items;
create policy cart_items_insert_owner
on public.cart_items
for insert
to authenticated
with check (
  auth.uid() = auth_user_id
  or (auth_user_id is null and lower(auth.jwt() ->> 'email') = lower(user_email))
);

drop policy if exists cart_items_update_owner on public.cart_items;
create policy cart_items_update_owner
on public.cart_items
for update
to authenticated
using (
  auth.uid() = auth_user_id
  or (auth_user_id is null and lower(auth.jwt() ->> 'email') = lower(user_email))
)
with check (
  auth.uid() = auth_user_id
  or (auth_user_id is null and lower(auth.jwt() ->> 'email') = lower(user_email))
);

drop policy if exists cart_items_delete_owner on public.cart_items;
create policy cart_items_delete_owner
on public.cart_items
for delete
to authenticated
using (
  auth.uid() = auth_user_id
  or (auth_user_id is null and lower(auth.jwt() ->> 'email') = lower(user_email))
);
