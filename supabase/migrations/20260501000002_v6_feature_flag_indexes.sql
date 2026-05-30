-- Chunk 00 follow-up: indexes on feature_flag_audit_log
-- flag_key + actor_id + created_at DESC (advisor finding)
CREATE INDEX IF NOT EXISTS idx_ff_audit_flag_key   ON feature_flag_audit_log (flag_key);
CREATE INDEX IF NOT EXISTS idx_ff_audit_actor_id   ON feature_flag_audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_ff_audit_created_at ON feature_flag_audit_log (created_at DESC);
