-- Support Shopify variant selection in cart_items

alter table public.cart_items
  add column if not exists shopify_variant_id text,
  add column if not exists variant_title text;

-- Replace the old uniqueness constraint so the same product can be added with different variants.
-- Coalesce variant id so NULL behaves like a real value for uniqueness.
drop index if exists public.uq_cart_items_auth_user_product;

create unique index if not exists uq_cart_items_auth_user_product_variant
  on public.cart_items (auth_user_id, product_id, (coalesce(shopify_variant_id, '')))
  where auth_user_id is not null;
