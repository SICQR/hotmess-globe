-- Founding carve-out for ticketing platform fee.
-- Founding venues/partners pay 0% on ticketing (promise on the founders site);
-- everyone else pays the pool's set rate or the standard 7%.
alter table public.market_sellers
  add column if not exists founding boolean not null default false;

-- HOTMESS's own brand seller accounts never pay a ticketing platform fee.
update public.market_sellers set founding = true where seller_type = 'hotmess_brand';

comment on column public.market_sellers.founding is
  'Founding venue/partner: 0% ticketing platform fee. Set true when a founding venue is onboarded as a ticketing seller (or synced from the founders venue subscription).';
