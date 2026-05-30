-- Cart ownership model unification
-- Adds auth_user_id column and updates RLS to support both email and user_id
-- This allows carts to work correctly even if email changes

-- Add user_id column
alter table public.cart_items 
add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;

-- Create index for user_id lookups
create index if not exists idx_cart_items_auth_user_id 
on public.cart_items (auth_user_id);

-- Update unique constraint to support both patterns
drop index if exists uq_cart_items_user_product;
create unique index if not exists uq_cart_items_user_product
  on public.cart_items (coalesce(auth_user_id::text, user_email), product_id);

-- Drop old RLS policies
drop policy if exists cart_items_select_owner on public.cart_items;
drop policy if exists cart_items_insert_owner on public.cart_items;
drop policy if exists cart_items_update_owner on public.cart_items;
drop policy if exists cart_items_delete_owner on public.cart_items;

-- New unified RLS policies (support both email and user_id)
create policy cart_items_select_owner
on public.cart_items
for select
to authenticated
using (
  auth_user_id = auth.uid() 
  or (auth_user_id is null and user_email = (auth.jwt() ->> 'email'))
);

create policy cart_items_insert_owner
on public.cart_items
for insert
to authenticated
with check (
  auth_user_id = auth.uid() 
  or (auth_user_id is null and user_email = (auth.jwt() ->> 'email'))
);

create policy cart_items_update_owner
on public.cart_items
for update
to authenticated
using (
  auth_user_id = auth.uid() 
  or (auth_user_id is null and user_email = (auth.jwt() ->> 'email'))
)
with check (
  auth_user_id = auth.uid() 
  or (auth_user_id is null and user_email = (auth.jwt() ->> 'email'))
);

create policy cart_items_delete_owner
on public.cart_items
for delete
to authenticated
using (
  auth_user_id = auth.uid() 
  or (auth_user_id is null and user_email = (auth.jwt() ->> 'email'))
);

-- Migration function: backfill auth_user_id for existing cart items
create or replace function public.migrate_cart_items_to_user_id()
returns void
language plpgsql
security definer
as $$
begin
  update public.cart_items ci
  set auth_user_id = u.id
  from auth.users u
  where ci.user_email = u.email
    and ci.auth_user_id is null;
end;
$$;

-- Run migration
select public.migrate_cart_items_to_user_id();

-- Add trigger to auto-set auth_user_id on insert
create or replace function public.set_cart_item_user_id()
returns trigger
language plpgsql
security definer
as $$
begin
  -- If auth_user_id not provided, set it from the authenticated user
  if new.auth_user_id is null and auth.uid() is not null then
    new.auth_user_id := auth.uid();
  end if;
  
  -- If user_email not provided, set it from the JWT
  if new.user_email is null then
    new.user_email := auth.jwt() ->> 'email';
  end if;
  
  return new;
end;
$$;

drop trigger if exists trg_cart_items_set_user_id on public.cart_items;
create trigger trg_cart_items_set_user_id
before insert on public.cart_items
for each row execute function public.set_cart_item_user_id();

comment on column public.cart_items.auth_user_id is 'Primary ownership key - references auth.users';
comment on column public.cart_items.user_email is 'Legacy ownership key - kept for backwards compatibility';
