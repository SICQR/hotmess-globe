-- ============================================================================
-- ADULT CONTENT SYSTEM
-- Phase 4: Marketplace Enhancement
-- ============================================================================

-- Add content rating to products (assumes products table exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'content_rating'
  ) THEN
    ALTER TABLE products ADD COLUMN content_rating TEXT 
      DEFAULT 'sfw' CHECK (content_rating IN ('sfw', '18+', 'xxx', 'fetish'));
  END IF;
END $$;

-- Add seller verification for adult content
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = '"User"' AND column_name = 'adult_seller_verified'
  ) THEN
    ALTER TABLE "User" ADD COLUMN adult_seller_verified BOOLEAN DEFAULT false;
    ALTER TABLE "User" ADD COLUMN adult_verification_date TIMESTAMPTZ;
    ALTER TABLE "User" ADD COLUMN keeper_2257_acknowledged BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Content moderation queue
CREATE TABLE IF NOT EXISTS content_moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID, -- References products(id) - soft reference
  submitted_by UUID REFERENCES "User"(id) ON DELETE CASCADE,
  content_rating TEXT NOT NULL CHECK (content_rating IN ('sfw', '18+', 'xxx', 'fetish')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES "User"(id),
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_content_rating ON products(content_rating);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON content_moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_product ON content_moderation_queue(product_id);

-- RLS
ALTER TABLE content_moderation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Submitters can view own submissions"
  ON content_moderation_queue FOR SELECT
  USING (auth.uid() = submitted_by);

CREATE POLICY "Service role full access moderation queue"
  ON content_moderation_queue FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Admin users can review
CREATE POLICY "Admins can review moderation queue"
  ON content_moderation_queue FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "User" 
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );
