-- Enable Supabase Realtime on public."User" updates (best-effort).
-- This supports live-ish Connect/Social nearby invalidation without aggressive polling.

DO $$
BEGIN
  -- Supabase uses the supabase_realtime publication for postgres_changes.
  -- This may already include the table; ignore errors if so.
  ALTER PUBLICATION supabase_realtime ADD TABLE public."User";
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
  WHEN undefined_object THEN
    -- Publication not present in some environments.
    NULL;
  WHEN insufficient_privilege THEN
    NULL;
  WHEN others THEN
    NULL;
END $$;
