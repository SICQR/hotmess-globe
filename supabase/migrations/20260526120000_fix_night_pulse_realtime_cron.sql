-- =====================================================================
-- Repo parity: drop orphan cron `refresh_night_pulse_every_5m` (jobid=5)
-- =====================================================================
-- This change was applied LIVE to Supabase rfoftonnlwudilafhfkl on
-- 2026-05-26 by fix-agent-B via mcp__supabase__apply_migration
-- (live name: `fix_night_pulse_realtime_cron_2026_05_26`,
-- version 20260526100246). This file commits the same SQL to the repo
-- so future environment rebuilds and audit history stay in sync with
-- production. NO-OP on environments where the change is already applied.
--
-- Root cause:
--   The matview `night_pulse_realtime` was intentionally replaced with a
--   regular VIEW on 2026-05-08 (migrations 20260508124922
--   fix_night_pulse_realtime_globe_compat + 20260509052137
--   night_pulse_realtime_add_latitude_longitude_aliases). A regular VIEW
--   has no REFRESH semantics, so `REFRESH MATERIALIZED VIEW
--   night_pulse_realtime` inside `public.refresh_night_pulse()` fails
--   every 5 minutes (288/288 failures in 24h with error
--   `"night_pulse_realtime" is not a table or materialized view`).
--   Both the cron job and the function are orphans — the live VIEW
--   already serves the frontend with zero cron involvement.
--
-- Fix: drop the orphan cron + the orphan function. Surgical, idempotent.
-- No other crons, matviews, or RLS touched.
-- =====================================================================

-- 1. Unschedule the orphan cron by name (idempotent via DO block).
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
end$$;

-- 2. Drop the orphan function. Verified 2026-05-26 via pg_get_functiondef
--    that nothing else in the schema references refresh_night_pulse().
drop function if exists public.refresh_night_pulse();
