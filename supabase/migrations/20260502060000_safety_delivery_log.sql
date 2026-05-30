-- safety_delivery_log — per-channel delivery audit for the multi-channel safety dispatcher.
-- One row per (event, contact, channel, attempt). The dispatcher writes it; ack endpoints
-- update it; the operator panel reads it. Owners can read their own rows.

CREATE TABLE IF NOT EXISTS safety_delivery_log (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  safety_event_id    uuid NOT NULL REFERENCES safety_events(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES auth.users(id),
  trusted_contact_id uuid REFERENCES trusted_contacts(id) ON DELETE SET NULL,
  channel            text NOT NULL CHECK (channel IN ('push','sms','whatsapp','email','voice')),
  attempt_number     int  NOT NULL DEFAULT 1,
  status             text NOT NULL CHECK (status IN ('queued','sent','delivered','acked','failed','skipped')),
  provider_id        text,
  provider_response  jsonb,
  attempted_at       timestamptz NOT NULL DEFAULT now(),
  delivered_at       timestamptz,
  acked_at           timestamptz,
  error              text
);

CREATE INDEX IF NOT EXISTS idx_sdl_event       ON safety_delivery_log(safety_event_id);
CREATE INDEX IF NOT EXISTS idx_sdl_user_recent ON safety_delivery_log(user_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_sdl_event_chan  ON safety_delivery_log(safety_event_id, channel);

ALTER TABLE safety_delivery_log ENABLE ROW LEVEL SECURITY;

-- Owners read their own delivery trail
DROP POLICY IF EXISTS sdl_owner_read ON safety_delivery_log;
CREATE POLICY sdl_owner_read ON safety_delivery_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Service role bypasses RLS. UPDATE/DELETE blocked for end users by design;
-- the dispatcher owns this table and ack URLs are validated server-side.
REVOKE INSERT, UPDATE, DELETE ON safety_delivery_log FROM authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON safety_delivery_log TO service_role;
