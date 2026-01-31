-- ============================================================================
-- TICKET RESALE SYSTEM
-- Phase 1: Peer-to-peer resale with fraud protection
-- Phase 2: Official ticketing (future)
-- ============================================================================

-- ============================================================================
-- TICKET LISTINGS (Resale)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ticket_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Seller
  seller_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  
  -- Event reference (can be Beacon or external)
  event_id UUID REFERENCES "Beacon"(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  event_venue TEXT,
  event_city TEXT,
  
  -- Ticket details
  ticket_type TEXT NOT NULL DEFAULT 'general', -- general, vip, early_bird, guest_list
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  original_price DECIMAL(10,2),
  asking_price DECIMAL(10,2) NOT NULL CHECK (asking_price > 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  
  -- Proof of ownership
  proof_type TEXT CHECK (proof_type IN ('screenshot', 'email', 'pdf', 'qr_code', 'confirmation_number')),
  proof_url TEXT, -- Stored securely, not public
  confirmation_number TEXT,
  
  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES "User"(id),
  verification_notes TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'draft', 'active', 'pending_verification', 'sold', 'expired', 'cancelled', 'flagged'
  )),
  
  -- Demand tracking
  view_count INT DEFAULT 0,
  save_count INT DEFAULT 0,
  inquiry_count INT DEFAULT 0,
  demand_level TEXT DEFAULT 'normal' CHECK (demand_level IN ('low', 'normal', 'high', 'hot')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ, -- Auto-expire after event date
  
  -- Search optimization
  search_vector TSVECTOR
);

-- ============================================================================
-- TICKET PURCHASES
-- ============================================================================
CREATE TABLE IF NOT EXISTS ticket_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  listing_id UUID NOT NULL REFERENCES ticket_listings(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  
  -- Transaction
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL, -- 10% default
  seller_payout DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  
  -- Payment
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN (
    'pending', 'processing', 'completed', 'failed', 'refunded', 'disputed'
  )),
  payment_intent_id TEXT,
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  
  -- Transfer
  transfer_status TEXT NOT NULL DEFAULT 'pending' CHECK (transfer_status IN (
    'pending', 'in_progress', 'completed', 'failed', 'disputed'
  )),
  transfer_method TEXT, -- 'in_app', 'email', 'qr_handoff'
  transfer_confirmed_at TIMESTAMPTZ,
  transfer_confirmed_by UUID REFERENCES "User"(id),
  
  -- Escrow (funds held until transfer confirmed)
  escrow_status TEXT DEFAULT 'pending' CHECK (escrow_status IN (
    'pending', 'held', 'released', 'refunded'
  )),
  escrow_released_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- TICKET CHAT THREADS (Mandatory before purchase)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ticket_chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  listing_id UUID NOT NULL REFERENCES ticket_listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'purchase_pending', 'completed', 'cancelled', 'reported'
  )),
  
  -- Purchase eligibility (must chat before buying)
  messages_exchanged INT DEFAULT 0,
  can_purchase BOOLEAN DEFAULT false, -- True after min messages
  purchase_unlocked_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(listing_id, buyer_id)
);

-- ============================================================================
-- TICKET CHAT MESSAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS ticket_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  thread_id UUID NOT NULL REFERENCES ticket_chat_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'system')),
  
  -- Read tracking
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Moderation
  is_flagged BOOLEAN DEFAULT false,
  flagged_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- TICKET FRAUD SIGNALS
-- ============================================================================
CREATE TABLE IF NOT EXISTS ticket_fraud_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  listing_id UUID REFERENCES ticket_listings(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES ticket_purchases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  
  signal_type TEXT NOT NULL CHECK (signal_type IN (
    'duplicate_listing', 'price_gouging', 'fake_proof', 
    'stolen_ticket', 'no_show', 'chargeback', 'scam_report',
    'suspicious_behavior', 'multiple_accounts'
  )),
  
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  
  details JSONB DEFAULT '{}',
  
  -- Resolution
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES "User"(id),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- OFFICIAL TICKETS (Phase 2 - Future)
-- ============================================================================
CREATE TABLE IF NOT EXISTS official_ticket_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event (must be linked to Beacon)
  event_id UUID NOT NULL REFERENCES "Beacon"(id) ON DELETE CASCADE,
  organiser_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  
  -- Ticket tier
  tier_name TEXT NOT NULL,
  tier_description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  
  -- Inventory
  total_quantity INT NOT NULL CHECK (total_quantity > 0),
  sold_quantity INT DEFAULT 0,
  reserved_quantity INT DEFAULT 0,
  
  -- Sale window
  sale_starts_at TIMESTAMPTZ,
  sale_ends_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_ticket_listings_seller ON ticket_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_ticket_listings_event ON ticket_listings(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_listings_status ON ticket_listings(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_ticket_listings_event_date ON ticket_listings(event_date);
CREATE INDEX IF NOT EXISTS idx_ticket_listings_city ON ticket_listings(event_city);
CREATE INDEX IF NOT EXISTS idx_ticket_listings_demand ON ticket_listings(demand_level);
CREATE INDEX IF NOT EXISTS idx_ticket_listings_search ON ticket_listings USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_ticket_purchases_buyer ON ticket_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_seller ON ticket_purchases(seller_id);
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_listing ON ticket_purchases(listing_id);
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_status ON ticket_purchases(payment_status);

CREATE INDEX IF NOT EXISTS idx_ticket_chat_threads_listing ON ticket_chat_threads(listing_id);
CREATE INDEX IF NOT EXISTS idx_ticket_chat_threads_buyer ON ticket_chat_threads(buyer_id);
CREATE INDEX IF NOT EXISTS idx_ticket_chat_messages_thread ON ticket_chat_messages(thread_id);

CREATE INDEX IF NOT EXISTS idx_ticket_fraud_listing ON ticket_fraud_signals(listing_id);
CREATE INDEX IF NOT EXISTS idx_ticket_fraud_user ON ticket_fraud_signals(user_id);

CREATE INDEX IF NOT EXISTS idx_official_tickets_event ON official_ticket_inventory(event_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE ticket_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_fraud_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE official_ticket_inventory ENABLE ROW LEVEL SECURITY;

-- Listings: public read, seller write
CREATE POLICY "Anyone can view active listings"
  ON ticket_listings FOR SELECT
  USING (status = 'active' OR seller_id = auth.uid());

CREATE POLICY "Sellers can manage own listings"
  ON ticket_listings FOR ALL
  USING (seller_id = auth.uid());

-- Purchases: buyer and seller can view
CREATE POLICY "Buyers can view own purchases"
  ON ticket_purchases FOR SELECT
  USING (buyer_id = auth.uid());

CREATE POLICY "Sellers can view own sales"
  ON ticket_purchases FOR SELECT
  USING (seller_id = auth.uid());

-- Chat threads: participants only
CREATE POLICY "Participants can view threads"
  ON ticket_chat_threads FOR SELECT
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "Buyers can create threads"
  ON ticket_chat_threads FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

-- Chat messages: participants only
CREATE POLICY "Participants can view messages"
  ON ticket_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ticket_chat_threads t
      WHERE t.id = ticket_chat_messages.thread_id
        AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
  );

CREATE POLICY "Participants can send messages"
  ON ticket_chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM ticket_chat_threads t
      WHERE t.id = ticket_chat_messages.thread_id
        AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
  );

-- Fraud signals: admin only
CREATE POLICY "Service role access fraud signals"
  ON ticket_fraud_signals FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Official inventory: organiser write, public read active
CREATE POLICY "Anyone can view active inventory"
  ON official_ticket_inventory FOR SELECT
  USING (is_active = true);

CREATE POLICY "Organisers can manage own inventory"
  ON official_ticket_inventory FOR ALL
  USING (organiser_id = auth.uid());

-- Service role full access
CREATE POLICY "Service role full access listings" ON ticket_listings FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access purchases" ON ticket_purchases FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access threads" ON ticket_chat_threads FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access messages" ON ticket_chat_messages FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access inventory" ON official_ticket_inventory FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Update demand level based on activity
CREATE OR REPLACE FUNCTION update_ticket_demand()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate demand level
  NEW.demand_level := CASE
    WHEN NEW.inquiry_count >= 20 OR NEW.save_count >= 15 THEN 'hot'
    WHEN NEW.inquiry_count >= 10 OR NEW.save_count >= 8 THEN 'high'
    WHEN NEW.inquiry_count >= 3 OR NEW.save_count >= 3 THEN 'normal'
    ELSE 'low'
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_ticket_demand
  BEFORE UPDATE ON ticket_listings
  FOR EACH ROW
  WHEN (OLD.inquiry_count IS DISTINCT FROM NEW.inquiry_count 
     OR OLD.save_count IS DISTINCT FROM NEW.save_count)
  EXECUTE FUNCTION update_ticket_demand();

-- Unlock purchase after minimum chat messages
CREATE OR REPLACE FUNCTION unlock_ticket_purchase()
RETURNS TRIGGER AS $$
DECLARE
  v_min_messages INT := 3; -- Minimum messages before purchase allowed
BEGIN
  -- Count messages in thread
  SELECT COUNT(*) INTO NEW.messages_exchanged
  FROM ticket_chat_messages
  WHERE thread_id = NEW.id;
  
  -- Check if purchase should be unlocked
  IF NEW.messages_exchanged >= v_min_messages AND NOT COALESCE(OLD.can_purchase, false) THEN
    NEW.can_purchase := true;
    NEW.purchase_unlocked_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update thread after message
CREATE OR REPLACE FUNCTION after_ticket_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ticket_chat_threads
  SET updated_at = now()
  WHERE id = NEW.thread_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_after_ticket_message
  AFTER INSERT ON ticket_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION after_ticket_message();

-- Update search vector
CREATE OR REPLACE FUNCTION update_ticket_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.event_name, '') || ' ' ||
    COALESCE(NEW.event_venue, '') || ' ' ||
    COALESCE(NEW.event_city, '') || ' ' ||
    COALESCE(NEW.ticket_type, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ticket_search_vector
  BEFORE INSERT OR UPDATE ON ticket_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_search_vector();

-- Auto-expire listings after event
CREATE OR REPLACE FUNCTION expire_past_ticket_listings()
RETURNS void AS $$
BEGIN
  UPDATE ticket_listings
  SET status = 'expired'
  WHERE status = 'active'
    AND event_date < now() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate platform fee (10%)
CREATE OR REPLACE FUNCTION calculate_ticket_fees(
  p_price DECIMAL,
  p_quantity INT DEFAULT 1
)
RETURNS TABLE (
  subtotal DECIMAL,
  platform_fee DECIMAL,
  seller_payout DECIMAL
) AS $$
DECLARE
  v_fee_rate DECIMAL := 0.10; -- 10%
BEGIN
  RETURN QUERY SELECT
    p_price * p_quantity AS subtotal,
    ROUND(p_price * p_quantity * v_fee_rate, 2) AS platform_fee,
    ROUND(p_price * p_quantity * (1 - v_fee_rate), 2) AS seller_payout;
END;
$$ LANGUAGE plpgsql;

-- Create or get chat thread
CREATE OR REPLACE FUNCTION get_or_create_ticket_thread(
  p_listing_id UUID,
  p_buyer_id UUID
)
RETURNS ticket_chat_threads AS $$
DECLARE
  v_thread ticket_chat_threads;
  v_seller_id UUID;
BEGIN
  -- Get seller from listing
  SELECT seller_id INTO v_seller_id
  FROM ticket_listings
  WHERE id = p_listing_id;
  
  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;
  
  IF v_seller_id = p_buyer_id THEN
    RAISE EXCEPTION 'Cannot message yourself';
  END IF;
  
  -- Try to get existing thread
  SELECT * INTO v_thread
  FROM ticket_chat_threads
  WHERE listing_id = p_listing_id AND buyer_id = p_buyer_id;
  
  -- Create if not exists
  IF v_thread.id IS NULL THEN
    INSERT INTO ticket_chat_threads (listing_id, buyer_id, seller_id)
    VALUES (p_listing_id, p_buyer_id, v_seller_id)
    RETURNING * INTO v_thread;
  END IF;
  
  RETURN v_thread;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
