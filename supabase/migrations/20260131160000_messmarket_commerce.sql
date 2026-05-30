-- ============================================================================
-- MESSMARKET — PEER-TO-PEER COMMERCE SYSTEM
-- ============================================================================
-- Adult peer-to-peer commerce for MSM community.
-- 
-- ALLOWED:
-- ✅ clothing, fetish_gear, worn_items, physical_goods, digital_goods, telegram_access
-- 
-- NOT ALLOWED (code enforced):
-- ❌ sexual_services, escort, pay_per_meet
-- 
-- Key principle: "Items are not people. This boundary is enforced."
-- ============================================================================

-- Product categories (allowed only)
CREATE TYPE product_category AS ENUM (
  'clothing',
  'fetish_gear',
  'worn_items',      -- underwear, socks, shoes, etc.
  'physical_goods',
  'digital_goods',
  'telegram_access', -- gated community/room access
  'event_access',    -- non-ticket event perks
  'custom'
);

-- Worn item subtypes (for worn_items category)
CREATE TYPE worn_item_type AS ENUM (
  'underwear',
  'socks',
  'shoes',
  'sportswear',
  'sleepwear',
  'other'
);

-- Product condition
CREATE TYPE product_condition AS ENUM (
  'new',
  'like_new',
  'good',
  'worn',           -- For worn items, this is the appeal
  'heavily_worn'
);

-- Listing status
CREATE TYPE listing_status AS ENUM (
  'draft',
  'active',
  'sold',
  'reserved',
  'expired',
  'removed'
);

-- Seller verification level
CREATE TYPE seller_verification AS ENUM (
  'unverified',
  'email_verified',
  'id_verified',
  'trusted'         -- Earned through sales + no disputes
);

-- ============================================================================
-- SELLERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Profile
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  
  -- Verification
  verification_level seller_verification DEFAULT 'unverified',
  verified_at TIMESTAMPTZ,
  
  -- Stats
  total_sales INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  avg_rating DECIMAL(3,2),
  rating_count INTEGER DEFAULT 0,
  
  -- Trust
  disputes INTEGER DEFAULT 0,
  response_time_hours INTEGER, -- Avg response time
  
  -- Stripe
  stripe_account_id TEXT,
  stripe_onboarded BOOLEAN DEFAULT FALSE,
  
  -- Settings
  ships_internationally BOOLEAN DEFAULT FALSE,
  ships_from_city TEXT,
  telegram_handle TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  
  -- Basic info
  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 100),
  description TEXT CHECK (char_length(description) <= 2000),
  
  -- Category (enforced)
  category product_category NOT NULL,
  worn_item_type worn_item_type, -- Required if category = 'worn_items'
  
  -- Condition
  condition product_condition DEFAULT 'good',
  
  -- Pricing
  price DECIMAL(10,2) NOT NULL CHECK (price > 0 AND price <= 10000),
  currency TEXT DEFAULT 'GBP' CHECK (currency IN ('GBP', 'EUR', 'USD')),
  original_price DECIMAL(10,2), -- For showing discounts
  
  -- Inventory
  quantity INTEGER DEFAULT 1 CHECK (quantity >= 0),
  
  -- Status
  status listing_status DEFAULT 'draft',
  
  -- Media
  images TEXT[] DEFAULT '{}', -- Array of image URLs
  video_url TEXT,
  
  -- Shipping
  ships_from TEXT,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  estimated_delivery_days INTEGER,
  
  -- For digital/telegram
  is_digital BOOLEAN DEFAULT FALSE,
  telegram_room_link TEXT, -- For telegram_access category
  digital_download_url TEXT, -- For digital_goods
  
  -- Worn items specific
  worn_duration TEXT, -- "1 day", "3 days", "1 week"
  worn_description TEXT, -- What activities
  includes_proof_photo BOOLEAN DEFAULT FALSE,
  
  -- Discovery
  tags TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT FALSE,
  
  -- Stats
  view_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,
  inquiry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Constraint: worn_item_type required for worn_items
  CONSTRAINT worn_items_need_type CHECK (
    category != 'worn_items' OR worn_item_type IS NOT NULL
  )
);

-- ============================================================================
-- ORDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Parties
  product_id UUID NOT NULL REFERENCES products(id),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  buyer_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Pricing
  price DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  platform_fee DECIMAL(10,2) NOT NULL, -- 10%
  seller_payout DECIMAL(10,2) NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'paid', 'shipped', 'delivered', 'completed', 'disputed', 'refunded', 'cancelled'
  )),
  
  -- Payment
  stripe_payment_intent_id TEXT,
  paid_at TIMESTAMPTZ,
  
  -- Shipping
  shipping_address JSONB,
  tracking_number TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  -- For digital
  digital_delivered BOOLEAN DEFAULT FALSE,
  digital_delivered_at TIMESTAMPTZ,
  
  -- Completion
  buyer_confirmed BOOLEAN DEFAULT FALSE,
  seller_confirmed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  
  -- Disputes
  dispute_reason TEXT,
  disputed_at TIMESTAMPTZ,
  dispute_resolved_at TIMESTAMPTZ,
  
  -- Chat
  chat_thread_id UUID,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PRODUCT REVIEWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES product_orders(id),
  product_id UUID NOT NULL REFERENCES products(id),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  buyer_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Rating
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  
  -- Content
  title TEXT,
  body TEXT CHECK (char_length(body) <= 1000),
  
  -- Verified purchase
  is_verified_purchase BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One review per order
  UNIQUE(order_id)
);

-- ============================================================================
-- PRODUCT SAVES (Wishlist)
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, product_id)
);

-- ============================================================================
-- BLOCKED CATEGORIES ENFORCEMENT
-- ============================================================================
-- This function prevents any attempt to create prohibited categories
CREATE OR REPLACE FUNCTION enforce_allowed_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check title and description for prohibited keywords
  IF NEW.title ~* '(escort|sex work|sexual service|pay.*meet|meet.*pay|hour.*rate|rate.*hour|full service|gfe|pnp|party.*play)' THEN
    RAISE EXCEPTION 'This type of listing is not allowed on MessMarket';
  END IF;
  
  IF NEW.description ~* '(escort|sex work|sexual service|pay.*meet|meet.*pay|hour.*rate|rate.*hour|full service|gfe|pnp|party.*play)' THEN
    RAISE EXCEPTION 'This type of listing is not allowed on MessMarket';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_categories
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION enforce_allowed_categories();

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON product_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON product_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON product_orders(status);
CREATE INDEX IF NOT EXISTS idx_saves_user ON product_saves(user_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_saves ENABLE ROW LEVEL SECURITY;

-- Sellers: public read, owner write
CREATE POLICY "Public can view sellers"
  ON sellers FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can manage own seller profile"
  ON sellers FOR ALL
  USING (user_id = auth.uid());

-- Products: public read active, seller write
CREATE POLICY "Public can view active products"
  ON products FOR SELECT
  USING (status = 'active');

CREATE POLICY "Sellers can view own products"
  ON products FOR SELECT
  USING (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()));

CREATE POLICY "Sellers can manage own products"
  ON products FOR ALL
  USING (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()));

-- Orders: buyer/seller only
CREATE POLICY "Users can view own orders"
  ON product_orders FOR SELECT
  USING (
    buyer_id = auth.uid() OR
    seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create orders"
  ON product_orders FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Parties can update orders"
  ON product_orders FOR UPDATE
  USING (
    buyer_id = auth.uid() OR
    seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
  );

-- Reviews: buyer write, public read
CREATE POLICY "Public can view reviews"
  ON product_reviews FOR SELECT
  USING (TRUE);

CREATE POLICY "Buyers can create reviews"
  ON product_reviews FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

-- Saves: user only
CREATE POLICY "Users can manage saves"
  ON product_saves FOR ALL
  USING (user_id = auth.uid());

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Calculate platform fee (10%)
CREATE OR REPLACE FUNCTION calculate_product_fees(p_price DECIMAL, p_shipping DECIMAL DEFAULT 0)
RETURNS TABLE(platform_fee DECIMAL, seller_payout DECIMAL, total DECIMAL)
LANGUAGE plpgsql
AS $$
DECLARE
  v_total DECIMAL;
  v_fee DECIMAL;
BEGIN
  v_total := p_price + p_shipping;
  v_fee := ROUND(p_price * 0.10, 2); -- 10% of item price (not shipping)
  
  RETURN QUERY SELECT 
    v_fee,
    p_price - v_fee,
    v_total;
END;
$$;

-- Update seller stats after order completion
CREATE OR REPLACE FUNCTION update_seller_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE sellers
    SET 
      total_sales = total_sales + 1,
      total_revenue = total_revenue + NEW.seller_payout,
      updated_at = NOW()
    WHERE id = NEW.seller_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_seller_stats
  AFTER UPDATE ON product_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_stats();

-- Update seller rating after review
CREATE OR REPLACE FUNCTION update_seller_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE sellers
  SET 
    avg_rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM product_reviews
      WHERE seller_id = NEW.seller_id
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM product_reviews
      WHERE seller_id = NEW.seller_id
    ),
    updated_at = NOW()
  WHERE id = NEW.seller_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_seller_rating
  AFTER INSERT ON product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_rating();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE products IS 'MessMarket product listings - NO sexual services';
COMMENT ON COLUMN products.category IS 'Allowed categories only - enforced by enum';
COMMENT ON COLUMN products.worn_item_type IS 'For worn_items category - underwear, socks, etc.';
COMMENT ON FUNCTION enforce_allowed_categories() IS 'Blocks prohibited keywords in listings';
