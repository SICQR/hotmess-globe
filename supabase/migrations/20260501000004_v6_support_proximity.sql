-- HOTMESS v6 — Chunk 02: Support Proximity
-- Migration: lifestyle_preferences + support_preferences columns + support_meetings table
-- Spec: DEV_BRIEF_support-proximity.docx
--
-- DECOUPLING RULE: lifestyle_preferences has ZERO system effect.
-- Only support_preferences.support_notifications_enabled activates the system.

-- ─── 1. LIFESTYLE PREFERENCES — declarative only, zero system effect ────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS lifestyle_preferences JSONB DEFAULT NULL;

COMMENT ON COLUMN profiles.lifestyle_preferences IS
  'Declarative only. Must never trigger system behaviour. '
  'Schema: { sober?: boolean, no_alcohol?: boolean, recovery?: boolean }. '
  'ZERO system effect. No triggers. No logic. Private — owner only.';

-- ─── 2. SUPPORT PREFERENCES — functional, controls all behaviour ─────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS support_preferences JSONB
  DEFAULT '{"support_notifications_enabled":false,"support_detail_level":"generic"}';

COMMENT ON COLUMN profiles.support_preferences IS
  'Functional. Default: disabled. Decoupled from lifestyle_preferences. '
  'Schema: { support_notifications_enabled: boolean, support_detail_level: "generic"|"detailed" }. '
  'Private — owner only.';

-- ─── 3. RLS — block non-owner reads at DB level ──────────────────────────────
-- Existing profiles RLS allows authenticated reads of all columns via SELECT *.
-- We enforce owner-only at the API layer (api/profile.js stripPrivateFields).
-- Belt-and-suspenders: update the profile SELECT policy to exclude private cols
-- via a view rather than column-level security (CLS not supported in Supabase free tier).
-- API-layer enforcement is the primary mechanism per spec.

-- Revoke the new columns from operator_role
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'operator_role') THEN
    -- Column-level REVOKE for the new fields
    EXECUTE 'REVOKE ALL ON TABLE profiles FROM operator_role';
    -- Re-grant only the aggregate-safe columns operators need
    EXECUTE $cols$
      GRANT SELECT (id, display_name, avatar_url, city, is_online, last_seen_at)
      ON profiles TO operator_role
    $cols$;
  END IF;
END$$;

-- ─── 4. SUPPORT MEETINGS TABLE — placeholder, real data source TBD ───────────
CREATE TABLE IF NOT EXISTS support_meetings (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_type TEXT        NOT NULL CHECK (meeting_type IN ('aa', 'na', 'other')),
  name         TEXT,
  lat          DECIMAL(9,6) NOT NULL,
  lng          DECIMAL(9,6) NOT NULL,
  day_of_week  INT         CHECK (day_of_week BETWEEN 0 AND 6),
  start_time   TIME        NOT NULL,
  is_active    BOOLEAN     DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE support_meetings IS
  'Placeholder. Real data source (Meeting Guide API / NA feeds) to be plugged in. '
  'Never expose to users directly — used only for proximity calculation.';

-- PostGIS location index (uses earthdistance extension)
CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE;
CREATE EXTENSION IF NOT EXISTS cube CASCADE;

CREATE INDEX IF NOT EXISTS idx_support_meetings_location
  ON support_meetings USING BTREE (lat, lng);

-- RLS on support_meetings — no direct user access, service_role only
ALTER TABLE support_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_meetings_service_only"
  ON support_meetings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Deny all other roles
CREATE POLICY "support_meetings_deny_public"
  ON support_meetings
  FOR SELECT
  TO authenticated, anon
  USING (false);

-- ─── 5. NOTIFICATION DEDUP TABLE — prevent > 1 notification per window ───────
CREATE TABLE IF NOT EXISTS support_notification_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_key  TEXT        NOT NULL  -- e.g. '2026-05-01-morning'
);

-- One notification per user per window
CREATE UNIQUE INDEX IF NOT EXISTS idx_support_notif_user_window
  ON support_notification_log (user_id, window_key);

-- RLS: user can see their own log; service_role writes
ALTER TABLE support_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_notif_log_own_select"
  ON support_notification_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "support_notif_log_service_insert"
  ON support_notification_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- No UPDATE, no DELETE (append-only dedup log)
REVOKE UPDATE, DELETE ON support_notification_log FROM anon, authenticated, service_role;

-- ─── 6. OPERATOR ROLE — ensure new tables are blocked ────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['support_meetings', 'support_notification_log'] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'operator_role') THEN
      EXECUTE format('REVOKE ALL ON TABLE %I FROM operator_role', t);
    END IF;
  END LOOP;
END$$;

-- ─── 7. RPC: update_support_preferences — safe partial JSONB update ──────────
-- Called by the client to toggle enabled or change detail level.
-- p_enabled = null means "don't change". p_detail_level = null means "don't change".
CREATE OR REPLACE FUNCTION update_support_preferences(
  p_user_id     UUID,
  p_enabled     BOOLEAN DEFAULT NULL,
  p_detail_level TEXT    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_prefs JSONB;
  new_prefs     JSONB;
BEGIN
  -- Owner-only: caller must match the target user
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  SELECT COALESCE(support_preferences,
    '{"support_notifications_enabled":false,"support_detail_level":"generic"}'::JSONB)
  INTO current_prefs
  FROM profiles
  WHERE id = p_user_id;

  new_prefs := current_prefs;

  IF p_enabled IS NOT NULL THEN
    new_prefs := jsonb_set(new_prefs, '{support_notifications_enabled}', to_jsonb(p_enabled));
  END IF;

  IF p_detail_level IS NOT NULL THEN
    IF p_detail_level NOT IN ('generic', 'detailed') THEN
      RAISE EXCEPTION 'Invalid detail level: %', p_detail_level;
    END IF;
    new_prefs := jsonb_set(new_prefs, '{support_detail_level}', to_jsonb(p_detail_level));
  END IF;

  UPDATE profiles SET support_preferences = new_prefs WHERE id = p_user_id;
END;
$$;

-- Grant execute to authenticated users only (SECURITY DEFINER enforces owner check inside)
GRANT EXECUTE ON FUNCTION update_support_preferences(UUID, BOOLEAN, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION update_support_preferences(UUID, BOOLEAN, TEXT) FROM anon;
