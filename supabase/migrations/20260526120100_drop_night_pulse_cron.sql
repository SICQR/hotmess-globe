-- =====================================================================
-- DROP orphan cron `refresh_night_pulse_every_5m` + companion function
-- =====================================================================
-- Owner: fix-agent-B (task #130)
-- Applied live: 2026-05-26 10:02 UTC (schema_migrations version 20260526100246)
-- Committed to repo (audit parity): 2026-05-26 12:01 UTC
--
-- Why:
--   The matview `night_pulse_realtime` was intentionally replaced with a
--   regular VIEW on 2026-05-08 (migration 20260508124922, then refined
--   2026-05-09 with lat/lng aliases). A regular VIEW has no REFRESH
--   semantics, so `REFRESH MATERIALIZED VIEW night_pulse_realtime` failed
--   288 times per day (every 5min). The cron and the only-caller function
--   `public.refresh_night_pulse()` are orphans.
--
--   Fix path: drop the orphan cron + orphan function. Frontend continues
--   to read the live VIEW directly with zero cron involvement.
--
-- Idempotent — only acts if the cron / function exists.
-- =====================================================================

-- 1. Unschedule the orphan cron by name. DO block so re-runs after the
--    job is already gone don't raise.
do $$
declare
  jid bigint;
begin
  select jobid into jid
  from cron.job
  where jobname = 'refresh_night_pulse_every_5m';

  if jid is not null then
    perform cron.unschedule(jid);
    raise notice 'Unscheduled cron jobid=% (refresh_night_pulse_every_5m)', jid;
  else
    raise notice 'Cron refresh_night_pulse_every_5m already absent — no-op';
  end if;
exception when others then
  raise notice 'cron.unschedule failed silently: %', sqlerrm;
end$$;

-- 2. Drop the orphan function. Nothing else in the schema calls it
--    (verified via pg_get_functiondef scan on 2026-05-26).
drop function if exists public.refresh_night_pulse();
