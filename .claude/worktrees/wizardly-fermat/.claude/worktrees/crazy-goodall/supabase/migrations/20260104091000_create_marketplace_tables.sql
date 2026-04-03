-- Marketplace / seller tables needed by SellerDashboard + Marketplace UI
-- Intentionally minimal schema + minimal RLS (email-based) to unblock flows.

create extension if not exists pgcrypto;

-- Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_email text not null,
  name text not null,
  description text,

  price_xp integer not null default 0,
  price_gbp numeric,

  product_type text,
  category text,
  tags text[] not null default '{}',
  image_urls text[] not null default '{}',
  status text not null default 'draft',

  inventory_count integer not null default 0,
  min_xp_level integer,
  details jsonb not null default '{}'::jsonb,

  sales_count integer not null default 0,
  average_rating numeric,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),

  created_by text
);

create index if not exists idx_products_seller_email on public.products (seller_email);
create index if not exists idx_products_status on public.products (status);

-- Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_email text not null,
  seller_email text not null,

  total_xp integer not null default 0,
  status text not null default 'pending',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),

  created_by text
);

create index if not exists idx_orders_buyer_email on public.orders (buyer_email);
create index if not exists idx_orders_seller_email on public.orders (seller_email);

-- Order Items
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,

  seller_email text not null,
  buyer_email text,

  quantity integer not null default 1,
  price_xp integer not null default 0,

  created_at timestamptz not null default now(),
  created_date timestamptz not null default now(),

  created_by text
);

create index if not exists idx_order_items_order_id on public.order_items (order_id);
create index if not exists idx_order_items_seller_email on public.order_items (seller_email);

-- Promotions
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  seller_email text not null,
  product_id uuid references public.products(id) on delete set null,

  title text,
  kind text,
  discount_percent integer,
  active boolean not null default true,

  starts_at timestamptz,
  ends_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),

  created_by text
);

create index if not exists idx_promotions_seller_email on public.promotions (seller_email);

-- Seller payouts
create table if not exists public.seller_payouts (
  id uuid primary key default gen_random_uuid(),
  seller_email text not null,

  amount_xp integer not null default 0,
  status text not null default 'pending',

  created_at timestamptz not null default now(),
  created_date timestamptz not null default now(),

  created_by text
);

create index if not exists idx_seller_payouts_seller_email on public.seller_payouts (seller_email);

-- Featured listings
create table if not exists public.featured_listings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  seller_email text not null,

  placement text not null default 'top_row',
  active boolean not null default true,

  duration_hours integer not null default 24,
  cost_xp integer not null default 0,

  starts_at timestamptz not null default now(),
  expires_at timestamptz,

  impressions integer not null default 0,
  clicks integer not null default 0,

  created_at timestamptz not null default now(),
  created_date timestamptz not null default now(),

  created_by text
);

create index if not exists idx_featured_listings_seller_email on public.featured_listings (seller_email);
create index if not exists idx_featured_listings_active on public.featured_listings (active);

-- XP ledger (used for transactions like featured listing purchases)
create table if not exists public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  amount integer not null,
  transaction_type text,
  reference_id text,
  reference_type text,
  balance_after integer,
  created_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  created_by text
);

create index if not exists idx_xp_ledger_user_email on public.xp_ledger (user_email);

-- RLS (minimal, email-based)
alter table public.products enable row level security;
drop policy if exists products_select_public_or_owner on public.products;
create policy products_select_public_or_owner
on public.products
for select
to anon, authenticated
using (
  status = 'active'
  or (auth.jwt() ->> 'email') = seller_email
);

drop policy if exists products_insert_owner on public.products;
create policy products_insert_owner
on public.products
for insert
to authenticated
with check ((auth.jwt() ->> 'email') = seller_email);

drop policy if exists products_update_owner on public.products;
create policy products_update_owner
on public.products
for update
to authenticated
using ((auth.jwt() ->> 'email') = seller_email)
with check ((auth.jwt() ->> 'email') = seller_email);

drop policy if exists products_delete_owner on public.products;
create policy products_delete_owner
on public.products
for delete
to authenticated
using ((auth.jwt() ->> 'email') = seller_email);

alter table public.orders enable row level security;
drop policy if exists orders_select_party on public.orders;
create policy orders_select_party
on public.orders
for select
to authenticated
using (
  (auth.jwt() ->> 'email') = buyer_email
  or (auth.jwt() ->> 'email') = seller_email
);

drop policy if exists orders_insert_party on public.orders;
create policy orders_insert_party
on public.orders
for insert
to authenticated
with check (
  (auth.jwt() ->> 'email') = buyer_email
  or (auth.jwt() ->> 'email') = seller_email
);

drop policy if exists orders_update_party on public.orders;
create policy orders_update_party
on public.orders
for update
to authenticated
using (
  (auth.jwt() ->> 'email') = buyer_email
  or (auth.jwt() ->> 'email') = seller_email
)
with check (
  (auth.jwt() ->> 'email') = buyer_email
  or (auth.jwt() ->> 'email') = seller_email
);

alter table public.order_items enable row level security;
drop policy if exists order_items_select_party on public.order_items;
create policy order_items_select_party
on public.order_items
for select
to authenticated
using (
  (auth.jwt() ->> 'email') = seller_email
  or (auth.jwt() ->> 'email') = buyer_email
);

drop policy if exists order_items_insert_party on public.order_items;
create policy order_items_insert_party
on public.order_items
for insert
to authenticated
with check (
  (auth.jwt() ->> 'email') = seller_email
  or (auth.jwt() ->> 'email') = buyer_email
);

alter table public.promotions enable row level security;
drop policy if exists promotions_select_owner on public.promotions;
create policy promotions_select_owner
on public.promotions
for select
to authenticated
using ((auth.jwt() ->> 'email') = seller_email);

drop policy if exists promotions_write_owner on public.promotions;
create policy promotions_write_owner
on public.promotions
for all
to authenticated
using ((auth.jwt() ->> 'email') = seller_email)
with check ((auth.jwt() ->> 'email') = seller_email);

alter table public.seller_payouts enable row level security;
drop policy if exists seller_payouts_select_owner on public.seller_payouts;
create policy seller_payouts_select_owner
on public.seller_payouts
for select
to authenticated
using ((auth.jwt() ->> 'email') = seller_email);

drop policy if exists seller_payouts_write_owner on public.seller_payouts;
create policy seller_payouts_write_owner
on public.seller_payouts
for all
to authenticated
using ((auth.jwt() ->> 'email') = seller_email)
with check ((auth.jwt() ->> 'email') = seller_email);

alter table public.featured_listings enable row level security;
drop policy if exists featured_listings_select_owner on public.featured_listings;
create policy featured_listings_select_owner
on public.featured_listings
for select
to authenticated
using ((auth.jwt() ->> 'email') = seller_email);

drop policy if exists featured_listings_write_owner on public.featured_listings;
create policy featured_listings_write_owner
on public.featured_listings
for all
to authenticated
using ((auth.jwt() ->> 'email') = seller_email)
with check ((auth.jwt() ->> 'email') = seller_email);

alter table public.xp_ledger enable row level security;
drop policy if exists xp_ledger_select_owner on public.xp_ledger;
create policy xp_ledger_select_owner
on public.xp_ledger
for select
to authenticated
using ((auth.jwt() ->> 'email') = user_email);

drop policy if exists xp_ledger_insert_owner on public.xp_ledger;
create policy xp_ledger_insert_owner
on public.xp_ledger
for insert
to authenticated
with check ((auth.jwt() ->> 'email') = user_email);
