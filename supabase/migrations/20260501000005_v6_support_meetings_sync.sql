-- HOTMESS v6 — Chunk 02b: support_meetings sync fields
-- Adds external_id for TSML upsert deduplication and last_synced_at tracking.
-- Migration 000004 created the table; this extends it for the sync service.

ALTER TABLE support_meetings
  ADD COLUMN IF NOT EXISTS external_id   TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN support_meetings.external_id IS
  'Stable ID from external source (TSML slug/id). Used for upsert deduplication in sync-meetings.js.';

-- Index for sync deactivation query
CREATE INDEX IF NOT EXISTS idx_support_meetings_external_id
  ON support_meetings (external_id)
  WHERE external_id IS NOT NULL;

-- Keep service_role-only access (inherited from 000004 policies)
-- No additional grants needed.
