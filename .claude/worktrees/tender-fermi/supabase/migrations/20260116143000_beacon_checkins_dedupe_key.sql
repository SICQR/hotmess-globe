-- Add DB-level dedupe key to prevent double check-ins under concurrent requests.
-- We keep the app-level rolling 12h check, and this unique key prevents race-condition duplicates.

alter table public.beacon_checkins
  add column if not exists dedupe_key text;

-- Backfill existing rows with a stable unique value.
update public.beacon_checkins
set dedupe_key = 'legacy:' || id::text
where dedupe_key is null;

alter table public.beacon_checkins
  alter column dedupe_key set not null;

create unique index if not exists uniq_beacon_checkins_dedupe_key
  on public.beacon_checkins (dedupe_key);
