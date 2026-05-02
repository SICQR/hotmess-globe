-- Drop the debug policy that allows ANY authenticated user to UPDATE ANY listing
-- The proper policy `listing_update_seller` already restricts updates to the seller
DROP POLICY IF EXISTS "Temp bypass for debug" ON market_listings;
