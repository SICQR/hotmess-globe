-- Daily Check-in and XP Balance Tables
-- Supports the gamification system for user retention

-- ============================================================================
-- XP Balances Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.xp_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INT NOT NULL DEFAULT 0,
  lifetime_earned INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_xp_balances_user_id ON public.xp_balances(user_id);

-- Enable RLS
ALTER TABLE public.xp_balances ENABLE ROW LEVEL SECURITY;

-- Users can read their own XP balance
CREATE POLICY xp_balances_select ON public.xp_balances
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own XP balance (for initialization)
CREATE POLICY xp_balances_insert ON public.xp_balances
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own XP balance
CREATE POLICY xp_balances_update ON public.xp_balances
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- User Check-ins Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_checkin TIMESTAMPTZ,
  total_checkins INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_checkins_user_id ON public.user_checkins(user_id);

-- Enable RLS
ALTER TABLE public.user_checkins ENABLE ROW LEVEL SECURITY;

-- Users can read their own check-in data
CREATE POLICY user_checkins_select ON public.user_checkins
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own check-in data
CREATE POLICY user_checkins_insert ON public.user_checkins
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own check-in data
CREATE POLICY user_checkins_update ON public.user_checkins
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- XP Transactions Log
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  balance_after INT NOT NULL,
  source TEXT NOT NULL, -- 'daily_checkin', 'challenge', 'event', 'purchase', etc.
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON public.xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_source ON public.xp_transactions(source);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON public.xp_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own transactions
CREATE POLICY xp_transactions_select ON public.xp_transactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- System can insert transactions (via function)
CREATE POLICY xp_transactions_insert ON public.xp_transactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- Add XP Function (Atomic XP addition with transaction logging)
-- ============================================================================
CREATE OR REPLACE FUNCTION add_xp(
  p_user_id UUID,
  p_amount INT,
  p_source TEXT,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS TABLE(new_balance INT, transaction_id UUID) AS $$
DECLARE
  v_new_balance INT;
  v_transaction_id UUID;
BEGIN
  -- Upsert the XP balance
  INSERT INTO public.xp_balances (user_id, balance, lifetime_earned, updated_at)
  VALUES (p_user_id, p_amount, p_amount, now())
  ON CONFLICT (user_id) DO UPDATE SET
    balance = xp_balances.balance + p_amount,
    lifetime_earned = xp_balances.lifetime_earned + GREATEST(p_amount, 0),
    updated_at = now()
  RETURNING balance INTO v_new_balance;

  -- Log the transaction
  INSERT INTO public.xp_transactions (user_id, amount, balance_after, source, description, metadata)
  VALUES (p_user_id, p_amount, v_new_balance, p_source, p_description, p_metadata)
  RETURNING id INTO v_transaction_id;

  -- Also update the User table for backwards compatibility
  UPDATE public."User"
  SET xp = COALESCE(xp, 0) + p_amount
  WHERE auth_user_id = p_user_id;

  RETURN QUERY SELECT v_new_balance, v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (with full signature)
GRANT EXECUTE ON FUNCTION add_xp(UUID, INT, TEXT, TEXT, JSONB) TO authenticated;

-- ============================================================================
-- Sync existing XP data (backfill from User table)
-- Only for users that exist in auth.users to avoid FK violations
-- ============================================================================
INSERT INTO public.xp_balances (user_id, balance, lifetime_earned)
SELECT 
  u.auth_user_id,
  COALESCE(u.xp, 0),
  COALESCE(u.xp, 0)
FROM public."User" u
INNER JOIN auth.users a ON a.id = u.auth_user_id
WHERE u.auth_user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- Sync existing streak data (backfill from user_streaks if exists)
-- Note: Skipping automatic backfill - column names may vary
-- ============================================================================
-- Backfill can be run manually if needed

-- ============================================================================
-- Add longest_streak column if it doesn't exist (may be named max_streak in some schemas)
-- ============================================================================
ALTER TABLE IF EXISTS public.user_checkins
  ADD COLUMN IF NOT EXISTS longest_streak INT NOT NULL DEFAULT 0;

-- ============================================================================
-- Trigger to update longest_streak
-- ============================================================================
CREATE OR REPLACE FUNCTION update_longest_streak()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.streak > COALESCE(OLD.longest_streak, 0) THEN
    NEW.longest_streak := NEW.streak;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_longest_streak ON public.user_checkins;
CREATE TRIGGER trigger_update_longest_streak
  BEFORE UPDATE ON public.user_checkins
  FOR EACH ROW
  EXECUTE FUNCTION update_longest_streak();

COMMENT ON TABLE public.xp_balances IS 'User XP balances for gamification';
COMMENT ON TABLE public.user_checkins IS 'Daily check-in streak tracking';
COMMENT ON TABLE public.xp_transactions IS 'XP transaction history for auditing';
COMMENT ON FUNCTION add_xp(UUID, INT, TEXT, TEXT, JSONB) IS 'Atomically add XP to a user with transaction logging';
