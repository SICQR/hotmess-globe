-- HOTMESS member credit ledger (resale proceeds → credit, redeemed at checkout).
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_pence integer NOT NULL,
  reason       text NOT NULL CHECK (reason IN ('resale_proceeds','ticket_redemption','refund','adjustment')),
  ref_type     text,
  ref_id       uuid,
  metadata     jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS credit_ledger_user_idx ON public.credit_ledger (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS credit_ledger_unique_ref
  ON public.credit_ledger (reason, ref_type, ref_id) WHERE ref_id IS NOT NULL;
CREATE OR REPLACE VIEW public.credit_balances AS
  SELECT user_id, COALESCE(SUM(amount_pence),0)::int AS balance_pence
  FROM public.credit_ledger GROUP BY user_id;
ALTER VIEW public.credit_balances SET (security_invoker = true);
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own credit ledger" ON public.credit_ledger;
CREATE POLICY "Users read own credit ledger" ON public.credit_ledger FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service manages credit ledger" ON public.credit_ledger;
CREATE POLICY "Service manages credit ledger" ON public.credit_ledger FOR ALL USING (auth.role() = 'service_role');
