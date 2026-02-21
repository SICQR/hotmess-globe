-- ============================================================
-- Migration: spatial_os_contract
-- 
-- Adds the 6 tables and 2 RPCs that the Hotmess Globe UI
-- calls at runtime under the new spatial OS layer system.
--
-- Principles:
--  • IF NOT EXISTS — idempotent
--  • RLS on every table
--  • GDPR soft-delete (deleted_at) where PII is stored
--  • No speculative schema — every table has a live UI caller
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. spatial_motion_log
--    Opt-in diagnostics emitted by MotionOrchestrator.
--    Stores animation domain transitions for performance audits.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spatial_motion_log (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
    domain      TEXT        NOT NULL CHECK (domain IN ('camera','sheet','modal','interrupt','hud')),
    action      TEXT        NOT NULL CHECK (action IN ('request','release','timeout')),
    blocked_by  TEXT[],                            -- domains that caused a wait
    wait_ms     INTEGER     DEFAULT 0,             -- milliseconds blocked
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ                        -- GDPR soft-delete
);

ALTER TABLE spatial_motion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own motion log"
    ON spatial_motion_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own motion log"
    ON spatial_motion_log FOR SELECT
    USING (auth.uid() = user_id AND deleted_at IS NULL);

-- ─────────────────────────────────────────────────────────────
-- 2. user_spatial_prefs
--    Per-user spatial and motion preferences.
--    Consumed by shell boot to configure MotionOrchestrator.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_spatial_prefs (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    reduced_motion   BOOLEAN     NOT NULL DEFAULT false,
    preferred_layer  TEXT        CHECK (preferred_layer IN ('L0','L1','L2','L3')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at       TIMESTAMPTZ                        -- GDPR soft-delete
);

ALTER TABLE user_spatial_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own spatial prefs"
    ON user_spatial_prefs FOR ALL
    USING (auth.uid() = user_id AND deleted_at IS NULL)
    WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 3. user_badges  (ensure table exists — first created in
--    20260214000000_user_badges.sql; this is a guard only)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_badges (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_key   TEXT        NOT NULL,
    awarded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_badges' AND policyname = 'Users read own badges'
    ) THEN
        EXECUTE 'CREATE POLICY "Users read own badges"
            ON user_badges FOR SELECT
            USING (auth.uid() = user_id AND deleted_at IS NULL)';
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 4. user_check_ins
--    Safety check-in records (SafetyFAB, AftercareNudge).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_check_ins (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    checked_in_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    location_label  TEXT,                          -- optional coarse label (city)
    resolved_at     TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ                    -- GDPR soft-delete
);

ALTER TABLE user_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own check-ins"
    ON user_check_ins FOR ALL
    USING (auth.uid() = user_id AND deleted_at IS NULL)
    WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 5. realtime_presence
--    NowSignal live presence records (no PII; TTL-purged).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS realtime_presence (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    layer       TEXT        NOT NULL CHECK (layer IN ('L0','L1','L2','L3')),
    status      TEXT        NOT NULL DEFAULT 'online',
    last_seen   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE realtime_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users upsert own presence"
    ON realtime_presence FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users read presence"
    ON realtime_presence FOR SELECT
    USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────
-- 6. system_settings
--    Feature flags and admin overrides (ensure exists).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
    key         TEXT        PRIMARY KEY,
    value       JSONB       NOT NULL DEFAULT '{}',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'system_settings' AND policyname = 'Anon read system settings'
    ) THEN
        EXECUTE 'CREATE POLICY "Anon read system settings"
            ON system_settings FOR SELECT
            USING (true)';
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- RPC 1: get_user_spatial_context
--    Returns spatial preferences and active layer for a user.
--    Called by MotionOrchestrator hook and shell boot.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_spatial_context(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prefs user_spatial_prefs%ROWTYPE;
BEGIN
    -- Callers may only fetch their own context
    IF auth.uid() IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT * INTO v_prefs
    FROM user_spatial_prefs
    WHERE user_id = p_user_id
      AND deleted_at IS NULL
    LIMIT 1;

    RETURN json_build_object(
        'reduced_motion',   COALESCE(v_prefs.reduced_motion, false),
        'preferred_layer',  v_prefs.preferred_layer
    );
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- RPC 2: delete_user_data
--    GDPR right-to-erasure: soft-deletes all PII rows for a user.
--    Called by account settings erasure flow.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION delete_user_data(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Callers may only delete their own data
    IF auth.uid() IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    UPDATE spatial_motion_log SET deleted_at = now() WHERE user_id = p_user_id AND deleted_at IS NULL;
    UPDATE user_spatial_prefs  SET deleted_at = now() WHERE user_id = p_user_id AND deleted_at IS NULL;
    UPDATE user_badges         SET deleted_at = now() WHERE user_id = p_user_id AND deleted_at IS NULL;
    UPDATE user_check_ins      SET deleted_at = now() WHERE user_id = p_user_id AND deleted_at IS NULL;
END;
$$;
