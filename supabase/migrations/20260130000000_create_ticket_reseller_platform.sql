-- ============================================================================
-- Ticket Reseller Platform
-- A safe, end-to-end 3rd party ticket reselling system for club tickets
-- Features: Escrow payments, fraud prevention, seller verification, 
--           ticket validation, buyer protection, dispute resolution
-- ============================================================================

-- ============================================================================
-- TICKET LISTINGS TABLE
-- Core table for tickets being sold by resellers
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Seller info
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_email TEXT NOT NULL,
  
  -- Event info (linked to Beacon events)
  event_id UUID REFERENCES public."Beacon"(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_venue TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  event_city TEXT,
  event_address TEXT,
  
  -- Ticket details
  ticket_type TEXT NOT NULL, -- 'general_admission', 'vip', 'early_bird', 'table', 'backstage', 'other'
  ticket_quantity INTEGER NOT NULL DEFAULT 1 CHECK (ticket_quantity >= 1 AND ticket_quantity <= 10),
  original_price_gbp NUMERIC NOT NULL CHECK (original_price_gbp >= 0),
  asking_price_gbp NUMERIC NOT NULL CHECK (asking_price_gbp >= 0),
  
  -- Price protection (prevent extreme scalping)
  max_markup_percentage NUMERIC DEFAULT 20, -- Platform limit on markup
  price_verified BOOLEAN DEFAULT false,
  
  -- Ticket proof/validation
  ticket_proof_url TEXT, -- Screenshot or PDF of ticket
  ticket_confirmation_code TEXT, -- Booking reference (encrypted)
  ticket_qr_url TEXT, -- QR code image (encrypted)
  ticket_source TEXT, -- 'resident_advisor', 'dice', 'eventbrite', 'venue_direct', 'other'
  original_purchaser_name TEXT,
  
  -- Listing details
  description TEXT,
  reason_for_selling TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending_verification', -- pending_verification, active, reserved, sold, cancelled, expired, flagged
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  
  -- Safety flags
  is_suspicious BOOLEAN DEFAULT false,
  fraud_score NUMERIC DEFAULT 0 CHECK (fraud_score >= 0 AND fraud_score <= 100),
  reported_count INTEGER DEFAULT 0,
  
  -- Transfer method
  transfer_method TEXT NOT NULL DEFAULT 'email_transfer', -- 'email_transfer', 'app_transfer', 'name_change', 'pdf_send', 'physical_handover'
  transfer_instructions TEXT,
  
  -- Views and interest
  view_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,
  inquiry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  listed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ, -- Auto-expires before event
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for ticket listings
CREATE INDEX IF NOT EXISTS idx_ticket_listings_seller ON public.ticket_listings (seller_id);
CREATE INDEX IF NOT EXISTS idx_ticket_listings_event ON public.ticket_listings (event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_listings_status ON public.ticket_listings (status);
CREATE INDEX IF NOT EXISTS idx_ticket_listings_event_date ON public.ticket_listings (event_date);
CREATE INDEX IF NOT EXISTS idx_ticket_listings_city ON public.ticket_listings (event_city);
CREATE INDEX IF NOT EXISTS idx_ticket_listings_price ON public.ticket_listings (asking_price_gbp);

-- ============================================================================
-- TICKET ORDERS TABLE
-- Tracks purchases with full escrow workflow
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Participants
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_email TEXT NOT NULL,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_email TEXT NOT NULL,
  
  -- Listing reference
  listing_id UUID NOT NULL REFERENCES public.ticket_listings(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  
  -- Pricing
  unit_price_gbp NUMERIC NOT NULL,
  subtotal_gbp NUMERIC NOT NULL,
  platform_fee_gbp NUMERIC NOT NULL DEFAULT 0, -- 10% platform fee
  buyer_protection_fee_gbp NUMERIC NOT NULL DEFAULT 0, -- 2.5% buyer protection
  total_gbp NUMERIC NOT NULL,
  
  -- Payment
  payment_method TEXT NOT NULL DEFAULT 'stripe', -- 'stripe', 'xp', 'mixed'
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, captured, failed, refunded
  paid_at TIMESTAMPTZ,
  
  -- Escrow status
  escrow_status TEXT NOT NULL DEFAULT 'pending_payment', 
  -- pending_payment: Awaiting payment
  -- holding: Payment received, holding in escrow
  -- transfer_pending: Seller needs to transfer ticket
  -- transfer_in_progress: Seller claims transfer started
  -- buyer_confirmation_pending: Waiting for buyer to confirm receipt
  -- release_pending: Buyer confirmed, payout processing
  -- released: Seller paid out
  -- disputed: Under dispute
  -- refunded: Buyer refunded
  
  escrow_held_at TIMESTAMPTZ,
  escrow_release_deadline TIMESTAMPTZ, -- Auto-release after 48 hours if no dispute
  escrow_released_at TIMESTAMPTZ,
  
  -- Transfer tracking
  transfer_started_at TIMESTAMPTZ,
  transfer_proof_url TEXT, -- Screenshot of transfer confirmation
  transfer_method_used TEXT,
  transfer_reference TEXT,
  
  -- Buyer confirmation
  buyer_confirmed_receipt BOOLEAN DEFAULT false,
  buyer_confirmed_at TIMESTAMPTZ,
  buyer_ticket_received_proof TEXT, -- Screenshot of received ticket
  
  -- Auto-release tracking
  auto_release_scheduled_at TIMESTAMPTZ,
  auto_release_reminder_sent BOOLEAN DEFAULT false,
  
  -- Seller payout
  seller_payout_amount_gbp NUMERIC,
  seller_payout_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  seller_payout_id UUID,
  seller_paid_at TIMESTAMPTZ,
  
  -- Order status
  status TEXT NOT NULL DEFAULT 'pending', 
  -- pending, confirmed, transfer_pending, transferred, completed, cancelled, refunded, disputed
  
  -- Communication
  last_message_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  
  -- Dispute reference
  dispute_id UUID,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for ticket orders
CREATE INDEX IF NOT EXISTS idx_ticket_orders_buyer ON public.ticket_orders (buyer_id);
CREATE INDEX IF NOT EXISTS idx_ticket_orders_seller ON public.ticket_orders (seller_id);
CREATE INDEX IF NOT EXISTS idx_ticket_orders_listing ON public.ticket_orders (listing_id);
CREATE INDEX IF NOT EXISTS idx_ticket_orders_status ON public.ticket_orders (status);
CREATE INDEX IF NOT EXISTS idx_ticket_orders_escrow ON public.ticket_orders (escrow_status);
CREATE INDEX IF NOT EXISTS idx_ticket_orders_payment ON public.ticket_orders (stripe_payment_intent_id);

-- ============================================================================
-- TICKET ESCROW TABLE
-- Detailed escrow transaction tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_escrow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.ticket_orders(id) ON DELETE CASCADE,
  
  -- Funds tracking
  amount_gbp NUMERIC NOT NULL,
  platform_fee_gbp NUMERIC NOT NULL DEFAULT 0,
  seller_amount_gbp NUMERIC NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending: Awaiting payment
  -- holding: Funds received and held
  -- releasing: Payout in progress
  -- released: Seller paid
  -- refunding: Refund in progress
  -- refunded: Buyer refunded
  
  -- Stripe references
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT, -- Transfer to seller's Connect account
  stripe_refund_id TEXT,
  
  -- Timeline
  funds_received_at TIMESTAMPTZ,
  funds_released_at TIMESTAMPTZ,
  funds_refunded_at TIMESTAMPTZ,
  
  -- Audit trail
  events JSONB DEFAULT '[]'::jsonb, -- Array of status change events
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_escrow_order ON public.ticket_escrow (order_id);
CREATE INDEX IF NOT EXISTS idx_ticket_escrow_status ON public.ticket_escrow (status);

-- ============================================================================
-- TICKET TRANSFERS TABLE
-- Tracks the actual ticket transfer process
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.ticket_orders(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.ticket_listings(id) ON DELETE CASCADE,
  
  -- Parties
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Transfer details
  transfer_method TEXT NOT NULL, -- email_transfer, app_transfer, name_change, pdf_send, physical_handover
  transfer_email TEXT, -- Email used for transfer (if applicable)
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending: Awaiting seller action
  -- initiated: Seller started transfer
  -- proof_submitted: Seller submitted proof
  -- confirmed: Buyer confirmed receipt
  -- failed: Transfer failed
  -- cancelled: Cancelled
  
  -- Evidence
  seller_proof_urls TEXT[] DEFAULT '{}', -- Screenshots of transfer
  seller_proof_submitted_at TIMESTAMPTZ,
  seller_notes TEXT,
  
  buyer_proof_urls TEXT[] DEFAULT '{}', -- Screenshots of received ticket
  buyer_confirmed_at TIMESTAMPTZ,
  buyer_notes TEXT,
  
  -- Validation
  ticket_validated BOOLEAN DEFAULT false,
  validation_method TEXT, -- 'qr_scan', 'code_verification', 'screenshot_match', 'manual'
  validated_at TIMESTAMPTZ,
  
  -- Deadlines
  transfer_deadline TIMESTAMPTZ, -- Seller must transfer by this time
  confirmation_deadline TIMESTAMPTZ, -- Buyer must confirm by this time
  
  -- Reminders sent
  reminder_24h_sent BOOLEAN DEFAULT false,
  reminder_12h_sent BOOLEAN DEFAULT false,
  reminder_2h_sent BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_transfers_order ON public.ticket_transfers (order_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_seller ON public.ticket_transfers (seller_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_buyer ON public.ticket_transfers (buyer_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_status ON public.ticket_transfers (status);

-- ============================================================================
-- TICKET DISPUTES TABLE
-- Handles disputes between buyers and sellers
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.ticket_orders(id) ON DELETE CASCADE,
  
  -- Parties
  opened_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opened_by_email TEXT NOT NULL,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_email TEXT NOT NULL,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_email TEXT NOT NULL,
  
  -- Dispute details
  reason TEXT NOT NULL, -- 'ticket_not_received', 'ticket_invalid', 'wrong_ticket', 'event_cancelled', 'seller_unresponsive', 'other'
  description TEXT NOT NULL,
  
  -- Evidence from both sides
  buyer_evidence TEXT[] DEFAULT '{}',
  buyer_statement TEXT,
  buyer_submitted_at TIMESTAMPTZ,
  
  seller_evidence TEXT[] DEFAULT '{}',
  seller_statement TEXT,
  seller_submitted_at TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'open',
  -- open: Newly opened
  -- under_review: Admin reviewing
  -- awaiting_seller: Waiting for seller response
  -- awaiting_buyer: Waiting for buyer response
  -- escalated: Escalated to senior review
  -- resolved_buyer_favor: Buyer refunded
  -- resolved_seller_favor: Seller paid
  -- resolved_partial: Partial refund
  -- closed: Dispute closed
  
  -- Resolution
  resolution TEXT,
  resolution_notes TEXT,
  resolved_by TEXT, -- Admin email
  resolved_at TIMESTAMPTZ,
  
  -- Financial resolution
  refund_amount_gbp NUMERIC DEFAULT 0,
  seller_payout_gbp NUMERIC DEFAULT 0,
  platform_absorbs BOOLEAN DEFAULT false, -- Platform covers the loss
  
  -- Penalties
  seller_strike_issued BOOLEAN DEFAULT false,
  buyer_strike_issued BOOLEAN DEFAULT false,
  
  -- Timeline
  response_deadline TIMESTAMPTZ, -- 48 hours to respond
  escalation_deadline TIMESTAMPTZ, -- Auto-escalate if no resolution
  
  -- Communication log
  admin_notes TEXT[] DEFAULT '{}',
  message_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_disputes_order ON public.ticket_disputes (order_id);
CREATE INDEX IF NOT EXISTS idx_ticket_disputes_buyer ON public.ticket_disputes (buyer_id);
CREATE INDEX IF NOT EXISTS idx_ticket_disputes_seller ON public.ticket_disputes (seller_id);
CREATE INDEX IF NOT EXISTS idx_ticket_disputes_status ON public.ticket_disputes (status);

-- ============================================================================
-- SELLER TICKET VERIFICATION TABLE
-- Tracks seller verification status for ticket reselling
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.seller_ticket_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  user_email TEXT NOT NULL,
  
  -- Verification status
  status TEXT NOT NULL DEFAULT 'unverified', 
  -- unverified, pending, verified, suspended, banned
  
  -- ID verification (via Stripe Connect or manual)
  id_verified BOOLEAN DEFAULT false,
  id_verification_method TEXT, -- 'stripe_identity', 'manual', 'document_upload'
  id_verified_at TIMESTAMPTZ,
  
  -- Phone verification
  phone_verified BOOLEAN DEFAULT false,
  phone_number TEXT,
  phone_verified_at TIMESTAMPTZ,
  
  -- Social verification
  social_verified BOOLEAN DEFAULT false,
  social_links JSONB DEFAULT '{}'::jsonb, -- Instagram, Twitter, etc.
  
  -- Payment verification (Stripe Connect)
  stripe_connect_id TEXT,
  stripe_connect_verified BOOLEAN DEFAULT false,
  stripe_connect_status TEXT,
  
  -- Trust score
  trust_score NUMERIC DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
  
  -- Track record
  total_sales INTEGER DEFAULT 0,
  successful_sales INTEGER DEFAULT 0,
  disputed_sales INTEGER DEFAULT 0,
  cancelled_sales INTEGER DEFAULT 0,
  
  average_rating NUMERIC DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  
  -- Response metrics
  avg_response_time_hours NUMERIC DEFAULT 0,
  avg_transfer_time_hours NUMERIC DEFAULT 0,
  
  -- Violations
  strike_count INTEGER DEFAULT 0,
  last_strike_at TIMESTAMPTZ,
  strike_reasons TEXT[] DEFAULT '{}',
  
  -- Limits (based on verification level and trust)
  max_active_listings INTEGER DEFAULT 3,
  max_ticket_value_gbp NUMERIC DEFAULT 200,
  
  -- Badges
  badges TEXT[] DEFAULT '{}', -- 'verified_seller', 'trusted_seller', 'power_seller', 'new_seller'
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_ticket_verification_user ON public.seller_ticket_verification (user_id);
CREATE INDEX IF NOT EXISTS idx_seller_ticket_verification_status ON public.seller_ticket_verification (status);
CREATE INDEX IF NOT EXISTS idx_seller_ticket_verification_trust ON public.seller_ticket_verification (trust_score DESC);

-- ============================================================================
-- TICKET WATCHLIST TABLE
-- Users can watch listings and get notified of price drops
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.ticket_listings(id) ON DELETE CASCADE,
  
  -- Alert preferences
  alert_on_price_drop BOOLEAN DEFAULT true,
  price_threshold_gbp NUMERIC, -- Alert when price drops to this
  alert_on_similar BOOLEAN DEFAULT false, -- Alert for similar listings
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_watchlist_user ON public.ticket_watchlist (user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_watchlist_listing ON public.ticket_watchlist (listing_id);

-- ============================================================================
-- TICKET MESSAGES TABLE
-- Secure messaging between buyer and seller for a transaction
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.ticket_orders(id) ON DELETE CASCADE,
  
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  
  message TEXT NOT NULL,
  
  -- Attachments
  attachments TEXT[] DEFAULT '{}',
  
  -- Read status
  read_at TIMESTAMPTZ,
  
  -- System message flag
  is_system_message BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_order ON public.ticket_messages (order_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender ON public.ticket_messages (sender_id);

-- ============================================================================
-- TICKET SELLER REVIEWS TABLE
-- Reviews specifically for ticket reseller transactions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_seller_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.ticket_orders(id) ON DELETE CASCADE UNIQUE,
  
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Ratings (1-5)
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  speed_rating INTEGER CHECK (speed_rating >= 1 AND speed_rating <= 5),
  accuracy_rating INTEGER CHECK (accuracy_rating >= 1 AND accuracy_rating <= 5),
  
  -- Review text
  review_text TEXT,
  
  -- Seller response
  seller_response TEXT,
  seller_responded_at TIMESTAMPTZ,
  
  -- Visibility
  is_visible BOOLEAN DEFAULT true,
  flagged BOOLEAN DEFAULT false,
  flagged_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_seller_reviews_seller ON public.ticket_seller_reviews (seller_id);
CREATE INDEX IF NOT EXISTS idx_ticket_seller_reviews_buyer ON public.ticket_seller_reviews (buyer_id);
CREATE INDEX IF NOT EXISTS idx_ticket_seller_reviews_rating ON public.ticket_seller_reviews (overall_rating);

-- ============================================================================
-- TICKET FRAUD LOGS TABLE
-- Tracks suspicious activity and fraud detection
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_fraud_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entity reference
  entity_type TEXT NOT NULL, -- 'listing', 'order', 'user', 'transfer'
  entity_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Detection
  fraud_type TEXT NOT NULL, -- 'duplicate_listing', 'price_gouging', 'fake_proof', 'stolen_ticket', 'account_farming', 'velocity_abuse'
  severity TEXT NOT NULL DEFAULT 'low', -- low, medium, high, critical
  confidence_score NUMERIC DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  
  -- Details
  description TEXT NOT NULL,
  evidence JSONB DEFAULT '{}'::jsonb,
  
  -- Action taken
  action_taken TEXT, -- 'flagged', 'blocked', 'suspended', 'banned', 'none'
  actioned_by TEXT,
  actioned_at TIMESTAMPTZ,
  
  -- Resolution
  is_resolved BOOLEAN DEFAULT false,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_fraud_logs_entity ON public.ticket_fraud_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ticket_fraud_logs_user ON public.ticket_fraud_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_fraud_logs_type ON public.ticket_fraud_logs (fraud_type);
CREATE INDEX IF NOT EXISTS idx_ticket_fraud_logs_severity ON public.ticket_fraud_logs (severity);

-- ============================================================================
-- TICKET PRICE HISTORY TABLE
-- Tracks price changes and market data
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.ticket_listings(id) ON DELETE CASCADE,
  
  old_price_gbp NUMERIC,
  new_price_gbp NUMERIC NOT NULL,
  
  change_reason TEXT, -- 'initial', 'seller_update', 'auto_reduce', 'promotion'
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_price_history_listing ON public.ticket_price_history (listing_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to calculate seller trust score
CREATE OR REPLACE FUNCTION calculate_seller_trust_score(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_score NUMERIC := 50;
  v_verified RECORD;
  v_stats RECORD;
BEGIN
  -- Get verification record
  SELECT * INTO v_verified
  FROM public.seller_ticket_verification
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 50;
  END IF;
  
  -- Base score adjustments
  IF v_verified.id_verified THEN
    v_score := v_score + 15;
  END IF;
  
  IF v_verified.phone_verified THEN
    v_score := v_score + 10;
  END IF;
  
  IF v_verified.stripe_connect_verified THEN
    v_score := v_score + 15;
  END IF;
  
  IF v_verified.social_verified THEN
    v_score := v_score + 5;
  END IF;
  
  -- Adjust based on track record
  IF v_verified.total_sales > 0 THEN
    -- Success rate bonus/penalty
    v_score := v_score + (
      ((v_verified.successful_sales::NUMERIC / NULLIF(v_verified.total_sales, 0)) - 0.8) * 20
    );
    
    -- Dispute penalty
    IF v_verified.disputed_sales > 0 THEN
      v_score := v_score - (v_verified.disputed_sales * 5);
    END IF;
  END IF;
  
  -- Rating adjustment
  IF v_verified.average_rating > 0 THEN
    v_score := v_score + ((v_verified.average_rating - 3) * 5);
  END IF;
  
  -- Strike penalty
  v_score := v_score - (v_verified.strike_count * 10);
  
  -- Clamp to 0-100
  v_score := GREATEST(0, LEAST(100, v_score));
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update seller stats after an order
CREATE OR REPLACE FUNCTION update_ticket_seller_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update seller verification stats
  UPDATE public.seller_ticket_verification
  SET
    total_sales = total_sales + 1,
    successful_sales = CASE 
      WHEN NEW.status = 'completed' THEN successful_sales + 1 
      ELSE successful_sales 
    END,
    disputed_sales = CASE 
      WHEN NEW.status = 'disputed' THEN disputed_sales + 1 
      ELSE disputed_sales 
    END,
    cancelled_sales = CASE 
      WHEN NEW.status = 'cancelled' THEN cancelled_sales + 1 
      ELSE cancelled_sales 
    END,
    updated_at = now()
  WHERE user_id = NEW.seller_id;
  
  -- Recalculate trust score
  UPDATE public.seller_ticket_verification
  SET trust_score = calculate_seller_trust_score(NEW.seller_id)
  WHERE user_id = NEW.seller_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_ticket_seller_stats
AFTER UPDATE ON public.ticket_orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('completed', 'disputed', 'cancelled'))
EXECUTE FUNCTION update_ticket_seller_stats();

-- Function to update seller rating after review
CREATE OR REPLACE FUNCTION update_ticket_seller_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.seller_ticket_verification
  SET
    average_rating = (
      SELECT AVG(overall_rating)
      FROM public.ticket_seller_reviews
      WHERE seller_id = NEW.seller_id AND is_visible = true
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM public.ticket_seller_reviews
      WHERE seller_id = NEW.seller_id AND is_visible = true
    ),
    updated_at = now()
  WHERE user_id = NEW.seller_id;
  
  -- Recalculate trust score
  UPDATE public.seller_ticket_verification
  SET trust_score = calculate_seller_trust_score(NEW.seller_id)
  WHERE user_id = NEW.seller_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_ticket_seller_rating
AFTER INSERT OR UPDATE ON public.ticket_seller_reviews
FOR EACH ROW EXECUTE FUNCTION update_ticket_seller_rating();

-- Function to auto-expire listings before event
CREATE OR REPLACE FUNCTION auto_expire_ticket_listings()
RETURNS void AS $$
BEGIN
  UPDATE public.ticket_listings
  SET status = 'expired', updated_at = now()
  WHERE status IN ('active', 'pending_verification')
    AND event_date < now() + INTERVAL '2 hours';
END;
$$ LANGUAGE plpgsql;

-- Function to log price changes
CREATE OR REPLACE FUNCTION log_ticket_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.asking_price_gbp IS DISTINCT FROM NEW.asking_price_gbp THEN
    INSERT INTO public.ticket_price_history (listing_id, old_price_gbp, new_price_gbp, change_reason)
    VALUES (NEW.id, OLD.asking_price_gbp, NEW.asking_price_gbp, 'seller_update');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_ticket_price_change
AFTER UPDATE ON public.ticket_listings
FOR EACH ROW EXECUTE FUNCTION log_ticket_price_change();

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Ticket Listings RLS
ALTER TABLE public.ticket_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ticket_listings_select ON public.ticket_listings;
CREATE POLICY ticket_listings_select
ON public.ticket_listings
FOR SELECT
TO anon, authenticated
USING (
  status = 'active' 
  OR seller_id = auth.uid()
  OR (auth.jwt() ->> 'email') IN ('admin@hotmess.london', 'scanme@hotmess.london')
);

DROP POLICY IF EXISTS ticket_listings_insert ON public.ticket_listings;
CREATE POLICY ticket_listings_insert
ON public.ticket_listings
FOR INSERT
TO authenticated
WITH CHECK (seller_id = auth.uid());

DROP POLICY IF EXISTS ticket_listings_update ON public.ticket_listings;
CREATE POLICY ticket_listings_update
ON public.ticket_listings
FOR UPDATE
TO authenticated
USING (
  seller_id = auth.uid()
  OR (auth.jwt() ->> 'email') IN ('admin@hotmess.london', 'scanme@hotmess.london')
)
WITH CHECK (
  seller_id = auth.uid()
  OR (auth.jwt() ->> 'email') IN ('admin@hotmess.london', 'scanme@hotmess.london')
);

DROP POLICY IF EXISTS ticket_listings_delete ON public.ticket_listings;
CREATE POLICY ticket_listings_delete
ON public.ticket_listings
FOR DELETE
TO authenticated
USING (seller_id = auth.uid() AND status NOT IN ('sold', 'reserved'));

-- Ticket Orders RLS
ALTER TABLE public.ticket_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ticket_orders_select ON public.ticket_orders;
CREATE POLICY ticket_orders_select
ON public.ticket_orders
FOR SELECT
TO authenticated
USING (
  buyer_id = auth.uid()
  OR seller_id = auth.uid()
  OR (auth.jwt() ->> 'email') IN ('admin@hotmess.london', 'scanme@hotmess.london')
);

DROP POLICY IF EXISTS ticket_orders_insert ON public.ticket_orders;
CREATE POLICY ticket_orders_insert
ON public.ticket_orders
FOR INSERT
TO authenticated
WITH CHECK (buyer_id = auth.uid());

DROP POLICY IF EXISTS ticket_orders_update ON public.ticket_orders;
CREATE POLICY ticket_orders_update
ON public.ticket_orders
FOR UPDATE
TO authenticated
USING (
  buyer_id = auth.uid()
  OR seller_id = auth.uid()
  OR (auth.jwt() ->> 'email') IN ('admin@hotmess.london', 'scanme@hotmess.london')
);

-- Ticket Escrow RLS (service role only for writes)
ALTER TABLE public.ticket_escrow ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ticket_escrow_select ON public.ticket_escrow;
CREATE POLICY ticket_escrow_select
ON public.ticket_escrow
FOR SELECT
TO authenticated
USING (
  order_id IN (
    SELECT id FROM public.ticket_orders 
    WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
  )
  OR (auth.jwt() ->> 'email') IN ('admin@hotmess.london', 'scanme@hotmess.london')
);

-- Ticket Transfers RLS
ALTER TABLE public.ticket_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ticket_transfers_select ON public.ticket_transfers;
CREATE POLICY ticket_transfers_select
ON public.ticket_transfers
FOR SELECT
TO authenticated
USING (
  buyer_id = auth.uid()
  OR seller_id = auth.uid()
  OR (auth.jwt() ->> 'email') IN ('admin@hotmess.london', 'scanme@hotmess.london')
);

DROP POLICY IF EXISTS ticket_transfers_update ON public.ticket_transfers;
CREATE POLICY ticket_transfers_update
ON public.ticket_transfers
FOR UPDATE
TO authenticated
USING (
  buyer_id = auth.uid()
  OR seller_id = auth.uid()
);

-- Ticket Disputes RLS
ALTER TABLE public.ticket_disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ticket_disputes_select ON public.ticket_disputes;
CREATE POLICY ticket_disputes_select
ON public.ticket_disputes
FOR SELECT
TO authenticated
USING (
  buyer_id = auth.uid()
  OR seller_id = auth.uid()
  OR (auth.jwt() ->> 'email') IN ('admin@hotmess.london', 'scanme@hotmess.london')
);

DROP POLICY IF EXISTS ticket_disputes_insert ON public.ticket_disputes;
CREATE POLICY ticket_disputes_insert
ON public.ticket_disputes
FOR INSERT
TO authenticated
WITH CHECK (opened_by = auth.uid());

DROP POLICY IF EXISTS ticket_disputes_update ON public.ticket_disputes;
CREATE POLICY ticket_disputes_update
ON public.ticket_disputes
FOR UPDATE
TO authenticated
USING (
  buyer_id = auth.uid()
  OR seller_id = auth.uid()
  OR (auth.jwt() ->> 'email') IN ('admin@hotmess.london', 'scanme@hotmess.london')
);

-- Seller Ticket Verification RLS
ALTER TABLE public.seller_ticket_verification ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seller_ticket_verification_select ON public.seller_ticket_verification;
CREATE POLICY seller_ticket_verification_select
ON public.seller_ticket_verification
FOR SELECT
TO authenticated
USING (true); -- Public read for trust info

DROP POLICY IF EXISTS seller_ticket_verification_insert ON public.seller_ticket_verification;
CREATE POLICY seller_ticket_verification_insert
ON public.seller_ticket_verification
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS seller_ticket_verification_update ON public.seller_ticket_verification;
CREATE POLICY seller_ticket_verification_update
ON public.seller_ticket_verification
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR (auth.jwt() ->> 'email') IN ('admin@hotmess.london', 'scanme@hotmess.london')
);

-- Ticket Watchlist RLS
ALTER TABLE public.ticket_watchlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ticket_watchlist_all ON public.ticket_watchlist;
CREATE POLICY ticket_watchlist_all
ON public.ticket_watchlist
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Ticket Messages RLS
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ticket_messages_select ON public.ticket_messages;
CREATE POLICY ticket_messages_select
ON public.ticket_messages
FOR SELECT
TO authenticated
USING (
  order_id IN (
    SELECT id FROM public.ticket_orders 
    WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
  )
);

DROP POLICY IF EXISTS ticket_messages_insert ON public.ticket_messages;
CREATE POLICY ticket_messages_insert
ON public.ticket_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND order_id IN (
    SELECT id FROM public.ticket_orders 
    WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
  )
);

-- Ticket Seller Reviews RLS
ALTER TABLE public.ticket_seller_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ticket_seller_reviews_select ON public.ticket_seller_reviews;
CREATE POLICY ticket_seller_reviews_select
ON public.ticket_seller_reviews
FOR SELECT
TO anon, authenticated
USING (is_visible = true);

DROP POLICY IF EXISTS ticket_seller_reviews_insert ON public.ticket_seller_reviews;
CREATE POLICY ticket_seller_reviews_insert
ON public.ticket_seller_reviews
FOR INSERT
TO authenticated
WITH CHECK (buyer_id = auth.uid());

DROP POLICY IF EXISTS ticket_seller_reviews_update ON public.ticket_seller_reviews;
CREATE POLICY ticket_seller_reviews_update
ON public.ticket_seller_reviews
FOR UPDATE
TO authenticated
USING (
  buyer_id = auth.uid()
  OR seller_id = auth.uid()
);

-- Ticket Fraud Logs (admin only)
ALTER TABLE public.ticket_fraud_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ticket_fraud_logs_admin ON public.ticket_fraud_logs;
CREATE POLICY ticket_fraud_logs_admin
ON public.ticket_fraud_logs
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'email') IN ('admin@hotmess.london', 'scanme@hotmess.london'));

-- Ticket Price History (public read)
ALTER TABLE public.ticket_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ticket_price_history_select ON public.ticket_price_history;
CREATE POLICY ticket_price_history_select
ON public.ticket_price_history
FOR SELECT
TO anon, authenticated
USING (true);

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON public.ticket_listings TO service_role;
GRANT ALL ON public.ticket_orders TO service_role;
GRANT ALL ON public.ticket_escrow TO service_role;
GRANT ALL ON public.ticket_transfers TO service_role;
GRANT ALL ON public.ticket_disputes TO service_role;
GRANT ALL ON public.seller_ticket_verification TO service_role;
GRANT ALL ON public.ticket_watchlist TO service_role;
GRANT ALL ON public.ticket_messages TO service_role;
GRANT ALL ON public.ticket_seller_reviews TO service_role;
GRANT ALL ON public.ticket_fraud_logs TO service_role;
GRANT ALL ON public.ticket_price_history TO service_role;
