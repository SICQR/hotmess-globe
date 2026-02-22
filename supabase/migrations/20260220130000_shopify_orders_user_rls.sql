-- Allow authenticated users to view their own Shopify orders.
-- Relies on customer_email matching the email stored in auth.users.
-- The existing admin-only policy stays untouched.

CREATE POLICY IF NOT EXISTS "shopify_orders: users can view own orders"
  ON public.shopify_orders
  FOR SELECT
  TO authenticated
  USING (customer_email = (
    SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1
  ));
