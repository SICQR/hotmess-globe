-- Taps / Woofs interaction table
CREATE TABLE IF NOT EXISTS public.taps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tapper_email text NOT NULL,
  tapped_email text NOT NULL,
  tap_type text NOT NULL DEFAULT 'tap', -- 'tap' | 'woof'
  created_at timestamptz DEFAULT now(),
  UNIQUE (tapper_email, tapped_email, tap_type)
);

ALTER TABLE public.taps ENABLE ROW LEVEL SECURITY;

-- Users can read taps they sent or received
CREATE POLICY taps_read ON public.taps FOR SELECT TO authenticated
  USING ((auth.jwt()->>'email') = tapper_email OR (auth.jwt()->>'email') = tapped_email);

-- Users can only insert their own taps
CREATE POLICY taps_insert ON public.taps FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt()->>'email') = tapper_email);

-- Users can delete their own taps
CREATE POLICY taps_delete ON public.taps FOR DELETE TO authenticated
  USING ((auth.jwt()->>'email') = tapper_email);
