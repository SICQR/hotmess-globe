-- Add GBP payout fields to seller_payouts
-- Enables real-money payout requests from the UI

ALTER TABLE public.seller_payouts
  ADD COLUMN IF NOT EXISTS amount_gbp numeric,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS requested_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS method text DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS notes text;

-- Fix status default to 'requested' (was 'pending')
-- Existing rows keep 'pending'; new payout requests use 'requested'
