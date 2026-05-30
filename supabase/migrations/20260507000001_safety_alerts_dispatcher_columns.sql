-- MEGA-3 PR-A: enable MEGA-2 panic-alert dispatcher to insert per-contact rows
-- on public.safety_alerts. Additive only. Existing event-level usage preserved.

ALTER TABLE public.safety_alerts
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.trusted_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS payload jsonb,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS error_message text;

ALTER TABLE public.safety_alerts ALTER COLUMN alert_type DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_safety_alerts_status_created
  ON public.safety_alerts (status, created_at)
  WHERE status IN ('queued', 'failed');

CREATE INDEX IF NOT EXISTS idx_safety_alerts_contact_id
  ON public.safety_alerts (contact_id) WHERE contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_safety_alerts_user_status
  ON public.safety_alerts (user_id, status, created_at DESC);

COMMENT ON COLUMN public.safety_alerts.contact_id IS
  'Per-recipient row when dispatched via panic-alert; null for event-level rows';
COMMENT ON COLUMN public.safety_alerts.channel IS
  'Delivery channel: sms | whatsapp | telegram | email | push';
COMMENT ON COLUMN public.safety_alerts.status IS
  'queued | dispatched | delivered | failed';
