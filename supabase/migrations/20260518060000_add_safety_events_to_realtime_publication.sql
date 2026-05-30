-- safety_events must be in supabase_realtime publication for the SOS ring
-- hook to receive postgres_changes events. RLS still applies per-user.
--
-- Applied LIVE to rfoftonnlwudilafhfkl on 2026-05-17 by cofounder Supabase
-- MCP audit. Mirrored here for dev parity / future fresh-database bootstraps.
ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_events;
