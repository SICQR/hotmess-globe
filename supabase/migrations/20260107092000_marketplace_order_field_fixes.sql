-- hotmess-globe: align marketplace order/order_items schema with UI writes

alter table if exists public.orders
  add column if not exists payment_method text,
  add column if not exists total_gbp numeric,
  add column if not exists total_sweat integer,
  add column if not exists stripe_charge_id text,
  add column if not exists shipping_address jsonb,
  add column if not exists tracking_number text,
  add column if not exists notes text,
  add column if not exists is_qr_scanned boolean not null default false,
  add column if not exists qr_scanned_at timestamptz,
  add column if not exists completed_at timestamptz;

alter table if exists public.order_items
  add column if not exists product_name text,
  add column if not exists product_category text,
  add column if not exists product_tags text[] not null default '{}'::text[],
  add column if not exists price_gbp numeric,
  add column if not exists price_sweat integer;
