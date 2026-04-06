-- T-06: Add UUID columns to taps table (email FK -> UUID FK migration)
-- Email columns kept for backwards compatibility during transition period

ALTER TABLE public.taps ADD COLUMN IF NOT EXISTS from_user_id UUID;
ALTER TABLE public.taps ADD COLUMN IF NOT EXISTS to_user_id UUID;

-- Backfill existing rows from profiles
UPDATE public.taps t
SET from_user_id = p.id
FROM public.profiles p
WHERE p.email = t.tapper_email AND t.from_user_id IS NULL;

UPDATE public.taps t
SET to_user_id = p.id
FROM public.profiles p
WHERE p.email = t.tapped_email AND t.to_user_id IS NULL;

-- Indexes for UUID-based queries
CREATE INDEX IF NOT EXISTS idx_taps_from_user_id ON public.taps (from_user_id);
CREATE INDEX IF NOT EXISTS idx_taps_to_user_id ON public.taps (to_user_id);
CREATE INDEX IF NOT EXISTS idx_taps_from_to_type ON public.taps (from_user_id, to_user_id, tap_type);

-- RLS: accept both email and UUID during transition
DROP POLICY IF EXISTS "taps_insert_own" ON public.taps;
CREATE POLICY "taps_insert_own" ON public.taps FOR INSERT TO authenticated
  WITH CHECK (
    tapper_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR from_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "taps_select_own" ON public.taps;
CREATE POLICY "taps_select_own" ON public.taps FOR SELECT TO authenticated
  USING (
    tapper_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR tapped_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR from_user_id = auth.uid()
    OR to_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "taps_delete_own" ON public.taps;
CREATE POLICY "taps_delete_own" ON public.taps FOR DELETE TO authenticated
  USING (
    tapper_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR from_user_id = auth.uid()
  );
