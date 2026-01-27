-- Seller Platform Enhancements
-- Adds tables and columns for complete seller platform functionality

-- Add seller-specific columns to User table
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS stripe_connect_id text;
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS stripe_connect_status text DEFAULT 'not_connected';
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS seller_onboarded boolean DEFAULT false;
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS seller_onboarded_at timestamptz;
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS seller_categories text[] DEFAULT '{}';
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS shipping_policy text;
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS return_policy text;
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS processing_time text;
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS verified_seller boolean DEFAULT false;
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS verified_seller_at timestamptz;

-- Create seller verification requests table
CREATE TABLE IF NOT EXISTS public.seller_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  
  -- Documents
  id_front_url text,
  id_back_url text,
  selfie_url text,
  
  -- Business details (optional)
  business_name text,
  business_registration text,
  additional_notes text,
  
  -- Review info
  reviewed_by text,
  reviewed_at timestamptz,
  rejection_reason text,
  
  -- Timestamps
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_verifications_email ON public.seller_verifications (seller_email);
CREATE INDEX IF NOT EXISTS idx_seller_verifications_status ON public.seller_verifications (status);

-- Add escrow and delivery tracking columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'xp';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_gbp numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipped_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS escrow_released_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS escrow_released_by text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS platform_fee_xp integer DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_received_xp integer DEFAULT 0;

-- Enhance seller_payouts table
ALTER TABLE public.seller_payouts ADD COLUMN IF NOT EXISTS amount_gbp numeric DEFAULT 0;
ALTER TABLE public.seller_payouts ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;
ALTER TABLE public.seller_payouts ADD COLUMN IF NOT EXISTS stripe_transfer_id text;
ALTER TABLE public.seller_payouts ADD COLUMN IF NOT EXISTS stripe_payout_id text;
ALTER TABLE public.seller_payouts ADD COLUMN IF NOT EXISTS payout_date timestamptz;
ALTER TABLE public.seller_payouts ADD COLUMN IF NOT EXISTS period_start date;
ALTER TABLE public.seller_payouts ADD COLUMN IF NOT EXISTS period_end date;
ALTER TABLE public.seller_payouts ADD COLUMN IF NOT EXISTS order_ids uuid[] DEFAULT '{}';
ALTER TABLE public.seller_payouts ADD COLUMN IF NOT EXISTS arrival_date timestamptz;
ALTER TABLE public.seller_payouts ADD COLUMN IF NOT EXISTS processed_at timestamptz;
ALTER TABLE public.seller_payouts ADD COLUMN IF NOT EXISTS notes text;

-- Create order disputes table
CREATE TABLE IF NOT EXISTS public.order_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_email text NOT NULL,
  seller_email text NOT NULL,
  
  status text NOT NULL DEFAULT 'open', -- open, investigating, resolved_buyer, resolved_seller, closed
  reason text NOT NULL,
  description text,
  
  -- Evidence
  buyer_evidence text[] DEFAULT '{}',
  seller_evidence text[] DEFAULT '{}',
  buyer_response text,
  seller_response text,
  
  -- Resolution
  resolution text,
  resolved_by text,
  resolved_at timestamptz,
  refund_amount_xp integer,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_disputes_order_id ON public.order_disputes (order_id);
CREATE INDEX IF NOT EXISTS idx_order_disputes_buyer ON public.order_disputes (buyer_email);
CREATE INDEX IF NOT EXISTS idx_order_disputes_seller ON public.order_disputes (seller_email);
CREATE INDEX IF NOT EXISTS idx_order_disputes_status ON public.order_disputes (status);

-- Create marketplace reviews table
CREATE TABLE IF NOT EXISTS public.marketplace_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  seller_email text NOT NULL,
  buyer_email text NOT NULL,
  
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  
  -- Response
  seller_response text,
  seller_responded_at timestamptz,
  
  -- Moderation
  is_visible boolean DEFAULT true,
  reported boolean DEFAULT false,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_product ON public.marketplace_reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_seller ON public.marketplace_reviews (seller_email);
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_buyer ON public.marketplace_reviews (buyer_email);

-- Create seller ratings aggregate table
CREATE TABLE IF NOT EXISTS public.seller_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_email text NOT NULL UNIQUE,
  
  average_rating numeric DEFAULT 0,
  total_ratings integer DEFAULT 0,
  rating_1_count integer DEFAULT 0,
  rating_2_count integer DEFAULT 0,
  rating_3_count integer DEFAULT 0,
  rating_4_count integer DEFAULT 0,
  rating_5_count integer DEFAULT 0,
  
  response_rate numeric DEFAULT 0, -- percentage
  avg_response_time_hours numeric DEFAULT 0,
  on_time_delivery_rate numeric DEFAULT 0, -- percentage
  total_sales integer DEFAULT 0,
  dispute_rate numeric DEFAULT 0, -- percentage
  
  last_calculated_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_ratings_email ON public.seller_ratings (seller_email);

-- Add order_items enhancements
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_name text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS price_gbp numeric DEFAULT 0;

-- RLS Policies for new tables

-- Seller Verifications
ALTER TABLE public.seller_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seller_verifications_select_own ON public.seller_verifications;
CREATE POLICY seller_verifications_select_own
ON public.seller_verifications
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'email') = seller_email
  OR (auth.jwt() ->> 'email') IN ('admin@hotmess.london', 'scanme@hotmess.london')
);

DROP POLICY IF EXISTS seller_verifications_insert_own ON public.seller_verifications;
CREATE POLICY seller_verifications_insert_own
ON public.seller_verifications
FOR INSERT
TO authenticated
WITH CHECK ((auth.jwt() ->> 'email') = seller_email);

DROP POLICY IF EXISTS seller_verifications_update_admin ON public.seller_verifications;
CREATE POLICY seller_verifications_update_admin
ON public.seller_verifications
FOR UPDATE
TO authenticated
USING (
  (auth.jwt() ->> 'email') IN ('admin@hotmess.london', 'scanme@hotmess.london')
)
WITH CHECK (
  (auth.jwt() ->> 'email') IN ('admin@hotmess.london', 'scanme@hotmess.london')
);

-- Order Disputes
ALTER TABLE public.order_disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_disputes_select_party ON public.order_disputes;
CREATE POLICY order_disputes_select_party
ON public.order_disputes
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'email') = buyer_email
  OR (auth.jwt() ->> 'email') = seller_email
  OR (auth.jwt() ->> 'email') IN ('admin@hotmess.london', 'scanme@hotmess.london')
);

DROP POLICY IF EXISTS order_disputes_insert_party ON public.order_disputes;
CREATE POLICY order_disputes_insert_party
ON public.order_disputes
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() ->> 'email') = buyer_email
  OR (auth.jwt() ->> 'email') = seller_email
);

DROP POLICY IF EXISTS order_disputes_update_party ON public.order_disputes;
CREATE POLICY order_disputes_update_party
ON public.order_disputes
FOR UPDATE
TO authenticated
USING (
  (auth.jwt() ->> 'email') = buyer_email
  OR (auth.jwt() ->> 'email') = seller_email
  OR (auth.jwt() ->> 'email') IN ('admin@hotmess.london', 'scanme@hotmess.london')
)
WITH CHECK (
  (auth.jwt() ->> 'email') = buyer_email
  OR (auth.jwt() ->> 'email') = seller_email
  OR (auth.jwt() ->> 'email') IN ('admin@hotmess.london', 'scanme@hotmess.london')
);

-- Marketplace Reviews
ALTER TABLE public.marketplace_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketplace_reviews_select_public ON public.marketplace_reviews;
CREATE POLICY marketplace_reviews_select_public
ON public.marketplace_reviews
FOR SELECT
TO anon, authenticated
USING (is_visible = true);

DROP POLICY IF EXISTS marketplace_reviews_insert_buyer ON public.marketplace_reviews;
CREATE POLICY marketplace_reviews_insert_buyer
ON public.marketplace_reviews
FOR INSERT
TO authenticated
WITH CHECK ((auth.jwt() ->> 'email') = buyer_email);

DROP POLICY IF EXISTS marketplace_reviews_update_party ON public.marketplace_reviews;
CREATE POLICY marketplace_reviews_update_party
ON public.marketplace_reviews
FOR UPDATE
TO authenticated
USING (
  (auth.jwt() ->> 'email') = buyer_email
  OR (auth.jwt() ->> 'email') = seller_email
)
WITH CHECK (
  (auth.jwt() ->> 'email') = buyer_email
  OR (auth.jwt() ->> 'email') = seller_email
);

-- Seller Ratings (public read)
ALTER TABLE public.seller_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seller_ratings_select_public ON public.seller_ratings;
CREATE POLICY seller_ratings_select_public
ON public.seller_ratings
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS seller_ratings_write_service ON public.seller_ratings;
CREATE POLICY seller_ratings_write_service
ON public.seller_ratings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to update seller ratings after a review
CREATE OR REPLACE FUNCTION update_seller_rating()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.seller_ratings (seller_email, average_rating, total_ratings, rating_1_count, rating_2_count, rating_3_count, rating_4_count, rating_5_count)
  SELECT 
    NEW.seller_email,
    AVG(rating),
    COUNT(*),
    COUNT(*) FILTER (WHERE rating = 1),
    COUNT(*) FILTER (WHERE rating = 2),
    COUNT(*) FILTER (WHERE rating = 3),
    COUNT(*) FILTER (WHERE rating = 4),
    COUNT(*) FILTER (WHERE rating = 5)
  FROM public.marketplace_reviews
  WHERE seller_email = NEW.seller_email AND is_visible = true
  ON CONFLICT (seller_email) DO UPDATE SET
    average_rating = EXCLUDED.average_rating,
    total_ratings = EXCLUDED.total_ratings,
    rating_1_count = EXCLUDED.rating_1_count,
    rating_2_count = EXCLUDED.rating_2_count,
    rating_3_count = EXCLUDED.rating_3_count,
    rating_4_count = EXCLUDED.rating_4_count,
    rating_5_count = EXCLUDED.rating_5_count,
    last_calculated_at = now(),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_seller_rating ON public.marketplace_reviews;
CREATE TRIGGER trigger_update_seller_rating
AFTER INSERT OR UPDATE ON public.marketplace_reviews
FOR EACH ROW EXECUTE FUNCTION update_seller_rating();

-- Function to update product average rating after a review
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET average_rating = (
    SELECT AVG(rating)
    FROM public.marketplace_reviews
    WHERE product_id = NEW.product_id AND is_visible = true
  ),
  updated_at = now()
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_product_rating ON public.marketplace_reviews;
CREATE TRIGGER trigger_update_product_rating
AFTER INSERT OR UPDATE ON public.marketplace_reviews
FOR EACH ROW
WHEN (NEW.product_id IS NOT NULL)
EXECUTE FUNCTION update_product_rating();
