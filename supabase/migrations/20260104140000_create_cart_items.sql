-- Cart items table (supports persisted carts + checkout flow)

create extension if not exists pgcrypto;

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_email text,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1,
  reserved_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cart_items enable row level security;

-- Basic constraints/indexes
alter table public.cart_items
  drop constraint if exists cart_items_quantity_positive;
alter table public.cart_items
  add constraint cart_items_quantity_positive check (quantity > 0);

create index if not exists idx_cart_items_user_email on public.cart_items (user_email);
create index if not exists idx_cart_items_product_id on public.cart_items (product_id);

-- One row per (user_email, product_id) when authenticated.
create unique index if not exists uq_cart_items_user_product
  on public.cart_items (user_email, product_id)
  where user_email is not null;

-- Auto-update updated_at
drop trigger if exists trg_cart_items_set_updated_at on public.cart_items;
create trigger trg_cart_items_set_updated_at
before update on public.cart_items
for each row execute function public.set_updated_at();

-- RLS policies (email-based)
drop policy if exists cart_items_select_owner on public.cart_items;
create policy cart_items_select_owner
on public.cart_items
for select
to authenticated
using ((auth.jwt() ->> 'email') = user_email);

drop policy if exists cart_items_insert_owner on public.cart_items;
create policy cart_items_insert_owner
on public.cart_items
for insert
to authenticated
with check ((auth.jwt() ->> 'email') = user_email);

drop policy if exists cart_items_update_owner on public.cart_items;
create policy cart_items_update_owner
on public.cart_items
for update
to authenticated
using ((auth.jwt() ->> 'email') = user_email)
with check ((auth.jwt() ->> 'email') = user_email);

drop policy if exists cart_items_delete_owner on public.cart_items;
create policy cart_items_delete_owner
on public.cart_items
for delete
to authenticated
using ((auth.jwt() ->> 'email') = user_email);
