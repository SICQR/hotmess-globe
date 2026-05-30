-- Create preloved_listings table if it doesn't exist
-- market.ts expects: id, seller_id, title, description, price (numeric), images (array),
-- category, condition, status, created_at, updated_at

CREATE TABLE IF NOT EXISTS public.preloved_listings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title       TEXT NOT NULL,
  description TEXT,
  price       NUMERIC NOT NULL CHECK (price > 0),
  currency    TEXT NOT NULL DEFAULT 'GBP',

  category    TEXT,
  condition   TEXT,
  images      TEXT[] DEFAULT '{}',

  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'sold', 'draft', 'removed', 'deleted')),

  location_city    TEXT,
  location_country TEXT,
  shipping_available BOOLEAN DEFAULT FALSE,
  local_pickup       BOOLEAN DEFAULT TRUE,

  views  INTEGER DEFAULT 0,
  saves  INTEGER DEFAULT 0,

  metadata   JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preloved_seller   ON public.preloved_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_preloved_status   ON public.preloved_listings(status);
CREATE INDEX IF NOT EXISTS idx_preloved_category ON public.preloved_listings(category);
CREATE INDEX IF NOT EXISTS idx_preloved_price    ON public.preloved_listings(price) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_preloved_created  ON public.preloved_listings(created_at DESC);

-- Add price column if table already exists with price_cents
ALTER TABLE public.preloved_listings
  ADD COLUMN IF NOT EXISTS price NUMERIC;

ALTER TABLE ONLY public.preloved_listings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Public: read active listings or own listings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'preloved_listings' AND policyname = 'preloved_read_active_or_own'
  ) THEN
    CREATE POLICY preloved_read_active_or_own ON public.preloved_listings
      FOR SELECT TO anon, authenticated
      USING (status = 'active' OR auth.uid() = seller_id);
  END IF;

  -- Authenticated: manage own listings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'preloved_listings' AND policyname = 'preloved_manage_own'
  ) THEN
    CREATE POLICY preloved_manage_own ON public.preloved_listings
      FOR ALL TO authenticated
      USING (auth.uid() = seller_id)
      WITH CHECK (auth.uid() = seller_id);
  END IF;
END $$;

GRANT SELECT ON public.preloved_listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preloved_listings TO authenticated;
