-- user_presence: enable RLS (was missing — P0 privacy fix)
-- Prevents cross-user reads of exact GPS coordinates via anon/auth key

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_presence_owner_select"
  ON public.user_presence FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_presence_owner_insert"
  ON public.user_presence FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_presence_owner_update"
  ON public.user_presence FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
