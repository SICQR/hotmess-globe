-- ============================================================
-- FIX: Prevent listings from being marked 'sold' prematurely
-- when quantity is still > 0.
--
-- Run this in your Supabase SQL Editor ONE TIME.
-- ============================================================

-- 1. A trigger function that fires BEFORE any UPDATE on market_listings.
--    If something tries to set status='sold' but quantity is still > 0,
--    we override it back to 'active'.
CREATE OR REPLACE FUNCTION public.enforce_listing_stock_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If someone is trying to mark it sold but there is still stock, keep it active
  IF NEW.status = 'sold' AND (NEW.quantity IS NOT NULL) AND NEW.quantity > 0 THEN
    NEW.status = 'active';
  END IF;

  -- If quantity drops to 0 or below, always mark as sold
  IF NEW.quantity IS NOT NULL AND NEW.quantity <= 0 THEN
    NEW.status = 'sold';
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Drop old version of this trigger if it exists
DROP TRIGGER IF EXISTS trg_enforce_listing_stock_status ON public.market_listings;

-- 3. Attach the trigger (runs BEFORE every UPDATE)
CREATE TRIGGER trg_enforce_listing_stock_status
  BEFORE UPDATE ON public.market_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_listing_stock_status();

-- Done! Listings with qty > 0 can never be marked sold.
