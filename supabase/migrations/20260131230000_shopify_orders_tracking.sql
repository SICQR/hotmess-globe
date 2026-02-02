-- Shopify orders tracking table for webhook data
-- Stores order data received from Shopify webhooks for analytics and order management

create table if not exists public.shopify_orders (
  id uuid primary key default gen_random_uuid(),
  shopify_order_id text unique not null,
  customer_email text,
  financial_status text,
  fulfillment_status text,
  total_price bigint default 0,
  line_items_count int default 0,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_shopify_orders_customer_email 
on public.shopify_orders(customer_email);

create index if not exists idx_shopify_orders_created_at 
on public.shopify_orders(created_at desc);

create index if not exists idx_shopify_orders_financial_status 
on public.shopify_orders(financial_status);

-- RLS
alter table public.shopify_orders enable row level security;

-- Only admins can view orders
create policy "Admins can view shopify orders"
on public.shopify_orders for select
to authenticated
using (
  exists (
    select 1 from public."User" u
    where u.id = auth.uid()
    and (u.role = 'admin' or u.is_superadmin = true)
  )
);

-- Service role can insert/update (for webhooks)
create policy "Service role can manage shopify orders"
on public.shopify_orders for all
to service_role
using (true)
with check (true);

-- Add shopify_inventory_item_id to products if not exists
alter table public.products 
add column if not exists shopify_inventory_item_id text;

create index if not exists idx_products_shopify_inventory_item_id 
on public.products(shopify_inventory_item_id);

comment on table public.shopify_orders is 'Orders synced from Shopify via webhooks';
