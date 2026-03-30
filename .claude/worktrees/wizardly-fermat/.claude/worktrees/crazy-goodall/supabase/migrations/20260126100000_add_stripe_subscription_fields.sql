-- Add Stripe subscription fields to User table
-- These fields track subscription status and Stripe integration

-- Add Stripe customer ID
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add Stripe subscription ID
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Add subscription status
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';

-- Add subscription end date (for cancellations)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;

-- Create indexes for lookups
CREATE INDEX IF NOT EXISTS idx_user_stripe_customer_id ON "User"(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_stripe_subscription_id ON "User"(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_subscription_status ON "User"(subscription_status);

-- Add constraint for valid subscription statuses
-- Note: This is done as a separate statement to handle existing data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_subscription_status'
  ) THEN
    -- Update any invalid statuses first
    UPDATE "User" SET subscription_status = 'none' 
    WHERE subscription_status IS NULL OR subscription_status NOT IN ('none', 'active', 'canceling', 'canceled', 'past_due', 'trialing');
    
    -- Now add the constraint
    ALTER TABLE "User" ADD CONSTRAINT valid_subscription_status 
      CHECK (subscription_status IN ('none', 'active', 'canceling', 'canceled', 'past_due', 'trialing'));
  END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN "User".stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN "User".stripe_subscription_id IS 'Active Stripe subscription ID';
COMMENT ON COLUMN "User".subscription_status IS 'Current subscription status: none, active, canceling, canceled, past_due, trialing';
COMMENT ON COLUMN "User".subscription_ends_at IS 'When subscription will end (for canceled subscriptions)';
