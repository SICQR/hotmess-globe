-- Privacy & Consent tables (GDPR compliance)
-- Already deployed to prod rfoftonnlwudilafhfkl via execute_sql.
-- This migration file is for version tracking.

-- ═══════════════════════════════════════════════════════════════════
-- 1. user_privacy_settings — per-user privacy controls
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  visibility TEXT NOT NULL DEFAULT 'visible' CHECK (visibility IN ('visible', 'low', 'invisible')),
  show_at_venues BOOLEAN NOT NULL DEFAULT true,
  show_nearby BOOLEAN NOT NULL DEFAULT true,
  share_vibe BOOLEAN NOT NULL DEFAULT true,
  journey_sharing TEXT NOT NULL DEFAULT 'off' CHECK (journey_sharing IN ('off', 'ask', 'trusted_only')),
  ai_suggestions BOOLEAN NOT NULL DEFAULT true,
  analytics_consent BOOLEAN NOT NULL DEFAULT true,
  location_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own privacy settings') THEN
    CREATE POLICY "Users read own privacy settings" ON user_privacy_settings FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users insert own privacy settings') THEN
    CREATE POLICY "Users insert own privacy settings" ON user_privacy_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users update own privacy settings') THEN
    CREATE POLICY "Users update own privacy settings" ON user_privacy_settings FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_privacy_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_privacy_updated ON user_privacy_settings;
CREATE TRIGGER trg_privacy_updated BEFORE UPDATE ON user_privacy_settings
  FOR EACH ROW EXECUTE FUNCTION update_privacy_updated_at();


-- ═══════════════════════════════════════════════════════════════════
-- 2. user_data_requests — GDPR export/delete requests
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_data_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('export', 'delete')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_data_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users create own data requests') THEN
    CREATE POLICY "Users create own data requests" ON user_data_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own data requests') THEN
    CREATE POLICY "Users read own data requests" ON user_data_requests FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_data_req_updated ON user_data_requests;
CREATE TRIGGER trg_data_req_updated BEFORE UPDATE ON user_data_requests
  FOR EACH ROW EXECUTE FUNCTION update_privacy_updated_at();


-- ═══════════════════════════════════════════════════════════════════
-- 3. Extend user_consents with per-type consent rows
-- ═══════════════════════════════════════════════════════════════════
DO $$ BEGIN
  ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS consent_type TEXT;
  ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS granted BOOLEAN DEFAULT false;
  ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS granted_at TIMESTAMPTZ;
EXCEPTION WHEN undefined_table THEN
  -- user_consents doesn't exist yet, skip
  NULL;
END $$;

-- Add unique constraint for upsert if it doesn't exist
DO $$ BEGIN
  ALTER TABLE user_consents ADD CONSTRAINT user_consents_user_type_unique UNIQUE (user_id, consent_type);
EXCEPTION WHEN duplicate_table THEN NULL;
WHEN undefined_table THEN NULL;
WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════════
-- 4. Add profile privacy columns (show_distance, allow_messages_from, etc.)
-- ═══════════════════════════════════════════════════════════════════
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_distance BOOLEAN DEFAULT true;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allow_messages_from TEXT DEFAULT 'everyone';
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS read_receipts BOOLEAN DEFAULT true;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_online_status BOOLEAN DEFAULT true;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
