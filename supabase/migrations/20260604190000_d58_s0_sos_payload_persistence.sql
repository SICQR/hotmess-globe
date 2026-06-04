-- D58 S0 — SOS payload persistence (Amendments 6 + 9)
--
-- Every SOS dispatch must persist:
--   - rendered_body     : exact text that left the system
--   - destination       : channel-specific identifier (chat_id / phone / email)
--   - channel           : telegram | sms | ops_alert | email | whatsapp | voice
--   - template_version  : composer version (e.g. D58-S0-v1)
--   - event_code        : HM-SOS-YYYYMMDD-XXXX human-shareable ID
--
-- Two tables receive the columns because two dispatcher paths exist:
--   1. safety_delivery_log — written by api/notifications/dispatcher.js
--   2. safety_alerts       — written by supabase/functions/panic-alert/index.ts
--
-- Both paths must persist the same shape so support can correlate incidents
-- regardless of which dispatcher fired.

BEGIN;

-- ============================================================================
-- safety_delivery_log
-- ============================================================================

ALTER TABLE public.safety_delivery_log
  ADD COLUMN IF NOT EXISTS rendered_body    text,
  ADD COLUMN IF NOT EXISTS destination      text,
  ADD COLUMN IF NOT EXISTS template_version text,
  ADD COLUMN IF NOT EXISTS event_code       text;

-- channel column already exists on this table (per dispatcher.js insert shape).
-- If it doesn't, add it — defensive.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'safety_delivery_log'
      AND column_name = 'channel'
  ) THEN
    ALTER TABLE public.safety_delivery_log ADD COLUMN channel text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_safety_delivery_log_event_code
  ON public.safety_delivery_log (event_code);

CREATE INDEX IF NOT EXISTS idx_safety_delivery_log_safety_event_id_channel
  ON public.safety_delivery_log (safety_event_id, channel);

-- ============================================================================
-- safety_alerts (panic-alert edge function path)
-- ============================================================================

ALTER TABLE public.safety_alerts
  ADD COLUMN IF NOT EXISTS rendered_body    text,
  ADD COLUMN IF NOT EXISTS destination      text,
  ADD COLUMN IF NOT EXISTS template_version text,
  ADD COLUMN IF NOT EXISTS event_code       text;

CREATE INDEX IF NOT EXISTS idx_safety_alerts_event_code
  ON public.safety_alerts (event_code);

-- ============================================================================
-- Backfill — best effort. Existing rows get a derived event_code from their
-- linked safety_event uuid + created_at so the column is non-null going forward.
-- rendered_body / destination / template_version stay NULL for historical rows
-- (we cannot reconstruct what was sent before D58 S0).
-- ============================================================================

-- safety_delivery_log backfill: event_code derived from the linked event
UPDATE public.safety_delivery_log dl
SET event_code = 'HM-SOS-' ||
                 to_char(coalesce(se.created_at, dl.attempted_at, now()), 'YYYYMMDD') ||
                 '-' ||
                 upper(substr(replace(se.id::text, '-', ''), 1, 4))
FROM public.safety_events se
WHERE dl.safety_event_id = se.id
  AND dl.event_code IS NULL;

-- safety_alerts backfill: same shape via payload->>'event_id' if available
UPDATE public.safety_alerts sa
SET event_code = 'HM-SOS-' ||
                 to_char(coalesce(se.created_at, sa.created_at, now()), 'YYYYMMDD') ||
                 '-' ||
                 upper(substr(replace(se.id::text, '-', ''), 1, 4))
FROM public.safety_events se
WHERE (sa.payload->>'event_id')::uuid = se.id
  AND sa.event_code IS NULL;

-- ============================================================================
-- Forensic view — single query to retrieve any historical SOS message
-- ============================================================================

CREATE OR REPLACE VIEW public.sos_dispatch_audit AS
SELECT
  'delivery_log'::text  AS source,
  dl.id                 AS row_id,
  dl.safety_event_id    AS safety_event_id,
  dl.event_code         AS event_code,
  dl.channel            AS channel,
  dl.destination        AS destination,
  dl.template_version   AS template_version,
  dl.rendered_body      AS rendered_body,
  dl.status             AS status,
  dl.provider_id        AS provider_id,
  dl.created_at         AS dispatched_at,
  dl.delivered_at       AS delivered_at,
  dl.error              AS error
FROM public.safety_delivery_log dl
UNION ALL
SELECT
  'safety_alerts'::text     AS source,
  sa.id                     AS row_id,
  (sa.payload->>'event_id')::uuid AS safety_event_id,
  sa.event_code             AS event_code,
  sa.channel                AS channel,
  sa.destination            AS destination,
  sa.template_version       AS template_version,
  sa.rendered_body          AS rendered_body,
  sa.status                 AS status,
  (sa.payload->>'provider_id') AS provider_id,
  sa.created_at             AS dispatched_at,
  sa.delivered_at           AS delivered_at,
  sa.error_message          AS error
FROM public.safety_alerts sa;

COMMENT ON VIEW public.sos_dispatch_audit IS
  'D58 S0 — unified read view across both SOS dispatch paths. ' ||
  'Use for incident reconstruction: SELECT * WHERE event_code = ''HM-SOS-...''.';

-- ============================================================================
-- RLS — admin/service only. Trusted-contact dispatch logs are sensitive.
-- ============================================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'safety_delivery_log'
      AND policyname = 'service_role_full_access'
  ) THEN
    EXECUTE 'ALTER TABLE public.safety_delivery_log ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY service_role_full_access ON public.safety_delivery_log FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $$;

COMMIT;
